# TUI User Experience Design

## 🎯 设计理念

基于经典TUI应用的最佳实践（mutt、less、vim、htop），设计直观且强大的用户界面。

## 📐 界面布局

### 1. 对话列表视图（主界面）
```
┌─ Show Me The Talk v1.0 ─ Project: my-project ─ 45 conversations ────────────┐
│                                                                             │
│ ▶ [12:34] How to implement DDD? (15 msgs) 👤→🤖 [typescript, architecture] │
│   [12:30] Debug async function (8 msgs)   👤→🤖 [javascript, debugging]    │
│   [12:25] Explain Repository pattern (12) 👤→🤖 [patterns, learning]       │
│   [11:45] Code review request (20 msgs)   👤→🤖 [review, refactoring]      │
│   [11:30] Fix TypeScript errors (6 msgs)  👤→🤖 [typescript, debugging]    │
│   [11:15] Async/await best practices (10) 👤→🤖 [javascript, learning]     │
│   [10:45] Database schema design (25)     👤→🤖 [database, architecture]   │
│                                                                             │
│                              [More...]                                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ j/k:nav ↵:view d:detail s:search f:filter e:export q:quit h:help          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. 消息详情视图
```
┌─ Conversation ─ How to implement DDD? ─ Message 1/15 ──────────────────────┐
│                                                                             │
│ 👤 User [12:34:15]:                                                        │
│ How do I implement Domain-Driven Design in TypeScript? I want to          │
│ structure my project properly with entities, repositories, and services.   │
│                                                                             │
│ ──────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│ 🤖 Assistant [12:34:20]:                                                   │
│ I'll help you implement Domain-Driven Design in TypeScript. Here's a      │
│ comprehensive approach:                                                     │
│                                                                             │
│ ## Core Concepts                                                           │
│                                                                             │
│ ```typescript                                                              │
│ // Domain Entity                                                           │
│ export class User {                                                        │
│   constructor(                                                             │
│     public readonly id: UserId,                                            │
│     private name: string,                                                  │
│     private email: Email                                                   │
│   ) {}                                                                     │
│ }                                                                          │
│ ```                                                                        │
│                                                                             │
│ 🔧 [Viewed: /src/domain/entities/User.ts]                                 │
│ 🔧 [Edited: /src/domain/repositories/UserRepository.ts]                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ ↑/↓:scroll PgUp/PgDn:page j/k:next/prev msg n:next conv ESC:back h:help   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. 搜索界面
```
┌─ Search Conversations ─────────────────────────────────────────────────────┐
│                                                                             │
│ Query: typescript domain design_                                           │
│                                                                             │
│ Results (3 found):                                                         │
│ ▶ [12:34] How to implement DDD? (15 msgs) 👤→🤖 [typescript, architecture] │
│   [10:20] TypeScript decorators (8 msgs)  👤→🤖 [typescript, patterns]    │
│   [09:15] Domain modeling tips (12 msgs)  👤→🤖 [design, architecture]    │
│                                                                             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Type to search, ↑/↓:navigate ↵:select ESC:cancel                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## ⌨️ 快捷键设计

### 全局快捷键
- `h` - 帮助
- `q` - 退出当前界面/程序
- `ESC` - 返回上级
- `Ctrl+C` - 强制退出

### 列表导航
- `j/k` 或 `↑/↓` - 上下移动
- `g/G` - 到顶部/底部
- `PgUp/PgDn` - 翻页
- `↵` - 选择/进入

### 对话列表
- `s` - 搜索
- `f` - 过滤
- `e` - 导出
- `d` - 显示详情
- `n/p` - 下一个/上一个项目

### 消息详情
- `j/k` - 下一条/上一条消息
- `↑/↓` - 滚动内容
- `Space/b` - 向下/向上翻页
- `n/p` - 下一个/上一个对话
- `c` - 复制代码块
- `t` - 显示工具使用

## 🎨 视觉设计

### 颜色方案
- **标题栏**: 蓝色背景，白色文字
- **选中项**: 高亮背景
- **用户消息**: 绿色前缀
- **AI消息**: 蓝色前缀
- **工具使用**: 黄色前缀
- **代码块**: 语法高亮
- **状态栏**: 反色显示

### 图标系统
- 👤 用户消息
- 🤖 AI消息
- 🔧 工具使用
- 📁 文件操作
- ⚡ 快速操作
- 🔍 搜索相关
- 📤 导出操作

## 🔄 导航流程

```
启动
  ↓
项目选择 → 对话列表 ⟷ 搜索界面
  ↓           ↓
  ↓      消息详情 ⟷ 代码查看器
  ↓           ↓
  ↓      导出选项
  ↓           ↓
设置界面 ← 帮助界面
```

## 📊 信息密度

每个界面都要显示恰当的信息量：
- **对话列表**: 时间、标题、消息数、标签、参与者
- **消息详情**: 完整内容、工具使用、代码块、时间戳
- **状态栏**: 当前位置、总数、快捷键提示