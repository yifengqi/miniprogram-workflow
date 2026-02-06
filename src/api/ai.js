import { useSettingsStore } from '@/stores/settings'

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
 * PRD 生成 Prompt 模板
 */
export const PRD_PROMPTS = {
  // 客户版 PRD
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

  // 开发版 PRD
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

  // 协议文档生成
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
