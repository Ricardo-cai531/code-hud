import * as path from 'node:path';

function expandHomeDirPrefix(inputPath: string, homeDir: string): string {
  if (inputPath === '~') {
    return homeDir;
  }
  if (inputPath.startsWith('~/') || inputPath.startsWith('~\\')) {
    return path.join(homeDir, inputPath.slice(2));
  }
  return inputPath;
}

/**
 * Get the CodeAgent config directory (~/.cac or CAC_CONFIG_DIR env var)
 */
export function getCacConfigDir(homeDir: string): string {
  const envConfigDir = process.env.CAC_CONFIG_DIR?.trim();
  if (!envConfigDir) {
    return path.join(homeDir, '.cac');
  }
  return path.resolve(expandHomeDirPrefix(envConfigDir, homeDir));
}

/**
 * Get the path to the CodeAgent settings.json file
 */
export function getCacConfigJsonPath(homeDir: string): string {
  return `${getCacConfigDir(homeDir)}.json`;
}

/**
 * Get the code-hud plugin directory for storing config and cache
 */
export function getHudPluginDir(homeDir: string): string {
  return path.join(getCacConfigDir(homeDir), 'plugins', 'code-hud');
}

/**
 * Legacy function for backward compatibility with Claude Code
 * @deprecated Use getCacConfigDir instead
 */
export function getClaudeConfigDir(homeDir: string): string {
  const envConfigDir = process.env.CLAUDE_CONFIG_DIR?.trim();
  if (!envConfigDir) {
    return path.join(homeDir, '.claude');
  }
  return path.resolve(expandHomeDirPrefix(envConfigDir, homeDir));
}
