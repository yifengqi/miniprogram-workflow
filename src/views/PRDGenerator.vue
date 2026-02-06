<template>
  <div class="prd-page">
    <div class="page-header">
      <h1 class="page-title">PRD 生成</h1>
      <p class="page-desc">
        {{ projectStore.currentProject ? `当前项目：${projectStore.currentProject.name}` : '请先选择一个项目' }}
      </p>
    </div>
    
    <template v-if="projectStore.currentProject">
      <!-- ⭐ 三阶段进度条 -->
      <div class="card phase-progress-card">
        <div class="phase-progress-header">
          <h3>开发路线图</h3>
          <el-tag :type="overallStatusType" size="small">{{ overallStatusText }}</el-tag>
        </div>
        
        <div class="phase-timeline">
          <div 
            v-for="p in 3" :key="p"
            class="phase-node"
            :class="{ 
              active: currentPhase === p, 
              completed: getPhase(p)?.status === 'completed',
              locked: getPhase(p)?.status === 'locked'
            }"
            @click="switchPhase(p)"
          >
            <div class="phase-dot">
              <span v-if="getPhase(p)?.status === 'completed'">✓</span>
              <span v-else-if="getPhase(p)?.status === 'locked'">🔒</span>
              <span v-else>{{ p }}</span>
            </div>
            <div class="phase-label">
              <strong>Phase {{ p }}</strong>
              <span>{{ phaseNames[p] }}</span>
            </div>
            <div class="phase-connector" v-if="p < 3"></div>
          </div>
        </div>
        
        <el-progress 
          :percentage="overallProgress" 
          :stroke-width="8"
          :color="progressColors"
          style="margin-top: 12px;"
        />
      </div>
      
      <!-- ⭐ 自动化进度显示 -->
      <div v-if="isAutoGenerating" class="card auto-progress-card">
        <div class="auto-header">
          <el-icon class="rotating"><Loading /></el-icon>
          <div>
            <h3>🤖 AI 自动化进行中 — Phase {{ currentPhase }}</h3>
            <p>正在生成{{ phaseNames[currentPhase] }}阶段的PRD，请稍候</p>
          </div>
        </div>
        
        <el-steps :active="autoStep" align-center finish-status="success" size="small">
          <el-step title="客户版PRD" :description="autoSteps[0].desc" />
          <el-step title="开发版PRD" :description="autoSteps[1].desc" />
          <el-step title="等待确认" :description="autoSteps[2].desc" />
        </el-steps>
        
        <div class="auto-tips" v-if="appliedExperiencesCount > 0">
          <el-alert type="info" :closable="false">
            <template #title>
              💡 已应用 <strong>{{ appliedExperiencesCount }}</strong> 条历史经验
            </template>
          </el-alert>
        </div>
      </div>
      
      <!-- 需求检查 -->
      <div v-if="!projectStore.currentProject.requirement" class="card warning-card">
        <el-icon><Warning /></el-icon>
        <div>
          <h4>尚未收集需求</h4>
          <p>请先完成需求收集，再生成PRD文档</p>
        </div>
        <el-button type="primary" @click="$router.push('/requirement-pool')">去需求池</el-button>
      </div>
      
      <!-- AI 配置检查 -->
      <div v-else-if="!settingsStore.isConfigured()" class="card warning-card">
        <el-icon><Warning /></el-icon>
        <div>
          <h4>尚未配置 AI 接口</h4>
          <p>请先在设置中配置 API Key</p>
        </div>
        <el-button type="primary" @click="$router.push('/settings')">去设置</el-button>
      </div>
      
      <!-- ⭐ 三阶段 PRD 区域 -->
      <template v-else>
        <!-- 当前阶段卡片 -->
        <div class="card phase-detail-card">
          <div class="phase-detail-header">
            <div class="phase-badge" :class="`phase-${currentPhase}`">
              {{ phaseIcons[currentPhase] }} Phase {{ currentPhase }}
            </div>
            <div>
              <h3>{{ phaseNames[currentPhase] }}阶段</h3>
              <p>{{ phaseDescs[currentPhase] }}</p>
            </div>
            <div class="phase-actions">
              <el-button 
                type="primary" 
                :loading="generatingClient"
                @click="generatePhaseClientPRD"
                :disabled="currentPhaseData?.status === 'locked'"
              >
                {{ currentPhaseData?.prdClient ? '重新生成' : '🤖 生成客户版PRD' }}
              </el-button>
              <el-button 
                type="success" 
                :loading="generatingDev"
                @click="generatePhaseDevPRD"
                :disabled="!currentPhaseData?.prdClient"
              >
                {{ currentPhaseData?.prdDev ? '重新生成' : '🤖 生成开发版PRD' }}
              </el-button>
            </div>
          </div>
          
          <!-- 阶段状态标签 -->
          <div class="phase-status-row">
            <el-tag :type="currentPhaseData?.prdClient ? 'success' : 'info'" size="small">
              客户版PRD {{ currentPhaseData?.prdClient ? '✓' : '待生成' }}
            </el-tag>
            <el-tag :type="currentPhaseData?.prdDev ? 'success' : 'info'" size="small">
              开发版PRD {{ currentPhaseData?.prdDev ? '✓' : '待生成' }}
            </el-tag>
            <el-tag :type="currentPhaseData?.demoCode ? 'success' : 'info'" size="small">
              Demo {{ currentPhaseData?.demoCode ? '✓' : '待生成' }}
            </el-tag>
            <el-tag :type="currentPhaseData?.testResult ? 'success' : 'info'" size="small">
              测试 {{ currentPhaseData?.testResult ? '✓ 通过' : '待验证' }}
            </el-tag>
          </div>
        </div>
        
        <!-- 生成进度 -->
        <div v-if="generating" class="card generating-card">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <div>
            <h4>Phase {{ currentPhase }} — 正在生成 {{ generatingType === 'client' ? '客户版' : '开发版' }} PRD...</h4>
            <p>AI 正在分析需求并生成{{ phaseNames[currentPhase] }}阶段文档，请稍候</p>
          </div>
        </div>
        
        <!-- ⭐ PRD 预览区域（当前阶段） -->
        <div class="preview-tabs card" v-if="currentPhaseData?.prdClient || currentPhaseData?.prdDev">
          <el-tabs v-model="activeTab" type="border-card">
            <el-tab-pane 
              :label="`Phase ${currentPhase} 客户版`" 
              name="client" 
              :disabled="!currentPhaseData?.prdClient"
            >
              <div class="tab-header">
                <el-button-group>
                  <el-button :icon="View" @click="previewMode = 'preview'" :type="previewMode === 'preview' ? 'primary' : ''">
                    预览
                  </el-button>
                  <el-button :icon="EditPen" @click="previewMode = 'edit'" :type="previewMode === 'edit' ? 'primary' : ''">
                    编辑
                  </el-button>
                </el-button-group>
                <div class="tab-actions">
                  <el-button @click="copyContent('client')">
                    <el-icon><CopyDocument /></el-icon> 复制
                  </el-button>
                  <el-button @click="downloadContent('client')">
                    <el-icon><Download /></el-icon> 下载
                  </el-button>
                </div>
              </div>
              
              <div v-if="previewMode === 'preview'" class="markdown-preview" v-html="clientPrdHtml"></div>
              <el-input 
                v-else 
                v-model="editableClientPrd" 
                type="textarea" 
                :rows="25"
                @blur="saveClientPrd"
              />
            </el-tab-pane>
            
            <el-tab-pane 
              :label="`Phase ${currentPhase} 开发版`" 
              name="dev" 
              :disabled="!currentPhaseData?.prdDev"
            >
              <div class="tab-header">
                <el-button-group>
                  <el-button :icon="View" @click="previewMode = 'preview'" :type="previewMode === 'preview' ? 'primary' : ''">
                    预览
                  </el-button>
                  <el-button :icon="EditPen" @click="previewMode = 'edit'" :type="previewMode === 'edit' ? 'primary' : ''">
                    编辑
                  </el-button>
                </el-button-group>
                <div class="tab-actions">
                  <el-button @click="copyContent('dev')">
                    <el-icon><CopyDocument /></el-icon> 复制
                  </el-button>
                  <el-button @click="downloadContent('dev')">
                    <el-icon><Download /></el-icon> 下载
                  </el-button>
                </div>
              </div>
              
              <div v-if="previewMode === 'preview'" class="markdown-preview" v-html="devPrdHtml"></div>
              <el-input 
                v-else 
                v-model="editableDevPrd" 
                type="textarea" 
                :rows="25"
                @blur="saveDevPrd"
              />
            </el-tab-pane>
          </el-tabs>
        </div>
        
        <!-- ⭐ 阶段操作区（PRD完成后） -->
        <div v-if="currentPhaseData?.prdClient && currentPhaseData?.prdDev" class="card next-step-card">
          <div class="next-step-content">
            <div class="step-icon">{{ currentPhaseData?.demoCode ? '✅' : '🚀' }}</div>
            <div class="step-info">
              <h3 v-if="!currentPhaseData?.demoCode">
                Phase {{ currentPhase }} PRD 已完成
              </h3>
              <h3 v-else-if="currentPhaseData?.testResult">
                Phase {{ currentPhase }} 已通过测试！
              </h3>
              <h3 v-else>
                Phase {{ currentPhase }} Demo 已生成
              </h3>
              
              <p v-if="!currentPhaseData?.demoCode">
                {{ phaseNames[currentPhase] }}阶段 PRD 已生成，确认后可以生成 Demo 代码
              </p>
              <p v-else-if="!currentPhaseData?.testResult">
                请测试验证后确认通过，进入下一阶段
              </p>
              <p v-else>
                {{ currentPhase < 3 ? '可以进入下一阶段' : '三阶段全部完成！' }}
              </p>
            </div>
            
            <div class="step-buttons">
              <!-- 生成Demo -->
              <el-button 
                v-if="!currentPhaseData?.demoCode"
                type="primary" 
                size="large"
                :loading="generatingDemo"
                @click="confirmAndGenerateDemo"
              >
                {{ generatingDemo ? '生成中...' : '确认PRD并生成Demo' }}
              </el-button>
              
              <!-- 查看Demo -->
              <el-button 
                v-if="currentPhaseData?.demoCode"
                type="info" 
                @click="router.push('/demo')"
              >
                查看Demo
              </el-button>
              
              <!-- 确认测试通过 -->
              <el-button 
                v-if="currentPhaseData?.demoCode && !currentPhaseData?.testResult"
                type="success" 
                size="large"
                @click="confirmPhasePass"
              >
                ✅ 测试通过，{{ currentPhase < 3 ? '进入下一阶段' : '全部完成' }}
              </el-button>
              
              <!-- 进入下一阶段 -->
              <el-button 
                v-if="currentPhaseData?.testResult && currentPhase < 3"
                type="primary" 
                size="large"
                @click="startNextPhase"
              >
                🚀 开始 Phase {{ currentPhase + 1 }} ({{ phaseNames[currentPhase + 1] }})
              </el-button>
            </div>
          </div>
        </div>
        
        <!-- ⭐ 历史阶段查看（折叠） -->
        <div v-if="hasCompletedPhases" class="card history-card">
          <el-collapse>
            <el-collapse-item 
              v-for="p in completedPhasesList" 
              :key="p"
              :title="`Phase ${p} — ${phaseNames[p]} ✅`"
            >
              <div class="history-phase">
                <div class="history-meta">
                  <el-tag type="success" size="small">已完成</el-tag>
                  <span v-if="getPhase(p)?.completedAt">{{ formatDate(getPhase(p).completedAt) }}</span>
                </div>
                <el-tabs>
                  <el-tab-pane label="客户版PRD">
                    <div class="markdown-preview small" v-html="renderMarkdown(getPhase(p)?.prdClient || '')"></div>
                  </el-tab-pane>
                  <el-tab-pane label="开发版PRD">
                    <div class="markdown-preview small" v-html="renderMarkdown(getPhase(p)?.prdDev || '')"></div>
                  </el-tab-pane>
                </el-tabs>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </template>
    </template>
    
    <!-- 未选择项目 -->
    <div v-else class="empty-state">
      <el-icon><FolderOpened /></el-icon>
      <p>请先在需求池中选择一个项目</p>
      <el-button type="primary" @click="$router.push('/requirement-pool')">去需求池</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'
