# Claude HUD 集成到 CodeAgent 方案

## 概述

本文档描述如何将 claude-hud 的状态栏功能集成到 CodeAgent CLI 中，作为内置插件实现，支持配置开关。

## 架构对比

### Claude HUD 原始架构
```
Claude Code → stdin JSON → claude-hud (独立进程) → stdout → 显示
            ↘ transcript JSONL → 解析工具/代理/todo
```

### CodeAgent 现有架构
```
CodeAgent CLI (React/Ink TUI)
  └── StatusLine 组件
      └── executeStatusLineCommand() → 执行外部命令
```

### 集成后架构
```
CodeAgent CLI
  └── 内置插件: hud-plugin-cac
      ├── skills: /hud-setup, /hud-config
      └── StatusLine 渲染增强
          ├── 内置模式: 直接渲染（高性能）
          └── 外部模式: 调用外部脚本（兼容）
```

---

## 集成方案

### 方案 A: 内置插件（推荐）

将 HUD 核心逻辑移植为 CodeAgent 内置组件，通过配置开关控制。

**优点：**
- 深度集成，性能最优
- 用户可通过 `/plugin` 命令启用/禁用
- 复用 CodeAgent 现有数据源（无需解析 transcript）
- 配置统一管理

**实现步骤：**

#### 1. 创建 HUD 插件定义

```typescript
// src/plugins/bundled/hud-plugin-cac.ts
import { registerBuiltinPlugin } from '../builtinPlugins'

export const hudPluginDefinition: BuiltinPluginDefinition = {
  name: 'hud',
  description: '实时状态栏 HUD - 显示上下文、工具活动、代理状态',
  version: '1.0.0',
  defaultEnabled: false,  // 默认关闭，用户手动开启

  skills: [
    {
      name: 'hud-setup',
      description: '配置 HUD 状态栏',
      // ... skill 定义
    },
    {
      name: 'hud-config',
      description: '自定义 HUD 显示选项',
      // ... skill 定义
    }
  ],

  // 可选：提供钩子增强功能
  hooks: {
    PostToolUse: [
      {
        matcher: '*',
        hooks: [{
          type: 'command',
          command: 'echo "tool completed"'
        }]
      }
    ]
  }
}

export function registerHudPlugin() {
  registerBuiltinPlugin(hudPluginDefinition)
}
```

#### 2. 移植核心渲染逻辑

需要移植的文件：

| 源文件 (claude-hud) | 目标文件 (CodeAgent) | 说明 |
|---------------------|----------------------|------|
| `src/render/*.ts` | `src/components/HudRender-cac.ts` | ANSI 渲染逻辑 |
| `src/types.ts` | `src/types/hud-cac.ts` | 类型定义 |
| `src/config.ts` | `src/utils/hudConfig-cac.ts` | HUD 配置 |
| `src/i18n/*.ts` | `src/i18n/hud-cac.ts` | 国际化 |

#### 3. 修改 StatusLine 组件

```typescript
// src/components/StatusLine.tsx (修改)

import { renderHudLine } from './HudRender-cac.js'
import { loadHudConfig } from '../utils/hudConfig-cac.js'

function StatusLineInner({ ... }: Props): React.ReactNode {
  const settings = useSettings()
  const hudEnabled = settings?.hud?.enabled ?? false

  // 内置 HUD 模式
  if (hudEnabled) {
    const hudConfig = loadHudConfig(settings?.hud)
    return (
      <Box paddingX={paddingX} gap={2}>
        <Text>
          <Ansi>{renderHudLine(statusInput, hudConfig)}</Ansi>
        </Text>
      </Box>
    )
  }

  // 外部命令模式（现有逻辑）
  return (
    <Box paddingX={paddingX} gap={2}>
      {statusLineText ? (
        <Text dimColor wrap="truncate">
          <Ansi>{statusLineText}</Ansi>
        </Text>
      ) : null}
    </Box>
  )
}
```

#### 4. 添加配置 Schema

