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
    
    <!-- ⭐ MD文档上传区域 -->
    <div 
      class="md-upload-zone card"
      :class="{ dragging: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleFileDrop"
      @click="triggerFileInput"
    >
      <input 
        ref="fileInputRef"
        type="file" 
        accept=".md,.markdown,.txt"
        multiple
        style="display: none;"
        @change="handleFileSelect"
      />
      
      <div class="upload-content">
        <div class="upload-icon">📄</div>
        <div class="upload-text">
          <h4>上传需求文档</h4>
          <p>拖拽 .md 文件到此处，或 <strong>点击选择文件</strong>，或 <strong>Ctrl+V 粘贴</strong> Markdown 内容</p>
        </div>
      </div>
      
      <!-- 粘贴输入框（展开时显示） -->
      <div v-if="showPasteArea" class="paste-area" @click.stop>
        <el-input
          ref="pasteInputRef"
          v-model="pasteContent"
          type="textarea"
          :rows="8"
          placeholder="在此粘贴 Markdown 内容...&#10;&#10;支持格式：&#10;# 项目名称&#10;## 项目背景&#10;## 核心功能&#10;..."
          @paste="handlePaste"
        />
        <div class="paste-actions">
          <el-button size="small" @click.stop="showPasteArea = false">取消</el-button>
          <el-button type="primary" size="small" @click.stop="submitPasteContent" :disabled="!pasteContent.trim()">
            导入到需求池
          </el-button>
        </div>
      </div>
      
      <el-button 
        v-if="!showPasteArea"
        type="text" 
        size="small" 
        class="paste-toggle"
        @click.stop="openPasteArea"
      >
        或者直接粘贴文本内容 →
      </el-button>
    </div>
    
    <!-- 导入预览弹窗 -->
    <el-dialog v-model="showImportPreview" title="📄 导入预览" width="700px" top="5vh">
      <div class="import-preview">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
          <template #title>
            已从文档中识别出以下信息，确认后将加入需求池
          </template>
        </el-alert>
        
        <el-form label-position="top">
          <el-form-item label="项目名称">
            <el-input v-model="importData.appName" placeholder="请输入项目名称" />
          </el-form-item>
          <el-form-item label="项目背景">
            <el-input v-model="importData.background" type="textarea" :rows="3" placeholder="项目背景描述" />
          </el-form-item>
          <el-form-item label="核心功能（P0）">
            <el-input v-model="importData.featuresP0" type="textarea" :rows="4" placeholder="必须实现的核心功能" />
          </el-form-item>
          <el-form-item label="重要功能（P1）">
            <el-input v-model="importData.featuresP1" type="textarea" :rows="3" placeholder="建议实现的功能" />
          </el-form-item>
          <el-form-item label="可选功能（P2）">
            <el-input v-model="importData.featuresP2" type="textarea" :rows="2" placeholder="锦上添花的功能" />
          </el-form-item>
          
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="联系方式">
                <el-input v-model="importData.contact" placeholder="选填" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="预算">
                <el-input v-model="importData.budget" placeholder="选填" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="期望时间">
                <el-input v-model="importData.expectedTime" placeholder="选填" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        
        <el-collapse>
          <el-collapse-item title="📝 查看原始 Markdown 内容">
            <pre class="raw-md">{{ importData._rawMarkdown }}</pre>
          </el-collapse-item>
        </el-collapse>
      </div>
      
      <template #footer>
        <el-button @click="showImportPreview = false">取消</el-button>
        <el-button type="primary" @click="confirmImport" :disabled="!importData.appName?.trim()">
          确认导入到需求池
        </el-button>
      </template>
    </el-dialog>
    
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
  Download,
  UploadFilled
} from '@element-plus/icons-vue'
import { useRequirementPoolStore } from '@/stores/requirementPool'
import { useProjectStore } from '@/stores/project'
import { triggerAutomation } from '@/utils/aiQueue'  // ⭐ 新增

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

// ⭐ MD上传相关
const isDragging = ref(false)
const showPasteArea = ref(false)
const pasteContent = ref('')
const showImportPreview = ref(false)
const fileInputRef = ref(null)
const pasteInputRef = ref(null)
const importData = ref({
  appName: '',
  background: '',
  featuresP0: '',
  featuresP1: '',
  featuresP2: '',
  contact: '',
  budget: '',
  expectedTime: '',
  _rawMarkdown: ''
})