import { View, EditPen, Loading, Plus } from '@element-plus/icons-vue'
import { useProjectStore } from '@/stores/project'
import { useSettingsStore } from '@/stores/settings'
import { useExperienceStore } from '@/stores/experience'
import { callAI, PRD_PROMPTS, generateClientPRD, generateDevPRD } from '@/api/ai'
import { aiQueue, triggerAutomation, triggerPhaseDemo } from '@/utils/aiQueue'

const router = useRouter()
const projectStore = useProjectStore()
const settingsStore = useSettingsStore()
const experienceStore = useExperienceStore()

// 阶段常量
const phaseNames = { 1: '骨架', 2: '血肉', 3: '衣服' }
const phaseDescs = { 
  1: 'P0核心功能 — 最小可行产品，跑通核心链路',
  2: 'P0+P1完整功能 — 完善体验，增加辅助功能',
  3: 'P2拓展功能 — 商业化、运营、中长期规划'
}
const phaseIcons = { 1: '🦴', 2: '🫀', 3: '👔' }
const progressColors = [
  { color: '#f56c6c', percentage: 20 },
  { color: '#e6a23c', percentage: 50 },
  { color: '#409eff', percentage: 80 },
  { color: '#67c23a', percentage: 100 }
]

// 状态
const activeTab = ref('client')
const previewMode = ref('preview')
const generating = ref(false)
const generatingType = ref('')
const generatingClient = ref(false)
const generatingDev = ref(false)
const generatingDemo = ref(false)

