# Phase 3：迭代优化自动化 - 实施方案

**目标**：从Demo到持续迭代的完全自动化

---

## 🎯 核心目标

让AI能够：
1. **理解反馈** - 自动分析用户反馈和问题描述
2. **智能诊断** - 识别问题类型、严重程度、影响范围
3. **生成方案** - 自动设计优化方案和修复代码
4. **应用改进** - 更新代码、更新文档、生成新版本
5. **持续学习** - 记录优化经验，避免重复问题

---

## 📐 系统设计

### 1. 迭代数据结构

每个项目的迭代记录：

```javascript
{
  id: 'iter_xxx',
  projectId: 'proj_xxx',
  version: 'v1.1',
  createdAt: '2026-02-06T10:00:00Z',
  status: 'completed',  // pending, analyzing, generating, completed, failed
  
  // 输入：用户反馈
  feedback: {
    type: 'bug | feature | optimization | ui',
    severity: 'critical | high | medium | low',
    description: '用户描述的问题或需求',
    screenshots: [],  // 可选：截图
    expectedBehavior: '期望的表现',
    actualBehavior: '实际的表现'
  },
  
  // AI分析结果
  analysis: {
    category: 'logic | ui | performance | data | api',
    rootCause: '根本原因分析',
    affectedFiles: ['pages/index/index.js', 'utils/request.js'],
    estimatedComplexity: 'simple | medium | complex',
    relatedExperiences: []  // 相关历史经验
  },
  
  // 优化方案
  solution: {
    approach: '解决方案描述',
    codeChanges: [
      {
        file: 'pages/index/index.js',
        type: 'modify | add | delete',
        before: '修改前代码',
        after: '修改后代码',
        explanation: '改动说明'
      }
    ],
    testPlan: '测试计划',
    risks: ['潜在风险1', '潜在风险2']
  },
  
  // 执行结果
  result: {
    filesModified: 5,
    linesChanged: 127,
    newVersion: 'v1.1',
    githubCommit: 'abc123',
    deployedAt: '2026-02-06T10:30:00Z'
  }
}
```

### 2. 迭代状态机

```
用户提交反馈
    ↓
[pending] 待处理
    ↓
AI分析问题
    ↓
[analyzing] 分析中
    ↓
生成优化方案
    ↓
[generating] 生成中
    ↓
用户确认方案
    ↓ (确认)
应用优化方案
    ↓
[completed] 完成
```

### 3. AI任务类型

新增迭代相关任务：
- `analyze_feedback` - 分析用户反馈
- `generate_solution` - 生成优化方案
- `apply_iteration` - 应用迭代优化

---

## 🔧 技术实现

### 1. 迭代Store (`src/stores/iteration.js`)

管理所有迭代记录：

```javascript
export const useIterationStore = defineStore('iteration', {
  state: () => ({
    iterations: {},  // { [projectId]: [iteration1, iteration2, ...] }
  }),
  
  getters: {
    getProjectIterations: (state) => (projectId) => {
      return state.iterations[projectId] || []
    },
    
    getLatestVersion: (state) => (projectId) => {
      const iters = state.iterations[projectId] || []
      if (iters.length === 0) return 'v1.0'
      return iters[iters.length - 1].version
    }
  },
  
  actions: {
    // 创建新迭代
    createIteration(projectId, feedback) { ... },
    
    // 更新迭代状态
    updateIterationStatus(iterationId, status, data) { ... },
    
    // 保存分析结果
    saveAnalysis(iterationId, analysis) { ... },
    
    // 保存优化方案
    saveSolution(iterationId, solution) { ... },
    
    // 完成迭代
    completeIteration(iterationId, result) { ... }
  }
})
```

### 2. AI API增强

**文件**: `src/api/ai.js`

新增函数：

```javascript
/**
 * 分析用户反馈
 * @param {Object} feedback - 用户反馈
 * @param {Object} project - 项目信息
 * @param {Array} experiences - 相关历史经验
 * @returns {Promise<Object>} 分析结果
 */
export async function analyzeFeedback(feedback, project, experiences) {
  // AI分析Prompt：
  // - 问题分类
  // - 根本原因
  // - 影响文件
  // - 复杂度评估
}

/**
 * 生成优化方案
 * @param {Object} feedback - 用户反馈
 * @param {Object} analysis - 分析结果
 * @param {Object} demoCode - 当前代码
 * @param {Array} experiences - 相关经验
 * @returns {Promise<Object>} 优化方案
 */
export async function generateSolution(feedback, analysis, demoCode, experiences) {
  // AI生成Prompt：
  // - 解决方案设计
  // - 具体代码改动（before/after）
  // - 测试计划
  // - 风险评估
}

/**
 * 生成迭代说明
 * @param {Object} iteration - 迭代记录
 * @returns {Promise<string>} 迭代说明文档
 */
export async function generateIterationDoc(iteration) {
  // 生成Markdown文档：
  // - 版本号
  // - 改动内容
  // - 问题修复
  // - 新增功能
}
```

