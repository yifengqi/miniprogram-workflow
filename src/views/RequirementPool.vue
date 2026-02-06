<template>
  <div class="requirement-pool-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1 class="page-title">需求池</h1>
          <p class="page-desc">管理客户需求，选择立项开发</p>
        </div>
        <el-button type="primary" size="large" @click="showShareDialog = true">
          <el-icon><Share /></el-icon>
          分享需求表单
        </el-button>
      </div>
    </div>
    
    <!-- 状态筛选标签 -->
    <el-tabs v-model="activeTab" class="status-tabs">
      <el-tab-pane name="pending">
        <template #label>
          <span class="tab-label">
            待评估
            <el-badge v-if="poolStore.pendingCount > 0" :value="poolStore.pendingCount" />
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="accepted">
        <template #label>
          <span class="tab-label">已立项</span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="rejected">
        <template #label>
          <span class="tab-label">已拒绝</span>
        </template>
      </el-tab-pane>
    </el-tabs>
    
    <!-- 需求列表 -->
    <div class="requirements-list">
      <div v-if="filteredRequirements.length === 0" class="empty-state">
        <el-icon :size="80"><FolderOpened /></el-icon>
        <p v-if="activeTab === 'pending'">还没有待评估的需求</p>
        <p v-else-if="activeTab === 'accepted'">还没有已立项的需求</p>
        <p v-else>还没有已拒绝的需求</p>
        <el-button v-if="activeTab === 'pending'" type="primary" @click="showShareDialog = true">
          分享表单给客户
        </el-button>
      </div>
      
      <div 
        v-for="req in filteredRequirements" 
        :key="req.id"
        class="requirement-card card"
      >
        <!-- 状态指示器 -->
        <div class="status-indicator" :class="req.status"></div>
        
        <!-- 基本信息 -->
        <div class="card-header">
          <h3 class="requirement-title">{{ req.quickInfo.appName }}</h3>
          <div class="requirement-meta">
            <span class="meta-time">
              <el-icon><Clock /></el-icon>
              {{ formatTime(req.submittedAt) }}
            </span>
          </div>
        </div>
        
        <!-- 详细信息 -->
        <div class="card-body">
          <div class="info-row">
            <span v-if="req.quickInfo.contact" class="info-item">
              <el-icon><Phone /></el-icon>
              {{ req.quickInfo.contact }}
            </span>
            <span v-if="req.quickInfo.budget" class="info-item">
              <el-icon><Wallet /></el-icon>
              {{ req.data.budget }}
            </span>
            <span v-if="req.quickInfo.expectedTime" class="info-item">
              <el-icon><Calendar /></el-icon>
              {{ req.data.expectedTime }}
            </span>
          </div>
          
          <p class="requirement-summary">
            {{ getSummary(req.data) }}
          </p>
          
          <!-- 标签 -->
          <div v-if="req.tags && req.tags.length > 0" class="tags">
            <el-tag v-for="tag in req.tags" :key="tag" size="small">{{ tag }}</el-tag>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="card-footer">
          <el-button size="small" @click="viewDetail(req)">
            <el-icon><View /></el-icon>
            查看详情
          </el-button>
          
          <div class="action-buttons">
            <template v-if="req.status === 'pending'">
              <el-button 
                type="primary" 
                size="small"
                @click="acceptAndCreateProject(req)"
              >
                <el-icon><Check /></el-icon>
                立项并生成PRD
              </el-button>
              <el-button 
                size="small"
                @click="rejectRequirement(req)"
              >
                <el-icon><Close /></el-icon>
                拒绝
              </el-button>
            </template>
            
            <template v-else-if="req.status === 'accepted'">
              <el-button 
                type="success" 
                size="small"
                @click="goToProject(req.projectId)"
              >
                <el-icon><Right /></el-icon>
                进入项目
              </el-button>
            </template>
            
            <template v-else>
              <el-tag type="info" size="small">{{ req.notes || '已拒绝' }}</el-tag>
            </template>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 详情弹窗 -->
    <el-dialog 
      v-model="detailVisible" 
      title="需求详情" 
      width="80%" 
      top="5vh"
    >
      <div v-if="selectedRequirement" class="detail-content">
        <div class="detail-header">
          <h2>{{ selectedRequirement.quickInfo.appName }}</h2>
          <div class="detail-meta">
            <el-tag :type="getStatusType(selectedRequirement.status)">
              {{ getStatusText(selectedRequirement.status) }}
            </el-tag>
            <span>提交于 {{ formatTime(selectedRequirement.submittedAt) }}</span>
          </div>
        </div>
        
        <el-divider />
        
        <div class="detail-body">
          <div class="detail-section">
            <h4>项目背景</h4>
            <p>{{ selectedRequirement.data.background }}</p>
          </div>
          
          <div class="detail-section">
            <h4>核心功能（P0）</h4>
            <p class="pre-wrap">{{ selectedRequirement.data.featuresP0 }}</p>
          </div>
          
          <div v-if="selectedRequirement.data.featuresP1" class="detail-section">
            <h4>期望功能（P1）</h4>
            <p class="pre-wrap">{{ selectedRequirement.data.featuresP1 }}</p>
          </div>
          
          <div class="detail-section">
            <h4>联系方式与预算</h4>
            <p>联系方式：{{ selectedRequirement.data.contact || '未填写' }}</p>
            <p>预算范围：{{ selectedRequirement.data.budget || '未填写' }}</p>
            <p>期望时间：{{ selectedRequirement.data.expectedTime || '未填写' }}</p>
          </div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button 
          v-if="selectedRequirement && selectedRequirement.status === 'pending'"
          type="primary" 
          @click="acceptAndCreateProject(selectedRequirement)"
        >
          立项并生成PRD
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 分享弹窗 -->
    <el-dialog v-model="showShareDialog" title="分享需求收集表单" width="500px">
      <div class="share-dialog-content">
        <div class="share-actions">
          <el-button type="primary" @click="copyFormLink" style="width: 100%">
            <el-icon><Link /></el-icon>
            复制表单链接
          </el-button>
          <el-button @click="generateQRCode" style="width: 100%">
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
              分享此链接给客户，他们填写后需求会自动进入需求池
            </div>
          </template>
        </el-alert>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Share,
  FolderOpened,
  Clock,
  Phone,
  Wallet,
  Calendar,
  View,
  Check,
  Close,
  Right,
  Link,
  PictureRounded,
  Download
} from '@element-plus/icons-vue'
import { useRequirementPoolStore } from '@/stores/requirementPool'
import { useProjectStore } from '@/stores/project'