// 自动化状态
const isAutoGenerating = ref(false)
const autoStep = ref(0)
const autoSteps = ref([
  { desc: '准备中...' },
  { desc: '等待中...' },
  { desc: '等待中...' }
])
const appliedExperiencesCount = ref(0)
let progressInterval = null

const editableClientPrd = ref('')
const editableDevPrd = ref('')

// ⭐ 计算当前阶段
const currentPhase = computed(() => {
  return projectStore.currentProject?.currentPhase || 1
})

const currentPhaseData = computed(() => {
  const project = projectStore.currentProject
  if (!project?.phases) return null
  return project.phases[currentPhase.value]
})

// 获取指定阶段数据
function getPhase(num) {
  return projectStore.currentProject?.phases?.[num]
}

// ⭐ 总体进度
const overallProgress = computed(() => {
  const project = projectStore.currentProject
  if (!project?.phases) return 0
  
  let total = 0
  for (let p = 1; p <= 3; p++) {
    const phase = project.phases[p]
    if (!phase) continue
    if (phase.status === 'completed') total += 33.3
    else if (phase.demoCode) total += 25
    else if (phase.prdDev) total += 20
    else if (phase.prdClient) total += 10
    else if (phase.status !== 'locked') total += 2
  }
  return Math.min(100, Math.round(total))
})

