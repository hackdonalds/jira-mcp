import { Config, JiraIssue, JiraIssueSummary, JiraSearchResult, JiraTransition, JiraProject, JiraIssueType } from './types.ts';
import { Logger } from './logger.ts';

export class JiraClient {
  private config: Config;
  private logger: Logger;

  constructor(config: Config, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    const url = `${this.config.JIRA_MCP_URL}/rest/api/2/${endpoint}`;
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.JIRA_MCP_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    };

    this.logger.debug(`Making JIRA API request`, { url, method: requestOptions.method || 'GET' });

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        const error = `JIRA API error: ${response.status} ${response.statusText} - ${errorText}`;
        this.logger.error(error, { url, status: response.status });
        throw new Error(error);
      }

      const data = await response.json();
      this.logger.debug(`JIRA API response received`, { url, status: response.status });
      return data;
    } catch (error) {
      const errorMessage = `JIRA API request failed: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMessage, { url, error: error instanceof Error ? error.message : String(error) });
      throw new Error(errorMessage);
    }
  }

  async getIssue(issueKey: string): Promise<JiraIssueSummary> {
    this.logger.info(`Fetching JIRA issue`, { issueKey });
    try {
      const issue = await this.makeRequest(`issue/${issueKey}`) as JiraIssue;
      this.logger.info(`Successfully fetched JIRA issue`, { issueKey, summary: issue.fields.summary });
      
      // Extract only the most important 6 properties to avoid token limit
      return {
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        priority: issue.fields.priority?.name || 'None',
        reporter: issue.fields.reporter?.displayName || 'Unknown'
      };
    } catch (error) {
      this.logger.error(`Failed to fetch JIRA issue`, { issueKey, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async searchIssues(jql: string, startAt: number = 0, maxResults: number = 50): Promise<JiraSearchResult> {
    this.logger.info(`Searching JIRA issues`, { jql, startAt, maxResults });
    try {
      const result = await this.makeRequest(`search?jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=${maxResults}`) as JiraSearchResult;
      this.logger.info(`Successfully searched JIRA issues`, { jql, total: result.total, returned: result.issues.length });
      return result;
    } catch (error) {
      this.logger.error(`Failed to search JIRA issues`, { jql, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async createIssue(projectKey: string, issueType: string, summary: string, description?: string, assignee?: string, priority?: string): Promise<JiraIssueSummary> {
    this.logger.info(`Creating JIRA issue`, { projectKey, issueType, summary });
    try {
      const fields: Record<string, unknown> = {
        project: { key: projectKey },
        issuetype: { name: issueType },
        summary
      };

      if (description) {
        fields.description = {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: description
                }
              ]
            }
          ]
        };
      }

      if (assignee) {
        fields.assignee = { name: assignee };
      }

      if (priority) {
        fields.priority = { name: priority };
      }

      const result = await this.makeRequest('issue', {
        method: 'POST',
        body: JSON.stringify({ fields })
      }) as { key: string };

      this.logger.info(`Successfully created JIRA issue`, { issueKey: result.key, projectKey, summary });
      return await this.getIssue(result.key);
    } catch (error) {
      this.logger.error(`Failed to create JIRA issue`, { projectKey, issueType, summary, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async updateIssue(issueKey: string, fields: Record<string, unknown>): Promise<JiraIssueSummary> {
    this.logger.info(`Updating JIRA issue`, { issueKey, fields: Object.keys(fields) });
    try {
      const updateFields: Record<string, unknown> = {};

      Object.entries(fields).forEach(([key, value]) => {
        if (key === 'summary' || key === 'description') {
          updateFields[key] = value;
        } else if (key === 'assignee') {
          updateFields[key] = { name: value };
        } else if (key === 'priority') {
          updateFields[key] = { name: value };
        } else {
          updateFields[key] = value;
        }
      });

      await this.makeRequest(`issue/${issueKey}`, {
        method: 'PUT',
        body: JSON.stringify({ fields: updateFields })
      });

      this.logger.info(`Successfully updated JIRA issue`, { issueKey });
      return await this.getIssue(issueKey);
    } catch (error) {
      this.logger.error(`Failed to update JIRA issue`, { issueKey, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async transitionIssue(issueKey: string, transitionId: string, comment?: string): Promise<void> {
    this.logger.info(`Transitioning JIRA issue`, { issueKey, transitionId });
    try {
      const body: Record<string, unknown> = {
        transition: { id: transitionId }
      };

      if (comment) {
        body.update = {
          comment: [
            {
              add: {
                body: {
                  type: 'doc',
                  version: 1,
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: comment
                        }
                      ]
                    }
                  ]
                }
              }
            }
          ]
        };
      }

      await this.makeRequest(`issue/${issueKey}/transitions`, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      this.logger.info(`Successfully transitioned JIRA issue`, { issueKey, transitionId });
    } catch (error) {
      this.logger.error(`Failed to transition JIRA issue`, { issueKey, transitionId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async addComment(issueKey: string, comment: string): Promise<void> {
    this.logger.info(`Adding comment to JIRA issue`, { issueKey });
    try {
      const body = {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: comment
                }
              ]
            }
          ]
        }
      };

      await this.makeRequest(`issue/${issueKey}/comment`, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      this.logger.info(`Successfully added comment to JIRA issue`, { issueKey });
    } catch (error) {
      this.logger.error(`Failed to add comment to JIRA issue`, { issueKey, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async getTransitions(issueKey: string): Promise<JiraTransition[]> {
    this.logger.debug(`Fetching transitions for JIRA issue`, { issueKey });
    try {
      const result = await this.makeRequest(`issue/${issueKey}/transitions`) as { transitions: JiraTransition[] };
      return result.transitions;
    } catch (error) {
      this.logger.error(`Failed to fetch transitions for JIRA issue`, { issueKey, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async getProjects(): Promise<JiraProject[]> {
    this.logger.debug(`Fetching JIRA projects`);
    try {
      const projects = await this.makeRequest('project') as JiraProject[];
      return projects;
    } catch (error) {
      this.logger.error(`Failed to fetch JIRA projects`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async getIssueTypes(projectKey: string): Promise<JiraIssueType[]> {
    this.logger.debug(`Fetching issue types for project`, { projectKey });
    try {
      const result = await this.makeRequest(`project/${projectKey}`) as { issueTypes: JiraIssueType[] };
      return result.issueTypes;
    } catch (error) {
      this.logger.error(`Failed to fetch issue types for project`, { projectKey, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}