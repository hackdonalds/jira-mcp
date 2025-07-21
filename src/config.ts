import { Config } from './types.ts';
import { Logger } from './logger.ts';

export function loadConfig(logger: Logger): Config {
  const config: Partial<Config> = {};

  // Load required environment variables
  const jiraUrl = Deno.env.get('JIRA_MCP_URL');
  const jiraToken = Deno.env.get('JIRA_MCP_TOKEN');
  
  if (!jiraUrl) {
    const error = 'JIRA_MCP_URL environment variable is required';
    logger.error(error);
    throw new Error(error);
  }
  
  if (!jiraToken) {
    const error = 'JIRA_MCP_TOKEN environment variable is required';
    logger.error(error);
    throw new Error(error);
  }

  config.JIRA_MCP_URL = jiraUrl;
  config.JIRA_MCP_TOKEN = jiraToken;

  // Load optional environment variables
  config.JIRA_MCP_PORT = Deno.env.get('JIRA_MCP_PORT');
  config.JIRA_MCP_DEBUG = Deno.env.get('JIRA_MCP_DEBUG') || 'debug';

  logger.info('Configuration loaded successfully', {
    jiraUrl: config.JIRA_MCP_URL,
    hasToken: !!config.JIRA_MCP_TOKEN,
    port: config.JIRA_MCP_PORT,
    debugLevel: config.JIRA_MCP_DEBUG
  });

  return config as Config;
}

export function validateRemoteConfig(config: Config, logger: Logger): void {
  if (!config.JIRA_MCP_PORT) {
    const error = 'JIRA_MCP_PORT environment variable is required when using --remote flag';
    logger.error(error);
    throw new Error(error);
  }
}