const overallStatusText = computed(() => {
  const project = projectStore.currentProject
  if (!project?.phases) return '未开始'
  if (project.stage === 'all_phases_completed') return '🎉 三阶段全部完成'
  return `Phase ${currentPhase.value} — ${phaseNames[currentPhase.value]}阶段`
})

const overallStatusType = computed(() => {
  const project = projectStore.currentProject
  if (project?.stage === 'all_phases_completed') return 'success'
  return ''
})

const hasCompletedPhases = computed(() => {
  return completedPhasesList.value.length > 0
})

const completedPhasesList = computed(() => {
  const project = projectStore.currentProject
  if (!project?.phases) return []
  const list = []
  for (let p = 1; p <= 3; p++) {
    if (project.phases[p]?.status === 'completed' && p !== currentPhase.value) {
      list.push(p)
    }
  }
  return list
})

// 监听阶段PRD变化
watch(() => currentPhaseData.value?.prdClient, (val) => {
  editableClientPrd.value = val || ''
}, { immediate: true })

watch(() => currentPhaseData.value?.prdDev, (val) => {
  editableDevPrd.value = val || ''
}, { immediate: true })

// Markdown 渲染
const clientPrdHtml = computed(() => marked(currentPhaseData.value?.prdClient || ''))
const devPrdHtml = computed(() => marked(currentPhaseData.value?.prdDev || ''))

