import { useSettingsStore } from '@/stores/settings'
import { useExperienceStore } from '@/stores/experience'

/**
 * 调用 AI API
 * @param {Array} messages - 消息数组 [{ role: 'user'|'assistant'|'system', content: string }]
 * @param {Object} options - 可选配置
 * @returns {Promise<string>} AI 回复内容
 */
export async function callAI(messages, options = {}) {
  const settingsStore = useSettingsStore()
  
  const apiUrl = options.apiUrl || settingsStore.apiUrl
  const apiKey = options.apiKey || settingsStore.apiKey
  const model = options.model || settingsStore.model
  
  if (!apiUrl || !apiKey) {
    throw new Error('请先在设置中配置 API')
  }
  
  // 判断是 Anthropic 还是 OpenAI 格式
  const isAnthropic = apiUrl.includes('anthropic')
  
  try {
    let response
    
    if (isAnthropic) {
      // Anthropic Claude API 格式
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: options.maxTokens || 4096,
          messages: messages.filter(m => m.role !== 'system'),
          system: messages.find(m => m.role === 'system')?.content
        })
      })
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message || 'API 调用失败')
      }
      
      return data.content?.[0]?.text || ''
      
    } else {
      // OpenAI 兼容格式 (OpenAI, DeepSeek, 中转站等)
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: options.maxTokens || 4096,
          temperature: options.temperature ?? 0.7,
          stream: false
        })
      })
      
      // 检查响应状态
      if (!response.ok) {
        const text = await response.text()
        // 检查是否是HTML错误页面
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          throw new Error(`API请求失败 (${response.status}): 服务器返回了错误页面，请检查API端点URL是否正确`)
        }
        throw new Error(`API请求失败 (${response.status}): ${text}`)
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        throw new Error(`API返回了非JSON格式数据，请检查API端点URL是否正确。返回内容: ${text.substring(0, 100)}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message || 'API 调用失败')
      }
      
      return data.choices?.[0]?.message?.content || ''
    }
    
  } catch (error) {
    console.error('AI 调用错误:', error)
    throw error
  }
}

/**
 * 流式调用 AI API
 * @param {Array} messages - 消息数组
 * @param {Function} onChunk - 收到数据块时的回调
 * @param {Object} options - 可选配置
 */
export async function callAIStream(messages, onChunk, options = {}) {
  const settingsStore = useSettingsStore()
  
  const apiUrl = options.apiUrl || settingsStore.apiUrl
  const apiKey = options.apiKey || settingsStore.apiKey
  const model = options.model || settingsStore.model
  
  if (!apiUrl || !apiKey) {
    throw new Error('请先在设置中配置 API')
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
      stream: true
    })
  })
  
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        
        try {
          const json = JSON.parse(data)
          const content = json.choices?.[0]?.delta?.content
          if (content) {
            onChunk(content)
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  }
}

/**
 * PRD 生成 Prompt 模板 — 三阶段版本
 * Phase 1 骨架：只生成 P0 核心功能
 * Phase 2 血肉：在骨架基础上补充 P0+P1 完整功能
 * Phase 3 衣服：在血肉基础上补充 P2 拓展功能
 */
export const PRD_PROMPTS = {
  // ============ Phase 1 骨架 ============
  phase1_client: `你是一个专业的产品经理。请生成一份【Phase 1 - 核心骨架版】客户PRD。

⚠️ 重要原则：
- 只包含 P0 核心功能（最小可行产品 MVP）
- 砍掉所有"锦上添花"的功能
- 目标：让产品能跑通核心链路即可
- 功能数量控制在 3-5 个以内

请按以下格式输出（Markdown格式）：

# [项目名称] - Phase 1 核心骨架 PRD（客户版）

## 阶段说明
> 🦴 骨架阶段：聚焦核心功能，快速验证可行性

## 一、项目概述
### 1.1 核心价值（一句话）
### 1.2 目标用户

## 二、核心功能清单（仅P0）
[每个功能附带：功能名 | 一句话说明 | 用户价值]

## 三、核心流程
[用户完成主要任务的最短路径]

## 四、验收标准
[用户可以完成哪些操作即算骨架完成]

---
需求信息：
`,

  phase1_dev: `你是一个资深的技术产品经理。请生成一份【Phase 1 - 核心骨架版】开发PRD。

⚠️ 重要原则：
- 只实现 P0 核心功能的技术方案
- 数据库只建核心表，字段精简
- 接口只做必须的，无分页/搜索/过滤
- 页面只做核心页面（3-5个）
- 技术栈：UniApp + Vue3 + 微信云开发

请按以下格式输出（Markdown格式）：

# [项目名称] - Phase 1 核心骨架 PRD（开发版）

## 阶段说明
> 🦴 骨架阶段：最小技术实现，快速出Demo

## 一、技术架构（精简版）
### 1.1 技术栈
### 1.2 核心项目结构（只列必须文件）

## 二、数据库设计（核心表）
[只建核心集合，字段精简]

## 三、云函数设计（核心接口）
[只实现必须的云函数]

## 四、页面设计（核心页面）
[只做3-5个必须的页面]

## 五、快速验证清单
[Demo出来后如何验证骨架是否OK]

---
需求信息：
`,

  // ============ Phase 2 血肉 ============
  phase2_client: `你是一个专业的产品经理。请生成一份【Phase 2 - 完整功能版】客户PRD。

⚠️ 重要原则：
- 在Phase 1骨架基础上，补充P1重要功能
- 完善用户体验和交互细节
- 增加必要的辅助功能（搜索、过滤、设置等）
- 不包含长期拓展功能

请按以下格式输出（Markdown格式）：

# [项目名称] - Phase 2 完整功能 PRD（客户版）

## 阶段说明
> 🫀 血肉阶段：在骨架基础上，补充完整功能和体验

## Phase 1 已完成功能（回顾）
[简要列出Phase 1已有的功能]

## Phase 2 新增功能（P1重要功能）
[每个功能附带：功能名 | 说明 | 为什么需要]

## 完整功能清单
[P0+P1 完整功能列表]

## 用户体验优化
[交互优化、视觉优化、流程优化]

## 验收标准
[Phase 2完成的验收标准]

---
Phase 1已有内容：
{phase1_prd}

需求信息：
`,

  phase2_dev: `你是一个资深的技术产品经理。请生成一份【Phase 2 - 完整功能版】开发PRD。

⚠️ 重要原则：
- 在Phase 1基础上增量开发
- 补充数据库索引、分页、搜索等
- 增加错误处理、加载状态、空状态
- 补充权限控制、数据校验

请按以下格式输出（Markdown格式）：

# [项目名称] - Phase 2 完整功能 PRD（开发版）

## 阶段说明
> 🫀 血肉阶段：增量开发完整功能

## Phase 1 已有（不重复开发）
[简列已有的技术实现]

## 新增数据库设计
[新集合 + 已有集合新增字段]

## 新增/修改云函数
[新增的云函数 + 已有函数的改动]

## 新增/修改页面
[新增页面 + 已有页面的功能增强]

## 体验优化技术方案
[加载优化、缓存策略、错误处理]

## 增量验证清单
[Phase 2 增量部分的测试清单]

---
Phase 1已有内容：
{phase1_prd}

需求信息：
`,

  // ============ Phase 3 衣服 ============
  phase3_client: `你是一个专业的产品经理。请生成一份【Phase 3 - 中长期拓展版】客户PRD。

⚠️ 重要原则：
- 在Phase 1+2基础上，规划P2拓展功能
- 考虑商业化、运营、数据分析等方向
- 支持未来扩展的功能预留
- 标注每个功能的建议实施时间

请按以下格式输出（Markdown格式）：

# [项目名称] - Phase 3 中长期拓展 PRD（客户版）

## 阶段说明
> 👔 衣服阶段：拓展功能，提升竞争力

## 已有功能回顾（Phase 1+2）
[简列已有功能]

## 拓展功能规划
### 短期（1-2周）
### 中期（1-2月）
### 长期（3-6月）

## 商业化/运营功能
[会员、支付、推广、数据分析等]

## 技术债务清理
[Phase 1-2遗留的优化项]

## 演进路线图

---
Phase 1+2已有内容：
{prev_prds}

需求信息：
`,

  phase3_dev: `你是一个资深的技术产品经理。请生成一份【Phase 3 - 中长期拓展版】开发PRD。

⚠️ 重要原则：
- 在Phase 1+2基础上增量设计
- 考虑可扩展性架构优化
- 提出性能优化方案
- 规划监控和运维方案

请按以下格式输出（Markdown格式）：

# [项目名称] - Phase 3 中长期拓展 PRD（开发版）

## 阶段说明
> 👔 衣服阶段：架构升级+拓展开发

## 架构优化
[微服务拆分/性能优化/缓存策略]

## 新增数据库设计
[新集合 + 架构升级相关改动]

## 新增云函数/接口
[拓展功能的接口设计]

## 新增页面
[管理后台、数据大盘等]

## 运维监控方案
[日志/告警/性能监控]

## 安全加固
[支付安全/数据安全/防攻击]

## 技术债务修复清单

---
Phase 1+2已有内容：
{prev_prds}

需求信息：
`,

  // ============ 旧版兼容（合并为全量PRD时使用）============
  client: `你是一个专业的产品经理，请根据以下需求信息生成一份客户版PRD文档。

要求：
1. 语言简洁易懂，避免技术术语
2. 重点描述功能"能做什么"，而不是"怎么做"
3. 包含清晰的功能列表和优先级
4. 可以包含简单的流程图描述

请按以下格式输出（Markdown格式）：

# [项目名称] - 产品需求文档（客户版）

## 一、项目概述
### 1.1 项目背景
### 1.2 目标用户

## 二、功能清单
### 2.1 核心功能（必须实现）
### 2.2 重要功能（建议实现）
### 2.3 可选功能（锦上添花）

## 三、功能详细说明
[对每个核心功能进行详细说明]

## 四、页面流程
[描述用户的主要操作流程]

## 五、其他说明

---
需求信息：
`,

  dev: `你是一个资深的技术产品经理，请根据以下需求信息生成一份开发版PRD文档。

要求：
1. 技术细节要精确，便于开发人员理解
2. 包含数据库设计、接口定义、页面结构
3. 遵循小程序开发最佳实践
4. 使用 UniApp + Vue3 + 微信云开发技术栈

请按以下格式输出（Markdown格式）：

# [项目名称] - 技术需求文档（开发版）

## 一、技术架构
### 1.1 技术栈
- 前端：UniApp + Vue3 (Composition API)
- 后端：微信云开发
- 数据库：云数据库（MongoDB）

### 1.2 项目结构

## 二、数据库设计
[为每个集合设计字段，包含字段名、类型、说明、索引]

## 三、云函数设计
[列出需要的云函数，包含功能说明、入参、返回值]

## 四、页面设计
[列出所有页面，包含路径、功能、组件]

## 五、接口定义
[定义前后端交互的接口格式]

## 六、注意事项
[安全、性能、兼容性等注意事项]

---
需求信息：
`,

  legal: `你是一个专业的法务文档撰写专家，请根据以下小程序项目信息，生成相应的法律协议文档。

要求：
1. 内容要符合中国法律法规
2. 语言要专业但易于理解
3. 覆盖所有必要的法律要点
4. 生成完整版和简介版两个版本

请分析项目功能，确定需要的协议类型，然后生成。

---
项目信息：
`
}

/**
 * 构建经验上下文（通用）
 */
function buildExperienceContext(experiences) {
  if (!experiences || experiences.length === 0) return ''
  
  const topExperiences = experiences.slice(0, 3)
  
  let ctx = '\n\n【历史经验参考】（已通过标签索引优化查询）\n'
  ctx += topExperiences.map((exp, index) => {
    const mustReadTag = exp.mustRead ? '【⭐必读】' : ''
    const priorityTag = `[优先级:${exp.priority}/5]`
    
    return `${index + 1}. ${mustReadTag}${priorityTag} 项目：${exp.projectName}
问题：${exp.analysis?.keyIssues?.[0]?.title || '无'}
教训：${exp.analysis?.lessons?.[0] || '无'}
建议：${exp.analysis?.recommendations?.[0] || '无'}
`
  }).join('\n---\n')
  
  ctx += '\n⚠️ 特别注意标记为【必读】的经验，这些是关键教训！\n'
  
  // 增加使用次数
  try {
    const experienceStore = useExperienceStore()
    topExperiences.forEach(exp => {
      const found = experienceStore.experiences.find(e => e.id === exp.id)
      if (found) found.useCount = (found.useCount || 0) + 1
    })
    experienceStore.saveToStorage()
  } catch (e) { /* ignore */ }
  
  return ctx
}

/**
 * 生成客户版PRD（支持三阶段）
 * @param {Object} requirement - 需求数据
 * @param {Object} options - 选项
 *   - phase: 1|2|3 阶段编号（默认null使用旧版全量PRD）
 *   - experiences: 相关经验
 *   - prevPRDs: 前阶段PRD内容（Phase 2/3需要）
 * @returns {Promise<string>} PRD内容
 */
export async function generateClientPRD(requirement, options = {}) {
  const experienceContext = buildExperienceContext(options.experiences)
  const phase = options.phase
  
  // 选择对应阶段的Prompt
  let promptKey = 'client'
  if (phase === 1) promptKey = 'phase1_client'
  else if (phase === 2) promptKey = 'phase2_client'
  else if (phase === 3) promptKey = 'phase3_client'
  
  let prompt = PRD_PROMPTS[promptKey]
  
  // Phase 2/3需要注入前阶段PRD
  if (phase === 2 && options.prevPRDs?.phase1) {
    prompt = prompt.replace('{phase1_prd}', options.prevPRDs.phase1)
  } else if (phase === 3 && options.prevPRDs) {
    const prev = `Phase 1:\n${options.prevPRDs.phase1 || ''}\n\nPhase 2:\n${options.prevPRDs.phase2 || ''}`
    prompt = prompt.replace('{prev_prds}', prev)
  }
  
  // ⭐ 智能构建需求内容：如果有原始MD文档直接用，否则用JSON
  let requirementContent
  if (requirement.rawMarkdown) {
    requirementContent = `\n\n【原始需求文档（Markdown）】\n${requirement.rawMarkdown}`
  } else {
    requirementContent = `\n\n【需求信息（结构化数据）】\n${JSON.stringify(requirement, null, 2)}`
  }
  
  const messages = [
    {
      role: 'system',
      content: phase
        ? `你是一个专业的产品经理，擅长分阶段交付产品。当前是Phase ${phase}（${['', '骨架', '血肉', '衣服'][phase]}阶段）。请仔细阅读需求文档全文再生成PRD。`
        : '你是一个专业的产品经理，擅长将客户需求转化为清晰的产品文档。请仔细阅读需求文档全文再生成PRD。'
    },
    {
      role: 'user',
      content: prompt + requirementContent + experienceContext
    }
  ]
  
  return await callAI(messages, {
    temperature: 0.7,
    maxTokens: phase === 1 ? 3000 : 4096
  })
}

/**
 * 生成开发版PRD（支持三阶段）
 * @param {Object} requirement - 需求数据
 * @param {string} clientPRD - 客户版PRD内容
 * @param {Object} options - 选项（phase, prevPRDs）
 * @returns {Promise<string>} PRD内容
 */
export async function generateDevPRD(requirement, clientPRD, options = {}) {
  const phase = options.phase
  
  let promptKey = 'dev'
  if (phase === 1) promptKey = 'phase1_dev'
  else if (phase === 2) promptKey = 'phase2_dev'
  else if (phase === 3) promptKey = 'phase3_dev'
  
  let prompt = PRD_PROMPTS[promptKey]
  
  if (phase === 2 && options.prevPRDs?.phase1) {
    prompt = prompt.replace('{phase1_prd}', options.prevPRDs.phase1)
  } else if (phase === 3 && options.prevPRDs) {
    const prev = `Phase 1:\n${options.prevPRDs.phase1 || ''}\n\nPhase 2:\n${options.prevPRDs.phase2 || ''}`
    prompt = prompt.replace('{prev_prds}', prev)
  }
  
  // ⭐ 智能构建需求内容
  let requirementContent
  if (requirement.rawMarkdown) {
    requirementContent = `\n\n【原始需求文档】\n${requirement.rawMarkdown}`
  } else {
    requirementContent = `\n\n【需求信息】\n${JSON.stringify(requirement, null, 2)}`
  }
  
  const messages = [
    {
      role: 'system',
      content: phase
        ? `你是一个资深的技术产品经理，擅长分阶段增量开发。当前是Phase ${phase}（${['', '骨架', '血肉', '衣服'][phase]}阶段）。请仔细阅读需求文档。`
        : '你是一个资深的技术产品经理，擅长将产品需求转化为详细的技术实现方案。'
    },
    {
      role: 'user',
      content: prompt + requirementContent + `\n\n客户版PRD：\n${clientPRD}`
    }
  ]
  
  return await callAI(messages, {
    temperature: 0.5,
    maxTokens: phase === 1 ? 4096 : 8192
  })
}

/**
 * ⭐ 增强的JSON解析器（多重容错）
 * AI返回的JSON经常不规范，这里做多重修复尝试
 */
function robustJsonParse(rawContent, logId) {
  // aiLogger is imported dynamically in the caller; here we just use console for fallback
  
  // 策略1：直接解析
  try {
    return JSON.parse(rawContent)
  } catch (e) { /* 继续尝试 */ }
  
  // 策略2：去掉 markdown 代码块标记
  let cleaned = rawContent
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  
  try {
    return JSON.parse(cleaned)
  } catch (e) { /* 继续尝试 */ }
  
  // 策略3：提取最外层 { ... }
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (e) { /* 继续尝试 */ }
    
    // 策略4：修复常见的JSON错误
    let fixed = jsonMatch[0]
      .replace(/,\s*}/g, '}')          // 尾逗号 ,}
      .replace(/,\s*]/g, ']')          // 尾逗号 ,]
      .replace(/'/g, '"')              // 单引号→双引号
      .replace(/\n/g, '\\n')           // 换行符
      .replace(/\t/g, '\\t')           // Tab
      .replace(/\\n"/g, '"')           // 修复字符串末尾
    
    try {
      return JSON.parse(fixed)
    } catch (e) { /* 继续尝试 */ }
  }
  
  // 策略5：尝试按行截取到最后一个 }
  const lastBrace = rawContent.lastIndexOf('}')
  const firstBrace = rawContent.indexOf('{')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const sliced = rawContent.slice(firstBrace, lastBrace + 1)
    try {
      return JSON.parse(sliced)
    } catch (e) { /* 全部失败 */ }
  }
  
  // 全部失败，记录日志并抛出详细错误
  const errorMsg = `AI返回的内容无法解析为JSON。内容长度: ${rawContent.length}字符。\n前200字: ${rawContent.slice(0, 200)}\n后200字: ${rawContent.slice(-200)}`
  console.error(errorMsg)
  
  // 日志由调用方处理
  
  throw new Error('AI生成的代码格式有误，请打开监控面板查看AI返回的原始内容。可以尝试重新生成。')
}

/**
 * ⭐ 分步生成Demo代码（可靠版）
 * 
 * 第1步：AI生成项目架构+文件清单（小JSON，不容易出错）
 * 第2步：逐个文件让AI生成代码（每次只生成1个文件内容）
 * 
 * @param {string} prdDev - 开发版PRD内容
 * @param {Object} requirement - 需求数据
 * @param {Function} onProgress - 进度回调 ({ step, total, current, message })
 * @returns {Promise<Object>} Demo代码结构
 */
export async function generateDemoCode(prdDev, requirement, onProgress) {
  const { aiLogger } = await import('@/utils/aiLogger')
  
  // 需求内容
  let reqContext = ''
  if (requirement?.rawMarkdown) {
    reqContext = requirement.rawMarkdown.slice(0, 3000)  // 截取避免太长
  } else {
    reqContext = JSON.stringify(requirement, null, 2)
  }
  
  // ========== 第1步：生成架构和文件清单 ==========
  const step1LogId = aiLogger.start('generate_demo_step1_plan', { prdLength: prdDev?.length })
  
  if (onProgress) onProgress({ step: 1, total: 2, current: '生成项目架构...', percentage: 5 })
  
  const planPrompt = `你是一个资深的微信小程序开发专家。请根据以下PRD，规划一个完整的小程序项目架构。

⚠️ 只输出纯JSON，不要加任何说明文字。

请输出以下JSON格式：
{
  "projectName": "项目名称",
  "structure": {
    "description": "项目结构说明（一句话）",
    "tree": "文件树（纯文本缩进格式）"
  },
  "files": [
    { "path": "app.js", "type": "javascript", "description": "全局逻辑" },
    { "path": "app.json", "type": "json", "description": "全局配置" },
    { "path": "app.wxss", "type": "wxss", "description": "全局样式" },
    { "path": "pages/index/index.js", "type": "javascript", "description": "首页逻辑" },
    { "path": "pages/index/index.wxml", "type": "wxml", "description": "首页模板" },
    { "path": "pages/index/index.wxss", "type": "wxss", "description": "首页样式" },
    { "path": "pages/index/index.json", "type": "json", "description": "首页配置" }
  ],
  "cloudFunctions": [
    { "name": "函数名", "path": "cloudfunctions/xxx/index.js", "description": "功能说明" }
  ],
  "setup": {
    "steps": ["1. 在微信开发者工具中导入项目", "2. 开通云开发", "3. 上传云函数"],
    "notes": ["注意事项"]
  }
}

要求：
1. files数组里只列出文件路径和说明，不要包含content（代码内容后面单独生成）
2. 文件数量控制在8-15个核心文件
3. 技术栈：微信小程序原生 + 云开发

---
开发版PRD：
${prdDev?.slice(0, 4000) || '(无PRD)'}

需求摘要：
${reqContext.slice(0, 1500)}
`

  let plan
  try {
    const planResponse = await callAI([
      { role: 'system', content: '你是微信小程序架构师。只输出纯JSON，不加任何额外文字。' },
      { role: 'user', content: planPrompt }
    ], { temperature: 0.3, maxTokens: 2048 })
    
    aiLogger.updateRawContent(step1LogId, planResponse)
    plan = robustJsonParse(planResponse)
    aiLogger.success(step1LogId, { filesCount: plan.files?.length })
    
  } catch (error) {
    aiLogger.error(step1LogId, error)
    throw new Error('第1步失败：无法生成项目架构。' + error.message)
  }
  
  if (!plan.files || plan.files.length === 0) {
    throw new Error('AI返回的项目架构中没有文件列表')
  }
  
  if (onProgress) onProgress({ step: 1, total: 2, current: `架构完成，共 ${plan.files.length} 个文件`, percentage: 15 })
  
  // ========== 第2步：逐个文件生成代码 ==========
  const totalFiles = plan.files.length + (plan.cloudFunctions?.length || 0)
  let completedFiles = 0
  
  // 批量生成：每次发2-3个相关文件一起生成（减少调用次数）
  const fileBatches = createBatches(plan.files, 3)
  
  for (const batch of fileBatches) {
    const batchLogId = aiLogger.start('generate_demo_step2_files', { 
      files: batch.map(f => f.path) 
    })
    
    const fileNames = batch.map(f => `${f.path} (${f.description})`).join('\n')
    
    if (onProgress) {
      const pct = 15 + Math.round((completedFiles / totalFiles) * 80)
      onProgress({ 
        step: 2, total: totalFiles, current: `生成文件: ${batch[0].path}...`, 
        percentage: pct 
      })
    }
    
    const filePrompt = `请为以下微信小程序文件生成完整代码。

项目名：${plan.projectName}
项目说明：${plan.structure?.description || ''}

需要生成的文件：
${fileNames}

PRD参考（摘要）：
${prdDev?.slice(0, 2000) || '(无)'}

⚠️ 只输出纯JSON数组格式，不加任何说明文字：
[
  {
    "path": "文件路径",
    "type": "文件类型",
    "content": "完整的文件代码内容",
    "description": "文件说明"
  }
]

要求：
1. 每个文件的content必须是完整可运行的代码
2. 代码要有中文注释
3. 业务逻辑要符合PRD描述
`

    try {
      const fileResponse = await callAI([
        { role: 'system', content: '你是微信小程序开发专家。只输出纯JSON数组，不加任何额外文字。代码内容中的双引号用转义处理。' },
        { role: 'user', content: filePrompt }
      ], { temperature: 0.3, maxTokens: 8192 })
      
      aiLogger.updateRawContent(batchLogId, fileResponse)
      
      // 解析文件数组
      let filesArray
      try {
        filesArray = robustJsonParse(fileResponse)
        // 如果解析出来是对象而非数组，尝试取files字段
        if (!Array.isArray(filesArray)) {
          filesArray = filesArray.files || filesArray.data || [filesArray]
        }
      } catch (parseError) {
        // 解析失败，用占位内容
        console.warn('文件批次解析失败，使用占位内容:', parseError.message)
        filesArray = batch.map(f => ({
          path: f.path,
          type: f.type,
          content: `// ${f.description}\n// AI生成失败，请手动补充代码\n`,
          description: f.description + ' (生成失败)'
        }))
      }
      
      // 把生成的代码内容合并回plan
      filesArray.forEach(generatedFile => {
        const planFile = plan.files.find(f => f.path === generatedFile.path)
        if (planFile) {
          planFile.content = generatedFile.content || ''
          planFile.description = generatedFile.description || planFile.description
        } else {
          // AI可能改了路径，直接追加
          plan.files.push(generatedFile)
        }
      })
      
      completedFiles += batch.length
      aiLogger.success(batchLogId, { generated: filesArray.length })
      
    } catch (error) {
      aiLogger.error(batchLogId, error)
      // 单批失败不中断整体，用占位内容
      batch.forEach(f => {
        const planFile = plan.files.find(pf => pf.path === f.path)
        if (planFile) {
          planFile.content = `// ${f.description}\n// 生成失败: ${error.message}\n`
        }
      })
      completedFiles += batch.length
    }
  }
  
  // 生成云函数代码（如果有的话）
  if (plan.cloudFunctions && plan.cloudFunctions.length > 0) {
    const cfLogId = aiLogger.start('generate_demo_step2_cloud', { 
      functions: plan.cloudFunctions.map(f => f.name) 
    })
    
    if (onProgress) onProgress({ step: 2, total: totalFiles, current: '生成云函数...', percentage: 90 })
    
    const cfPrompt = `请为以下微信云函数生成完整代码。

云函数列表：
${plan.cloudFunctions.map(f => `${f.name} - ${f.description}`).join('\n')}

⚠️ 只输出纯JSON数组：
[{ "name": "函数名", "path": "路径", "content": "完整代码", "description": "说明" }]
`
    try {
      const cfResponse = await callAI([
        { role: 'system', content: '你是云函数开发专家。只输出纯JSON数组。' },
        { role: 'user', content: cfPrompt }
      ], { temperature: 0.3, maxTokens: 4096 })
      
      aiLogger.updateRawContent(cfLogId, cfResponse)
      let cfArray = robustJsonParse(cfResponse)
      if (!Array.isArray(cfArray)) cfArray = cfArray.cloudFunctions || [cfArray]
      
      plan.cloudFunctions = cfArray
      aiLogger.success(cfLogId, { generated: cfArray.length })
    } catch (error) {
      aiLogger.error(cfLogId, error)
      // 云函数失败不中断
      plan.cloudFunctions.forEach(f => {
        f.content = `// ${f.description}\n// 生成失败: ${error.message}\n`
      })
    }
  }
  
  // ========== 第3步：生成部署指南 + 测试指南 ==========
  if (onProgress) onProgress({ step: 2, total: totalFiles, current: '生成部署和测试指南...', percentage: 95 })
  
  const guideLogId = aiLogger.start('generate_demo_step3_guides', { projectName: plan.projectName })
  
  try {
    const hasCloud = plan.cloudFunctions && plan.cloudFunctions.length > 0
    const pageList = plan.files.filter(f => f.path.includes('pages/')).map(f => f.path).join(', ')
    
    const guidePrompt = `请为以下微信小程序项目生成「快速部署指南」和「测试指南」。

项目名：${plan.projectName}
文件数：${plan.files.length} 个
${hasCloud ? `云函数：${plan.cloudFunctions.map(f => f.name).join(', ')}` : '无云函数'}
页面列表：${pageList || '(无)'}

PRD摘要：
${prdDev?.slice(0, 1500) || '(无)'}

⚠️ 只输出纯JSON，不加任何说明文字：
{
  "deployGuide": {
    "title": "快速部署指南",
    "prerequisites": ["前置条件1", "前置条件2"],
    "steps": [
      { "title": "步骤标题", "detail": "详细操作说明", "tip": "小贴士(可选)" }
    ],
    "envConfig": [
      { "name": "配置项名称", "value": "示例值", "description": "说明" }
    ],
    "commonIssues": [
      { "problem": "常见问题描述", "solution": "解决方案" }
    ]
  },
  "testGuide": {
    "title": "测试指南",
    "testEnv": "推荐的测试环境说明",
    "quickTests": [
      { "name": "快速冒烟测试项", "steps": "操作步骤", "expected": "预期结果" }
    ],
    "testFlow": "建议的测试顺序和流程说明（一段文字）",
    "deviceTests": "真机测试注意事项",
    "performanceTips": "性能关注点"
  }
}

要求：
1. 部署步骤要非常具体，针对微信开发者工具的实际操作
2. ${hasCloud ? '包含云开发环境配置和云函数部署步骤' : '无需云开发相关步骤'}
3. 测试指南中的快速冒烟测试要覆盖核心页面和主流程
4. 常见问题要写开发者实际会遇到的（如AppID、域名白名单等）`

    const guideResponse = await callAI([
      { role: 'system', content: '你是微信小程序部署和测试专家。只输出纯JSON。' },
      { role: 'user', content: guidePrompt }
    ], { temperature: 0.3, maxTokens: 3072 })
    
    aiLogger.updateRawContent(guideLogId, guideResponse)
    const guides = robustJsonParse(guideResponse)
    
    // 合并到plan
    plan.deployGuide = guides.deployGuide || null
    plan.testGuide = guides.testGuide || null
    
    // 同时更新setup（向后兼容）
    if (guides.deployGuide?.steps) {
      plan.setup = {
        steps: guides.deployGuide.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.detail}`),
        notes: guides.deployGuide.commonIssues?.map(i => `${i.problem} → ${i.solution}`) || []
      }
    }
    
    aiLogger.success(guideLogId, { hasDeployGuide: !!plan.deployGuide, hasTestGuide: !!plan.testGuide })
    
  } catch (error) {
    aiLogger.error(guideLogId, error)
    // 指南生成失败不影响整体
    console.warn('部署/测试指南生成失败:', error.message)
  }
  
  if (onProgress) onProgress({ step: 2, total: totalFiles, current: '全部完成!', percentage: 100 })
  
  return plan
}

/**
 * 将数组分成固定大小的批次
 */
function createBatches(arr, batchSize) {
  const batches = []
  for (let i = 0; i < arr.length; i += batchSize) {
    batches.push(arr.slice(i, i + batchSize))
  }
  return batches
}
}

/**
 * 生成GitHub仓库配置
 * @param {Object} demoCode - Demo代码结构
 * @param {Object} project - 项目信息
 * @returns {Object} GitHub配置
 */
export function generateGitHubConfig(demoCode, project) {
  return {
    repoName: `${project.name}-miniprogram`.replace(/\s+/g, '-').toLowerCase(),
    description: project.requirement?.background || '微信小程序项目',
    private: true,  // 默认私有仓库
    defaultBranch: 'main',
    files: demoCode.files,
    readme: generateReadme(demoCode, project)
  }
}

/**
 * 生成README.md
 */
function generateReadme(demoCode, project) {
  return `# ${project.name}

${project.requirement?.background || ''}

## 项目信息

- 类型：${project.requirement?.appType?.join('、') || '未知'}
- 预算：${project.quickInfo?.budget || '待定'}
- 期望时间：${project.quickInfo?.expectedTime || '待定'}

## 项目结构

\`\`\`
${demoCode.structure?.tree || ''}
\`\`\`

## 快速开始

${demoCode.setup?.steps?.map((step, i) => `${i + 1}. ${step}`).join('\n') || ''}

## 注意事项

${demoCode.setup?.notes?.map(note => `- ${note}`).join('\n') || ''}

## 技术栈

- 微信小程序原生框架
- 微信云开发
- JavaScript ES6+

---

生成时间：${new Date().toLocaleString('zh-CN')}
`
}

/**
 * 分析用户反馈
 * @param {Object} feedback - 用户反馈
 * @param {Object} project - 项目信息
 * @param {Array} experiences - 相关历史经验
 * @returns {Promise<Object>} 分析结果
 */
export async function analyzeFeedback(feedback, project, experiences = []) {
  let experienceContext = ''
  if (experiences.length > 0) {
    experienceContext = '\n\n【相关历史经验】\n'
    experienceContext += experiences.slice(0, 3).map((exp, index) => {
      return `${index + 1}. 项目：${exp.projectName}\n问题：${exp.analysis?.keyIssues?.[0]?.title || '无'}\n解决：${exp.analysis?.solutions?.[0]?.approach || '无'}\n`
    }).join('\n')
  }
  
  const prompt = `你是一个资深的软件问题分析专家，请分析以下用户反馈并给出详细的诊断结果。

**项目信息**：
- 项目名称：${project.name}
- 项目类型：${project.requirement?.appType?.join('、') || '未知'}

**用户反馈**：
- 问题类型：${feedback.type}
- 严重程度：${feedback.severity}
- 问题描述：${feedback.description}
${feedback.expectedBehavior ? `- 期望行为：${feedback.expectedBehavior}` : ''}
${feedback.actualBehavior ? `- 实际行为：${feedback.actualBehavior}` : ''}
${experienceContext}

请按以下JSON格式输出分析结果：
{
  "category": "logic | ui | performance | data | api | config",
  "rootCause": "根本原因的详细分析",
  "affectedFiles": ["可能受影响的文件路径1", "文件路径2"],
  "estimatedComplexity": "simple | medium | complex",
  "priority": 1-5,
  "tags": ["标签1", "标签2"],
  "relatedExperiences": ["相关经验的关键点"]
}

**分析要点**：
1. 准确分类问题类别
2. 深入分析根本原因，不仅仅是表面现象
3. 列出所有可能受影响的文件
4. 评估修复复杂度
5. 参考历史经验，避免重复问题
`

  const messages = [
    {
      role: 'system',
      content: '你是一个资深的软件问题分析专家，擅长快速定位问题根源并给出专业建议。'
    },
    {
      role: 'user',
      content: prompt
    }
  ]
  
  const response = await callAI(messages, {
    temperature: 0.3,  // 分析要求准确
    maxTokens: 2048
  })
  
  // 解析JSON
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    } else {
      throw new Error('AI返回的分析结果不是有效的JSON格式')
    }
  } catch (error) {
    console.error('解析分析结果失败:', error)
    throw new Error('分析结果格式有误，请重试')
  }
}

