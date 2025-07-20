# JIRA MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with JIRA APIs.

## Features

This MCP server provides the following tools:

- **jira_get_issue**: Get details of a specific JIRA issue
- **jira_search**: Search issues using JQL (JIRA Query Language)
- **jira_create_issue**: Create a new issue
- **jira_update_issue**: Update an existing issue
- **jira_transition_issue**: Transition an issue to a new status
- **jira_add_comment**: Add a comment to an issue

# Authentication
The MCP uses only Bearer token with a personal access token. 
The environment variables are `JIRA_BASE_URL` , `JIRA_API_TOKEN`, `JIRA_EMAIL`

# Logging
The mcp server keeps a log `mcp.log` in the code directory. The logs are extensive and detailed. 
Use debug,info,warning and error logs.