function renderMarkdown(content) {
  return marked(content)
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('zh-CN')
}

// ⭐ 切换查看阶段（仅已完成或当前阶段可点击）
function switchPhase(p) {
  const phase = getPhase(p)
  if (phase?.status === 'locked') {
    ElMessage.warning('该阶段尚未解锁，请先完成前置阶段')
    return
  }
}

// ⭐ 生成当前阶段客户版PRD
async function generatePhaseClientPRD() {
  generatingClient.value = true
  generating.value = true
  generatingType.value = 'client'
  
  try {
    const project = projectStore.currentProject
    const phase = currentPhase.value
    
    // 获取前阶段PRD
    const prevPRDs = {}
    if (phase >= 2 && project.phases?.[1]) prevPRDs.phase1 = project.phases[1].prdClient || ''
    if (phase >= 3 && project.phases?.[2]) prevPRDs.phase2 = project.phases[2].prdClient || ''
    
    // 获取相关经验
    const relevantExp = experienceStore.getRelevantExperiences({
      tags: [`type:${project.requirement?.appType}`, 'stage:prd_generation'],
      projectType: project.requirement?.appType,
      stage: 'prd_generation'
    })
    
    const result = await generateClientPRD(project.requirement, {
      phase,
      experiences: relevantExp.slice(0, 3),
      prevPRDs
    })
    
    projectStore.savePhasePRD('client', result, phase)
    editableClientPrd.value = result
    activeTab.value = 'client'
    ElMessage.success(`Phase ${phase} 客户版 PRD 生成成功！`)
    
  } catch (error) {
    ElMessage.error('生成失败: ' + (error.message || '未知错误'))
  } finally {
    generatingClient.value = false
    generating.value = false
  }
}

// ⭐ 生成当前阶段开发版PRD
async function generatePhaseDevPRD() {
  generatingDev.value = true
  generating.value = true
  generatingType.value = 'dev'
  
  try {
    const project = projectStore.currentProject
    const phase = currentPhase.value
    const clientPRD = currentPhaseData.value?.prdClient || ''
    
    const prevPRDs = {}
    if (phase >= 2 && project.phases?.[1]) prevPRDs.phase1 = project.phases[1].prdDev || ''
    if (phase >= 3 && project.phases?.[2]) prevPRDs.phase2 = project.phases[2].prdDev || ''
    
    const result = await generateDevPRD(project.requirement, clientPRD, {
      phase,
      prevPRDs
    })
    
    projectStore.savePhasePRD('dev', result, phase)
    editableDevPrd.value = result
    activeTab.value = 'dev'
    ElMessage.success(`Phase ${phase} 开发版 PRD 生成成功！`)
    
  } catch (error) {
    ElMessage.error('生成失败: ' + (error.message || '未知错误'))
  } finally {
    generatingDev.value = false
    generating.value = false
  }
}

// 保存编辑
function saveClientPrd() {
  projectStore.savePhasePRD('client', editableClientPrd.value, currentPhase.value)
}

function saveDevPrd() {
  projectStore.savePhasePRD('dev', editableDevPrd.value, currentPhase.value)
}

// 复制内容
async function copyContent(type) {
  const content = type === 'client' ? currentPhaseData.value?.prdClient : currentPhaseData.value?.prdDev
  if (!content) return
  
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success('已复制到剪贴板')
  } catch (e) {
    ElMessage.error('复制失败')
  }
}

// 下载内容
function downloadContent(type) {
  const content = type === 'client' ? currentPhaseData.value?.prdClient : currentPhaseData.value?.prdDev
  if (!content) return
  
  const projectName = projectStore.currentProject?.name || '项目'
  const typeName = type === 'client' ? '客户版' : '开发版'
  const filename = `${projectName}_Phase${currentPhase.value}_PRD_${typeName}.md`
  
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('文件已下载')
}

