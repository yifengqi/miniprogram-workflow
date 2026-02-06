<template>
  <div class="home-page">
    <div class="page-header">
      <h1 class="page-title">项目管理</h1>
      <p class="page-desc">管理你的小程序开发项目，快速启动标准化流程</p>
    </div>
    
    <!-- 快速操作 -->
    <div class="quick-actions">
      <el-button type="primary" size="large" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新建项目
      </el-button>
    </div>
    
    <!-- 项目列表 -->
    <div class="project-grid" v-if="projectStore.projects.length > 0">
      <div 
        v-for="project in projectStore.projects" 
        :key="project.id"
        class="project-card"
        :class="{ active: project.id === projectStore.currentProjectId }"
        @click="selectProject(project)"
      >
        <div class="project-card__header">
          <h3 class="project-card__title">{{ project.name }}</h3>
          <el-dropdown trigger="click" @command="handleCommand($event, project)">
            <el-button :icon="MoreFilled" text />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="rename">
                  <el-icon><Edit /></el-icon>
                  重命名
                </el-dropdown-item>
                <el-dropdown-item command="share">
                  <el-icon><Share /></el-icon>
                  分享需求表单
                </el-dropdown-item>
                <el-dropdown-item command="delete" divided>
                  <el-icon><Delete /></el-icon>
                  删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        
        <div class="project-card__content">
          <div class="project-card__status">
            <div class="status-item">
              <el-icon :class="{ done: project.requirement }"><Document /></el-icon>
              <span>需求</span>
            </div>
            <div class="status-item">
              <el-icon :class="{ done: project.prdClient }"><EditPen /></el-icon>
              <span>客户PRD</span>
            </div>
            <div class="status-item">
              <el-icon :class="{ done: project.prdDev }"><Cpu /></el-icon>
              <span>开发PRD</span>
            </div>
          </div>
        </div>
        
        <div class="project-card__footer">
          <span class="project-card__time">
            更新于 {{ formatTime(project.updatedAt) }}
          </span>
          <el-tag v-if="project.id === projectStore.currentProjectId" type="warning" size="small">
            当前项目
          </el-tag>
        </div>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="empty-state">
      <el-icon><FolderOpened /></el-icon>
      <p>还没有项目，点击上方按钮创建第一个项目</p>
    </div>
    
    <!-- 流程说明 -->
    <div class="workflow-guide card">
      <div class="card-header">
        <h3 class="card-title">标准化开发流程</h3>
      </div>
      <div class="workflow-steps">
        <div class="workflow-step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h4>需求收集</h4>
            <p>使用结构化表单向客户收集需求</p>
          </div>
        </div>
        <div class="workflow-arrow"><el-icon><ArrowRight /></el-icon></div>
        <div class="workflow-step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h4>PRD生成</h4>
            <p>AI自动生成客户版+开发版PRD</p>
          </div>
        </div>
        <div class="workflow-arrow"><el-icon><ArrowRight /></el-icon></div>
        <div class="workflow-step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h4>开发实现</h4>
            <p>按PRD进行开发迭代</p>
          </div>
        </div>
        <div class="workflow-arrow"><el-icon><ArrowRight /></el-icon></div>
        <div class="workflow-step">
          <div class="step-number">4</div>
          <div class="step-content">
            <h4>检查上线</h4>
            <p>完成非功能性检查清单</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 新建项目对话框 -->
    <el-dialog v-model="showCreateDialog" title="新建项目" width="400px">
      <el-form @submit.prevent="createProject">
        <el-form-item label="项目名称">
          <el-input v-model="newProjectName" placeholder="请输入项目名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createProject" :disabled="!newProjectName.trim()">
          创建
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 重命名对话框 -->
    <el-dialog v-model="showRenameDialog" title="重命名项目" width="400px">
      <el-form @submit.prevent="renameProject">
        <el-form-item label="项目名称">
          <el-input v-model="renameValue" placeholder="请输入新名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRenameDialog = false">取消</el-button>
        <el-button type="primary" @click="renameProject" :disabled="!renameValue.trim()">
          确定
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 分享弹窗 -->
    <el-dialog v-model="showShareDialog" title="分享需求收集表单" width="500px">
      <div class="share-dialog-content">
        <div class="share-actions">
          <el-button type="primary" @click="copyShareLink" style="width: 100%">
            <el-icon><Link /></el-icon>
            复制表单链接
          </el-button>
          <el-button @click="generateShareQRCode" style="width: 100%">
            <el-icon><PictureRounded /></el-icon>
            生成二维码
          </el-button>
        </div>
        
        <div v-if="showQRCode" class="qrcode-section">
          <div ref="qrcodeContainer" class="qrcode-container"></div>
          <p class="qrcode-hint">客户扫码即可填写需求</p>
          <el-button type="primary" @click="downloadQRCode" style="width: 100%">
            <el-icon><Download /></el-icon>
            下载二维码
          </el-button>
        </div>
        
        <el-alert 
          type="info" 
          :closable="false"
          style="margin-top: 16px"
        >
          <template #title>
            <div style="font-size: 13px;">
              分享此链接给客户，他们可以直接在线填写需求，无需登录系统
            </div>
          </template>
        </el-alert>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MoreFilled, Link, PictureRounded, Download, Share, Edit, Delete } from '@element-plus/icons-vue'