const router = useRouter()
const poolStore = useRequirementPoolStore()
const projectStore = useProjectStore()

const activeTab = ref('pending')
const detailVisible = ref(false)
const selectedRequirement = ref(null)
const showShareDialog = ref(false)
const showQRCode = ref(false)
const qrcodeContainer = ref(null)

const publicFormUrl = window.location.origin + '/public-form'

// 根据状态筛选需求
const filteredRequirements = computed(() => {
  if (activeTab.value === 'pending') {
    return poolStore.pendingRequirements
  } else if (activeTab.value === 'accepted') {
    return poolStore.acceptedRequirements
  } else {
    return poolStore.rejectedRequirements
  }
})

// 格式化时间
function formatTime(timestamp) {
  if (!timestamp) return '未知时间'
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return date.toLocaleDateString('zh-CN')
}

// 获取需求摘要
function getSummary(data) {
  if (data.background) {
    return data.background.length > 100 
      ? data.background.substring(0, 100) + '...' 
      : data.background
  }
  return '暂无背景描述'
}

// 查看详情
function viewDetail(requirement) {
  selectedRequirement.value = requirement
  detailVisible.value = true
}

// 接受需求并创建项目
function acceptAndCreateProject(requirement) {
  detailVisible.value = false
  
  ElMessageBox.confirm(
    `确认立项「${requirement.quickInfo.appName}」并跳转到PRD生成页面吗？`,
    '确认立项',
    {
      confirmButtonText: '确认立项',
      cancelButtonText: '取消',
      type: 'success',
      center: true
    }
  ).then(() => {
    // 1. 创建项目
    const project = projectStore.createProjectFromRequirement(requirement)
    
    // 2. 更新需求状态
    poolStore.acceptRequirement(requirement.id, project.id)
    
    // 3. 设置为当前项目
    projectStore.setCurrentProject(project.id)
    
    // 4. 跳转到PRD生成页面
    router.push('/prd')
    
    ElMessage.success({
      message: '项目已创建！现在可以生成PRD了',
      duration: 3000
    })
  }).catch(() => {
    // 用户取消
  })
}

// 拒绝需求
function rejectRequirement(requirement) {
  ElMessageBox.prompt('请输入拒绝原因（可选）', '拒绝需求', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    inputPlaceholder: '如：预算不符、时间冲突等'
  }).then(({ value }) => {
    poolStore.rejectRequirement(requirement.id, value || '不符合接单条件')
    ElMessage.success('已标记为拒绝')
  }).catch(() => {
    // 用户取消
  })
}

// 进入项目
function goToProject(projectId) {
  projectStore.setCurrentProject(projectId)
  router.push('/')
}

// 获取状态类型（用于标签颜色）
function getStatusType(status) {
  const types = {
    pending: 'warning',
    accepted: 'success',
    rejected: 'info'
  }
  return types[status] || 'info'
}

// 获取状态文本
function getStatusText(status) {
  const texts = {
    pending: '待评估',
    accepted: '已立项',
    rejected: '已拒绝'
  }
  return texts[status] || status
}

// 复制表单链接
function copyFormLink() {
  navigator.clipboard.writeText(publicFormUrl)
  ElMessage.success('表单链接已复制到剪贴板')
}

// 生成二维码
async function generateQRCode() {
  showQRCode.value = true
  
  await new Promise(resolve => setTimeout(resolve, 100))
  
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

// 初始化
onMounted(() => {
  poolStore.loadFromStorage()
})
</script>

<style scoped>
.requirement-pool-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
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

.status-tabs {
  margin-bottom: 24px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.requirements-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.requirement-card {
  position: relative;
  padding: 20px;
  overflow: visible;
}

.status-indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 12px 0 0 12px;
}

.status-indicator.pending {
  background: var(--el-color-warning);
}

.status-indicator.accepted {
  background: var(--el-color-success);
}

.status-indicator.rejected {
  background: var(--el-color-info);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.requirement-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.requirement-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.meta-time {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-body {
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}

.requirement-summary {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-secondary);
}

.empty-state p {
  margin: 16px 0;
  font-size: 16px;
}

/* 详情弹窗 */
.detail-content {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-header h2 {
  margin: 0 0 12px 0;
  font-size: 24px;
  color: var(--text-primary);
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--text-secondary);
}

.detail-body {
  padding: 20px 0;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.detail-section p {
  margin: 4px 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.pre-wrap {
  white-space: pre-wrap;
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

/* 响应式 */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
  }
  
  .card-footer {
    flex-direction: column;
    align-items: stretch;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-buttons .el-button {
    width: 100%;
  }
}
</style>
