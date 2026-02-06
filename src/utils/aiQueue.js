import { ElMessage, ElNotification } from 'element-plus'
import { callAI, generateClientPRD, generateDevPRD, generateDemoCode, generateGitHubConfig, analyzeFeedback, generateSolution } from '@/api/ai'
import { useProjectStore } from '@/stores/project'
import { useRequirementPoolStore } from '@/stores/requirementPool'
import { useExperienceStore } from '@/stores/experience'
import { useIterationStore } from '@/stores/iteration'  // ⭐ 新增
import { aiNotification } from './aiNotification'
import { githubService } from './github'

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
        
      case 'generate_solution':  // ⭐ Phase 3
        await this.taskGenerateSolution(project, task)
        break
        
      case 'apply_iteration':  // ⭐ Phase 3
        await this.taskApplyIteration(project, task)
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
    const experienceStore = useExperienceStore()
    
    // ⭐ 通知开始
    aiNotification.taskStart(
      task.id,
      '🤖 开始生成Demo代码',
      `正在根据PRD生成「${project.name}」的完整代码...预计需要3-5分钟`
    )
    
    try {
      // 🔴 生成Demo代码（带进度回调）
      const demoCode = await generateDemoCode(
        project.prdDev,
        project.requirement,
        (progress) => {
          // 更新进度通知
          const percentage = Math.min(90, Math.floor(progress.length / 100))
          aiNotification.taskProgress(
            task.id,
            `AI正在生成代码文件...`,
            percentage
          )
        }
      )
      
      // 保存Demo代码
      projectStore.updateProject(project.id, {
        demoCode,
        stage: 'demo_generated'
      })
      
      // 记录阶段
      experienceStore.logProjectStage(project.id, 'demo_generated', {
        filesCount: demoCode.files?.length || 0,
        cloudFunctions: demoCode.cloudFunctions?.length || 0
      })
      
      // 🔴 如果配置了GitHub，自动推送
      if (githubService.isConfigured() && task.options.autoGithub !== false) {
        aiNotification.taskProgress(
          task.id,
          '正在推送到GitHub...',
          95
        )
        
        await this.pushToGitHub(project, demoCode)
        
        aiNotification.taskComplete(
          task.id,
          '🎉 Demo生成并推送完成',
          `代码已生成并推送到GitHub，共${demoCode.files?.length || 0}个文件`
        )
      } else {
        aiNotification.taskComplete(
          task.id,
          '✅ Demo代码生成完成',
          `已生成${demoCode.files?.length || 0}个文件，请查看或下载`
        )
      }
      
    } catch (error) {
      console.error('Demo生成失败:', error)
      aiNotification.taskError(
        task.id,
        '❌ Demo生成失败',
        error.message
      )
      throw error
    }
  }
  
  /**
   * 推送到GitHub
   */
  async pushToGitHub(project, demoCode) {
    try {
      // 1. 生成GitHub配置
      const githubConfig = generateGitHubConfig(demoCode, project)
      
      // 2. 获取用户信息
      const user = await githubService.getUserInfo()
      
      // 3. 创建仓库
      const repo = await githubService.createRepository(githubConfig)
      
      // 4. 推送文件
      await githubService.pushFiles(
        user.login,
        repo.name,
        demoCode.files,
        (progress) => {
          console.log(`📤 推送进度: ${progress.percentage}% (${progress.completed}/${progress.total})`)
        }
      )
      
      // 5. 保存仓库信息
      const projectStore = useProjectStore()
      projectStore.updateProject(project.id, {
        githubRepo: {
          url: repo.html_url,
          name: repo.name,
          owner: user.login,
          createdAt: new Date().toISOString()
        }
      })
      
      return repo
      
    } catch (error) {
      console.error('GitHub推送失败:', error)
      throw error
    }
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
   * 分析反馈任务 ⭐ Phase 3
   */
  async taskAnalyzeFeedback(project, task) {
    const projectStore = useProjectStore()
    const experienceStore = useExperienceStore()
    const iterationStore = useIterationStore()
    
    const { iterationId, feedback } = task.options
    
    // ⭐ 通知开始
    aiNotification.taskStart(
      task.id,
      '🔍 开始分析反馈',
      `正在分析「${project.name}」的用户反馈...`
    )
    
    try {
      // 1. 获取相关经验（使用标签索引优化）
      const tags = [
        `issue:${feedback.type}`,
        `stage:iteration`,
        `type:${project.requirement?.appType}`
      ]
      
      const experiences = experienceStore.getRelevantExperiences({
        tags,
        projectType: project.requirement?.appType,
        stage: 'iteration'
      })
      
      console.log(`📊 查找相关修复经验: ${experiences.length}条`)
      
      // 2. AI分析
      const analysis = await analyzeFeedback(feedback, project, experiences.slice(0, 3))
      
      // 3. 保存分析结果
      iterationStore.saveAnalysis(iterationId, analysis)
      
      // 4. 记录到经验库
      experienceStore.logProjectStage(project.id, 'iteration_analyzed', {
        iterationId,
        category: analysis.category,
        complexity: analysis.estimatedComplexity
      })
      
      // ⭐ 通知完成
      aiNotification.taskComplete(
        task.id,
        '✅ 反馈分析完成',
        `问题类别：${analysis.category}，复杂度：${analysis.estimatedComplexity}`
      )
      
      // 5. 自动触发方案生成
      if (project.autoMode !== false) {
        this.addTask(project.id, 'generate_solution', 'high', { iterationId })
      }
      
    } catch (error) {
      console.error('分析反馈失败:', error)
      iterationStore.failIteration(iterationId, error.message)
      
      aiNotification.taskError(
        task.id,
        '❌ 分析失败',
        error.message
      )
      throw error
    }
  }
  
  /**
   * 生成方案任务 ⭐ Phase 3
   */
  async taskGenerateSolution(project, task) {
    const projectStore = useProjectStore()
    const experienceStore = useExperienceStore()
    const iterationStore = useIterationStore()
    
    const { iterationId } = task.options
    const iteration = iterationStore.getIteration(iterationId)
    
    if (!iteration || !iteration.analysis) {
      throw new Error('迭代记录或分析结果不存在')
    }
    
    // ⭐ 通知开始
    aiNotification.taskStart(
      task.id,
      '💡 开始生成优化方案',
      `正在为「${project.name}」设计解决方案...`
    )
    
    try {
      // 1. 获取当前代码
      const demoCode = project.demoCode
      if (!demoCode) {
        throw new Error('项目尚未生成Demo代码')
      }
      
      // 2. 获取相关修复经验
      const tags = [
        `fix:${iteration.analysis.category}`,
        'stage:iteration'
      ]
      
      const experiences = experienceStore.getRelevantExperiences({
        tags,
        stage: 'iteration'
      })
      
      console.log(`📊 查找相关修复方案: ${experiences.length}条`)
      
      // 3. AI生成方案
      const solution = await generateSolution(
        iteration.feedback,
        iteration.analysis,
        demoCode,
        experiences.slice(0, 3)
      )
      
      // 4. 保存方案
      iterationStore.saveSolution(iterationId, solution)
      
      // 5. 记录到经验库
      experienceStore.logProjectStage(project.id, 'solution_generated', {
        iterationId,
        codeChanges: solution.codeChanges?.length || 0,
        estimatedTime: solution.estimatedTime
      })
      
      // ⭐ 通知完成
      aiNotification.taskComplete(
        task.id,
        '✅ 优化方案已生成',
        `需改动${solution.codeChanges?.length || 0}个文件，请查看并确认`
      )
      
      ElNotification({
        title: '💡 方案已就绪',
        message: `AI已生成优化方案，请在迭代管理页面查看并确认应用`,
        type: 'success',
        duration: 8000
      })
      
    } catch (error) {
      console.error('生成方案失败:', error)
      iterationStore.failIteration(iterationId, error.message)
      
      aiNotification.taskError(
        task.id,
        '❌ 方案生成失败',
        error.message
      )
      throw error
    }
  }
  
  /**
   * 应用迭代任务 ⭐ Phase 3
   */
  async taskApplyIteration(project, task) {
    const projectStore = useProjectStore()
    const experienceStore = useExperienceStore()
    const iterationStore = useIterationStore()
    
    const { iterationId } = task.options
    const iteration = iterationStore.getIteration(iterationId)
    
    if (!iteration || !iteration.solution) {
      throw new Error('迭代记录或优化方案不存在')
    }
    
    // ⭐ 通知开始
    aiNotification.taskStart(
      task.id,
      '⚙️ 开始应用优化',
      `正在应用「${iteration.version}」的代码改动...`
    )
    
    try {
      // 1. 应用代码改动
      const demoCode = { ...project.demoCode }
      let modifiedCount = 0
      let linesChanged = 0
      
      iteration.solution.codeChanges.forEach(change => {
        const fileIndex = demoCode.files.findIndex(f => f.path === change.file)
        
        if (change.type === 'modify' && fileIndex !== -1) {
          // 修改文件
          demoCode.files[fileIndex].content = change.after
          modifiedCount++
          
          // 估算改动行数
          const beforeLines = change.before?.split('\n').length || 0
          const afterLines = change.after?.split('\n').length || 0
          linesChanged += Math.abs(afterLines - beforeLines)
          
        } else if (change.type === 'add') {
          // 新增文件
          demoCode.files.push({
            path: change.file,
            type: change.file.split('.').pop(),
            content: change.after,
            description: change.explanation
          })
          modifiedCount++
          linesChanged += change.after?.split('\n').length || 0
          
        } else if (change.type === 'delete' && fileIndex !== -1) {
          // 删除文件
          linesChanged += demoCode.files[fileIndex].content?.split('\n').length || 0
          demoCode.files.splice(fileIndex, 1)
          modifiedCount++
        }
      })
      
      // 2. 更新项目代码和版本
      projectStore.updateProject(project.id, {
        demoCode,
        version: iteration.version
      })
      
      // 3. 推送到GitHub
      if (githubService.isConfigured() && project.githubRepo) {
        aiNotification.taskProgress(
          task.id,
          '正在推送到GitHub...',
          80
        )
        
        await this.pushToGitHub(project, demoCode)
      }
      
      // 4. 记录经验
      experienceStore.recordIterationExperience(project.id, iteration)
      
      // 5. 完成迭代
      iterationStore.completeIteration(iterationId, {
        filesModified: modifiedCount,
        linesChanged,
        newVersion: iteration.version,
        deployedAt: new Date().toISOString()
      })
      
      // ⭐ 通知完成
      aiNotification.taskComplete(
        task.id,
        '🎉 迭代优化完成',
        `已升级到${iteration.version}，改动${modifiedCount}个文件`
      )
      
      ElNotification({
        title: '🎉 版本升级成功',
        message: `${iteration.version}已发布！改动了${modifiedCount}个文件，${linesChanged}行代码`,
        type: 'success',
        duration: 8000
      })
      
    } catch (error) {
      console.error('应用迭代失败:', error)
      iterationStore.failIteration(iterationId, error.message)
      
      aiNotification.taskError(
        task.id,
        '❌ 应用失败',
        error.message
      )
      throw error
    }
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
