import { Logger } from './logger.ts';

export async function startUIServer(logger: Logger): Promise<string> {
  // Find an available port
  const port = await findAvailablePort();
  
  // Create HTTP server for UI
  const handler = (request: Request): Response => {
    const url = new URL(request.url);
    
    // Handle API endpoints
    if (url.pathname === '/api/logs') {
      const logs = logger.getLogs();
      return new Response(JSON.stringify(logs), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/api/logs/export') {
      const logs = logger.getLogs();
      const logText = logs.map(log => 
        `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${log.message}${log.details ? ' ' + JSON.stringify(log.details) : ''}`
      ).join('\n');
      
      return new Response(logText, {
        headers: { 
          'Content-Type': 'text/plain',
          'Content-Disposition': 'attachment; filename="mcp-logs.txt"'
        }
      });
    }

    if (url.pathname === '/api/logs/clear' && request.method === 'POST') {
      logger.clearLogs();
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Serve UI HTML
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(getUIHTML(), {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  };

  // Start the server
  const server = Deno.serve({ port, hostname: 'localhost' }, handler);
  
  return `http://localhost:${port}`;
}

async function findAvailablePort(): Promise<number> {
  for (let port = 8080; port < 8200; port++) {
    try {
      const listener = Deno.listen({ port, hostname: 'localhost' });
      listener.close();
      return port;
    } catch {
      // Port is in use, try next one
      continue;
    }
  }
  throw new Error('No available ports found');
}

function getUIHTML(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JIRA MCP Server - Logs</title>
    <script src="https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
        }
        
        .header {
            background: #fff;
            padding: 1rem 2rem;
            border-bottom: 1px solid #ddd;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .header h1 {
            font-size: 1.5rem;
            color: #2c3e50;
        }
        
        .controls {
            background: #fff;
            padding: 1rem 2rem;
            border-bottom: 1px solid #ddd;
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            align-items: center;
        }
        
        .search-input {
            flex: 1;
            min-width: 300px;
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        
        .level-filter {
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        
        .button {
            padding: 0.5rem 1rem;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
        }
        
        .button:hover {
            background: #2980b9;
        }
        
        .button.secondary {
            background: #95a5a6;
        }
        
        .button.secondary:hover {
            background: #7f8c8d;
        }
        
        .logs-container {
            padding: 1rem 2rem;
            max-height: calc(100vh - 200px);
            overflow-y: auto;
        }
        
        .log-entry {
            background: #fff;
            margin-bottom: 0.5rem;
            border-radius: 4px;
            border: 1px solid #e0e0e0;
            overflow: hidden;
        }
        
        .log-header {
            padding: 0.75rem 1rem;
            cursor: pointer;
            display: flex;
            justify-content: between;
            align-items: center;
            user-select: none;
        }
        
        .log-header:hover {
            background: #f8f9fa;
        }
        
        .log-level {
            padding: 0.25rem 0.5rem;
            border-radius: 3px;
            font-size: 0.7rem;
            font-weight: bold;
            text-transform: uppercase;
            margin-right: 0.5rem;
        }
        
        .log-level.debug { background: #6c757d; color: white; }
        .log-level.info { background: #17a2b8; color: white; }
        .log-level.warning { background: #ffc107; color: #212529; }
        .log-level.error { background: #dc3545; color: white; }
        
        .log-message {
            flex: 1;
            margin: 0 1rem;
        }
        
        .log-timestamp {
            color: #6c757d;
            font-size: 0.8rem;
        }
        
        .log-details {
            padding: 1rem;
            background: #f8f9fa;
            border-top: 1px solid #e0e0e0;
            display: none;
        }
        
        .log-details.expanded {
            display: block;
        }
        
        .log-details pre {
            background: #f1f3f4;
            padding: 0.5rem;
            border-radius: 3px;
            overflow-x: auto;
            font-size: 0.8rem;
        }
        
        .stats {
            color: #6c757d;
            font-size: 0.9rem;
        }
        
        .no-logs {
            text-align: center;
            color: #6c757d;
            font-style: italic;
            padding: 2rem;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>JIRA MCP Server - Logs</h1>
    </div>
    
    <div class="controls">
        <input type="text" class="search-input" id="searchInput" placeholder="Search logs (fuzzy search enabled)...">
        <select class="level-filter" id="levelFilter">
            <option value="">All Levels</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
        </select>
        <button class="button" onclick="refreshLogs()">Refresh</button>
        <button class="button secondary" onclick="exportLogs()">Export</button>
        <button class="button secondary" onclick="clearLogs()">Clear</button>
        <span class="stats" id="stats"></span>
    </div>
    
    <div class="logs-container" id="logsContainer">
        <div class="no-logs">Loading logs...</div>
    </div>

    <script>
        let allLogs = [];
        let filteredLogs = [];
        let fuse = null;
        
        // Initialize Fuse.js for fuzzy search
        function initializeFuse(logs) {
            fuse = new Fuse(logs, {
                keys: ['message', 'level'],
                threshold: 0.3,
                includeScore: true
            });
        }
        
        // Load logs from API
        async function loadLogs() {
            try {
                const response = await fetch('/api/logs');
                allLogs = await response.json();
                initializeFuse(allLogs);
                filterLogs();
            } catch (error) {
                console.error('Error loading logs:', error);
                document.getElementById('logsContainer').innerHTML = 
                    '<div class="no-logs">Error loading logs</div>';
            }
        }
        
        // Filter logs based on search and level filter
        function filterLogs() {
            const searchTerm = document.getElementById('searchInput').value.trim();
            const levelFilter = document.getElementById('levelFilter').value;
            
            let logs = allLogs;
            
            // Apply level filter
            if (levelFilter) {
                logs = logs.filter(log => log.level === levelFilter);
            }
            
            // Apply search filter
            if (searchTerm && fuse) {
                const results = fuse.search(searchTerm);
                logs = results.map(result => result.item);
            }
            
            filteredLogs = logs;
            renderLogs();
            updateStats();
        }
        
        // Render logs in the UI
        function renderLogs() {
            const container = document.getElementById('logsContainer');
            
            if (filteredLogs.length === 0) {
                container.innerHTML = '<div class="no-logs">No logs found</div>';
                return;
            }
            
            const logsHTML = filteredLogs.map((log, index) => {
                const timestamp = new Date(log.timestamp).toLocaleString();
                const hasDetails = log.details && Object.keys(log.details).length > 0;
                
                return \`
                    <div class="log-entry">
                        <div class="log-header" onclick="toggleDetails(\${index})">
                            <span class="log-level \${log.level}">\${log.level}</span>
                            <span class="log-message">\${escapeHtml(log.message)}</span>
                            <span class="log-timestamp">\${timestamp}</span>
                        </div>
                        \${hasDetails ? \`
                        <div class="log-details" id="details-\${index}">
                            <pre>\${escapeHtml(JSON.stringify(log.details, null, 2))}</pre>
                        </div>
                        \` : ''}
                    </div>
                \`;
            }).join('');
            
            container.innerHTML = logsHTML;
        }
        
        // Toggle log details visibility
        function toggleDetails(index) {
            const details = document.getElementById(\`details-\${index}\`);
            if (details) {
                details.classList.toggle('expanded');
            }
        }
        
        // Update stats display
        function updateStats() {
            const stats = document.getElementById('stats');
            stats.textContent = \`Showing \${filteredLogs.length} of \${allLogs.length} logs\`;
        }
        
        // Export logs as text file
        async function exportLogs() {
            try {
                const response = await fetch('/api/logs/export');
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'mcp-logs.txt';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Error exporting logs:', error);
                alert('Error exporting logs');
            }
        }
        
        // Clear all logs
        async function clearLogs() {
            if (!confirm('Are you sure you want to clear all logs?')) {
                return;
            }
            
            try {
                await fetch('/api/logs/clear', { method: 'POST' });
                await loadLogs();
            } catch (error) {
                console.error('Error clearing logs:', error);
                alert('Error clearing logs');
            }
        }
        
        // Refresh logs
        async function refreshLogs() {
            await loadLogs();
        }
        
        // Escape HTML to prevent XSS
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Event listeners
        document.getElementById('searchInput').addEventListener('input', filterLogs);
        document.getElementById('levelFilter').addEventListener('change', filterLogs);
        
        // Auto-refresh logs every 5 seconds
        setInterval(loadLogs, 5000);
        
        // Initial load
        loadLogs();
    </script>
</body>
</html>
  `.trim();
}