import { useProjectStore } from '@/stores/project'

const router = useRouter()
const projectStore = useProjectStore()

const showCreateDialog = ref(false)
const newProjectName = ref('')

const showRenameDialog = ref(false)
const renameValue = ref('')
const renameProjectId = ref(null)

const showShareDialog = ref(false)
const shareProjectId = ref(null)
const showQRCode = ref(false)
const qrcodeContainer = ref(null)

const publicFormUrl = window.location.origin + '/public-form'

function formatTime(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  return date.toLocaleDateString()
}

function createProject() {
  if (!newProjectName.value.trim()) return
  projectStore.createProject(newProjectName.value.trim())
  showCreateDialog.value = false
  newProjectName.value = ''
  ElMessage.success('项目创建成功')
}

function selectProject(project) {
  projectStore.selectProject(project.id)
}

function handleCommand(command, project) {
  if (command === 'rename') {
    renameProjectId.value = project.id
    renameValue.value = project.name
    showRenameDialog.value = true
  } else if (command === 'share') {
    shareProjectId.value = project.id
    showQRCode.value = false
    showShareDialog.value = true
  } else if (command === 'delete') {
    ElMessageBox.confirm('确定要删除这个项目吗？删除后无法恢复。', '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    }).then(() => {
      projectStore.deleteProject(project.id)
      ElMessage.success('项目已删除')
    }).catch(() => {})
  }
}

function copyShareLink() {
  navigator.clipboard.writeText(publicFormUrl)
  ElMessage.success('表单链接已复制到剪贴板')
}

async function generateShareQRCode() {
  showQRCode.value = true
  
  // 等待DOM更新
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // 动态加载 qrcode 库
  if (!window.QRCode) {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'
    script.onload = () => {
      renderQRCode()
    }
    document.head.appendChild(script)
  } else {
    renderQRCode()
  }
}

function renderQRCode() {
  if (qrcodeContainer.value) {
    qrcodeContainer.value.innerHTML = ''
    new window.QRCode(qrcodeContainer.value, {
      text: publicFormUrl,
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff'
    })
  }
}

function downloadQRCode() {
  const canvas = qrcodeContainer.value?.querySelector('canvas')
  if (canvas) {
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = '需求收集表单二维码.png'
    a.click()
    ElMessage.success('二维码已下载')
  }
}

function renameProject() {
  if (!renameValue.value.trim() || !renameProjectId.value) return
  projectStore.updateProject(renameProjectId.value, { name: renameValue.value.trim() })
  showRenameDialog.value = false
  ElMessage.success('重命名成功')
}
</script>

<style scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
}

.quick-actions {
  margin-bottom: 24px;
}

/* 分享弹窗 */
.share-dialog-content {
  padding: 8px 0;
}

.share-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.qrcode-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
}

.qrcode-container {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 12px;
}

.qrcode-hint {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0 0 16px 0;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.project-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.project-card:hover {
  border-color: var(--border-light);
  transform: translateY(-2px);
}

.project-card.active {
  border-color: var(--primary-color);
}

.project-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.project-card__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.project-card__status {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.status-item .el-icon {
  font-size: 20px;
  color: var(--text-muted);
}

.status-item .el-icon.done {
  color: var(--success-color);
}

.project-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.project-card__time {
  font-size: 12px;
  color: var(--text-muted);
}

.workflow-guide {
  margin-top: 40px;
}

.workflow-steps {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.workflow-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 200px;
}

.step-number {
  width: 32px;
  height: 32px;
  background: var(--primary-color);
  color: #000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: var(--text-primary);
}

.step-content p {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.workflow-arrow {
  color: var(--text-muted);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .workflow-arrow {
    display: none;
  }
}
</style>
