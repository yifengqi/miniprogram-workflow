import { ElMessage, ElNotification } from 'element-plus'
import { callAI, generateClientPRD, generateDevPRD } from '@/api/ai'
import { useProjectStore } from '@/stores/project'
import { useRequirementPoolStore } from '@/stores/requirementPool'
import { useExperienceStore } from '@/stores/experience'
import { aiNotification } from './aiNotification'  // ⭐ 新增

/**
 * AI任务队列
 * 自动化执行AI任务，实现流水线式处理
 */
class AITaskQueue {
  constructor() {
    this.queue = []
    this.running = false
    this.currentTask = null
  }
  
  /**
   * 添加任务到队列
   * @param {string} projectId - 项目ID
   * @param {string} taskType - 任务类型
   * @param {string} priority - 优先级 (high/normal/low)
   * @param {object} options - 额外选项
   */
  addTask(projectId, taskType, priority = 'normal', options = {}) {
    const task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      taskType,
      priority,
      options,
      status: 'pending',
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3
    }
    
    // 按优先级插入
    if (priority === 'high') {
      this.queue.unshift(task)
    } else {
      this.queue.push(task)
    }
    
    console.log(`📋 任务已加入队列: ${taskType} (${projectId})`)
    
    // 启动处理
    this.process()
    
