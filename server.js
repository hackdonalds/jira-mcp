#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const LOG_FILE = 'mcp.log';

class Logger {
  constructor() {
    // Try to determine the best log file location
    try {
      this.logFile = path.join(process.cwd(), LOG_FILE);
      // Test if we can write to the current directory
      fs.writeFileSync(this.logFile, '', { flag: 'a' });
    } catch (error) {
      // If current directory is not writable, try temp directory
      try {
        this.logFile = path.join(os.tmpdir(), LOG_FILE);
        fs.writeFileSync(this.logFile, '', { flag: 'a' });
      } catch (tempError) {
        // If all else fails, disable file logging
        this.logFile = null;
        console.error('Warning: Cannot write log file, logging to stderr only');
      }
    }
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}${data ? ` | Data: ${JSON.stringify(data)}` : ''}\n`;
    
    // Try to write to file if available
    if (this.logFile) {
      try {
        fs.appendFileSync(this.logFile, logEntry);
      } catch (error) {
        // If file write fails, disable file logging and continue with stderr
        this.logFile = null;
        console.error('Warning: Log file write failed, switching to stderr only');
      }
    }
    
    // Always log errors to stderr, and in development log all levels
    if (level === 'error' || process.env.NODE_ENV === 'development') {
      console.error(logEntry.trim());
    }
  }

  debug(message, data) { this.log('debug', message, data); }
  info(message, data) { this.log('info', message, data); }
  warning(message, data) { this.log('warning', message, data); }
  error(message, data) { this.log('error', message, data); }
}

const logger = new Logger();

class JiraClient {
  constructor() {
    this.baseUrl = process.env.JIRA_BASE_URL;
    this.apiToken = process.env.JIRA_API_TOKEN;
    this.email = process.env.JIRA_EMAIL;

    if (this.baseUrl && this.apiToken) {
      logger.info('JIRA client initialized', { baseUrl: this.baseUrl, email: this.email });
    } else {
      const missingVars = [];
      if (!this.baseUrl) missingVars.push('JIRA_BASE_URL');
      if (!this.apiToken) missingVars.push('JIRA_API_TOKEN');
      
      logger.warning('JIRA client not configured - missing environment variables', { missing: missingVars });
    }
  }

  _checkConfiguration() {
    if (!this.baseUrl || !this.apiToken) {
      const missingVars = [];
      if (!this.baseUrl) missingVars.push('JIRA_BASE_URL');
      if (!this.apiToken) missingVars.push('JIRA_API_TOKEN');
      
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}. Please set these before using JIRA tools.`);
    }
  }

  async makeRequest(endpoint, options = {}) {
    this._checkConfiguration();
    const url = `${this.baseUrl}/rest/api/2/${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers
    };

    logger.debug('Making JIRA API request', { url, method: options.method || 'GET' });

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = responseText ? JSON.parse(responseText) : null;
      } catch (e) {
        responseData = responseText;
      }

      if (!response.ok) {
        logger.error('JIRA API request failed', { 
          status: response.status, 
          statusText: response.statusText,
          url,
          response: responseData 
        });
        throw new Error(`JIRA API error: ${response.status} ${response.statusText}`);
      }

      logger.debug('JIRA API request successful', { url, status: response.status });
      return responseData;
    } catch (error) {
      logger.error('JIRA API request error', { url, error: error.message });
      throw error;
    }
  }

  async getIssue(issueKey) {
    logger.info('Getting JIRA issue', { issueKey });
    return await this.makeRequest(`issue/${issueKey}`);
  }

  async searchIssues(jql, startAt = 0, maxResults = 50) {
    logger.info('Searching JIRA issues', { jql, startAt, maxResults });
    return await this.makeRequest('search', {
      method: 'POST',
      body: JSON.stringify({ jql, startAt, maxResults })
    });
  }

  async createIssue(issueData) {
    logger.info('Creating JIRA issue', { issueData });
    return await this.makeRequest('issue', {
      method: 'POST',
      body: JSON.stringify({ fields: issueData })
    });
  }

  async updateIssue(issueKey, updateData) {
    logger.info('Updating JIRA issue', { issueKey, updateData });
    return await this.makeRequest(`issue/${issueKey}`, {
      method: 'PUT',
      body: JSON.stringify({ fields: updateData })
    });
  }

  async transitionIssue(issueKey, transitionId, comment = null) {
    logger.info('Transitioning JIRA issue', { issueKey, transitionId, comment });
    const body = { transition: { id: transitionId } };
    if (comment) {
      body.update = { comment: [{ add: { body: comment } }] };
    }
    return await this.makeRequest(`issue/${issueKey}/transitions`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async addComment(issueKey, comment) {
    logger.info('Adding comment to JIRA issue', { issueKey, comment });
    return await this.makeRequest(`issue/${issueKey}/comment`, {
      method: 'POST',
      body: JSON.stringify({ body: comment })
    });
  }
}

const server = new McpServer({
  name: 'jira-mcp-server',
  version: '0.1.0',
});

const jiraClient = new JiraClient();

// Register jira_get_issue tool
server.registerTool(
  'jira_get_issue',
  {
    title: 'Get JIRA Issue',
    description: 'Get details of a specific JIRA issue',
    inputSchema: {
      issueKey: z.string().describe('The JIRA issue key (e.g., PROJECT-123)')
    }
  },
  async ({ issueKey }) => {
    logger.info('Getting JIRA issue', { issueKey });
    try {
      const issue = await jiraClient.getIssue(issueKey);
      logger.info('Successfully retrieved issue', { issueKey });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(issue, null, 2)
        }]
      };
    } catch (error) {
      logger.error('Failed to get issue', { issueKey, error: error.message });
      throw error;
    }
  }
);

// Register jira_search tool
server.registerTool(
  'jira_search',
  {
    title: 'Search JIRA Issues',
    description: 'Search issues using JQL (JIRA Query Language)',
    inputSchema: {
      jql: z.string().describe('JQL query string'),
      startAt: z.number().optional().describe('Starting index for pagination (default: 0)'),
      maxResults: z.number().optional().describe('Maximum number of results (default: 50)')
    }
  },
  async ({ jql, startAt = 0, maxResults = 50 }) => {
    logger.info('Searching JIRA issues', { jql, startAt, maxResults });
    try {
      const searchResults = await jiraClient.searchIssues(jql, startAt, maxResults);
      logger.info('Successfully searched issues', { 
        jql, 
        resultCount: searchResults.issues?.length || 0 
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(searchResults, null, 2)
        }]
      };
    } catch (error) {
      logger.error('Failed to search issues', { jql, error: error.message });
      throw error;
    }
  }
);

// Register jira_create_issue tool
server.registerTool(
  'jira_create_issue',
  {
    title: 'Create JIRA Issue',
    description: 'Create a new JIRA issue',
    inputSchema: {
      project: z.string().describe('Project key'),
      issueType: z.string().describe('Issue type (e.g., Bug, Task, Story)'),
      summary: z.string().describe('Issue summary'),
      description: z.string().optional().describe('Issue description'),
      assignee: z.string().optional().describe('Assignee account ID'),
      priority: z.string().optional().describe('Priority name')
    }
  },
  async ({ project, issueType, summary, description, assignee, priority }) => {
    logger.info('Creating JIRA issue', { project, issueType, summary });
    try {
      const issueData = {
        project: { key: project },
        issuetype: { name: issueType },
        summary: summary,
      };
      
      if (description) issueData.description = description;
      if (assignee) issueData.assignee = { accountId: assignee };
      if (priority) issueData.priority = { name: priority };

      const createdIssue = await jiraClient.createIssue(issueData);
      logger.info('Successfully created issue', { 
        issueKey: createdIssue.key,
        summary 
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(createdIssue, null, 2)
        }]
      };
    } catch (error) {
      logger.error('Failed to create issue', { project, summary, error: error.message });
      throw error;
    }
  }
);

// Register jira_update_issue tool
server.registerTool(
  'jira_update_issue',
  {
    title: 'Update JIRA Issue',
    description: 'Update an existing JIRA issue',
    inputSchema: {
      issueKey: z.string().describe('The JIRA issue key'),
      summary: z.string().optional().describe('New summary'),
      description: z.string().optional().describe('New description'),
      assignee: z.string().optional().describe('New assignee account ID'),
      priority: z.string().optional().describe('New priority name')
    }
  },
  async ({ issueKey, summary, description, assignee, priority }) => {
    logger.info('Updating JIRA issue', { issueKey });
    try {
      const updateData = {};
      
      if (summary) updateData.summary = summary;
      if (description) updateData.description = description;
      if (assignee) updateData.assignee = { accountId: assignee };
      if (priority) updateData.priority = { name: priority };

      await jiraClient.updateIssue(issueKey, updateData);
      logger.info('Successfully updated issue', { 
        issueKey,
        fieldsUpdated: Object.keys(updateData)
      });
      return {
        content: [{
          type: 'text',
          text: `Issue ${issueKey} updated successfully`
        }]
      };
    } catch (error) {
      logger.error('Failed to update issue', { issueKey, error: error.message });
      throw error;
    }
  }
);

// Register jira_transition_issue tool
server.registerTool(
  'jira_transition_issue',
  {
    title: 'Transition JIRA Issue',
    description: 'Transition an issue to a new status',
    inputSchema: {
      issueKey: z.string().describe('The JIRA issue key'),
      transitionId: z.string().describe('The transition ID'),
      comment: z.string().optional().describe('Optional comment for the transition')
    }
  },
  async ({ issueKey, transitionId, comment }) => {
    logger.info('Transitioning JIRA issue', { issueKey, transitionId });
    try {
      await jiraClient.transitionIssue(issueKey, transitionId, comment);
      logger.info('Successfully transitioned issue', { 
        issueKey,
        transitionId
      });
      return {
        content: [{
          type: 'text',
          text: `Issue ${issueKey} transitioned successfully`
        }]
      };
    } catch (error) {
      logger.error('Failed to transition issue', { issueKey, transitionId, error: error.message });
      throw error;
    }
  }
);

// Register jira_add_comment tool
server.registerTool(
  'jira_add_comment',
  {
    title: 'Add JIRA Comment',
    description: 'Add a comment to a JIRA issue',
    inputSchema: {
      issueKey: z.string().describe('The JIRA issue key'),
      comment: z.string().describe('Comment text')
    }
  },
  async ({ issueKey, comment }) => {
    logger.info('Adding comment to JIRA issue', { issueKey });
    try {
      const addedComment = await jiraClient.addComment(issueKey, comment);
      logger.info('Successfully added comment', { 
        issueKey,
        commentId: addedComment.id
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(addedComment, null, 2)
        }]
      };
    } catch (error) {
      logger.error('Failed to add comment', { issueKey, error: error.message });
      throw error;
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  logger.info('Starting JIRA MCP server');
  await server.connect(transport);
}

main().catch((error) => {
  logger.error('Server startup failed', { error: error.message });
  console.error('Failed to start server:', error);
  process.exit(1);
});