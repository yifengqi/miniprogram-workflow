<template>
  <div class="prd-page">
    <div class="page-header">
      <h1 class="page-title">PRD 生成</h1>
      <p class="page-desc">
        {{ projectStore.currentProject ? `当前项目：${projectStore.currentProject.name}` : '请先选择一个项目' }}
      </p>
    </div>
    
    <template v-if="projectStore.currentProject">
      <!-- ⭐ 自动化进度显示 -->
      <div v-if="isAutoGenerating" class="card auto-progress-card">
        <div class="auto-header">
          <el-icon class="rotating"><Loading /></el-icon>
          <div>
            <h3>🤖 AI 自动化进行中</h3>
            <p>系统正在自动生成PRD，您无需任何操作</p>
          </div>
        </div>
        
        <el-steps :active="autoStep" align-center finish-status="success">
          <el-step title="客户版PRD" :description="autoSteps[0].desc" />
          <el-step title="开发版PRD" :description="autoSteps[1].desc" />
          <el-step title="等待您确认" :description="autoSteps[2].desc" />
        </el-steps>
        
        <el-progress 
          v-if="autoProgress < 100"
          :percentage="autoProgress" 
          :status="autoProgress === 100 ? 'success' : undefined"
          :stroke-width="12"
        />
        
        <div class="auto-tips">
          <el-alert type="info" :closable="false">
            <template #title>
              💡 系统已应用 <strong>{{ appliedExperiencesCount }}</strong> 条历史经验，避免常见问题
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
        <el-button type="primary" @click="$router.push('/requirement')">
          去收集需求
        </el-button>
      </div>
      
      <!-- AI 配置检查 -->
      <div v-else-if="!settingsStore.isConfigured()" class="card warning-card">
        <el-icon><Warning /></el-icon>
        <div>
          <h4>尚未配置 AI 接口</h4>
          <p>请先在设置中配置 API Key</p>
        </div>
        <el-button type="primary" @click="$router.push('/settings')">
          去设置
        </el-button>
      </div>
      
      <!-- PRD 生成区域 -->
      <template v-else>
        <!-- 生成按钮区域 -->
        <div class="generate-section card">
          <div class="generate-buttons">
            <div class="generate-item">
              <div class="generate-info">
                <h3>客户版 PRD</h3>
                <p>面向客户的功能说明文档，语言简洁易懂</p>
              </div>
              <div class="generate-action">
                <el-tag v-if="projectStore.currentProject.prdClient" type="success">已生成</el-tag>
                <el-button 
                  type="primary" 
                  :loading="generatingClient"
                  @click="generateClientPRD"
                >
                  {{ projectStore.currentProject.prdClient ? '重新生成' : '生成' }}
                </el-button>
              </div>
            </div>
            
            <el-divider />
            
            <div class="generate-item">
              <div class="generate-info">
                <h3>开发版 PRD</h3>
                <p>面向开发者的技术文档，包含数据库、接口、页面设计</p>
              </div>
              <div class="generate-action">
                <el-tag v-if="projectStore.currentProject.prdDev" type="success">已生成</el-tag>
                <el-button 
                  type="primary" 
                  :loading="generatingDev"
                  @click="generateDevPRD"
                  :disabled="!projectStore.currentProject.prdClient"
                >
                  {{ projectStore.currentProject.prdDev ? '重新生成' : '生成' }}
                </el-button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 生成进度 -->
        <div v-if="generating" class="card generating-card">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <div>
            <h4>正在生成 {{ generatingType === 'client' ? '客户版' : '开发版' }} PRD...</h4>
            <p>AI 正在分析需求并生成文档，请稍候</p>
          </div>
        </div>
        
        <!-- 预览区域 -->
        <div class="preview-tabs card" v-if="projectStore.currentProject.prdClient || projectStore.currentProject.prdDev">
          <el-tabs v-model="activeTab" type="border-card">
            <el-tab-pane label="客户版 PRD" name="client" :disabled="!projectStore.currentProject.prdClient">
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
                    <el-icon><CopyDocument /></el-icon>
                    复制
                  </el-button>
                  <el-button @click="downloadContent('client')">
                    <el-icon><Download /></el-icon>
                    下载
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
            
            <el-tab-pane label="开发版 PRD" name="dev" :disabled="!projectStore.currentProject.prdDev">
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
                    <el-icon><CopyDocument /></el-icon>
                    复制
                  </el-button>
                  <el-button @click="downloadContent('dev')">
                    <el-icon><Download /></el-icon>
                    下载
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
      </template>
    </template>
    
    <!-- 未选择项目 -->
    <div v-else class="empty-state">
      <el-icon><FolderOpened /></el-icon>
      <p>请先在首页创建或选择一个项目</p>
      <el-button type="primary" @click="$router.push('/')">去首页</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import { View, EditPen, Loading } from '@element-plus/icons-vue'
import { useProjectStore } from '@/stores/project'
import { useSettingsStore } from '@/stores/settings'
import { useExperienceStore } from '@/stores/experience'  // ⭐ 新增
import { callAI, PRD_PROMPTS } from '@/api/ai'
import { aiQueue } from '@/utils/aiQueue'  // ⭐ 新增

