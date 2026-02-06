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
  
  // 三阶段模板
  const PHASE_NAMES = { 1: '骨架', 2: '血肉', 3: '衣服' }
  const PHASE_DESC = {
    1: 'P0核心功能，最小可行产品',
    2: 'P0+P1完整功能，完善体验',
    3: 'P2拓展功能，中长期规划'
  }
  
  function createEmptyPhase(num) {
    return {
      name: PHASE_NAMES[num],
      description: PHASE_DESC[num],
      status: num === 1 ? 'pending' : 'locked',
      prdClient: null,
      prdDev: null,
      demoCode: null,
      testResult: null,
      startedAt: null,
      completedAt: null
    }
  }

  // ⭐ 从需求池创建项目（三阶段结构）
  function createProjectFromRequirement(requirement) {
    const project = {
      id: `project-${Date.now()}`,
      name: requirement.data.appName || '未命名项目',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      requirementId: requirement.id,
      requirement: requirement.data,
      
      // ⭐ 三阶段结构：造骨架 → 生血肉 → 搭衣服
      currentPhase: 1,
      phases: {
        1: createEmptyPhase(1),
        2: createEmptyPhase(2),
        3: createEmptyPhase(3)
      },
      
      // 兼容旧字段（指向当前阶段数据的快捷访问）
      prdClient: null,
      prdDev: null,
      demoCode: null,
      
      iterations: [],
      checklistProgress: {},
      status: 'requirement',
      stage: 'phase1_prd',
      autoMode: true,
      
      quickInfo: {
        contact: requirement.quickInfo?.contact,
        budget: requirement.data.budget,
        expectedTime: requirement.data.expectedTime
      }
    }
    projects.value.unshift(project)
    currentProjectId.value = project.id
    
    experienceStore.logProjectStage(project.id, 'created', {
      source: 'requirement_pool',
      requirementId: requirement.id
    })
    
    return project
  }
  
  // ⭐ 保存阶段PRD
  function savePhasePRD(type, content, phaseNum) {
    if (!currentProjectId.value) return
    const project = currentProject.value
    if (!project) return
    
    const phase = phaseNum || project.currentPhase
    const key = type === 'client' ? 'prdClient' : 'prdDev'
    
    // 更新阶段内数据
    if (project.phases && project.phases[phase]) {
      project.phases[phase][key] = content
      
      // 更新阶段状态
      if (type === 'dev' && project.phases[phase].prdClient) {
        project.phases[phase].status = 'prd_ready'
      }
    }
    
    // 同步到顶层（兼容旧逻辑）
    updateProject(currentProjectId.value, {
      [key]: content,
      phases: project.phases,
      stage: type === 'dev' ? `phase${phase}_prd_ready` : project.stage
    })
    
    experienceStore.logProjectStage(currentProjectId.value, `phase${phase}_prd_${type}_generated`, {
      phase, contentLength: content?.length || 0
    })
  }
  
  // ⭐ 保存阶段Demo
  function savePhaseDemoCode(demoCode, phaseNum) {
    if (!currentProjectId.value) return
    const project = currentProject.value
    if (!project) return
    
    const phase = phaseNum || project.currentPhase
    
    if (project.phases && project.phases[phase]) {
      project.phases[phase].demoCode = demoCode
      project.phases[phase].status = 'demo_ready'
    }
    
    updateProject(currentProjectId.value, {
      demoCode,
      phases: project.phases,
      stage: `phase${phase}_demo_ready`
    })
    
    experienceStore.logProjectStage(currentProjectId.value, `phase${phase}_demo_generated`, { phase })
  }
  
  // ⭐ 确认阶段通过，进入下一阶段
  function completePhase(phaseNum) {
    if (!currentProjectId.value) return
    const project = currentProject.value
    if (!project || !project.phases) return
    
    const phase = phaseNum || project.currentPhase
    
    // 标记当前阶段完成
    project.phases[phase].status = 'completed'
    project.phases[phase].completedAt = new Date().toISOString()
    project.phases[phase].testResult = '通过'
    
    // 解锁下一阶段
    const nextPhase = phase + 1
    if (nextPhase <= 3 && project.phases[nextPhase]) {
      project.phases[nextPhase].status = 'pending'
      project.phases[nextPhase].startedAt = new Date().toISOString()
      project.currentPhase = nextPhase
      
      updateProject(currentProjectId.value, {
        currentPhase: nextPhase,
        phases: project.phases,
        stage: `phase${nextPhase}_prd`
      })
    } else {
      // 三阶段全部完成
      updateProject(currentProjectId.value, {
        phases: project.phases,
        stage: 'all_phases_completed',
        status: 'completed'
      })
    }
    
    experienceStore.logProjectStage(currentProjectId.value, `phase${phase}_completed`, { phase })
    
    return nextPhase <= 3 ? nextPhase : null
  }
  
  // ⭐ 获取当前阶段信息
  function getCurrentPhase(projectId) {
    const project = projectId ? getProjectById(projectId) : currentProject.value
    if (!project || !project.phases) return null
    return {
      num: project.currentPhase || 1,
      data: project.phases[project.currentPhase || 1],
      name: PHASE_NAMES[project.currentPhase || 1]
    }
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
  
  // 保存 PRD（兼容旧调用，自动路由到阶段版本）
  function savePRD(type, content) {
    if (!currentProjectId.value) return
    const project = currentProject.value
    
    // 如果项目有phases结构，使用阶段版本
    if (project?.phases) {
      savePhasePRD(type, content)
    } else {
      // 旧项目兼容
      const key = type === 'client' ? 'prdClient' : 'prdDev'
      updateProject(currentProjectId.value, { [key]: content })
      
      experienceStore.logProjectStage(currentProjectId.value, `prd_${type}_generated`, {
        contentLength: content?.length || 0
      })
      
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
    PHASE_NAMES,
    PHASE_DESC,
    createProject,
    createProjectFromRequirement,
    setCurrentProject,
    getProjectById,
    updateProject,
    updateStage,
    deleteProject,
    selectProject,
    saveRequirement,
    savePRD,
    savePhasePRD,
    savePhaseDemoCode,
    completePhase,
    getCurrentPhase,
    saveChecklistProgress,
    recordIssue,
    completeProject,
    exportAllData,
    importData,
    clearAllData
  }
})