// ⭐ 确认PRD并生成Demo
async function confirmAndGenerateDemo() {
  try {
    generatingDemo.value = true
    
    ElMessage({
      message: `🚀 Phase ${currentPhase.value} Demo 开始生成，预计3-5分钟...`,
      type: 'info',
      duration: 3000
    })
    
    triggerPhaseDemo(projectStore.currentProject.id, currentPhase.value)
    
    setTimeout(() => {
      router.push('/demo')
    }, 1000)
    
  } catch (error) {
    ElMessage.error('启动Demo生成失败: ' + (error.message || '未知错误'))
    generatingDemo.value = false
  }
}

// ⭐ 确认阶段通过
async function confirmPhasePass() {
  try {
    await ElMessageBox.confirm(
      `确认 Phase ${currentPhase.value}（${phaseNames[currentPhase.value]}）测试通过？\n通过后将${currentPhase.value < 3 ? '解锁下一阶段' : '完成全部开发'}。`,
      '确认阶段通过',
      { type: 'success', confirmButtonText: '确认通过', cancelButtonText: '取消' }
    )
    
    const nextPhase = projectStore.completePhase(currentPhase.value)
    
    if (nextPhase) {
      ElMessage.success(`🎉 Phase ${currentPhase.value} 通过！已解锁 Phase ${nextPhase}（${phaseNames[nextPhase]}）`)
    } else {
      ElMessage.success('🎉 恭喜！三个阶段全部完成！')
    }
  } catch {
    // 取消
  }
}

// ⭐ 开始下一阶段
function startNextPhase() {
  const nextPhase = currentPhase.value + 1
  if (nextPhase > 3) return
  
  ElMessage.info(`开始 Phase ${nextPhase}（${phaseNames[nextPhase]}）...`)
}

// 检测自动化进度
function checkAutomationProgress() {
  const project = projectStore.currentProject
  if (!project || !project.autoMode) {
    isAutoGenerating.value = false
    return
  }
  
  const queueStatus = aiQueue.getStatus()
  
  if (queueStatus.running || queueStatus.queueLength > 0) {
    isAutoGenerating.value = true
    
    const phaseData = currentPhaseData.value
    
    if (!phaseData?.prdClient) {
      autoStep.value = 0
      autoSteps.value[0].desc = '正在生成中... 🤖'
    } else if (!phaseData?.prdDev) {
      autoStep.value = 1
      autoSteps.value[0].desc = '已完成 ✓'
      autoSteps.value[1].desc = '正在生成中... 🤖'
    } else {
      autoStep.value = 2
      autoSteps.value[0].desc = '已完成 ✓'
      autoSteps.value[1].desc = '已完成 ✓'
      autoSteps.value[2].desc = '请您确认 👀'
      isAutoGenerating.value = false
    }
    
    const experiences = experienceStore.getRelevantExperiences({
      projectType: project.requirement?.appType,
      stage: 'prd_generation'
    })
    appliedExperiencesCount.value = Math.min(experiences.length, 3)
  } else {
    if (currentPhaseData.value?.prdClient && currentPhaseData.value?.prdDev) {
      isAutoGenerating.value = false
    }
  }
}

onMounted(() => {
  checkAutomationProgress()
  progressInterval = setInterval(checkAutomationProgress, 2000)
})

onUnmounted(() => {
  if (progressInterval) clearInterval(progressInterval)
})
</script>

<style scoped>
.prd-page {
  max-width: 1000px;
  margin: 0 auto;
}

/* ⭐ 三阶段进度条 */
.phase-progress-card {
  margin-bottom: 24px;
}

.phase-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.phase-progress-header h3 {
  margin: 0;
  font-size: 16px;
}

.phase-timeline {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  padding: 0 20px;
}

.phase-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  cursor: pointer;
  z-index: 1;
  flex: 1;
  transition: all 0.3s;
}

.phase-node:hover:not(.locked) {
  transform: translateY(-2px);
}

.phase-dot {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  background: var(--bg-tertiary);
  border: 3px solid var(--border-color);
  color: var(--text-secondary);
  transition: all 0.3s;
}

.phase-node.active .phase-dot {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-color: #667eea;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.phase-node.completed .phase-dot {
  background: #67c23a;
  border-color: #67c23a;
  color: white;
}

.phase-node.locked .phase-dot {
  opacity: 0.5;
  cursor: not-allowed;
}

