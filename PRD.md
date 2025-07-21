# Project
This project consists of two main parts. 
- JIRA MCP Server
    - THIS IS VERY IMPORTANT! If there is any error the MCP should still respond with the error so that the user knows what is wrong while using the MCP client. This is importanta for the mcp client and the user so they know what is wrong with the setup.
    - `maxResults` should be `50` by default so that we don't overuse tokens.
    - MCP Server can be spawned for io transport using `--stdio` flag which is also default
    - MCP Server also has the capability to serve over HTTP when run with `--remote` flag
    - The server keeps the logs in debug,info,warning,error levels.
    - The MCP server uses personal access token (PAT) to use JIRA authentication while using JIRA APIs
    - The environment variables of MCP server are `JIRA_MCP_PORT` (this is only required if it is run with `--remote` flag. Remember to log this error as well), `JIRA_MCP_DEBUG`, `JIRA_MCP_URL` and `JIRA_MCP_TOKEN`
    - By default debug level is the lowest which logs everything.
- MCP Server User interface
    - MCP Server finds an available port and serves a user interface to show it's logs. THe user can filter the logs with a simple interface. The log search supports fuzzy search. 
    - Use fuse.js for fuzzy searching capabilities on the frontend.
    - Give the user the ability to save/export the logs into a txt file
    - Allow the user to filter by debug level as well
    - Include log entry details view (expandable entries)


# Technical requirements
The MCP server uses Deno to run.

# MCP Tools
This MCP server provides the following tools:

`jira_get_issue`: Get details of a specific JIRA issue by key
`jira_search`: Search issues using JQL (JIRA Query Language) with pagination support
`jira_create_issue`: Create a new issue with project, issue type, summary, and optional fields
`jira_update_issue`: Update an existing issue's fields (summary, description, assignee, priority)
`jira_transition_issue`: Transition an issue to a new status with optional comment
`jira_add_comment`: Add a comment to an existing issue
`get_mcp_ui`: Returns the url to the mcp server user interface

# MCP UI
The MCP server finds an available port to serve a user interface where user can show and filter the server's logs.

# Dependencies
This project uses https://github.com/punkpeye/fastmcp as an MCP server framework.