    return task.id
  }
  
  /**
   * 处理队列
   */
  async process() {
    if (this.running || this.queue.length === 0) return
    
    this.running = true
    
    while (this.queue.length > 0) {
      const task = this.queue.shift()
      this.currentTask = task
      
      try {
        task.status = 'running'
        task.startedAt = new Date().toISOString()
        
        console.log(`🤖 开始执行任务: ${task.taskType}`)
        
        await this.executeTask(task)
        
        task.status = 'completed'
        task.completedAt = new Date().toISOString()
        
        console.log(`✅ 任务完成: ${task.taskType}`)
        
      } catch (error) {
        console.error(`❌ 任务失败: ${task.taskType}`, error)
        
        task.attempts++
        task.error = error.message
        
        // 重试逻辑
        if (task.attempts < task.maxAttempts) {
          console.log(`🔄 重试任务 (${task.attempts}/${task.maxAttempts})`)
          this.queue.unshift(task)  // 重新加入队列
        } else {
          task.status = 'failed'
          
          ElNotification({
            title: '任务失败',
            message: `${task.taskType} 执行失败: ${error.message}`,
            type: 'error',
            duration: 5000
          })
        }
      }
    }
    
    this.running = false
    this.currentTask = null
  }
  
  /**
   * 执行具体任务
   */
  async executeTask(task) {
    const projectStore = useProjectStore()
    const experienceStore = useExperienceStore()
    const project = projectStore.getProjectById(task.projectId)
    
    if (!project) {
      throw new Error('项目不存在')
    }
    
    switch (task.taskType) {
      case 'generate_prd_client':
        await this.taskGenerateClientPRD(project, task)
        break
        
      case 'generate_prd_dev':
        await this.taskGenerateDevPRD(project, task)
        break
        
      case 'generate_demo':
        await this.taskGenerateDemo(project, task)
        break
        
      case 'analyze_feedback':
        await this.taskAnalyzeFeedback(project, task)
        break
        
      case 'run_checklist':
        await this.taskRunChecklist(project, task)
        break
        
      default:
        throw new Error(`未知任务类型: ${task.taskType}`)
    }
  }
  
  /**
   * 生成客户版PRD
   */
  async taskGenerateClientPRD(project, task) {
    const projectStore = useProjectStore()
    const experienceStore = useExperienceStore()
    
    // ⭐ 通知开始
    aiNotification.taskStart(
      task.id,
      '🤖 开始生成客户版PRD',
      `正在为「${project.name}」生成客户版PRD...`
    )
    
    // 🔴 优化：使用标签索引快速查找相关经验
    const projectType = project.requirement?.appType
    const tags = [
      `type:${projectType}`,
      'stage:prd_generation'
    ]
    
    // 三层筛选：标签定位 → 重要性 → 相关度
    const relevantExp = experienceStore.getRelevantExperiences({
      tags,
      projectType,
      stage: 'prd_generation'
    })
    
    console.log(`📊 经验查询优化：`)
    console.log(`  - 使用标签: ${tags.join(', ')}`)
    console.log(`  - 找到经验: ${relevantExp.length}条`)
    console.log(`  - 必读经验: ${relevantExp.filter(e => e.mustRead).length}条`)
    console.log(`  - 实际使用: ${Math.min(relevantExp.length, 3)}条（Top 3）`)
    
    // ⭐ 通知应用经验
    if (relevantExp.length > 0) {
      const mustReadCount = relevantExp.filter(e => e.mustRead).length
      aiNotification.experienceApplied(
        relevantExp.length,
        relevantExp.slice(0, 3)
      )
      
      if (mustReadCount > 0) {
        ElNotification({
          title: '⚠️ 重要提示',
          message: `发现 ${mustReadCount} 条必读经验，AI将特别注意！`,
          type: 'warning',
          duration: 5000
        })
      }
    }
    
    // 生成PRD（只传递前3条）
    const prdContent = await generateClientPRD(project.requirement, {
      experiences: relevantExp.slice(0, 3)  // ⭐ 只用前3条
    })
    
    // 保存
    projectStore.savePRD('client', prdContent)
    
    // ⭐ 通知完成
    aiNotification.taskComplete(
      task.id,
      '✅ 客户版PRD生成完成',
      '即将自动生成开发版PRD...'
    )
    
    // 🔴 自动触发下一步：生成开发版PRD
    if (project.autoMode !== false) {
      this.addTask(project.id, 'generate_prd_dev', 'high')
    }
  }
  
  /**
   * 生成开发版PRD
   */
  async taskGenerateDevPRD(project, task) {
    const projectStore = useProjectStore()
    
    // ⭐ 通知开始
    aiNotification.taskStart(
      task.id,
      '🤖 开始生成开发版PRD',
      `正在为「${project.name}」生成开发版PRD...`
    )
    
    // 生成PRD
    const prdContent = await generateDevPRD(
      project.requirement,
      project.prdClient
    )
    
    // 保存
    projectStore.savePRD('dev', prdContent)
    
    // ⭐ 通知完成
    aiNotification.taskComplete(
      task.id,
      '🎉 PRD生成完成',
      '客户版和开发版PRD都已生成，请查看确认'
    )
  }
  
  /**
   * 生成Demo代码
   */
  async taskGenerateDemo(project, task) {
    const projectStore = useProjectStore()
    
    ElNotification({
      title: '开始生成Demo',
      message: `正在根据PRD生成代码...预计需要3-5分钟`,
      type: 'info'
    })
    
    // TODO: 实现Demo代码生成
    // const demoCode = await generateDemoCode(project.prdDev)
    
    // 暂时模拟
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const demoCode = {
      files: [],
      structure: '项目结构',
      readme: 'Demo说明'
    }
    
    projectStore.updateProject(project.id, {
      demoCode,
      stage: 'demo_ready'
    })
    
    ElNotification({
      title: 'Demo生成完成',
      message: `代码已生成，请查看确认`,
      type: 'success'
    })
  }
  
  /**
   * 分析客户反馈
   */
  async taskAnalyzeFeedback(project, task) {
    // TODO: 实现反馈分析
    ElNotification({
      title: '反馈分析',
      message: `正在分析客户反馈...`,
      type: 'info'
    })
  }
  
  /**
   * 运行检查清单
   */
  async taskRunChecklist(project, task) {
    // TODO: 实现自动检查
    ElNotification({
      title: '自动检查',
      message: `正在运行非功能性检查...`,
      type: 'info'
    })
  }
  
  /**
   * 获取队列状态
   */
  getStatus() {
    return {
      running: this.running,
      currentTask: this.currentTask,
      queueLength: this.queue.length,
      pendingTasks: this.queue.filter(t => t.status === 'pending').length
    }
  }
  
  /**
   * 清空队列
   */
  clear() {
    this.queue = []
    this.running = false
    this.currentTask = null
  }
}

// 单例导出
export const aiQueue = new AITaskQueue()

// 便捷方法：触发自动化流程
export function triggerAutomation(projectId) {
  console.log(`🚀 启动自动化流程: ${projectId}`)
  
  // 添加PRD生成任务
  aiQueue.addTask(projectId, 'generate_prd_client', 'high')
  
  return aiQueue.getStatus()
}
