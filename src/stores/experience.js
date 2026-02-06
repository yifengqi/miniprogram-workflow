import { defineStore } from 'pinia'
import { callAI } from '@/api/ai'
import { useProjectStore } from './project'

export const useExperienceStore = defineStore('experience', {
  state: () => ({
    experiences: [],      // 所有经验条目
    projectLogs: {},      // 每个项目的完整日志
    intelligentRules: [], // 智能提示规则
    tagsIndex: {},        // ⭐ 标签索引字典
    mustReadExperiences: [] // ⭐ 必读经验列表
  }),
  
  getters: {
    // 获取某个项目的日志
    getProjectLog: (state) => (projectId) => {
      return state.projectLogs[projectId]
    },
    
    // ⭐ 优化：使用标签索引快速查找相关经验
    getRelevantExperiences: (state) => (criteria) => {
      // 第一层：标签快速定位（O(1)）
      let candidates = []
      
      if (criteria.tags && criteria.tags.length > 0) {
        // 使用标签索引快速查找
        const taggedExps = new Set()
        criteria.tags.forEach(tag => {
          if (state.tagsIndex[tag]) {
            state.tagsIndex[tag].forEach(expId => taggedExps.add(expId))
          }
        })
        candidates = Array.from(taggedExps).map(id => 
          state.experiences.find(exp => exp.id === id)
        ).filter(Boolean)
      } else if (criteria.projectType) {
        // 按项目类型查找
        const typeTag = `type:${criteria.projectType}`
        if (state.tagsIndex[typeTag]) {
          candidates = state.tagsIndex[typeTag].map(id =>
            state.experiences.find(exp => exp.id === id)
          ).filter(Boolean)
        }
      } else {
        candidates = [...state.experiences]
      }
      
      // 第二层：重要性筛选
      // 优先返回必读经验
      const mustRead = candidates.filter(exp => exp.mustRead)
      const others = candidates.filter(exp => !exp.mustRead)
      
      // 第三层：相关度排序
      const sorted = [...mustRead, ...others].sort((a, b) => {
        // 优先级排序
        if (a.priority !== b.priority) {
          return (b.priority || 0) - (a.priority || 0)
        }
        // 使用频率排序
        if (a.useCount !== b.useCount) {
          return (b.useCount || 0) - (a.useCount || 0)
        }
        // 时间排序（新的优先）
        return new Date(b.timestamp) - new Date(a.timestamp)
      })
      
      return sorted
    },
    
    // 统计数据
    stats: (state) => {
      return {
        totalProjects: Object.keys(state.projectLogs).length,
        totalExperiences: state.experiences.length,
        activeRules: state.intelligentRules.filter(r => r.enabled).length
      }
    }
  },
  
  actions: {
    // 初始化加载
    loadFromStorage() {
      try {
        const experiences = localStorage.getItem('experiences')
        if (experiences) {
          this.experiences = JSON.parse(experiences)
        }
        
        const projectLogs = localStorage.getItem('project-logs')
        if (projectLogs) {
          this.projectLogs = JSON.parse(projectLogs)
        }
        
        const rules = localStorage.getItem('intelligent-rules')
        if (rules) {
          this.intelligentRules = JSON.parse(rules)
        }
        
        // ⭐ 加载标签索引
        const tagsIndex = localStorage.getItem('tags-index')
        if (tagsIndex) {
          this.tagsIndex = JSON.parse(tagsIndex)
        } else {
          // 首次加载，构建索引
          this.rebuildTagsIndex()
        }
        
        // ⭐ 加载必读经验列表
        const mustRead = localStorage.getItem('must-read-experiences')
        if (mustRead) {
          this.mustReadExperiences = JSON.parse(mustRead)
        }
        
        // ⭐ 如果没有规则，添加默认规则（演示用）
        if (this.intelligentRules.length === 0) {
          this.initializeDefaultRules()
        }
        
        console.log('📚 经验库已加载:', this.stats)
        console.log('🏷️ 标签索引:', Object.keys(this.tagsIndex).length, '个标签')
        console.log('⭐ 必读经验:', this.mustReadExperiences.length, '条')
      } catch (error) {
        console.error('加载经验库失败:', error)
      }
    },
    
    // ⭐ 初始化默认智能提示规则
    initializeDefaultRules() {
      const defaultRules = [
        {
          id: 'rule-default-1',
          source: '系统内置',
          projectName: '演示规则',
          trigger: '抢票',
          action: '检测到"抢票"关键词：建议明确说明是个人工具还是商业平台，并注意法律合规性',
          enabled: true,
          createdAt: new Date().toISOString(),
          hitCount: 0
        },
        {
          id: 'rule-default-2',
          source: '系统内置',
          projectName: '演示规则',
          trigger: '电商',
          action: '检测到电商类项目：建议考虑支付流程、库存管理、订单状态、售后服务等功能',
          enabled: true,
          createdAt: new Date().toISOString(),
          hitCount: 0
        },
        {
          id: 'rule-default-3',
          source: '系统内置',
          projectName: '演示规则',
          trigger: '社区',
          action: '检测到社区类项目：建议考虑内容审核、用户举报、敏感词过滤等功能，确保合规',
          enabled: true,
          createdAt: new Date().toISOString(),
          hitCount: 0
        },
        {
          id: 'rule-default-4',
          source: '系统内置',
          projectName: '演示规则',
          trigger: '预约',
          action: '检测到预约类项目：建议明确预约规则（是否可取消、取消时限）、通知方式（短信/站内信）',
          enabled: true,
          createdAt: new Date().toISOString(),
          hitCount: 0
        },
        // 🔴 高优先级安全规则 - 来自实战经验
        {
          id: 'rule-security-payment',
          source: '实战经验 #H001',
          projectName: '积分/支付安全',
          trigger: { keywords: ['积分', '支付', '付款', '充值', '优惠券', '折扣', '满减', '红包', '打赏', '虚拟货币', '会员', '钱包', '余额'] },
          action: '🔴【必读安全警告】检测到积分/支付相关功能！务必做到"三重审核"：①前端仅展示不计算 ②后端独立计算金额和积分（绝不信任前端传值）③后端完整日志记录（谁、何时、做了什么）。防止0元购买、积分刷取等安全漏洞。详见标准化流程/06_非功能性检查清单.md第十章。',
          enabled: true,
          createdAt: new Date().toISOString(),
          hitCount: 0,
          priority: 5,
          mustRead: true
        },
        {
          id: 'rule-security-concurrency',
          source: '实战经验 #H002',
          projectName: '高并发/安全防范',
          trigger: { keywords: ['秒杀', '抢购', '高并发', '并发', '限时', '限量', '库存', '竞拍', '拼团'] },
          action: '🔴【必读安全警告】检测到高并发场景！务必做到：①库存扣减使用数据库事务+乐观锁 ②接口频率限制（Rate Limiting）③防重放攻击（请求签名+时间戳）④队列削峰。设计系统时假设每个用户都是黑客！详见标准化流程/06_非功能性检查清单.md第十章。',
          enabled: true,
          createdAt: new Date().toISOString(),
          hitCount: 0,
          priority: 5,
          mustRead: true
        },
        {
          id: 'rule-security-api',
          source: '实战经验 #H002',
          projectName: 'API安全',
          trigger: { keywords: ['接口', 'API', '登录', '注册', '验证码', '短信'] },
          action: '⚠️【安全提醒】涉及接口安全：①所有敏感接口需要登录态鉴权 ②参数严格校验（类型、范围、长度）③防SQL注入（参数化查询）④防XSS（输出转义）⑤关键操作添加验证码。',
          enabled: true,
          createdAt: new Date().toISOString(),
          hitCount: 0,
          priority: 4,
          mustRead: false
        }
      ]
      
      this.intelligentRules = defaultRules
      this.saveToStorage()
      
      console.log('💡 已初始化默认智能提示规则（含安全规则）')
    },
    
    // 保存到存储
    saveToStorage() {
      try {
        localStorage.setItem('experiences', JSON.stringify(this.experiences))
        localStorage.setItem('project-logs', JSON.stringify(this.projectLogs))
        localStorage.setItem('intelligent-rules', JSON.stringify(this.intelligentRules))
        localStorage.setItem('tags-index', JSON.stringify(this.tagsIndex))  // ⭐ 保存索引
        localStorage.setItem('must-read-experiences', JSON.stringify(this.mustReadExperiences))  // ⭐ 保存必读列表
      } catch (error) {
        console.error('保存经验库失败:', error)
      }
    },
    
    // 🔴 记录项目阶段
    logProjectStage(projectId, stage, data) {
      if (!this.projectLogs[projectId]) {
        this.projectLogs[projectId] = {
          projectId,
          startedAt: new Date().toISOString(),
          timeline: [],
          issues: [],
          improvements: []
        }
      }
      
      const log = this.projectLogs[projectId]
      
      log.timeline.push({
        stage,
        timestamp: new Date().toISOString(),
        data: data || {},
        snapshot: this.captureSnapshot(projectId, stage)
      })
      
      log.updatedAt = new Date().toISOString()
      
      this.saveToStorage()
      
      console.log(`📝 记录项目阶段: ${projectId} - ${stage}`)
    },
    
    // 🔴 捕获项目状态快照
    captureSnapshot(projectId, stage) {
      const projectStore = useProjectStore()
      const project = projectStore.getProjectById(projectId)
      
      if (!project) return null
      
      return {
        stage,
        timestamp: new Date().toISOString(),
        requirement: project.requirement ? {
          hasData: true,
          fieldsCount: Object.keys(project.requirement).length
        } : null,
        prdClient: project.prdClient ? {
          hasData: true,
          length: project.prdClient.length
        } : null,
        prdDev: project.prdDev ? {
          hasData: true,
          length: project.prdDev.length
        } : null,
        status: project.status
      }
    },
    
    // 🔴 记录问题
    recordIssue(projectId, issue) {
      const log = this.projectLogs[projectId]
      if (!log) {
        console.error('项目日志不存在:', projectId)
        return null
      }
      
      const issueRecord = {
        id: `issue-${Date.now()}`,
        timestamp: new Date().toISOString(),
        stage: issue.stage || 'unknown',
        title: issue.title,
        description: issue.description,
        severity: issue.severity || 'medium',
        category: issue.category || 'other',
        snapshot: {
          before: this.captureSnapshot(projectId, 'before_fix')
        },
        solved: false
      }
      
      log.issues.push(issueRecord)
      this.saveToStorage()
      
      console.log(`⚠️ 记录问题: ${projectId} - ${issue.title}`)
      
      return issueRecord.id
    },
    
    // 🔴 记录问题解决
    recordIssueSolved(projectId, issueId, solution) {
      const log = this.projectLogs[projectId]
      if (!log) return
      
      const issue = log.issues.find(i => i.id === issueId)
      if (!issue) return
      
      // 记录解决后快照
      issue.snapshot.after = this.captureSnapshot(projectId, 'after_fix')
      issue.solution = solution
      issue.solved = true
      issue.solvedAt = new Date().toISOString()
      
      // 分析差异
      issue.diff = this.analyzeDiff(
        issue.snapshot.before,
        issue.snapshot.after
      )
      
      this.saveToStorage()
      
      console.log(`✅ 问题已解决: ${projectId} - ${issue.title}`)
    },
    
    // 🔴 分析前后差异
    analyzeDiff(before, after) {
      const diff = {
        changes: [],
        summary: ''
      }
      
      // 对比需求
      if (!before.requirement && after.requirement) {
        diff.changes.push({
          type: 'requirement',
          action: 'added',
          description: '添加了需求数据'
        })
      }
      
      // 对比PRD
      if (!before.prdClient && after.prdClient) {
        diff.changes.push({
          type: 'prdClient',
          action: 'generated',
          description: '生成了客户版PRD'
        })
      } else if (before.prdClient?.length !== after.prdClient?.length) {
        diff.changes.push({
          type: 'prdClient',
          action: 'modified',
          before: before.prdClient?.length || 0,
          after: after.prdClient?.length || 0,
          description: 'PRD内容发生变化'
        })
      }
      
      diff.summary = `共${diff.changes.length}处变更`
      
      return diff
    },
    
    // 🔴 项目完成时生成经验总结
    async generateProjectExperience(projectId) {
      const log = this.projectLogs[projectId]
      if (!log) {
        throw new Error('项目日志不存在')
      }
      
      const projectStore = useProjectStore()
      const project = projectStore.getProjectById(projectId)
      
      console.log('🤖 AI正在分析项目，生成经验总结...')
      
      // 准备数据
      const projectData = {
        project: {
          id: project.id,
          name: project.name,
          type: project.requirement?.appType || '未知',
          duration: this.calculateDuration(log)
        },
        timeline: log.timeline.map(t => ({
          stage: t.stage,
          timestamp: t.timestamp
        })),
        issues: log.issues.map(i => ({
          title: i.title,
          description: i.description,
          category: i.category,
          solution: i.solution,
          diff: i.diff
        })),
        stats: {
          totalStages: log.timeline.length,
          totalIssues: log.issues.length,
          solvedIssues: log.issues.filter(i => i.solved).length
        }
      }
      
      // 调用AI分析
      const prompt = `
你是一个项目管理专家，请分析以下项目的完整日志，提取经验教训。

项目数据：
${JSON.stringify(projectData, null, 2)}

请按以下JSON格式输出：
{
  "keyIssues": [
    {
      "title": "问题标题",
      "description": "问题描述",
      "category": "分类",
      "cause": "发生原因",
      "solution": "解决方案",
      "beforeAfter": {
        "before": "优化前的情况",
        "after": "优化后的情况",
        "diff": ["差异点1", "差异点2"]
      }
    }
  ],
  "lessons": [
    "经验教训1",
    "经验教训2"
  ],
  "improvements": [
    {
      "area": "改进领域",
      "description": "改进描述",
      "autoAction": {
        "trigger": "触发条件",
        "action": "自动动作"
      }
    }
  ],
  "recommendations": [
    "未来建议1",
    "未来建议2"
  ],
  "tags": [
    "标签1",
    "标签2"
  ],
  "priority": 3
}

注意：
- tags要包含：项目类型、问题类型、技术栈等关键词
- priority是重要性评分（1-5），5最重要
`
      
      try {
        const aiResponse = await callAI(prompt, {
          model: 'gpt-4',
          temperature: 0.3
        })
        
        const analysis = JSON.parse(aiResponse)
        
        // ⭐ 自动生成标签
        const autoTags = [
          `type:${project.requirement?.appType || '未知'}`,
          `stage:prd_generation`,
          ...log.issues.map(i => `issue:${i.category}`)
        ]
        
        const allTags = [...new Set([...autoTags, ...(analysis.tags || [])])]
        
        // 保存经验
        const experience = {
          id: `exp-${Date.now()}`,
          projectId,
          projectName: project.name,
          projectType: project.requirement?.appType,
          timestamp: new Date().toISOString(),
          analysis,
          rawLog: projectData,
          applied: false,
          applyToFutureProjects: true,
          
          // ⭐ 新增字段
          tags: allTags,                        // 标签列表
          priority: analysis.priority || 3,     // 优先级 1-5
          mustRead: analysis.priority >= 4,     // 是否必读
          useCount: 0,                          // 使用次数
          effectiveCount: 0                     // 有效次数（用户采纳）
        }
        
        this.experiences.push(experience)
        
        // ⭐ 更新标签索引
        this.updateTagsIndex(experience)
        
        // ⭐ 如果是必读，加入必读列表
        if (experience.mustRead) {
          this.mustReadExperiences.push(experience.id)
        }
        
        this.saveToStorage()
        
        console.log('✅ 经验总结生成完成')
        console.log('📊 标签:', allTags)
        console.log('⭐ 优先级:', experience.priority)
        console.log('📌 必读:', experience.mustRead)
        
        return experience
        
      } catch (error) {
        console.error('AI分析失败:', error)
        throw error
      }
    },
    
    // ⭐ 更新标签索引
    updateTagsIndex(experience) {
      if (!experience.tags) return
      
      experience.tags.forEach(tag => {
        if (!this.tagsIndex[tag]) {
          this.tagsIndex[tag] = []
        }
        if (!this.tagsIndex[tag].includes(experience.id)) {
          this.tagsIndex[tag].push(experience.id)
        }
      })
    },
    
    // ⭐ 重建标签索引（用于数据迁移）
    rebuildTagsIndex() {
      this.tagsIndex = {}
      this.experiences.forEach(exp => {
        this.updateTagsIndex(exp)
      })
      this.saveToStorage()
      console.log('🔄 标签索引已重建')
    },
    
    // 🔴 应用改进到系统
    applyImprovements(experience) {
      if (!experience.analysis?.improvements) return
      
      experience.analysis.improvements.forEach(improvement => {
        if (improvement.autoAction) {
          this.intelligentRules.push({
            id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            source: experience.id,
            projectName: experience.projectName,
            trigger: improvement.autoAction.trigger,
            action: improvement.autoAction.action,
            enabled: true,
            createdAt: new Date().toISOString(),
            hitCount: 0
          })
        }
      })
      
      experience.applied = true
      this.saveToStorage()
      
      console.log(`🎯 已应用${experience.analysis.improvements.length}个改进`)
    },
    
    // 🔴 检查智能提示
    checkIntelligentHints(context) {
      const hints = []
      
      this.intelligentRules.forEach(rule => {
        if (!rule.enabled) return
        
        // 检查触发条件
        if (this.matchTrigger(rule.trigger, context)) {
          hints.push({
            message: rule.action,
            source: rule.projectName,
            ruleId: rule.id
          })
          
          // 增加命中计数
          rule.hitCount = (rule.hitCount || 0) + 1
        }
      })
      
      if (hints.length > 0) {
        this.saveToStorage()
      }
      
      return hints
    },
    
    // 匹配触发条件
    matchTrigger(trigger, context) {
      // 简单的关键词匹配
      if (typeof trigger === 'string') {
        const text = JSON.stringify(context).toLowerCase()
        return text.includes(trigger.toLowerCase())
      }
      
      // 对象形式的触发条件
      if (trigger.keywords) {
        const text = JSON.stringify(context).toLowerCase()
        return trigger.keywords.some(keyword => 
          text.includes(keyword.toLowerCase())
        )
      }
      
      return false
    },
    
    // 计算项目时长
    calculateDuration(log) {
      if (!log.timeline || log.timeline.length === 0) return 0
      
      const start = new Date(log.startedAt)
      const end = new Date(log.timeline[log.timeline.length - 1].timestamp)
      
      return Math.round((end - start) / (1000 * 60 * 60)) // 小时
    },
    
    // ⭐ 记录迭代经验 (Phase 3)
    recordIterationExperience(projectId, iteration) {
      const projectStore = useProjectStore()
      const project = projectStore.getProjectById(projectId)
      
      if (!project) return
      
      // 创建经验记录
      const experience = {
        id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        projectId,
        projectName: project.name,
        category: 'iteration',
        
        // 问题信息
        issue: {
          type: iteration.feedback.type,
          severity: iteration.feedback.severity,
          description: iteration.feedback.description,
          category: iteration.analysis?.category
        },
        
        // 解决方案
        solution: {
          before: '用户反馈的问题',
          after: '应用优化方案后',
          diff: `${iteration.solution?.codeChanges?.length || 0}个文件改动`,
          approach: iteration.solution?.approach,
          codeChanges: iteration.solution?.codeChanges?.length || 0
        },
        
        // 分析结果
        analysis: {
          rootCause: iteration.analysis?.rootCause,
          affectedFiles: iteration.analysis?.affectedFiles || [],
          complexity: iteration.analysis?.estimatedComplexity,
          
          keyIssues: [{
            title: iteration.feedback.description,
            severity: iteration.feedback.severity,
            category: iteration.analysis?.category
          }],
          
          lessons: iteration.solution?.bestPractices || [],
          
          solutions: [{
            approach: iteration.solution?.approach,
            implementation: `改动${iteration.solution?.codeChanges?.length || 0}个文件`,
            result: iteration.result?.filesModified ? '成功' : '待应用'
          }],
          
          recommendations: iteration.solution?.risks?.map(r => `注意：${r}`) || []
        },
        
        // 标签（自动生成）
        tags: [
          `type:${project.requirement?.appType}`,
          `issue:${iteration.feedback.type}`,
          `fix:${iteration.analysis?.category}`,
          `stage:iteration`,
          `severity:${iteration.feedback.severity}`
        ],
        
        // 优先级
        priority: iteration.analysis?.priority || 3,
        mustRead: iteration.feedback.severity === 'critical' || iteration.feedback.severity === 'high',
        
        // 使用统计
        useCount: 0,
        effectiveCount: 0
      }
      
      // 添加经验
      this.experiences.push(experience)
      
      // 更新标签索引
      this.updateTagsIndex(experience)
      
      // 如果是必读经验，添加到列表
      if (experience.mustRead) {
        this.mustReadExperiences.push(experience.id)
      }
      
      this.saveToStorage()
      
      console.log(`📚 迭代经验已记录: ${experience.id}`)
      
      return experience
    },
    
    // 清空所有数据
    clearAll() {
      this.experiences = []
      this.projectLogs = {}
      this.intelligentRules = []
      this.saveToStorage()
    }
  }
})
