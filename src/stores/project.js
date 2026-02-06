import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useProjectStore = defineStore('project', () => {
  // 项目列表
  const projects = ref(JSON.parse(localStorage.getItem('projects') || '[]'))
  
  // 当前选中的项目ID
  const currentProjectId = ref(localStorage.getItem('current_project_id') || null)
  
  // 当前项目
  const currentProject = computed(() => {
    if (!currentProjectId.value) return null
    return projects.value.find(p => p.id === currentProjectId.value)
  })
  
  // 创建新项目
  function createProject(name) {
    const project = {
      id: Date.now().toString(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      requirement: null,
      prdClient: null,
      prdDev: null,
      checklistProgress: {}
    }
    projects.value.unshift(project)
    currentProjectId.value = project.id
    return project
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
    }
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
    updateProject,
    deleteProject,
    selectProject,
    saveRequirement,
    savePRD,
    saveChecklistProgress,
    exportAllData,
    importData,
    clearAllData
  }
})