const projectStore = useProjectStore()
const settingsStore = useSettingsStore()
const experienceStore = useExperienceStore()  // ⭐ 新增

const activeTab = ref('client')
const previewMode = ref('preview')
const generating = ref(false)
const generatingType = ref('')
const generatingClient = ref(false)
const generatingDev = ref(false)

// ⭐ 自动化状态
const isAutoGenerating = ref(false)
const autoStep = ref(0)
const autoProgress = ref(0)
const autoSteps = ref([
  { desc: '准备中...' },
  { desc: '等待中...' },
  { desc: '等待中...' }
])
const appliedExperiencesCount = ref(0)
let progressInterval = null

const editableClientPrd = ref('')
const editableDevPrd = ref('')

// 监听项目变化，更新可编辑内容
watch(() => projectStore.currentProject?.prdClient, (val) => {
  editableClientPrd.value = val || ''
}, { immediate: true })

watch(() => projectStore.currentProject?.prdDev, (val) => {
  editableDevPrd.value = val || ''
}, { immediate: true })

// Markdown 渲染
const clientPrdHtml = computed(() => {
  return marked(projectStore.currentProject?.prdClient || '')
})

const devPrdHtml = computed(() => {
  return marked(projectStore.currentProject?.prdDev || '')
})

// 格式化需求数据
function formatRequirement() {
  const req = projectStore.currentProject?.requirement
  if (!req) return ''
  
  let text = ''
  text += `【项目名称】${req.appName || '未填写'}\n`
  text += `【项目背景】${req.background || '未填写'}\n`
  text += `【小程序类型】${[...req.appType, req.appTypeOther].filter(Boolean).join('、') || '未填写'}\n`
  text += `【目标用户】${req.targetUser || '未填写'}\n`
  text += `【使用场景】${req.userScenario || '未填写'}\n`
  text += `【用户规模】${req.userScale || '未填写'}\n`
  text += `【P0核心功能】\n${req.featuresP0 || '未填写'}\n`
  text += `【P1重要功能】\n${req.featuresP1 || '未填写'}\n`
  text += `【P2可选功能】\n${req.featuresP2 || '未填写'}\n`
  text += `【登录需求】${req.needLogin || '未填写'}\n`
  if (req.loginType?.length) {
    text += `【登录方式】${req.loginType.join('、')}\n`
  }
  text += `【管理后台】${req.needAdmin || '未填写'}\n`
  if (req.needAdmin === '需要') {
    text += `【后台使用者】${req.adminUser || '未填写'}\n`
    text += `【后台功能】${req.adminFeatures || '未填写'}\n`
  }
  text += `【存储数据】${req.dataStorage || '未填写'}\n`
  text += `【内容来源】${req.contentSource?.join('、') || '未填写'}\n`
  text += `【支付需求】${req.needPayment || '未填写'}\n`
  if (req.needPayment === '需要微信支付') {
    text += `【支付场景】${req.paymentScenario || '未填写'}\n`
    text += `【退款需求】${req.needRefund || '未填写'}\n`
  }
  text += `【参考项目】${req.reference || '无'}\n`
  text += `【UI风格】${req.uiStyle || '未填写'}\n`
  text += `【色调偏好】${req.colorPreference || '无特别要求'}\n`
  text += `【后端服务】${req.backend || '未填写'}\n`
  text += `【上线时间】${req.timeline || '未填写'}\n`
  text += `【预算范围】${req.budget || '未填写'}\n`
  if (req.otherNotes) {
    text += `【其他说明】${req.otherNotes}\n`
  }
  
  return text
}

// 生成客户版 PRD
async function generateClientPRD() {
  generatingClient.value = true
  generating.value = true
  generatingType.value = 'client'
  
  try {
    const requirementText = formatRequirement()
    const prompt = PRD_PROMPTS.client + requirementText
    
    const result = await callAI([
      { role: 'user', content: prompt }
    ])
    
    projectStore.savePRD('client', result)
    editableClientPrd.value = result
    activeTab.value = 'client'
    ElMessage.success('客户版 PRD 生成成功！')
    
  } catch (error) {
    ElMessage.error('生成失败: ' + (error.message || '未知错误'))
  } finally {
    generatingClient.value = false
    generating.value = false
  }
}

// 生成开发版 PRD
async function generateDevPRD() {
  generatingDev.value = true
  generating.value = true
  generatingType.value = 'dev'
  
  try {
    const requirementText = formatRequirement()
    const clientPrd = projectStore.currentProject?.prdClient || ''
    const prompt = PRD_PROMPTS.dev + requirementText + '\n\n【已确认的客户版PRD】\n' + clientPrd
    
    const result = await callAI([
      { role: 'user', content: prompt }
    ])
    
    projectStore.savePRD('dev', result)
    editableDevPrd.value = result
    activeTab.value = 'dev'
    ElMessage.success('开发版 PRD 生成成功！')
    
  } catch (error) {
    ElMessage.error('生成失败: ' + (error.message || '未知错误'))
  } finally {
    generatingDev.value = false
    generating.value = false
  }
}