// ⭐ 全局键盘监听（Ctrl+V 粘贴）
function handleGlobalPaste(e) {
  // 如果焦点在输入框内则不拦截
  const tag = document.activeElement?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea') return
  
  const text = e.clipboardData?.getData('text')
  if (text && (text.includes('#') || text.includes('##') || text.length > 100)) {
    e.preventDefault()
    parseAndPreview(text)
  }
}

onMounted(() => {
  poolStore.loadFromStorage()
  document.addEventListener('paste', handleGlobalPaste)
})

// ⭐ 拖拽文件处理
function handleFileDrop(e) {
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  processFiles(files)
}

// ⭐ 选择文件处理
function handleFileSelect(e) {
  const files = Array.from(e.target?.files || [])
  processFiles(files)
  // 清空input，允许重复选同一文件
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function triggerFileInput() {
  if (!showPasteArea.value) {
    fileInputRef.value?.click()
  }
}

// ⭐ 处理文件列表
function processFiles(files) {
  const mdFiles = files.filter(f => 
    f.name.endsWith('.md') || f.name.endsWith('.markdown') || f.name.endsWith('.txt')
  )
  
  if (mdFiles.length === 0) {
    ElMessage.warning('请上传 .md 或 .txt 格式的文件')
    return
  }
  
  // 处理第一个文件（后续可扩展为批量）
  const file = mdFiles[0]
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result
    if (content) {
      parseAndPreview(content, file.name)
    }
  }
  reader.readAsText(file, 'utf-8')
  
  // 如果有多个文件，提示
  if (mdFiles.length > 1) {
    ElMessage.info(`检测到 ${mdFiles.length} 个文件，先导入第一个：${mdFiles[0].name}`)
  }
}

// ⭐ 粘贴区域
function openPasteArea() {
  showPasteArea.value = true
  pasteContent.value = ''
  setTimeout(() => pasteInputRef.value?.focus(), 100)
}

function handlePaste(e) {
  // textarea自身的paste事件，不需要额外处理，内容会自动填入
}

function submitPasteContent() {
  if (!pasteContent.value.trim()) return
  parseAndPreview(pasteContent.value)
  showPasteArea.value = false
  pasteContent.value = ''
}

// ⭐ 解析 Markdown 并打开预览
function parseAndPreview(mdContent, fileName = '') {
  const parsed = parseMdToRequirement(mdContent, fileName)
  importData.value = { ...parsed, _rawMarkdown: mdContent }
  showImportPreview.value = true
}

