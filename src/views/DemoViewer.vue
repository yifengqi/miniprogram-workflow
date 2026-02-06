<template>
  <div class="demo-page">
    <div class="page-header">
      <h1 class="page-title">Demo代码</h1>
      <p class="page-desc">
        {{ projectStore.currentProject ? `当前项目：${projectStore.currentProject.name}` : '请先选择一个项目' }}
      </p>
    </div>
    
    <template v-if="projectStore.currentProject">
      <!-- ⭐ 阶段选择器 -->
      <div v-if="projectStore.currentProject.phases" class="card phase-selector-card">
        <span class="selector-label">查看阶段：</span>
        <el-radio-group v-model="viewPhase" size="small">
          <el-radio-button 
            v-for="p in 3" :key="p" :value="p"
            :disabled="!getPhaseDemo(p)"
          >
            {{ phaseLabels[p] }}
            <el-tag v-if="getPhaseDemo(p)" type="success" size="small" style="margin-left:4px;">✓</el-tag>
          </el-radio-button>
        </el-radio-group>
      </div>
      
      <!-- Demo未生成 -->
      <div v-if="!activeDemoCode" class="card warning-card">
        <el-icon><InfoFilled /></el-icon>
        <div>
          <h4>{{ phaseLabels[viewPhase] }} 尚未生成Demo代码</h4>
          <p>请先完成PRD生成，然后点击"生成Demo"</p>
        </div>
        <el-button type="primary" @click="$router.push('/prd')">
          去生成PRD
        </el-button>
      </div>
      
      <!-- Demo生成中 -->
      <div v-else-if="generatingDemo" class="card generating-card">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <div>
          <h4>正在生成Demo代码...</h4>
          <p>AI正在根据PRD生成完整的小程序代码，请稍候（预计3-5分钟）</p>
          <el-progress 
            :percentage="demoProgress" 
            :status="demoProgress === 100 ? 'success' : undefined"
            style="margin-top: 12px; width: 100%;"
          />
        </div>
      </div>
      
      <!-- Demo已生成 -->
      <template v-else>
        <!-- 项目信息卡片 -->
        <div class="card project-info-card">
          <div class="info-row">
            <div class="info-item">
              <span class="info-label">项目名称</span>
              <span class="info-value">{{ demoCode.projectName || projectStore.currentProject.name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">文件数量</span>
              <span class="info-value">{{ demoCode.files?.length || 0 }} 个</span>
            </div>
            <div class="info-item">
              <span class="info-label">云函数</span>
              <span class="info-value">{{ demoCode.cloudFunctions?.length || 0 }} 个</span>
            </div>
          </div>
          
          <!-- GitHub仓库信息 -->
          <div v-if="projectStore.currentProject.githubRepo" class="github-info">
            <el-icon style="color: #333;"><Link /></el-icon>
            <span>已推送到GitHub：</span>
            <el-link 
              :href="projectStore.currentProject.githubRepo.url" 
              target="_blank"
              type="primary"
            >
              {{ projectStore.currentProject.githubRepo.name }}
            </el-link>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="card actions-card">
          <div class="actions-grid">
            <el-button 
              type="primary" 
              size="large"
              @click="downloadAllCode"
            >
              <el-icon><Download /></el-icon>
              下载完整代码
            </el-button>
            
            <el-button 
              v-if="projectStore.currentProject.githubRepo"
              size="large"
              @click="openGitHub"
            >
              <el-icon><Link /></el-icon>
              在GitHub中查看
            </el-button>
            
            <el-button 
              v-else
              size="large"
              :loading="pushingToGithub"
              @click="pushToGitHub"
            >
              <el-icon><Upload /></el-icon>
              {{ pushingToGithub ? '推送中...' : '推送到GitHub' }}
            </el-button>
            
            <el-button 
              size="large"
              @click="viewSetupGuide"
            >
              <el-icon><Reading /></el-icon>
              查看使用说明
            </el-button>
            
            <el-button 
              type="warning"
              size="large"
              @click="goToIteration"
            >
              <el-icon><ChatDotRound /></el-icon>
              提交反馈/迭代
            </el-button>
          </div>
        </div>
        
        <!-- 项目结构 -->
        <div class="card structure-card">
          <h3>📁 项目结构</h3>
          <div class="structure-tree">
            <pre>{{ demoCode.structure?.tree || '加载中...' }}</pre>
          </div>
          <p class="structure-desc" v-if="demoCode.structure?.description">
            {{ demoCode.structure.description }}
          </p>
        </div>
        
        <!-- 文件列表 -->
        <div class="card files-card">
          <div class="card-header">
            <h3>📄 代码文件</h3>
            <el-input
              v-model="fileSearchText"
              placeholder="搜索文件..."
              style="width: 300px;"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
          
          <el-collapse v-model="activeFiles" accordion>
            <el-collapse-item 
              v-for="(file, index) in filteredFiles" 
              :key="file.path"
              :name="index"
            >
              <template #title>
                <div class="file-header">
                  <el-icon style="margin-right: 8px;"><Document /></el-icon>
                  <span class="file-path">{{ file.path }}</span>
                  <el-tag size="small" style="margin-left: 12px;">{{ file.type }}</el-tag>
                  <span v-if="file.description" class="file-desc">{{ file.description }}</span>
                </div>
              </template>
              
              <div class="file-content">
                <div class="file-actions">
                  <el-button size="small" @click.stop="copyFileContent(file)">
                    <el-icon><CopyDocument /></el-icon>
                    复制代码
                  </el-button>
                  <el-button size="small" @click.stop="downloadFile(file)">
                    <el-icon><Download /></el-icon>
                    下载文件
                  </el-button>
                </div>
                <pre class="code-block"><code>{{ file.content }}</code></pre>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
        
        <!-- 使用说明对话框 -->
        <el-dialog
          v-model="setupDialogVisible"
          title="📖 使用说明"
          width="70%"
        >
          <div class="setup-guide">
            <h3>快速开始步骤</h3>
            <ol>
              <li v-for="(step, index) in demoCode.setup?.steps || []" :key="index">
                {{ step }}
              </li>
            </ol>
            
            <h3 v-if="demoCode.setup?.notes?.length">注意事项</h3>
            <ul v-if="demoCode.setup?.notes?.length">
              <li v-for="(note, index) in demoCode.setup.notes" :key="index">
                {{ note }}
              </li>
            </ul>
          </div>
        </el-dialog>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import { 
  InfoFilled, Loading, Link, Download, Upload, Reading, 
  Search, Document, CopyDocument, FolderOpened, ChatDotRound
} from '@element-plus/icons-vue'
import { useProjectStore } from '@/stores/project'
import { aiQueue } from '@/utils/aiQueue'
import { githubService } from '@/utils/github'
import JSZip from 'jszip'

const router = useRouter()
const projectStore = useProjectStore()

const generatingDemo = ref(false)
const demoProgress = ref(0)
const pushingToGithub = ref(false)
const setupDialogVisible = ref(false)
const fileSearchText = ref('')
const activeFiles = ref([])

// ⭐ 阶段相关
const viewPhase = ref(projectStore.currentProject?.currentPhase || 1)
const phaseLabels = { 1: 'Phase 1 骨架', 2: 'Phase 2 血肉', 3: 'Phase 3 衣服' }

function getPhaseDemo(p) {
  return projectStore.currentProject?.phases?.[p]?.demoCode
}

// 计算属性（阶段感知）
const activeDemoCode = computed(() => {
  const project = projectStore.currentProject
  if (!project) return null
  // 如果有phases结构，从阶段中取
  if (project.phases?.[viewPhase.value]?.demoCode) {
    return project.phases[viewPhase.value].demoCode
  }
  // 兼容旧数据
  return project.demoCode
})

const demoCode = computed(() => activeDemoCode.value || {})

const filteredFiles = computed(() => {
  if (!demoCode.value.files) return []
  
  const search = fileSearchText.value.toLowerCase()
  if (!search) return demoCode.value.files
  
  return demoCode.value.files.filter(file => 
    file.path.toLowerCase().includes(search) ||
    file.description?.toLowerCase().includes(search)
  )
})

// 监听Demo生成进度
let progressInterval = null

function checkDemoProgress() {
  const project = projectStore.currentProject
  if (!project) return
  
  // ⭐ 使用修复后的 hasTask 方法
  const hasDemoTask = aiQueue.hasTask('generate_demo', project.id)
  
  // 也检查是否有PRD任务在跑（PRD跑完才会到Demo）
  const hasPrdTask = aiQueue.hasTask('generate_prd_client', project.id) || 
                     aiQueue.hasTask('generate_prd_dev', project.id)
  
  if (hasDemoTask) {
    generatingDemo.value = true
    demoProgress.value = Math.min(95, demoProgress.value + 2)
  } else if (hasPrdTask) {
    // PRD还在生成，Demo还没开始
    generatingDemo.value = true
    demoProgress.value = Math.min(30, demoProgress.value + 1)
  } else if (activeDemoCode.value) {
    generatingDemo.value = false
    demoProgress.value = 100
  } else {
    // 没有任务也没有Demo，可能任务已失败
    if (generatingDemo.value && demoProgress.value > 0) {
      // 之前在生成，现在没了，可能失败了
      generatingDemo.value = false
    }
  }
}

onMounted(() => {
  checkDemoProgress()
  progressInterval = setInterval(checkDemoProgress, 2000)
})

onUnmounted(() => {
  if (progressInterval) {
    clearInterval(progressInterval)
  }
})

// 下载完整代码
async function downloadAllCode() {
  try {
    const zip = new JSZip()
    const projectName = demoCode.value.projectName || projectStore.currentProject.name
    
    // 添加所有文件
    demoCode.value.files.forEach(file => {
      zip.file(file.path, file.content)
    })
    
    // 添加云函数
    if (demoCode.value.cloudFunctions?.length) {
      demoCode.value.cloudFunctions.forEach(fn => {
        zip.file(fn.path, fn.content)
      })
    }
    
    // 生成zip
    const content = await zip.generateAsync({ type: 'blob' })
    
    // 下载
    const url = URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName}.zip`
    a.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success('代码已下载！')
    
  } catch (error) {
    ElMessage.error('下载失败: ' + (error.message || '未知错误'))
  }
}

// 推送到GitHub
async function pushToGitHub() {
  if (!githubService.isConfigured()) {
    ElMessage.warning('请先在设置中配置GitHub Token')
    return
  }
  
  try {
    pushingToGithub.value = true
    
    await aiQueue.pushToGitHub(
      projectStore.currentProject,
      demoCode.value
    )
    
    ElMessage.success('推送成功！')
    
  } catch (error) {
    ElMessage.error('推送失败: ' + (error.message || '未知错误'))
  } finally {
    pushingToGithub.value = false
  }
}

// 打开GitHub仓库
function openGitHub() {
  if (projectStore.currentProject.githubRepo?.url) {
    window.open(projectStore.currentProject.githubRepo.url, '_blank')
  }
}

// 查看使用说明
function viewSetupGuide() {
  setupDialogVisible.value = true
}

// 复制文件内容
async function copyFileContent(file) {
  try {
    await navigator.clipboard.writeText(file.content)
    ElMessage.success(`已复制 ${file.path}`)
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 下载单个文件
function downloadFile(file) {
  const blob = new Blob([file.content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.path.split('/').pop()
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('文件已下载')
}

// 跳转到迭代管理
function goToIteration() {
  router.push('/iteration')
}
</script>

<style scoped>
.demo-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.page-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

/* 警告卡片 */
.warning-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
  border: none;
}

.warning-card .el-icon {
  font-size: 32px;
  color: #d63031;
  flex-shrink: 0;
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

/* 生成中卡片 */
.generating-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.loading-icon {
  font-size: 32px;
  color: var(--el-color-primary);
  animation: spin 1s linear infinite;
  flex-shrink: 0;
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
  margin: 0 0 12px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

/* 项目信息卡片 */
.project-info-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.info-row {
  display: flex;
  gap: 32px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  opacity: 0.8;
}

.info-value {
  font-size: 20px;
  font-weight: 600;
}

.github-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

/* 操作按钮 */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

/* 项目结构 */
.structure-tree {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 16px;
  margin: 12px 0;
  overflow-x: auto;
}

.structure-tree pre {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
}

.structure-desc {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 8px 0 0 0;
}

/* 文件列表 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h3 {
  margin: 0;
}

.file-header {
  display: flex;
  align-items: center;
  flex: 1;
}

.file-path {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: var(--text-primary);
}

.file-desc {
  margin-left: auto;
  color: var(--text-secondary);
  font-size: 12px;
}

.file-content {
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.file-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.code-block {
  margin: 0;
  padding: 16px;
  background: #2d2d2d;
  border-radius: 6px;
  overflow-x: auto;
  max-height: 500px;
  overflow-y: auto;
}

.code-block code {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #f8f8f2;
}

/* 使用说明对话框 */
.setup-guide h3 {
  margin: 20px 0 12px 0;
  color: var(--text-primary);
}

.setup-guide h3:first-child {
  margin-top: 0;
}

.setup-guide ol,
.setup-guide ul {
  padding-left: 24px;
  line-height: 1.8;
}

.setup-guide li {
  margin-bottom: 8px;
  color: var(--text-secondary);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-secondary);
}

.empty-state .el-icon {
  font-size: 80px;
  color: var(--text-disabled);
  margin-bottom: 16px;
}

.empty-state p {
  font-size: 16px;
  margin: 0 0 20px 0;
}
</style>
