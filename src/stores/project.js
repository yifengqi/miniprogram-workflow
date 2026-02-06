import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useExperienceStore } from './experience'

export const useProjectStore = defineStore('project', () => {
  const experienceStore = useExperienceStore()
  // 项目列表
  const projects = ref(JSON.parse(localStorage.getItem('projects') || '[]'))
  
  // 当前选中的项目ID
  const currentProjectId = ref(localStorage.getItem('current_project_id') || null)
  
  // 当前项目
  const currentProject = computed(() => {
    if (!currentProjectId.value) return null
    return projects.value.find(p => p.id === currentProjectId.value)
  })
  
  // 创建新项目（保留但不推荐使用）
  function createProject(name) {
    const project = {
      id: Date.now().toString(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      requirementId: null,  // 关联的需求ID
      requirement: null,
      prdClient: null,
      prdDev: null,
      checklistProgress: {},
      status: 'requirement'  // requirement | prd-generated | in-development
    }
    projects.value.unshift(project)
    currentProjectId.value = project.id
    return project
  }
  
  // ⭐ 新增：从需求池创建项目（推荐使用）
  function createProjectFromRequirement(requirement) {
    const project = {
      id: `project-${Date.now()}`,
      name: requirement.data.appName || '未命名项目',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      requirementId: requirement.id,  // 关联需求ID
      requirement: requirement.data,  // 完整需求数据
      prdClient: null,
      prdDev: null,
      demoCode: null,  // ⭐ 新增：Demo代码
      iterations: [],  // ⭐ 新增：迭代记录
      checklistProgress: {},
      status: 'requirement',
      stage: 'requirement',  // ⭐ 新增：当前阶段
      autoMode: true,  // ⭐ 新增：是否自动化模式
      
      // 快速信息
      quickInfo: {
        contact: requirement.quickInfo.contact,
        budget: requirement.data.budget,
        expectedTime: requirement.data.expectedTime
      }
    }
    projects.value.unshift(project)
    currentProjectId.value = project.id
    
    // ⭐ 记录项目创建
    experienceStore.logProjectStage(project.id, 'created', {
      source: 'requirement_pool',
      requirementId: requirement.id
    })
    
    return project
  }
  
  // ⭐ 新增：设置当前项目
  function setCurrentProject(id) {
    currentProjectId.value = id
    localStorage.setItem('current_project_id', id)
  }
  
  // 更新项目
  function updateProject(id, data) {
    const index = projects.value.findIndex(p => p.id === id)
    if (index !== -1) {
      projects.value[index] = {
        ...projects.value[index],
        ...data,
        updatedAt: new Date().toISOString()
      }
    }
  }
  
  // 删除项目
  function deleteProject(id) {
    const index = projects.value.findIndex(p => p.id === id)
    if (index !== -1) {
      projects.value.splice(index, 1)
      if (currentProjectId.value === id) {
        currentProjectId.value = projects.value[0]?.id || null
      }
    }
  }
  
  // 选择项目
  function selectProject(id) {
    currentProjectId.value = id
    localStorage.setItem('current_project_id', id)
  }
  
  // 保存需求数据
  function saveRequirement(data) {
    if (currentProjectId.value) {
      updateProject(currentProjectId.value, { requirement: data })
    }
  }
  
  // 保存 PRD
  function savePRD(type, content) {
    if (currentProjectId.value) {
      const key = type === 'client' ? 'prdClient' : 'prdDev'
      updateProject(currentProjectId.value, { [key]: content })
      
      // ⭐ 记录PRD生成
      experienceStore.logProjectStage(currentProjectId.value, `prd_${type}_generated`, {
        contentLength: content?.length || 0
      })
      
      // ⭐ 更新项目阶段
      if (type === 'dev') {
        updateProject(currentProjectId.value, { 
          stage: 'prd_ready',
          status: 'prd-generated'
        })
      }
    }
  }
  
  // ⭐ 新增：获取项目by ID
  function getProjectById(id) {
    return projects.value.find(p => p.id === id)
  }
  
  // ⭐ 新增：更新项目阶段
  function updateStage(id, stage) {
    updateProject(id, { stage })
    experienceStore.logProjectStage(id, stage)
  }
  
  // ⭐ 新增：记录问题
  function recordIssue(projectId, issue) {
    return experienceStore.recordIssue(projectId, issue)
  }
  
  // ⭐ 新增：标记项目完成
  async function completeProject(projectId) {
    updateProject(projectId, { 
      status: 'completed',
      stage: 'completed',
      completedAt: new Date().toISOString()
    })
    
    experienceStore.logProjectStage(projectId, 'completed')
    
    return await experienceStore.generateProjectExperience(projectId)
  }
  
  // 保存检查清单进度
  function saveChecklistProgress(progress) {
    if (currentProjectId.value) {
      updateProject(currentProjectId.value, { checklistProgress: progress })
    }
  }
  
  // 导出所有数据
  function exportAllData() {
    return {
      projects: projects.value,
      exportedAt: new Date().toISOString()
    }
  }
  
  // 导入数据
  function importData(data) {
    if (data.projects) {
      projects.value = data.projects
    }
  }
  
  // 清除所有数据
  function clearAllData() {
    projects.value = []
    currentProjectId.value = null
    localStorage.removeItem('projects')
    localStorage.removeItem('current_project_id')
  }
  
  // 监听变化自动保存
  watch(projects, (val) => {
    localStorage.setItem('projects', JSON.stringify(val))
  }, { deep: true })
  
  return {
    projects,
    currentProjectId,
    currentProject,
    createProject,
    createProjectFromRequirement,  // ⭐ 新增
    setCurrentProject,  // ⭐ 新增
    getProjectById,  // ⭐ 新增
    updateProject,
    updateStage,  // ⭐ 新增
    deleteProject,
    selectProject,
    saveRequirement,
    savePRD,
    saveChecklistProgress,
    recordIssue,  // ⭐ 新增
    completeProject,  // ⭐ 新增
    exportAllData,
    importData,
    clearAllData
  }
})
