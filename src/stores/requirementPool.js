import { defineStore } from 'pinia'

export const useRequirementPoolStore = defineStore('requirementPool', {
  state: () => ({
    requirements: []
  }),
  
  getters: {
    // 待评估的需求
    pendingRequirements: (state) => 
      state.requirements.filter(r => r.status === 'pending'),
    
    // 已立项的需求
    acceptedRequirements: (state) => 
      state.requirements.filter(r => r.status === 'accepted'),
    
    // 已拒绝的需求
    rejectedRequirements: (state) => 
      state.requirements.filter(r => r.status === 'rejected'),
    
    // 待评估数量（用于徽章显示）
    pendingCount: (state) => 
      state.requirements.filter(r => r.status === 'pending').length,
    
    // 根据ID获取需求
    getRequirementById: (state) => (id) => 
      state.requirements.find(r => r.id === id)
  },
  
  actions: {
    // 从 localStorage 加载
    loadFromStorage() {
      const data = localStorage.getItem('requirement-pool')
      if (data) {
        this.requirements = JSON.parse(data)
      }
    },
    
    // 保存到 localStorage
    saveToStorage() {
      localStorage.setItem('requirement-pool', JSON.stringify(this.requirements))
    },
    
    // 添加新需求（客户提交时调用）
    addRequirement(requirementData) {
      const requirement = {
        id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        data: requirementData,
        projectId: null,
        notes: '',
        tags: [],
        quickInfo: {
          appName: requirementData.appName || '未命名项目',
          budget: requirementData.budget || null,
          contact: requirementData.contact ? this.maskContact(requirementData.contact) : null,
          expectedTime: requirementData.expectedTime || null,
          hasContact: !!requirementData.contact,
          hasBudget: !!requirementData.budget,
          hasTime: !!requirementData.expectedTime
        }
      }
      
      this.requirements.unshift(requirement)
      this.saveToStorage()
      return requirement
    },
    
    // 更新需求
    updateRequirement(requirement) {
      const index = this.requirements.findIndex(r => r.id === requirement.id)
      if (index !== -1) {
        this.requirements[index] = { ...requirement, updatedAt: new Date().toISOString() }
        this.saveToStorage()
      }
    },
    
    // 接受需求（立项时）
    acceptRequirement(requirementId, projectId) {
      const requirement = this.getRequirementById(requirementId)
      if (requirement) {
        requirement.status = 'accepted'
        requirement.projectId = projectId
        this.updateRequirement(requirement)
      }
    },
    
    // 拒绝需求
    rejectRequirement(requirementId, reason = '') {
      const requirement = this.getRequirementById(requirementId)
      if (requirement) {
        requirement.status = 'rejected'
        requirement.notes = reason
        this.updateRequirement(requirement)
      }
    },
    
    // 删除需求
    deleteRequirement(id) {
      this.requirements = this.requirements.filter(r => r.id !== id)
      this.saveToStorage()
    },
    
    // 遮蔽联系方式（隐私保护）
    maskContact(contact) {
      if (!contact) return null
      // 手机号：138****8888
      if (/^1\d{10}$/.test(contact)) {
        return contact.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
      }
      // 其他：显示前3位和最后2位
      if (contact.length > 5) {
        return contact.slice(0, 3) + '****' + contact.slice(-2)
      }
      return contact
    },
    
    // 清空所有数据（用于重置）
    clearAll() {
      this.requirements = []
      this.saveToStorage()
    }
  }
})
