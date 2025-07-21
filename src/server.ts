#!/usr/bin/env deno run --allow-net --allow-env --allow-read --allow-write

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { Logger } from './logger.ts';
import { loadConfig, validateRemoteConfig } from './config.ts';
import { JiraClient } from './jira-client.ts';
import { startUIServer } from './ui-server.ts';

// Parse command line arguments
const args = Deno.args;
const useRemote = args.includes('--remote');
const useStdio = args.includes('--stdio') || !useRemote;

// Initialize logger
const logger = new Logger(Deno.env.get('JIRA_MCP_DEBUG'));

try {
  // Load and validate configuration
  const config = loadConfig(logger);
  
  if (useRemote) {
    validateRemoteConfig(config, logger);
  }

  // Initialize JIRA client
  const jiraClient = new JiraClient(config, logger);

  // Create FastMCP server
  const server = new FastMCP({
    name: 'JIRA MCP Server',
    version: '1.0.0'
  });

  // Start UI server
  let uiUrl: string = '';
  try {
    uiUrl = await startUIServer(logger);
    logger.info(`UI server started at ${uiUrl}`);
  } catch (error) {
    logger.error(`Failed to start UI server: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Tool: Get JIRA issue by key
  server.addTool({
    name: 'jira_get_issue',
    description: 'Get details of a specific JIRA issue by key',
    parameters: z.object({
      issueKey: z.string().describe('The JIRA issue key (e.g., PROJECT-123)')
    }),
    execute: async (args) => {
      try {
        const issue = await jiraClient.getIssue(args.issueKey);
        return JSON.stringify(issue, null, 2);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Error in jira_get_issue: ${errorMsg}`);
        return `Error: ${errorMsg}`;
      }
    }
  });

  // Tool: Search JIRA issues using JQL
  server.addTool({
    name: 'jira_search',
    description: 'Search issues using JQL (JIRA Query Language) with pagination support',
    parameters: z.object({
      jql: z.string().describe('JQL query string to search for issues'),
      startAt: z.number().optional().default(0).describe('Starting index for pagination (default: 0)'),
      maxResults: z.number().optional().default(50).describe('Maximum number of results to return (default: 50)')
    }),
    execute: async (args) => {
      try {
        const result = await jiraClient.searchIssues(args.jql, args.startAt, args.maxResults);
        // Extract only the most important 6 properties for each issue to avoid token limit
        const summary = {
          total: result.total,
          startAt: result.startAt,
          maxResults: result.maxResults,
          issues: result.issues.map(issue => ({
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status.name,
            assignee: issue.fields.assignee?.displayName || 'Unassigned',
            priority: issue.fields.priority?.name || 'None',
            reporter: issue.fields.reporter?.displayName || 'Unknown'
          }))
        };
        return JSON.stringify(summary, null, 2);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Error in jira_search: ${errorMsg}`);
        return `Error: ${errorMsg}`;
      }
    }
  });

  // Tool: Create new JIRA issue
  server.addTool({
    name: 'jira_create_issue',
    description: 'Create a new issue with project, issue type, summary, and optional fields',
    parameters: z.object({
      projectKey: z.string().describe('The project key where the issue will be created'),
      issueType: z.string().describe('The type of issue to create (e.g., Bug, Task, Story)'),
      summary: z.string().describe('The summary/title of the issue'),
      description: z.string().optional().describe('The description of the issue'),
      assignee: z.string().optional().describe('The assignee username'),
      priority: z.string().optional().describe('The priority level (e.g., High, Medium, Low)')
    }),
    execute: async (args) => {
      try {
        const issue = await jiraClient.createIssue(
          args.projectKey,
          args.issueType,
          args.summary,
          args.description,
          args.assignee,
          args.priority
        );
        return JSON.stringify(issue, null, 2);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Error in jira_create_issue: ${errorMsg}`);
        return `Error: ${errorMsg}`;
      }
    }
  });

  // Tool: Update existing JIRA issue
  server.addTool({
    name: 'jira_update_issue',
    description: "Update an existing issue's fields (summary, description, assignee, priority)",
    parameters: z.object({
      issueKey: z.string().describe('The JIRA issue key to update'),
      summary: z.string().optional().describe('New summary/title for the issue'),
      description: z.string().optional().describe('New description for the issue'),
      assignee: z.string().optional().describe('New assignee username'),
      priority: z.string().optional().describe('New priority level')
    }),
    execute: async (args) => {
      try {
        const { issueKey, ...fields } = args;
        const filteredFields = Object.fromEntries(
          Object.entries(fields).filter(([_, value]) => value !== undefined)
        );
        
        if (Object.keys(filteredFields).length === 0) {
          return 'Error: No fields provided to update';
        }

        const issue = await jiraClient.updateIssue(issueKey, filteredFields);
        return JSON.stringify(issue, null, 2);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Error in jira_update_issue: ${errorMsg}`);
        return `Error: ${errorMsg}`;
      }
    }
  });

  // Tool: Transition JIRA issue to new status
  server.addTool({
    name: 'jira_transition_issue',
    description: 'Transition an issue to a new status with optional comment',
    parameters: z.object({
      issueKey: z.string().describe('The JIRA issue key to transition'),
      transitionId: z.string().describe('The ID of the transition to execute'),
      comment: z.string().optional().describe('Optional comment to add during transition')
    }),
    execute: async (args) => {
      try {
        await jiraClient.transitionIssue(args.issueKey, args.transitionId, args.comment);
        return `Successfully transitioned issue ${args.issueKey}`;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Error in jira_transition_issue: ${errorMsg}`);
        return `Error: ${errorMsg}`;
      }
    }
  });

  // Tool: Add comment to JIRA issue
  server.addTool({
    name: 'jira_add_comment',
    description: 'Add a comment to an existing issue',
    parameters: z.object({
      issueKey: z.string().describe('The JIRA issue key to add comment to'),
      comment: z.string().describe('The comment text to add')
    }),
    execute: async (args) => {
      try {
        await jiraClient.addComment(args.issueKey, args.comment);
        return `Successfully added comment to issue ${args.issueKey}`;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Error in jira_add_comment: ${errorMsg}`);
        return `Error: ${errorMsg}`;
      }
    }
  });

  // Tool: Get MCP UI URL
  server.addTool({
    name: 'get_mcp_ui',
    description: 'Returns the URL to the MCP server user interface for viewing logs',
    parameters: z.object({}),
    execute: async () => {
      if (uiUrl) {
        return `MCP Server UI is available at: ${uiUrl}`;
      } else {
        return 'MCP Server UI is not available. Check server logs for errors.';
      }
    }
  });

  // Start the MCP server
  if (useStdio) {
    logger.info('Starting MCP server with stdio transport');
    server.start({
      transportType: 'stdio'
    });
  } else if (useRemote) {
    const port = parseInt(config.JIRA_MCP_PORT!, 10);
    logger.info(`Starting MCP server with HTTP transport on port ${port}`);
    server.start({
      transportType: 'httpStream',
      httpStream: {
        port: port
      }
    });
  }

} catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  logger.error(`Failed to start MCP server: ${errorMsg}`);
  console.error(`FATAL: ${errorMsg}`);
  Deno.exit(1);
}