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

/**
 * 生成客户版PRD
 * @param {Object} requirement - 需求数据
 * @param {Object} options - 选项（experiences: 相关经验）
 * @returns {Promise<string>} PRD内容
 */
export async function generateClientPRD(requirement, options = {}) {
  // 🔴 构建经验上下文（优化版）
  let experienceContext = ''
  if (options.experiences && options.experiences.length > 0) {
    // ⭐ 只使用前3条最相关的经验（三层筛选后的结果）
    const topExperiences = options.experiences.slice(0, 3)
    
    experienceContext = '\n\n【历史经验参考】（已通过标签索引优化查询）\n'
    experienceContext += topExperiences.map((exp, index) => {
      // ⭐ 标记必读经验
      const mustReadTag = exp.mustRead ? '【⭐必读】' : ''
      const priorityTag = `[优先级:${exp.priority}/5]`
      
      return `${index + 1}. ${mustReadTag}${priorityTag} 项目：${exp.projectName}
问题：${exp.analysis?.keyIssues?.[0]?.title || '无'}
教训：${exp.analysis?.lessons?.[0] || '无'}
建议：${exp.analysis?.recommendations?.[0] || '无'}
使用次数：${exp.useCount || 0}次
`
    }).join('\n---\n')
    
    experienceContext += '\n⚠️ 特别注意标记为【必读】的经验，这些是关键教训！\n'
    experienceContext += '💡 请参考以上经验，避免类似问题。\n'
    
    // ⭐ 增加使用次数
    if (options.updateUseCount !== false) {
      const experienceStore = useExperienceStore()
      topExperiences.forEach(exp => {
        const found = experienceStore.experiences.find(e => e.id === exp.id)
        if (found) {
          found.useCount = (found.useCount || 0) + 1
        }
      })
      experienceStore.saveToStorage()
    }
  }
  
  const messages = [
    {
      role: 'system',
      content: '你是一个专业的产品经理，擅长将客户需求转化为清晰的产品文档。'
    },
    {
      role: 'user',
      content: PRD_PROMPTS.client + JSON.stringify(requirement, null, 2) + experienceContext
    }
  ]
  
  return await callAI(messages, {
    temperature: 0.7,
    maxTokens: 4096
  })
}

/**
 * 生成开发版PRD
 * @param {Object} requirement - 需求数据
 * @param {string} clientPRD - 客户版PRD内容
 * @param {Object} options - 选项
 * @returns {Promise<string>} PRD内容
 */
export async function generateDevPRD(requirement, clientPRD, options = {}) {
  const messages = [
    {
      role: 'system',
      content: '你是一个资深的技术产品经理，擅长将产品需求转化为详细的技术实现方案。'
    },
    {
      role: 'user',
      content: PRD_PROMPTS.dev + `\n\n原始需求：\n${JSON.stringify(requirement, null, 2)}\n\n客户版PRD：\n${clientPRD}`
    }
  ]
  
  return await callAI(messages, {
    temperature: 0.5,  // 技术文档要求更严谨
    maxTokens: 8192
  })
}

/**
 * 生成Demo代码
 * @param {Object} prdDev - 开发版PRD内容
 * @param {Object} requirement - 需求数据
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Object>} Demo代码结构
 */
export async function generateDemoCode(prdDev, requirement, onProgress) {
  const prompt = `你是一个资深的小程序开发专家，请根据以下PRD开发版内容，生成一个完整的小程序Demo代码。

技术栈要求：
- 框架：微信小程序原生
- 语言：JavaScript ES6+
- 样式：WXSS
- 数据：微信云开发

代码要求：
1. 完整的项目结构
2. 所有必需的页面文件（.js, .wxml, .wxss, .json）
3. 核心业务逻辑实现
4. 完整的云函数代码
5. 项目配置文件（app.json, project.config.json等）
6. README.md 使用说明

请按以下JSON格式输出：
{
  "projectName": "项目名称",
  "structure": {
    "description": "项目结构说明",
    "tree": "文件树（文本格式）"
  },
  "files": [
    {
      "path": "app.js",
      "type": "javascript",
      "content": "文件内容",
      "description": "文件说明"
    },
    {
      "path": "app.json",
      "type": "json",
      "content": "配置内容",
      "description": "全局配置"
    },
    {
      "path": "pages/index/index.js",
      "type": "javascript",
      "content": "页面逻辑",
      "description": "首页逻辑"
    }
    // ... 更多文件
  ],
  "cloudFunctions": [
    {
      "name": "函数名",
      "path": "cloudfunctions/xxx/index.js",
      "content": "云函数代码",
      "description": "功能说明"
    }
  ],
  "setup": {
    "steps": [
      "1. 在微信开发者工具中导入项目",
      "2. 配置云开发环境",
      "3. ..."
    ],
    "notes": [
      "注意事项1",
      "注意事项2"
    ]
  }
}

---
开发版PRD：
${prdDev}

原始需求：
${JSON.stringify(requirement, null, 2)}
`

  const messages = [
    {
      role: 'system',
      content: '你是一个资深的微信小程序开发专家，精通完整项目架构和代码实现。'
    },
    {
      role: 'user',
      content: prompt
    }
  ]
  
  // 使用流式API获取进度
  if (onProgress) {
    let fullContent = ''
    await callAIStream(messages, (chunk) => {
      fullContent += chunk
      onProgress(fullContent)
    }, {
      temperature: 0.3,  // Demo代码要求精确
      maxTokens: 16384   // 需要更多token
    })
    
    // 解析JSON
    try {
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      } else {
        throw new Error('AI返回的内容不是有效的JSON格式')
      }
    } catch (error) {
      console.error('解析Demo代码失败:', error)
      throw new Error('AI生成的代码格式有误，请重试')
    }
  } else {
    // 非流式调用
    const response = await callAI(messages, {
      temperature: 0.3,
      maxTokens: 16384
    })
    
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    } else {
      throw new Error('AI返回的内容不是有效的JSON格式')
    }
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
