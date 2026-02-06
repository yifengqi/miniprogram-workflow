import { defineStore } from 'pinia'

/**
 * 迭代管理Store
 * 管理项目的所有迭代记录、优化方案和版本历史
 */
export const useIterationStore = defineStore('iteration', {
  state: () => ({
    iterations: {},  // { [projectId]: [iteration1, iteration2, ...] }
  }),
  
  getters: {
    /**
     * 获取项目的所有迭代
     */
    getProjectIterations: (state) => (projectId) => {
      return state.iterations[projectId] || []
    },
    
    /**
     * 获取最新版本号
     */
    getLatestVersion: (state) => (projectId) => {
      const iters = state.iterations[projectId] || []
      if (iters.length === 0) return 'v1.0'
      
      const latest = iters[iters.length - 1]
      return latest.version
    },
    
    /**
     * 获取下一个版本号
     */
    getNextVersion: (state) => (projectId, type = 'minor') => {
      const current = state.getLatestVersion(projectId)
      const match = current.match(/v(\d+)\.(\d+)(?:\.(\d+))?/)
      
      if (!match) return 'v1.1'
      
      let [, major, minor, patch = 0] = match.map(Number)
      
      if (type === 'major') {
        major++
        minor = 0
        patch = 0
      } else if (type === 'minor') {
        minor++
        patch = 0
      } else {
        patch++
      }
      
      return `v${major}.${minor}.${patch}`
    },
    
    /**
     * 获取单个迭代
     */
    getIteration: (state) => (iterationId) => {
      for (const projectId in state.iterations) {
        const found = state.iterations[projectId].find(iter => iter.id === iterationId)
        if (found) return found
      }
      return null
    },
    
    /**
     * 获取待处理的迭代数量
     */
    getPendingCount: (state) => (projectId) => {
      const iters = state.iterations[projectId] || []
      return iters.filter(iter => 
        iter.status === 'pending' || iter.status === 'analyzing' || iter.status === 'generating'
      ).length
    },
    
    /**
     * 统计信息
     */
    getStats: (state) => (projectId) => {
      const iters = state.iterations[projectId] || []
      return {
        total: iters.length,
        completed: iters.filter(iter => iter.status === 'completed').length,
        pending: iters.filter(iter => iter.status === 'pending').length,
        failed: iters.filter(iter => iter.status === 'failed').length,
        bugs: iters.filter(iter => iter.feedback?.type === 'bug').length,
        features: iters.filter(iter => iter.feedback?.type === 'feature').length,
        optimizations: iters.filter(iter => iter.feedback?.type === 'optimization').length
      }
    }
  },
  
  actions: {
    /**
     * 从localStorage加载
     */
    loadFromStorage() {
      try {
        const data = localStorage.getItem('iterations')
        if (data) {
          this.iterations = JSON.parse(data)
        }
      } catch (error) {
        console.error('加载迭代数据失败:', error)
      }
    },
    
    /**
     * 保存到localStorage
     */
    saveToStorage() {
      try {
        localStorage.setItem('iterations', JSON.stringify(this.iterations))
      } catch (error) {
        console.error('保存迭代数据失败:', error)
      }
    },
    
    /**
     * 创建新迭代
     * @param {string} projectId - 项目ID
     * @param {Object} feedback - 用户反馈
     * @param {string} versionType - 版本类型 (major | minor | patch)
     * @returns {Object} 新创建的迭代
     */
    createIteration(projectId, feedback, versionType = 'minor') {
      if (!this.iterations[projectId]) {
        this.iterations[projectId] = []
      }
      
      const iteration = {
        id: `iter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectId,
        version: this.getNextVersion(projectId, versionType),
        createdAt: new Date().toISOString(),
        status: 'pending',
        
        feedback: {
          type: feedback.type || 'optimization',
          severity: feedback.severity || 'medium',
          description: feedback.description || '',
          screenshots: feedback.screenshots || [],
          expectedBehavior: feedback.expectedBehavior || '',
          actualBehavior: feedback.actualBehavior || ''
        },
        
        analysis: null,
        solution: null,
        result: null
      }
      
      this.iterations[projectId].push(iteration)
      this.saveToStorage()
      
      return iteration
    },
    
    /**
     * 更新迭代状态
     */
    updateIterationStatus(iterationId, status, additionalData = {}) {
      for (const projectId in this.iterations) {
        const iter = this.iterations[projectId].find(i => i.id === iterationId)
        if (iter) {
          iter.status = status
          iter.updatedAt = new Date().toISOString()
          Object.assign(iter, additionalData)
          this.saveToStorage()
          return true
        }
      }
      return false
    },
    
    /**
     * 保存分析结果
     */
    saveAnalysis(iterationId, analysis) {
      for (const projectId in this.iterations) {
        const iter = this.iterations[projectId].find(i => i.id === iterationId)
        if (iter) {
          iter.analysis = analysis
          iter.status = 'analyzed'
          iter.analyzedAt = new Date().toISOString()
          this.saveToStorage()
          return true
        }
      }
      return false
    },
    
    /**
     * 保存优化方案
     */
    saveSolution(iterationId, solution) {
      for (const projectId in this.iterations) {
        const iter = this.iterations[projectId].find(i => i.id === iterationId)
        if (iter) {
          iter.solution = solution
          iter.status = 'solution_ready'
          iter.solutionGeneratedAt = new Date().toISOString()
          this.saveToStorage()
          return true
        }
      }
      return false
    },
    
    /**
     * 确认方案（用户确认后）
     */
    confirmSolution(iterationId) {
      for (const projectId in this.iterations) {
        const iter = this.iterations[projectId].find(i => i.id === iterationId)
        if (iter) {
          iter.status = 'applying'
          iter.confirmedAt = new Date().toISOString()
          this.saveToStorage()
          return true
        }
      }
      return false
    },
    
    /**
     * 完成迭代
     */
    completeIteration(iterationId, result) {
      for (const projectId in this.iterations) {
        const iter = this.iterations[projectId].find(i => i.id === iterationId)
        if (iter) {
          iter.result = result
          iter.status = 'completed'
          iter.completedAt = new Date().toISOString()
          this.saveToStorage()
          return true
        }
      }
      return false
    },
    
    /**
     * 标记失败
     */
    failIteration(iterationId, error) {
      for (const projectId in this.iterations) {
        const iter = this.iterations[projectId].find(i => i.id === iterationId)
        if (iter) {
          iter.status = 'failed'
          iter.error = error
          iter.failedAt = new Date().toISOString()
          this.saveToStorage()
          return true
        }
      }
      return false
    },
    
    /**
     * 删除迭代
     */
    deleteIteration(iterationId) {
      for (const projectId in this.iterations) {
        const index = this.iterations[projectId].findIndex(i => i.id === iterationId)
        if (index !== -1) {
          this.iterations[projectId].splice(index, 1)
          this.saveToStorage()
          return true
        }
      }
      return false
    },
    
    /**
     * 清空项目的所有迭代
     */
    clearProjectIterations(projectId) {
      if (this.iterations[projectId]) {
        delete this.iterations[projectId]
        this.saveToStorage()
      }
    },
    
    /**
     * 清空所有迭代
     */
    clearAll() {
      this.iterations = {}
      this.saveToStorage()
    }
  }
})