// ⭐ 核心：MD解析器
function parseMdToRequirement(md, fileName = '') {
  const result = {
    appName: '',
    background: '',
    featuresP0: '',
    featuresP1: '',
    featuresP2: '',
    contact: '',
    budget: '',
    expectedTime: '',
    appType: [],
    targetUser: '',
    otherNotes: ''
  }
  
  // 1. 提取一级标题作为项目名
  const h1Match = md.match(/^#\s+(.+)$/m)
  if (h1Match) {
    result.appName = h1Match[1].trim()
  } else if (fileName) {
    // 用文件名
    result.appName = fileName.replace(/\.(md|markdown|txt)$/i, '')
  }
  
  // 2. 按二级标题拆分段落
  const sections = {}
  const sectionRegex = /^##\s+(.+)$/gm
  let match
  const sectionPositions = []
  
  while ((match = sectionRegex.exec(md)) !== null) {
    sectionPositions.push({ title: match[1].trim(), index: match.index + match[0].length })
  }
  
  sectionPositions.forEach((sec, i) => {
    const end = i + 1 < sectionPositions.length ? sectionPositions[i + 1].index - sectionPositions[i + 1].title.length - 3 : md.length
    const content = md.slice(sec.index, end).trim()
    sections[sec.title.toLowerCase()] = content
    // 也存原始标题
    sections[sec.title] = content
  })
  
  // 3. 智能匹配各字段
  for (const [title, content] of Object.entries(sections)) {
    const t = title.toLowerCase()
    
    // 背景
    if (t.includes('背景') || t.includes('概述') || t.includes('简介') || t.includes('overview') || t.includes('introduction')) {
      result.background = content
    }
    // 核心功能
    else if (t.includes('核心功能') || t.includes('p0') || t.includes('必须') || t.includes('core') || t.includes('mvp')) {
      result.featuresP0 = content
    }
    // 重要功能
    else if (t.includes('重要功能') || t.includes('p1') || t.includes('期望') || t.includes('important')) {
      result.featuresP1 = content
    }
    // 可选功能
    else if (t.includes('可选') || t.includes('p2') || t.includes('拓展') || t.includes('optional') || t.includes('扩展') || t.includes('中长期')) {
      result.featuresP2 = content
    }
    // 目标用户
    else if (t.includes('用户') || t.includes('受众') || t.includes('target')) {
      result.targetUser = content
    }
    // 预算
    else if (t.includes('预算') || t.includes('budget') || t.includes('费用')) {
      result.budget = content
    }
    // 时间
    else if (t.includes('时间') || t.includes('deadline') || t.includes('timeline') || t.includes('期限')) {
      result.expectedTime = content
    }
    // 功能需求（通用）
    else if (t.includes('功能') || t.includes('feature') || t.includes('需求')) {
      // 如果P0还空着，放P0
      if (!result.featuresP0) result.featuresP0 = content
      else if (!result.featuresP1) result.featuresP1 = content
    }
  }
  
  // 4. 如果完全没解析到结构，把全文当背景
  if (!result.background && !result.featuresP0) {
    // 去掉一级标题后，剩余当背景
    const noH1 = md.replace(/^#\s+.+$/m, '').trim()
    result.background = noH1.slice(0, 500)
    result.featuresP0 = noH1.length > 500 ? noH1.slice(500) : ''
  }
  
  return result
}

// ⭐ 确认导入
function confirmImport() {
  if (!importData.value.appName?.trim()) {
    ElMessage.warning('项目名称不能为空')
    return
  }
  
  const reqData = {
    appName: importData.value.appName,
    background: importData.value.background,
    featuresP0: importData.value.featuresP0,
    featuresP1: importData.value.featuresP1,
    featuresP2: importData.value.featuresP2,
    contact: importData.value.contact,
    budget: importData.value.budget,
    expectedTime: importData.value.expectedTime,
    targetUser: importData.value.targetUser || '',
    appType: importData.value.appType || [],
    otherNotes: importData.value.otherNotes || '',
    _source: 'md_import',
    _rawMarkdown: importData.value._rawMarkdown
  }
  
  poolStore.addRequirement(reqData)
  showImportPreview.value = false
  activeTab.value = 'pending'
  
  ElMessage.success(`「${reqData.appName}」已导入需求池！`)
}

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
// 接受需求并创建项目
function acceptAndCreateProject(requirement) {
  detailVisible.value = false
  
  ElMessageBox.confirm(
    `确认立项「${requirement.quickInfo.appName}」并启动AI自动化流程吗？\n\n✅ AI将自动生成客户版PRD\n✅ AI将自动生成开发版PRD\n\n您只需要最后确认即可`,
    '确认立项',
    {
      confirmButtonText: '🚀 立项并启动自动化',
      cancelButtonText: '取消',
      type: 'success',
      center: true,
      distinguishCancelAndClose: true
    }
  ).then(() => {
    // 1. 创建项目
    const project = projectStore.createProjectFromRequirement(requirement)
    
    // 2. 更新需求状态
    poolStore.acceptRequirement(requirement.id, project.id)
    
    // 3. 设置为当前项目
    projectStore.setCurrentProject(project.id)
    
    // ⭐ 4. 触发自动化流程
    triggerAutomation(project.id)
    
    // 5. 跳转到PRD生成页面
    router.push('/prd')
    
    ElMessage.success({
      message: '🎉 项目已创建！AI正在自动生成PRD，请稍候...',
      duration: 5000
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

// 清理
onUnmounted(() => {
  document.removeEventListener('paste', handleGlobalPaste)
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

/* ⭐ MD上传区域 */
.md-upload-zone {
  margin-bottom: 24px;
  padding: 24px;
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.md-upload-zone:hover {
  border-color: var(--primary-color);
  background: rgba(212, 175, 55, 0.03);
}

.md-upload-zone.dragging {
  border-color: #409eff;
  background: rgba(64, 158, 255, 0.08);
  transform: scale(1.01);
  box-shadow: 0 0 20px rgba(64, 158, 255, 0.15);
}

.upload-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.upload-icon {
  font-size: 40px;
}

.upload-text h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.upload-text p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.paste-toggle {
  margin-top: 8px;
  font-size: 13px;
}

.paste-area {
  margin-top: 16px;
  text-align: left;
}

.paste-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

/* 导入预览 */
.import-preview {
  max-height: 65vh;
  overflow-y: auto;
}

.raw-md {
  background: var(--bg-tertiary, #f5f7fa);
  padding: 16px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
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
