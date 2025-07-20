# JIRA MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with JIRA APIs. This server enables AI assistants to read, create, update, and manage JIRA issues through standardized MCP tools.

## Features

This MCP server provides the following tools:

- **jira_get_issue**: Get details of a specific JIRA issue by key
- **jira_search**: Search issues using JQL (JIRA Query Language) with pagination support
- **jira_create_issue**: Create a new issue with project, issue type, summary, and optional fields
- **jira_update_issue**: Update an existing issue's fields (summary, description, assignee, priority)
- **jira_transition_issue**: Transition an issue to a new status with optional comment
- **jira_add_comment**: Add a comment to an existing issue

## Requirements

- Node.js 18.0 or higher
- JIRA instance with API token access
- Personal Access Token from your JIRA instance

## Installation

### Option 1: Quick Start with npx (Recommended)

Run the JIRA MCP server directly without installation:

```bash
npx @hackdonalds/jira-mcp
```

### Option 2: Install Globally

Install the package globally for repeated use:

```bash
npm install -g @hackdonalds/jira-mcp
jira-mcp
```

### Option 3: Install from Source

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd jira-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the server:
   ```bash
   npm start
   ```

### Configuration

Set up your environment variables before running:

```bash
export JIRA_BASE_URL="https://your-jira-instance.com"
export JIRA_API_TOKEN="your-api-token"
export JIRA_EMAIL="your-email@company.com"  # Optional
```

Or create a `.env` file:
```bash
cp .env.example .env
# Edit .env with your JIRA credentials
```

## Configuration

### Environment Variables

The MCP server requires the following environment variables:

- **JIRA_BASE_URL**: Your JIRA instance URL (without trailing slash)
  - Example: `https://yourcompany.atlassian.net` or `https://jira.yourcompany.com`
- **JIRA_API_TOKEN**: Your JIRA Personal Access Token
  - For Atlassian Cloud: Create at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
  - For Server/Data Center: Create in your JIRA profile settings

### Authentication

This server uses **Bearer token authentication** with Personal Access Tokens. The JIRA_EMAIL environment variable is optional and only used for logging purposes.

**Supported JIRA versions:**
- Atlassian Cloud
- JIRA Server 9.0+
- JIRA Data Center

## Usage

### Starting the Server

#### Using npx (if not installed globally):
```bash
npx @hackdonalds/jira-mcp
```

#### If installed globally:
```bash
jira-mcp
```

#### From source:
```bash
npm start
```

Or run directly:
```bash
node server.js
```

### Example Tool Usage

#### Search Issues
```javascript
// Search for issues assigned to current user
{
  "tool": "jira_search",
  "arguments": {
    "jql": "assignee = currentUser() AND status != Done",
    "maxResults": 10
  }
}
```

#### Get Issue Details
```javascript
{
  "tool": "jira_get_issue",
  "arguments": {
    "issueKey": "PROJ-123"
  }
}
```

#### Create New Issue
```javascript
{
  "tool": "jira_create_issue",
  "arguments": {
    "project": "PROJ",
    "issueType": "Task",
    "summary": "New task summary",
    "description": "Detailed description of the task",
    "priority": "High"
  }
}
```

#### Update Issue
```javascript
{
  "tool": "jira_update_issue",
  "arguments": {
    "issueKey": "PROJ-123",
    "summary": "Updated summary",
    "assignee": "user-account-id"
  }
}
```

#### Add Comment
```javascript
{
  "tool": "jira_add_comment",
  "arguments": {
    "issueKey": "PROJ-123",
    "comment": "This is a comment on the issue"
  }
}
```

## Logging

The MCP server maintains comprehensive logging:

- **Log File**: `mcp.log` (in current directory or system temp directory)
- **Log Levels**: debug, info, warning, error
- **Fallback**: If file logging fails, logs to stderr
- **Content**: API requests, responses, errors, and tool executions

## Error Handling

The server includes robust error handling:

- **Missing Configuration**: Graceful degradation with helpful error messages
- **API Errors**: Detailed logging of JIRA API response errors
- **Network Issues**: Proper timeout and retry handling
- **File System**: Automatic fallback for log file creation

## Development

### Project Structure

```
jira-mcp/
├── server.js          # Main MCP server implementation
├── package.json       # Node.js dependencies and scripts
├── .env.example       # Environment variable template
├── .gitignore         # Git ignore rules
├── README.md          # This file
└── mcp.log           # Log file (created at runtime)
```

### Testing

Set your environment variables and test the server:

```bash
export JIRA_BASE_URL="https://your-jira-instance.com"
export JIRA_API_TOKEN="your-token-here"

# Test with npx
npx @hackdonalds/jira-mcp

# Or test from source
node server.js
```

### API Compatibility

- Uses JIRA REST API v2 (`/rest/api/2/`)
- Compatible with both Atlassian Cloud and Server installations
- Supports Bearer token authentication for modern JIRA instances

## Troubleshooting

### Common Issues

1. **Authentication Errors (401)**
   - Verify your API token is correct and not expired
   - Check that your JIRA instance supports Bearer token authentication
   - Ensure JIRA_BASE_URL is correct and accessible

2. **File System Errors (EROFS)**
   - The server automatically handles read-only file systems
   - Logs will fall back to stderr if file logging fails

3. **Empty Search Results**
   - Verify your JQL syntax is correct
   - Check that you have permission to view the issues
   - Try a simpler query like `project is not empty`

4. **Network/Timeout Issues**
   - Ensure your JIRA instance is accessible from your network
   - Check for corporate firewalls or VPN requirements

### Debug Mode

Enable verbose logging by setting:
```bash
export NODE_ENV=development
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

Built with the [Model Context Protocol](https://modelcontextprotocol.io/) TypeScript SDK.