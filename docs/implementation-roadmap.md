# Show Me The Talk - 实现路线图

## 产品重新定位 (2025-01)

### 核心价值主张
- **从"对话导出工具"升级为"AI 协作学习平台"**
- **Slogan**: "Read the Talk, Write Better Code - 学习最优秀的 Prompt，写更优秀的 Code"
- **核心理念**: 没有 AI 之前我们阅读 Code，有 AI 之后我们阅读 Prompt

### 产品定位
- 专注**人类友好**的对话阅读体验
- 支持 Time Machine/Time Travel/Replay 功能
- 面向开发者的 Prompt 学习和优化平台
- 支持社区互动和知识分享

## 优先级功能 (按 ROI 排序)

### 🥇 Phase 1: 核心体验 (2025-01)

#### 1.1 阅读体验优化 ⭐⭐⭐⭐⭐
**ROI: 9/10** | **开发周期: 1-2周** | **技术难度: 低**

**功能清单:**
- [ ] AI 回复内容折叠（默认显示前3行 + "展开"按钮）
- [ ] 代码块预览（显示语言 + 行数 + 前2行）
- [ ] 侧边栏目录（自动提取对话中的关键节点）
- [ ] 工具调用图标化显示
- [ ] 响应式布局优化

**技术实现:**
- 扩展 `HtmlRenderVisitor` 添加折叠逻辑
- 新增 `TableOfContentsGenerator` 服务
- 前端 JavaScript 交互增强

#### 1.2 Time Machine 基础版 ⭐⭐⭐⭐⭐
**ROI: 9/10** | **开发周期: 1-2周** | **技术难度: 中**

**功能清单:**
- [ ] 时间轴导航（显示对话的时间进度）
- [ ] 快照回放（按时间点查看对话状态）
- [ ] 关键节点标记（重要的 Prompt 和结果）
- [ ] 进度条导航

**技术实现:**
- 扩展 `Conversation` 模型添加时间轴数据
- 新增 `TimeMachineService` 服务
- 实现时间点索引和快照生成

### 🥈 Phase 2: 数据源扩展 (2025-02)

#### 2.1 SpecStory 数据源支持 ⭐⭐⭐⭐
**ROI: 8/10** | **开发周期: 1周** | **技术难度: 中**

**功能清单:**
- [ ] 读取 `.specstory/history/*.md` 文件
- [ ] 解析 YAML front-matter 和 Markdown 内容
- [ ] 转换为统一的 `Conversation` 对象
- [ ] 支持 SpecStory 用户无痛迁移

**技术实现:**
- 新增 `SpecStoryRepository` 适配器
- 实现 Markdown 解析器
- 扩展 CLI 支持多数据源

### 🥉 Phase 3: 高级功能 (2025-03)

#### 3.1 Prompt 调优建议 ⭐⭐⭐
**ROI: 7/10** | **开发周期: 2-3周** | **技术难度: 高**

#### 3.2 社区互动功能 ⭐⭐⭐
**ROI: 6/10** | **开发周期: 3-4周** | **技术难度: 高**

#### 3.3 残局导入功能 ⭐⭐
**ROI: 5/10** | **开发周期: 2-3周** | **技术难度: 高**

## 技术债务和重构计划

### 领域模型优化 (Phase 4)
- 引入 `Session` 和 `Turn` 概念
- 实现 `Metadata` Value Object
- 添加 `FileImpact` 追踪
- 支持 `Phase` 推断

### 架构升级 (Phase 5)
- 微服务架构考虑
- 性能优化
- 缓存策略
- 数据库支持

## 不做的事情 (明确边界)

1. **自动捕获并本地化保存** - 专注阅读体验，不做数据采集
2. **多 IDE 支持** - 目前只专注 Claude Code
3. **代码执行和 Diff** - 专注人类友好界面，不做技术细节展示
4. **实时协作** - 专注个人学习体验

## 成功指标

### Phase 1 目标
- 用户平均阅读时长提升 50%
- 用户满意度 > 4.5/5.0
- GitHub Star 数量达到 100+

### Phase 2 目标
- 支持 SpecStory 用户迁移
- 月活用户达到 500+
- 社区贡献者达到 10+

### Phase 3 目标
- 建立开发者社区
- 形成 Prompt 知识库
- 实现商业化探索