// Environment variables interface
export interface Config {
  JIRA_MCP_URL: string;
  JIRA_MCP_TOKEN: string;
  JIRA_MCP_PORT?: string;
  JIRA_MCP_DEBUG?: string;
}

// Log levels enum
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

// Log entry interface
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  details?: any;
}

// JIRA API types
export interface JiraIssue {
  key: string;
  id: string;
  self: string;
  fields: {
    summary: string;
    description?: string;
    priority?: {
      name: string;
    };
    status: {
      name: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    reporter: {
      displayName: string;
      emailAddress: string;
    };
    issuetype: {
      name: string;
    };
    project: {
      key: string;
      name: string;
    };
    created: string;
    updated: string;
  };
}

export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
  startAt: number;
  maxResults: number;
}

export interface JiraTransition {
  id: string;
  name: string;
  to: {
    name: string;
    id: string;
  };
}

export interface JiraProject {
  key: string;
  name: string;
  id: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
  description: string;
}

export interface JiraIssueSummary {
  key: string;
  summary: string;
  status: string;
  assignee: string;
  priority: string;
  reporter: string;
}