/**
 * 生成优化方案
 * @param {Object} feedback - 用户反馈
 * @param {Object} analysis - 分析结果
 * @param {Object} demoCode - 当前代码
 * @param {Array} experiences - 相关经验
 * @returns {Promise<Object>} 优化方案
 */
export async function generateSolution(feedback, analysis, demoCode, experiences = []) {
  let experienceContext = ''
  if (experiences.length > 0) {
    experienceContext = '\n\n【参考历史经验】\n'
    experienceContext += experiences.slice(0, 3).map((exp, index) => {
      return `${index + 1}. ${exp.projectName}\n解决方案：${exp.analysis?.solutions?.[0]?.approach || '无'}\n代码改动：${exp.analysis?.solutions?.[0]?.implementation || '无'}\n`
    }).join('\n')
  }
  
  // 获取相关文件内容
  let affectedFilesContent = ''
  if (analysis.affectedFiles && analysis.affectedFiles.length > 0) {
    affectedFilesContent = '\n\n【当前代码】\n'
    analysis.affectedFiles.forEach(filePath => {
      const file = demoCode.files?.find(f => f.path === filePath)
      if (file) {
        affectedFilesContent += `\n文件：${filePath}\n\`\`\`${file.type}\n${file.content}\n\`\`\`\n`
      }
    })
  }
  
  const prompt = `你是一个资深的软件开发专家，请根据问题分析生成详细的优化方案。

**问题分析**：
- 问题类别：${analysis.category}
- 根本原因：${analysis.rootCause}
- 影响文件：${analysis.affectedFiles?.join(', ')}
- 复杂度：${analysis.estimatedComplexity}

**用户反馈**：
${feedback.description}
${affectedFilesContent}
${experienceContext}

请按以下JSON格式输出优化方案：
{
  "approach": "整体解决思路和方案描述",
  "codeChanges": [
    {
      "file": "文件路径",
      "type": "modify | add | delete",
      "before": "修改前的代码（如果是modify）",
      "after": "修改后的完整代码",
      "explanation": "为什么这样改，改了什么",
      "lineNumbers": "影响的行号范围（如 50-65）"
    }
  ],
  "testPlan": "如何测试这个改动，验证修复是否成功",
  "risks": ["潜在风险1", "潜在风险2"],
  "estimatedTime": "预计改动耗时（分钟）",
  "bestPractices": ["最佳实践建议1", "建议2"]
}

**要求**：
1. 代码改动要完整、可直接应用
2. 必须包含详细的改动说明
3. 考虑边界情况和错误处理
4. 参考历史经验，采用成熟方案
5. 提供具体的测试计划
`

  const messages = [
    {
      role: 'system',
      content: '你是一个资深的软件开发专家，擅长设计优雅的解决方案并编写高质量代码。'
    },
    {
      role: 'user',
      content: prompt
    }
  ]
  
  const response = await callAI(messages, {
    temperature: 0.4,
    maxTokens: 8192
  })
  
  // 解析JSON
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    } else {
      throw new Error('AI返回的方案不是有效的JSON格式')
    }
  } catch (error) {
    console.error('解析优化方案失败:', error)
    throw new Error('优化方案格式有误，请重试')
  }
}