// 保存编辑
function saveClientPrd() {
  projectStore.savePRD('client', editableClientPrd.value)
}

function saveDevPrd() {
  projectStore.savePRD('dev', editableDevPrd.value)
}

// 复制内容
async function copyContent(type) {
  const content = type === 'client' 
    ? projectStore.currentProject?.prdClient 
    : projectStore.currentProject?.prdDev
    
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
  const content = type === 'client' 
    ? projectStore.currentProject?.prdClient 
    : projectStore.currentProject?.prdDev
    
  if (!content) return
  
  const projectName = projectStore.currentProject?.name || '项目'
  const typeName = type === 'client' ? '客户版' : '开发版'
  const filename = `${projectName}_PRD_${typeName}.md`
  
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('文件已下载')
}

// ⭐ 检测自动化进度
function checkAutomationProgress() {
  const project = projectStore.currentProject
  if (!project || !project.autoMode) {
    isAutoGenerating.value = false
    return
  }
  
  const queueStatus = aiQueue.getStatus()
  
  // 检查是否有任务在队列中
  if (queueStatus.running || queueStatus.queueLength > 0) {
    isAutoGenerating.value = true
    
    // 更新步骤状态
    if (!project.prdClient) {
      autoStep.value = 0
      autoSteps.value[0].desc = '正在生成中... 🤖'
      autoProgress.value = 30
    } else if (!project.prdDev) {
      autoStep.value = 1
      autoSteps.value[0].desc = '已完成 ✓'
      autoSteps.value[1].desc = '正在生成中... 🤖'
      autoProgress.value = 65
    } else {
      autoStep.value = 2
      autoSteps.value[0].desc = '已完成 ✓'
      autoSteps.value[1].desc = '已完成 ✓'
      autoSteps.value[2].desc = '请您查看确认 👀'
      autoProgress.value = 100
      isAutoGenerating.value = false
    }
    
    // 计算应用的经验数
    const experiences = experienceStore.getRelevantExperiences({
      projectType: project.requirement?.appType,
      stage: 'prd_generation'
    })
    appliedExperiencesCount.value = Math.min(experiences.length, 3)
  } else {
    // 队列空了，检查是否完成
    if (project.prdClient && project.prdDev) {
      isAutoGenerating.value = false
      autoProgress.value = 100
    }
  }
}

// ⭐ 初始化和清理
onMounted(() => {
  // 检查当前项目是否在自动化中
  checkAutomationProgress()
  
  // 定期检查进度
  progressInterval = setInterval(checkAutomationProgress, 2000)
})

onUnmounted(() => {
  if (progressInterval) {
    clearInterval(progressInterval)
  }
})
</script>

<style scoped>
.prd-page {
  max-width: 1000px;
  margin: 0 auto;
}

.warning-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--warning-color);
  background: rgba(230, 162, 60, 0.1);
}

.warning-card .el-icon {
  font-size: 32px;
  color: var(--warning-color);
}

.warning-card h4 {
  margin: 0 0 4px 0;
  color: var(--text-primary);
}

.warning-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

/* ⭐ 自动化进度卡片 */
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

.auto-header .el-icon {
  font-size: 48px;
  color: white;
}

.auto-header h3 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
}

.auto-header p {
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
}

.auto-progress-card :deep(.el-steps) {
  margin: 24px 0;
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 8px;
}

.auto-progress-card :deep(.el-step__title) {
  color: rgba(255, 255, 255, 0.9);
}

.auto-progress-card :deep(.el-step__description) {
  color: rgba(255, 255, 255, 0.7);
}

.auto-progress-card :deep(.el-step__icon) {
  border-color: rgba(255, 255, 255, 0.5);
  color: rgba(255, 255, 255, 0.7);
}

.auto-progress-card :deep(.el-step__icon.is-success) {
  border-color: #67c23a;
  color: #67c23a;
}

.auto-tips {
  margin-top: 16px;
}

.auto-tips :deep(.el-alert) {
  background: rgba(255, 255, 255, 0.15);
  border: none;
}

.auto-tips :deep(.el-alert__title) {
  color: white;
}

.rotating {
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.generate-section {
  margin-bottom: 24px;
}

.generate-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
}

.generate-info h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.generate-info p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.generate-action {
  display: flex;
  align-items: center;
  gap: 12px;
}

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

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.generating-card h4 {
  margin: 0 0 4px 0;
  color: var(--text-primary);
}

.generating-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.preview-tabs {
  padding: 0;
}

.preview-tabs :deep(.el-tabs__header) {
  background: var(--bg-tertiary);
  margin: 0;
}

.preview-tabs :deep(.el-tabs__content) {
  padding: 20px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.tab-actions {
  display: flex;
  gap: 8px;
}

.markdown-preview {
  max-height: 600px;
  overflow-y: auto;
  padding: 20px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}
</style>