### 3. AI队列增强

**文件**: `src/utils/aiQueue.js`

新增任务：

```javascript
/**
 * 分析反馈任务
 */
async taskAnalyzeFeedback(project, task) {
  const { iterationId, feedback } = task.options
  
  // 1. 获取相关经验
  const experiences = experienceStore.getRelevantExperiences({
    tags: [`issue:${feedback.type}`, `stage:iteration`],
    projectType: project.requirement?.appType
  })
  
  // 2. AI分析
  const analysis = await analyzeFeedback(feedback, project, experiences)
  
  // 3. 保存分析结果
  iterationStore.saveAnalysis(iterationId, analysis)
  
  // 4. 自动触发方案生成
  if (project.autoMode) {
    this.addTask(project.id, 'generate_solution', 'high', { iterationId })
  }
}

/**
 * 生成方案任务
 */
async taskGenerateSolution(project, task) {
  const { iterationId } = task.options
  const iteration = iterationStore.getIteration(iterationId)
  
  // 1. 获取当前代码
  const demoCode = project.demoCode
  
  // 2. 获取相关经验
  const experiences = experienceStore.getRelevantExperiences({
    tags: [`fix:${iteration.analysis.category}`],
    stage: 'iteration'
  })
  
  // 3. AI生成方案
  const solution = await generateSolution(
    iteration.feedback,
    iteration.analysis,
    demoCode,
    experiences
  )
  
  // 4. 保存方案
  iterationStore.saveSolution(iterationId, solution)
  
  // 5. 通知用户确认
  aiNotification.solutionReady(iterationId, solution)
}

/**
 * 应用迭代任务
 */
async taskApplyIteration(project, task) {
  const { iterationId } = task.options
  const iteration = iterationStore.getIteration(iterationId)
  
  // 1. 应用代码改动
  const newDemoCode = applyCodeChanges(project.demoCode, iteration.solution.codeChanges)
  
  // 2. 更新项目代码
  projectStore.updateProject(project.id, {
    demoCode: newDemoCode,
    version: iteration.version
  })
  
  // 3. 推送到GitHub
  if (githubService.isConfigured()) {
    await this.pushToGitHub(project, newDemoCode)
  }
  
  // 4. 记录经验
  experienceStore.recordIterationExperience(project.id, iteration)
  
  // 5. 完成迭代
  iterationStore.completeIteration(iterationId, {
    filesModified: iteration.solution.codeChanges.length,
    newVersion: iteration.version,
    deployedAt: new Date().toISOString()
  })
}
```

---

## 🎨 用户界面

### 1. 迭代管理页面 (`src/views/IterationManager.vue`)

**功能**：
- 📝 提交反馈表单
- 📊 迭代历史列表
- 🔍 分析结果展示
- 💡 优化方案查看
- ✅ 方案确认和应用
- 📈 版本对比

**布局**：
```
┌─────────────────────────────────────┐
│  提交新反馈                           │
│  [类型] [严重程度] [描述]             │
│  [提交] 按钮                          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  迭代历史                             │
│  ┌─────────────────────────────────┐│
│  │ v1.1 - 修复登录bug (已完成)      ││
│  │ 2026-02-06 10:30                ││
│  │ [查看详情] [查看代码]             ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ v1.0 - 初始版本                  ││
│  │ 2026-02-05 15:00                ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### 2. Demo页面增强

在`DemoViewer.vue`中添加：
- **"提交反馈"**按钮
- **迭代历史**标签页
- **版本切换**功能

---

## 📊 实施优先级

### Phase 3A：基础迭代系统 (核心)
1. ✅ 创建`iterationStore`
2. ✅ AI分析和方案生成函数
3. ✅ AI队列迭代任务
4. ✅ 基础迭代管理页面

### Phase 3B：高级功能
1. ✅ 版本对比功能
2. ✅ 代码差异可视化
3. ✅ 迭代历史图表
4. ✅ 批量反馈处理

### Phase 3C：智能增强
1. ✅ AI主动问题检测
2. ✅ 性能优化建议
3. ✅ 代码质量分析
4. ✅ 自动测试生成

---

## 🎯 Phase 3 成功标准

用户提交一个反馈后：
1. ✅ AI在2分钟内完成分析
2. ✅ AI在5分钟内生成优化方案
3. ✅ 用户确认后自动应用改动
4. ✅ 自动推送新版本到GitHub
5. ✅ 记录优化经验到知识库
6. ✅ 显示前后对比和改动说明

---

## 📝 开始实施

现在开始实施 **Phase 3A：基础迭代系统**

您准备好了吗？我将开始创建相关文件。