.phase-label {
  margin-top: 8px;
  text-align: center;
}

.phase-label strong {
  display: block;
  font-size: 13px;
  color: var(--text-primary);
}

.phase-label span {
  font-size: 12px;
  color: var(--text-secondary);
}

.phase-connector {
  position: absolute;
  top: 24px;
  left: 60%;
  width: 80%;
  height: 3px;
  background: var(--border-color);
  z-index: 0;
}

.phase-node.completed .phase-connector {
  background: #67c23a;
}

/* 阶段详情卡片 */
.phase-detail-card {
  margin-bottom: 20px;
}

.phase-detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.phase-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 14px;
  white-space: nowrap;
}

.phase-badge.phase-1 { background: #fef0f0; color: #f56c6c; }
.phase-badge.phase-2 { background: #fdf6ec; color: #e6a23c; }
.phase-badge.phase-3 { background: #f0f9eb; color: #67c23a; }

.phase-detail-header h3 {
  margin: 0;
  font-size: 18px;
}

.phase-detail-header p {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.phase-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.phase-status-row {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

/* 警告卡片 */
.warning-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--warning-color);
  background: rgba(230, 162, 60, 0.1);
}

.warning-card .el-icon { font-size: 32px; color: var(--warning-color); }
.warning-card h4 { margin: 0 0 4px 0; color: var(--text-primary); }
.warning-card p { margin: 0; color: var(--text-secondary); font-size: 14px; }

/* 自动化进度 */
.auto-progress-card {
  margin-bottom: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.auto-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.auto-header .el-icon { font-size: 48px; color: white; }
.auto-header h3 { margin: 0 0 4px 0; font-size: 20px; font-weight: 600; }
.auto-header p { margin: 0; font-size: 14px; opacity: 0.9; }

.auto-progress-card :deep(.el-steps) {
  margin: 20px 0;
  background: rgba(255,255,255,0.1);
  padding: 16px;
  border-radius: 8px;
}

.auto-progress-card :deep(.el-step__title) { color: rgba(255,255,255,0.9); }
.auto-progress-card :deep(.el-step__description) { color: rgba(255,255,255,0.7); }

.auto-tips { margin-top: 16px; }
.auto-tips :deep(.el-alert) { background: rgba(255,255,255,0.15); border: none; }
.auto-tips :deep(.el-alert__title) { color: white; }

.rotating { animation: rotate 2s linear infinite; }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* 生成中 */
.generating-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid var(--primary-color);
  background: rgba(212, 175, 55, 0.1);
}

.loading-icon {
  font-size: 32px;
  color: var(--primary-color);
  animation: spin 1s linear infinite;
}

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.generating-card h4 { margin: 0 0 4px 0; }
.generating-card p { margin: 0; color: var(--text-secondary); font-size: 14px; }

/* 预览标签页 */
.preview-tabs { padding: 0; }
.preview-tabs :deep(.el-tabs__header) { background: var(--bg-tertiary); margin: 0; }
.preview-tabs :deep(.el-tabs__content) { padding: 20px; }

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.tab-actions { display: flex; gap: 8px; }

.markdown-preview {
  max-height: 600px;
  overflow-y: auto;
  padding: 20px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.markdown-preview.small { max-height: 300px; }

/* 下一步卡片 */
.next-step-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.next-step-content {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.step-icon { font-size: 48px; flex-shrink: 0; }
.step-info { flex: 1; min-width: 200px; }
.step-info h3 { margin: 0 0 8px 0; color: white; font-size: 20px; }
.step-info p { margin: 0; color: rgba(255,255,255,0.9); font-size: 14px; }

.step-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.next-step-content .el-button { flex-shrink: 0; }

/* 历史阶段 */
.history-card { margin-top: 24px; }
.history-phase { padding: 8px 0; }
.history-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.history-meta span { font-size: 13px; color: var(--text-secondary); }

/* 响应式 */
@media (max-width: 768px) {
  .phase-actions {
    margin-left: 0;
    width: 100%;
  }
  .phase-detail-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .step-buttons {
    width: 100%;
  }
  .step-buttons .el-button {
    width: 100%;
  }
}
</style>