```typescript
// src/utils/settings/types.ts (添加)

type HudSettings = {
  enabled: boolean
  lineLayout: 'compact' | 'expanded'
  display: {
    showContextBar: boolean
    showUsage: boolean
    showTools: boolean
    showAgents: boolean
    showTodos: boolean
    showGitStatus: boolean
    showMemoryUsage: boolean
  }
  colors: {
    context: 'auto' | 'green' | 'yellow' | 'red'
    usage: 'auto' | 'green' | 'yellow' | 'red'
  }
  pathLevels: 1 | 2 | 3
  language: 'en' | 'zh' | 'zh-Hans'
}

type SettingsJson = {
  // ... 现有字段
  hud?: HudSettings
}
```

#### 5. 数据源映射

CodeAgent 已有的数据源，无需额外解析：

| HUD 数据 | CodeAgent 来源 |
|----------|----------------|
| model | `mainLoopModel` |
| context_window | `contextPercentages` |
| tokens | `currentUsage` |
| rate_limits | `rateLimits` |
| git status | 需新增 `getGitStatus()` |
| tools/agents | `messages` 中解析 |
| todos | `AppState.todos` |

---

### 方案 B: 外部命令模式（最小改动）

保持 HUD 为独立进程，通过 statusLine 配置调用。

**优点：**
- 改动最小
- HUD 可独立更新
- 与原 Claude Code 兼容

**缺点：**
- 性能稍差（进程启动开销）
- 配置分散

**配置示例：**

```json
// ~/.cac/settings.json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/claude-hud/dist/index.js",
    "padding": 0
  }
}
```

---

## 文件结构（方案 A）

```
packages/codeagent/
├── src/
│   ├── plugins/
│   │   └── bundled/
│   │       └── hud-plugin-cac.ts      # 插件定义
│   ├── components/
│   │   ├── StatusLine.tsx             # 修改：集成 HUD
│   │   └── HudRender-cac.tsx          # 新增：HUD 渲染
│   ├── utils/
│   │   ├── hudConfig-cac.ts           # 新增：HUD 配置
│   │   └── hudGit-cac.ts              # 新增：Git 状态
│   └── types/
│       └── hud-cac.ts                 # 新增：类型定义
└── .cac/
    └── skills/
        └── hud/
            ├── SKILL.md               # /hud 命令
            └── config.md              # 配置帮助
```

---

## 配置选项

### 用户配置示例

```json
// ~/.cac/settings.json
{
  "hud": {
    "enabled": true,
    "lineLayout": "expanded",
    "display": {
      "showContextBar": true,
      "showUsage": true,
      "showTools": true,
      "showAgents": true,
      "showTodos": true,
      "showGitStatus": true
    },
    "colors": {
      "context": "auto",
      "usage": "auto"
    },
    "pathLevels": 2,
    "language": "zh-Hans"
  }
}
```

### 命令行开关

```bash
# 启用 HUD
codeagent config set hud.enabled true

# 禁用 HUD
codeagent config set hud.enabled false

# 切换布局
codeagent config set hud.lineLayout compact
```

---

## 实现优先级

### P0 - 核心功能
1. 移植渲染逻辑 (`HudRender-cac.tsx`)
2. 修改 StatusLine 组件
3. 添加配置 Schema

### P1 - 增强功能
4. Git 状态显示
5. 工具/代理活动追踪
6. Todo 进度显示

### P2 - 可选功能
7. 多语言支持
8. 自定义颜色主题
9. 内存使用显示

---

## 测试计划

1. **单元测试**：渲染逻辑、配置解析
2. **集成测试**：StatusLine 组件渲染
3. **E2E 测试**：实际 CLI 运行验证

---

## 兼容性说明

- **Node.js**: 18+
- **Bun**: 1.3.11+
- **终端**: 支持 ANSI 颜色
- **平台**: Windows / macOS / Linux

---

## 下一步行动

1. 确认集成方案（推荐方案 A）
2. 创建 feature branch
3. 按 P0 → P1 → P2 顺序实现
4. 编写测试用例
5. 更新文档

---

## 参考

- Claude HUD: https://github.com/jarrodwatts/claude-hud
- CodeAgent 插件系统: `src/plugins/builtinPlugins.ts`
- StatusLine 组件: `src/components/StatusLine.tsx`
