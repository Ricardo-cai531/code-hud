---
name: claude-plugin-to-codeagent
description: Convert a Claude Code plugin to a CodeAgent-compatible plugin
triggers:
  - migrate plugin to codeagent
  - convert claude plugin
  - adapt plugin for codeagent
  - claude plugin to codeagent
tags:
  - migration
  - plugin
  - codeagent
  - conversion
---

# Convert Claude Code Plugin to CodeAgent Plugin

You are converting a Claude Code plugin to work with CodeAgent. Follow these steps precisely.

## Context

CodeAgent is a fork/derivative of Claude Code that uses different configuration paths and plugin manifest formats. The core functionality (statusline rendering, tool integrations, etc.) remains the same, but the following aspects must be adapted.

## Key Differences

| Aspect | Claude Code | CodeAgent |
|--------|-------------|-----------|
| Plugin manifest dir | `.claude-plugin/` | `.cac-plugin/` |
| Config directory | `~/.claude` | `~/.cac` |
| Environment variable | `CLAUDE_CONFIG_DIR` | `CAC_CONFIG_DIR` |
| Settings file | `~/.claude/settings.json` | `~/.cac/settings.json` |
| Plugin install path | `~/.claude/plugins/` | `~/.cac/plugins/` |
| Command prefix | `/plugin-name:cmd` | `/plugin-name:cmd` (same) |

## Step-by-Step Conversion

### Phase 1: Analyze Source Plugin

1. Read the existing `.claude-plugin/plugin.json` to understand:
   - Plugin name, version, description
   - Registered commands, skills, agents, hooks
   - Any MCP/LSP server configurations
2. Read `package.json` for build configuration
3. Scan `src/` for any hardcoded paths referencing `.claude` or `CLAUDE_CONFIG_DIR`
4. Scan `commands/` for path references
5. Check if `dist/` is gitignored (common pattern)

### Phase 2: Create CodeAgent Plugin Manifest

Create `.cac-plugin/plugin.json` based on the Claude Code manifest:

```json
{
  "name": "{PLUGIN_NAME}",
  "version": "{VERSION}",
  "description": "{DESCRIPTION} (for CodeAgent)",
  "author": {
    "name": "{AUTHOR_NAME}",
    "url": "{AUTHOR_URL}"
  },
  "commands": {
    "{cmd}": {
      "source": "./commands/{cmd}.md",
      "description": "{CMD_DESCRIPTION}"
    }
  },
  "homepage": "{HOMEPAGE}",
  "repository": "{REPOSITORY}",
  "license": "{LICENSE}",
  "keywords": ["{KEYWORDS}", "codeagent"]
}
```

**Important**: CodeAgent's manifest schema uses `commands` as an object with `source` or `content` fields, not simple path strings.

Also create `.cac-plugin/marketplace.json`:

```json
{
  "name": "{PLUGIN_NAME}-marketplace",
  "owner": {
    "name": "{OWNER_NAME}",
    "url": "{OWNER_URL}"
  },
  "plugins": [
    {
      "name": "{PLUGIN_NAME}",
      "source": "./",
      "description": "{DESCRIPTION}",
      "version": "{VERSION}"
    }
  ]
}
```

### Phase 3: Update Source Code

**File renames**: If any file references "claude" in its name related to config:
- `src/claude-config-dir.ts` → `src/cac-config-dir.ts`
- Update all imports accordingly

**Path replacements** in source files:

| Old | New |
|-----|-----|
| `~/.claude` | `~/.cac` |
| `.claude` (as config dir) | `.cac` |
| `CLAUDE_CONFIG_DIR` | `CAC_CONFIG_DIR` |
| `getClaudeConfigDir` | `getCacConfigDir` |
| `getClaudeConfigJsonPath` | `getCacConfigJsonPath` |
| `plugins/old-name` | `plugins/new-name` |

**Important**: Be careful with `.claude` replacements - only replace config directory references, not:
- `.claude-plugin/` (this is being replaced by `.cac-plugin/`)
- `CLAUDE.md` (project instruction file, may keep or rename to `CODEAGENT.md`)
- Generic "claude" in comments/strings that don't refer to paths

### Phase 4: Update Command Files

For each file in `commands/`:

1. Replace `CLAUDE_CONFIG_DIR` → `CAC_CONFIG_DIR`
2. Replace `~/.claude` paths → `~/.cac`
3. Replace plugin name references (e.g., `old-name` → `new-name`)
4. Update command invocation examples (`/old-name:setup` → `/new-name:setup`)
5. **Critical**: If `dist/` is gitignored, update setup to prefer `bun run src/index.ts` over `node dist/index.js`:
   - When bun is available: use `src/index.ts` directly
   - When only node is available: add a build step (`npm ci && npm run build`) then use `dist/index.js`
6. Update Windows-specific instructions to also support bun

### Phase 5: Update Package Metadata

Update `package.json`:
- `name`: Change to new plugin name
- `description`: Reference CodeAgent instead of Claude Code
- `keywords`: Replace `claude-code` with `codeagent`
- `files`: Include `.cac-plugin/` instead of `.claude-plugin/`

### Phase 6: Update Documentation

For `README.md`, `README.zh.md`, and any other docs:

1. Replace project name references
2. Replace "Claude Code" → "CodeAgent" (except when referring to the original project)
3. Update installation commands for CodeAgent
4. Update marketplace URLs
5. Update config file paths: `~/.claude/plugins/old-name/` → `~/.cac/plugins/new-name/`
6. Update command references: `/old-name:configure` → `/new-name:configure`
7. Update clone URLs
8. Rename `CLAUDE.md` → `CODEAGENT.md` and update content

### Phase 7: Cleanup

1. Delete old `.claude-plugin/` directory
2. Delete old source files (e.g., `src/claude-config-dir.ts`)
3. Remove any `dist/` stale compiled files that reference old names
4. Update `.gitignore` if needed

### Phase 8: Build & Test

1. Run `npm ci && npm run build`
2. Test with sample stdin data if applicable
3. Verify no import errors related to old module names
4. Commit and push to target repository

## Common Pitfalls

1. **dist/ is gitignored**: Plugins installed from git won't have compiled files. Prefer `bun run src/index.ts` in setup commands.
2. **Stale dist files**: After renaming source files, old `dist/*.js` files remain. Delete them and rebuild.
3. **Overly broad replacements**: `claude` appears in many contexts. Only replace config paths and branding, not generic references.
4. **Windows bash compatibility**: Windows + Git Bash (OSTYPE=msys/cygwin) must use bash commands, not PowerShell.
5. **Plugin manifest format**: CodeAgent uses a richer manifest schema with `source`/`content` fields for commands, not simple path strings.

## Input Parameters

When invoked, ask for:
- Source plugin directory path
- New plugin name (default: derived from old name)
- Target repository URL
- Author/owner information
