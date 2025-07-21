# JIRA MCP Server

A Model Context Protocol (MCP) server for JIRA integration, built with Deno and FastMCP. This server provides comprehensive JIRA functionality including issue management, search, and status transitions.

## Features

- **Complete JIRA Integration**: Get, search, create, update, and transition JIRA issues
- **MCP Protocol Support**: Built on the Model Context Protocol for seamless AI assistant integration
- **Flexible Transport**: Supports both stdio (default) and HTTP transport modes
- **Web UI**: Built-in web interface for viewing and filtering server logs with fuzzy search
- **Comprehensive Logging**: Multi-level logging (debug, info, warning, error) with export functionality
- **Error Handling**: Robust error handling that always responds to MCP clients

## Installation

### Prerequisites
- [Deno](https://deno.land/) installed on your system
- JIRA instance with API access
- Personal Access Token (PAT) for JIRA authentication

### Setup

1. Clone or download this repository
2. Set up environment variables:
   ```bash
   export JIRA_MCP_URL="https://your-jira-instance.atlassian.net"
   export JIRA_MCP_TOKEN="your-personal-access-token"
   export JIRA_MCP_DEBUG="info"  # Optional: debug, info, warning, error
   export JIRA_MCP_PORT="8080"   # Required only for --remote mode
   ```

3. Make the server executable:
   ```bash
   chmod +x src/server.ts
   ```

## Usage

### Running with stdio (default for MCP clients)
```bash
deno run --allow-net --allow-env --allow-read --allow-write src/server.ts
# or
deno run --allow-net --allow-env --allow-read --allow-write src/server.ts --stdio
```

### Running with HTTP transport
```bash
deno run --allow-net --allow-env --allow-read --allow-write src/server.ts --remote
```

### Using Deno tasks
```bash
# Development mode
deno task dev

# Production mode  
deno task start

# Compile to executable
deno task compile
```

## MCP Tools

The server provides the following MCP tools:

### `jira_get_issue`
Get details of a specific JIRA issue by key.
- **Parameters**: `issueKey` (string) - The JIRA issue key (e.g., "PROJECT-123")

### `jira_search`
Search issues using JQL (JIRA Query Language) with pagination support.
- **Parameters**: 
  - `jql` (string) - JQL query string
  - `startAt` (number, optional) - Starting index for pagination (default: 0)
  - `maxResults` (number, optional) - Maximum results to return (default: 50)

### `jira_create_issue`
Create a new issue with project, issue type, summary, and optional fields.
- **Parameters**:
  - `projectKey` (string) - Project key where the issue will be created
  - `issueType` (string) - Type of issue (e.g., "Bug", "Task", "Story")
  - `summary` (string) - Issue summary/title
  - `description` (string, optional) - Issue description
  - `assignee` (string, optional) - Assignee username
  - `priority` (string, optional) - Priority level

### `jira_update_issue`
Update an existing issue's fields.
- **Parameters**:
  - `issueKey` (string) - The JIRA issue key to update
  - `summary` (string, optional) - New summary
  - `description` (string, optional) - New description
  - `assignee` (string, optional) - New assignee
  - `priority` (string, optional) - New priority

### `jira_transition_issue`
Transition an issue to a new status with optional comment.
- **Parameters**:
  - `issueKey` (string) - The JIRA issue key to transition
  - `transitionId` (string) - ID of the transition to execute
  - `comment` (string, optional) - Optional comment during transition

### `jira_add_comment`
Add a comment to an existing issue.
- **Parameters**:
  - `issueKey` (string) - The JIRA issue key
  - `comment` (string) - Comment text to add

### `get_mcp_ui`
Returns the URL to the MCP server user interface for viewing logs.
- **Parameters**: None

## Web UI

The server automatically starts a web interface for log viewing and management. Features include:

- **Real-time log viewing** with auto-refresh every 5 seconds
- **Fuzzy search** powered by Fuse.js for finding specific log entries
- **Level filtering** to show only debug, info, warning, or error logs
- **Expandable log details** for viewing structured data
- **Export functionality** to download logs as text files
- **Clear logs** option for log management

Access the UI through the `get_mcp_ui` tool or check the server startup logs for the URL.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_MCP_URL` | Yes | Your JIRA instance URL |
| `JIRA_MCP_TOKEN` | Yes | Personal Access Token for JIRA API |
| `JIRA_MCP_PORT` | Remote mode only | Port number for HTTP transport |
| `JIRA_MCP_DEBUG` | No | Log level (debug/info/warning/error) |

## Development

### Project Structure
```
├── src/
│   ├── server.ts      # Main MCP server implementation
│   ├── types.ts       # TypeScript type definitions
│   ├── logger.ts      # Logging system
│   ├── config.ts      # Configuration management
│   ├── jira-client.ts # JIRA API client
│   └── ui-server.ts   # Web UI server
├── deno.json          # Deno configuration
├── PRD.md            # Project requirements
└── README.md         # This file
```

### Building
Create a standalone executable:
```bash
deno task compile
```

This creates a `jira-mcp` executable that can be distributed without requiring Deno installation.

## Error Handling

The server implements comprehensive error handling to ensure MCP clients always receive responses, even when JIRA operations fail. All errors are:

1. **Logged** with appropriate log levels
2. **Returned to MCP clients** as error messages
3. **Structured** to provide actionable information

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
1. Check the server logs via the Web UI
2. Verify environment variables are correctly set
3. Test JIRA API connectivity manually
4. Review JIRA permissions for the provided token