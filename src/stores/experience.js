import { defineStore } from 'pinia'
import { callAI } from '@/api/ai'

export const useExperienceStore = defineStore('experience', {
  state: () => ({
    experiences: [],      // 所有经验条目
    projectLogs: {},      // 每个项目的完整日志
    intelligentRules: []  // 智能提示规则
  }),
  
  getters: {
    // 获取某个项目的日志
    getProjectLog: (state) => (projectId) => {
      return state.projectLogs[projectId]
    },
    
    // 获取相关经验
    getRelevantExperiences: (state) => (criteria) => {
      return state.experiences.filter(exp => {
        if (criteria.projectType && exp.project?.type !== criteria.projectType) {
          return false
        }
        if (criteria.stage && exp.stage !== criteria.stage) {
          return false
        }
        if (criteria.tags && !criteria.tags.some(tag => exp.tags?.includes(tag))) {
          return false
        }
        return true
      })
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
        
        console.log('📚 经验库已加载:', this.stats)
      } catch (error) {
        console.error('加载经验库失败:', error)
      }
    },
    
    // 保存到存储
    saveToStorage() {
      try {
        localStorage.setItem('experiences', JSON.stringify(this.experiences))
        localStorage.setItem('project-logs', JSON.stringify(this.projectLogs))
        localStorage.setItem('intelligent-rules', JSON.stringify(this.intelligentRules))
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
  ]
}
`
      
      try {
        const aiResponse = await callAI(prompt, {
          model: 'gpt-4',
          temperature: 0.3
        })
        
        const analysis = JSON.parse(aiResponse)
        
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
          applyToFutureProjects: true
        }
        
        this.experiences.push(experience)
        this.saveToStorage()
        
        console.log('✅ 经验总结生成完成')
        
        return experience
        
      } catch (error) {
        console.error('AI分析失败:', error)
        throw error
      }
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
    
    // 清空所有数据
    clearAll() {
      this.experiences = []
      this.projectLogs = {}
      this.intelligentRules = []
      this.saveToStorage()
    }
  }
})

// 需要导入 projectStore
import { useProjectStore } from './project'
