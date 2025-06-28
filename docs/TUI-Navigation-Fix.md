# TUI Navigation Fix

## 🐛 问题诊断

之前的TUI无法正确导航，原因是：

1. **状态管理问题** - 主菜单没有保存选中状态，每次渲染都重置为0
2. **输入设置问题** - stdin没有正确设置为raw模式
3. **渲染问题** - 渲染器没有使用正确的状态值

## ✅ 修复内容

### 1. 添加主菜单状态跟踪
```typescript
// TUIState.ts
export interface TUIState {
  selectedMenuIndex: number; // 新增：跟踪主菜单选中项
  // ...
}
```

### 2. 修复输入处理
```typescript
// InteractiveTUI.ts
private handleMainMenuInput(key: string, state: TUIState): void {
  switch (key) {
    case '\u001b[A': // Up arrow
      const newIndex = Math.max(0, state.selectedMenuIndex - 1);
      this.stateManager.setState({ selectedMenuIndex: newIndex });
      break;
    case '\u001b[B': // Down arrow
      const nextIndex = Math.min(options.length - 1, state.selectedMenuIndex + 1);
      this.stateManager.setState({ selectedMenuIndex: nextIndex });
      break;
  }
}
```

### 3. 设置正确的终端模式
```typescript
private setupInputHandling(): void {
  process.stdin.setRawMode(true);  // 启用原始模式
  process.stdin.resume();           // 开始接收输入
  process.stdin.setEncoding('utf8'); // UTF-8编码
}
```

### 4. 更新渲染器
```typescript
// TUIRenderer.ts
private renderMainMenu(state: TUIState): void {
  // 使用state.selectedMenuIndex而不是硬编码的0
  this.drawMenu(options, state.selectedMenuIndex);
}
```

## 🧪 测试验证

1. **状态管理测试** ✅
   - selectedMenuIndex正确递增/递减
   - 状态在渲染之间保持

2. **键盘输入测试** ✅
   - 上下箭头键正确识别
   - Enter键触发正确的动作
   - ESC键返回上级菜单

3. **导航流程** ✅
   - 主菜单 → 项目列表 → 对话列表 → 导出选项
   - 每个屏幕都能正确导航

## 📝 使用说明

```bash
# 在真实终端中测试
npm run dev -- --tui

# 键盘操作
↑/↓  - 上下导航
Enter - 选择当前项
ESC   - 返回上级
Ctrl+C - 退出程序
```

## 🎯 结果

TUI现在完全可以正常导航了！用户可以：
- 使用箭头键在菜单间移动
- 选中状态正确高亮显示
- 进入子菜单并返回
- 执行实际的导出操作