/**
 * 生成迭代说明文档
 * @param {Object} iteration - 迭代记录
 * @returns {Promise<string>} 迭代说明文档
 */
export async function generateIterationDoc(iteration) {
  const prompt = `请根据以下迭代信息生成一份清晰的版本更新说明文档（Markdown格式）。

**版本信息**：
- 版本号：${iteration.version}
- 更新时间：${new Date(iteration.completedAt || iteration.createdAt).toLocaleString('zh-CN')}

**问题反馈**：
- 类型：${iteration.feedback.type}
- 严重程度：${iteration.feedback.severity}
- 描述：${iteration.feedback.description}

**问题分析**：
${iteration.analysis ? `- 类别：${iteration.analysis.category}
- 原因：${iteration.analysis.rootCause}` : '无'}

**解决方案**：
${iteration.solution ? `- 方案：${iteration.solution.approach}
- 改动文件：${iteration.solution.codeChanges?.length || 0} 个` : '无'}

**改动结果**：
${iteration.result ? `- 修改文件：${iteration.result.filesModified} 个
- 代码行数：${iteration.result.linesChanged || 0} 行` : '无'}

请生成一份专业的版本更新说明，包含：
1. 版本号和更新时间
2. 主要改动内容
3. 修复的问题
4. 新增的功能（如果有）
5. 注意事项（如果有）

格式要求：清晰、简洁、用户友好。
`

  const messages = [
    {
      role: 'system',
      content: '你是一个技术文档专家，擅长编写清晰易懂的版本更新说明。'
    },
    {
      role: 'user',
      content: prompt
    }
  ]
  
  return await callAI(messages, {
    temperature: 0.5,
    maxTokens: 2048
  })
}
