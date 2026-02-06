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
    
    <!-- ⭐ 新增需求入口 -->
    <div class="add-requirement-section">
      <div class="add-cards">
        <!-- 入口1：快速描述 → AI生成需求文档 -->
        <div class="add-card card" @click="showQuickInput = true">
          <div class="add-card-icon">💬</div>
          <h4>快速描述</h4>
          <p>输入简单想法，AI帮你生成完整需求文档</p>
        </div>
        
        <!-- 入口2：上传已有文档 -->
        <div 
          class="add-card card"
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
          <div class="add-card-icon">📄</div>
          <h4>上传文档</h4>
          <p>拖拽 .md 文件或点击选择，支持 Ctrl+V 粘贴</p>
        </div>
      </div>
    </div>
    
    <!-- ⭐ 快速描述弹窗 -->
    <el-dialog v-model="showQuickInput" title="💬 快速描述你的想法" width="650px">
      <div class="quick-input-form">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
          <template #title>
            简单描述就行，AI 会结合标准模板自动生成完整的需求文档
          </template>
        </el-alert>
        
        <el-form label-position="top">
          <el-form-item label="项目名称" required>
            <el-input v-model="quickForm.appName" placeholder="例如：智能衣橱、抢票助手" />
          </el-form-item>
          
          <el-form-item label="简单描述一下你想做什么">
            <el-input 
              v-model="quickForm.description" 
              type="textarea" 
              :rows="6"
              placeholder="用你自己的话描述就行，比如：&#10;&#10;我想做一个衣橱管理小程序，用户拍照录入衣物，AI根据天气和场合推荐每日穿搭。解决每天不知道穿什么的问题..."
            />
          </el-form-item>
          
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="目标用户（选填）">
                <el-input v-model="quickForm.targetUser" placeholder="例如：22-35岁都市白领" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="预算/时间（选填）">
                <el-input v-model="quickForm.budget" placeholder="例如：1万以内，1个月" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
      
      <template #footer>
        <el-button @click="showQuickInput = false">取消</el-button>
        <el-button 
          type="primary" 
          :loading="aiGeneratingReq"
          @click="generateRequirementDoc"
          :disabled="!quickForm.appName?.trim() || !quickForm.description?.trim()"
        >
          {{ aiGeneratingReq ? 'AI 正在生成需求文档...' : '🤖 AI 生成需求文档' }}
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 导入预览弹窗 -->
    <el-dialog v-model="showImportPreview" title="📄 导入预览" width="750px" top="5vh">
      <div class="import-preview">
        <el-alert type="success" :closable="false" style="margin-bottom: 16px;">
          <template #title>
            文档将整篇存入需求池，立项时 AI 会直接阅读原文档生成 PRD，无需手动拆分
          </template>
        </el-alert>
        
        <el-form label-position="top">
          <el-form-item label="项目名称（用于在需求池中显示）" required>
            <el-input v-model="importData.appName" placeholder="请输入项目名称" />
          </el-form-item>
          
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="联系方式（选填）">
                <el-input v-model="importData.contact" placeholder="手机/微信" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="预算（选填）">
                <el-input v-model="importData.budget" placeholder="预算范围" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="期望时间（选填）">
                <el-input v-model="importData.expectedTime" placeholder="期望上线时间" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        
        <!-- 文档内容预览 -->
        <div class="md-preview-section">
          <div class="md-preview-header">
            <h4>📝 文档内容预览</h4>
            <el-tag size="small">{{ importData._wordCount }} 字 · {{ importData._sectionCount }} 个章节</el-tag>
          </div>
          <div class="md-preview-body" v-html="importData._renderedHtml"></div>
        </div>
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
import { useSettingsStore } from '@/stores/settings'
import { triggerAutomation } from '@/utils/aiQueue'
import { callAI } from '@/api/ai'

const router = useRouter()
const poolStore = useRequirementPoolStore()
const projectStore = useProjectStore()
const settingsStore = useSettingsStore()

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
  contact: '',
  budget: '',
  expectedTime: '',
  _rawMarkdown: '',
  _renderedHtml: '',
  _wordCount: 0,
  _sectionCount: 0
})

// ⭐ 快速描述相关
const showQuickInput = ref(false)
const aiGeneratingReq = ref(false)
const quickForm = ref({
  appName: '',
  description: '',
  targetUser: '',
  budget: ''
})

// ⭐ AI 根据简单描述生成完整需求文档
async function generateRequirementDoc() {
  if (!quickForm.value.appName?.trim() || !quickForm.value.description?.trim()) {
    ElMessage.warning('请填写项目名称和描述')
    return
  }
  
  if (!settingsStore.isConfigured()) {
    ElMessage.warning('请先在设置中配置 AI 接口')
    return
  }
  
  aiGeneratingReq.value = true
  
  try {
    const prompt = `你是一个专业的产品经理，请根据用户的简单描述，生成一份完整、结构化的需求文档（Markdown格式）。

用户输入：
- 项目名称：${quickForm.value.appName}
- 想法描述：${quickForm.value.description}
${quickForm.value.targetUser ? `- 目标用户：${quickForm.value.targetUser}` : ''}
${quickForm.value.budget ? `- 预算/时间：${quickForm.value.budget}` : ''}

请按以下标准模板输出，每个部分都要有实质内容：

# ${quickForm.value.appName} - 需求文档

## 一、项目基本信息
### 1.1 项目背景（核心痛点、解决什么问题）
### 1.2 小程序名称
### 1.3 小程序类型

## 二、用户相关
### 2.1 目标用户画像（至少2-3类用户）
### 2.2 使用场景（至少3-5个典型场景）
### 2.3 预计用户规模

## 三、核心功能
### 3.1 必须要有的功能（P0）—— 3-5个核心功能，每个附详细说明
### 3.2 希望有的功能（P1）—— 4-6个重要功能
### 3.3 锦上添花的功能（P2）—— 3-5个拓展功能
### 3.4 登录需求

## 四、管理后台
### 4.1 是否需要管理后台
### 4.2 后台功能清单

## 五、数据与内容
### 5.1 需要存储哪些数据
### 5.2 内容来源

## 六、支付与交易
### 6.1 是否涉及支付（MVP阶段建议）

## 七、设计与体验
### 7.1 参考产品
### 7.2 UI风格偏好
### 7.3 主色调建议

## 八、技术建议
### 8.1 推荐技术栈
### 8.2 关键技术挑战与应对策略

## 九、时间与预算
### 9.1 分阶段时间规划（Phase 1/2/3）
### 9.2 成本预估

## 十、功能优先级矩阵
| 优先级 | 功能 | 用户价值 | 技术难度 | 建议周期 |
|--------|------|---------|---------|---------|
（列出所有P0/P1/P2功能）

---
要求：
1. 内容要具体、有深度，不要空泛
2. 每个P0功能都要有子功能点说明
3. 基于用户描述合理推导出他没想到的功能
4. 技术方案要具体可执行
5. 输出纯Markdown格式，直接可用
`

    const result = await callAI([
      { role: 'system', content: '你是一个资深产品经理，擅长将模糊的想法转化为结构化、可执行的需求文档。输出纯Markdown格式。' },
      { role: 'user', content: prompt }
    ], { maxTokens: 8192, temperature: 0.7 })
    
    // AI生成完成，打开预览
    showQuickInput.value = false
    parseAndPreview(result, quickForm.value.appName + '.md')
    
    // 清空表单
    quickForm.value = { appName: '', description: '', targetUser: '', budget: '' }
    
    ElMessage.success('需求文档已生成，请预览确认')
    
  } catch (error) {
    ElMessage.error('AI生成失败: ' + (error.message || '未知错误'))
  } finally {
    aiGeneratingReq.value = false
  }
}

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

// ⭐ 解析 Markdown 并打开预览（新逻辑：不拆分，整篇存储）
function parseAndPreview(mdContent, fileName = '') {
  // 1. 提取标题（智能匹配多种格式）
  let appName = ''
  // 优先取一级标题
  const h1Match = mdContent.match(/^#\s+(.+)$/m)
  if (h1Match) {
    // 清理 emoji 和特殊标记
    appName = h1Match[1].replace(/[📝📋🔥💡📊📐💰🎯🚀]/g, '').replace(/[-—–].*需求文档.*$/i, '').trim()
    if (!appName) appName = h1Match[1].trim()
  }
  // 用文件名兜底
  if (!appName && fileName) {
    appName = fileName.replace(/\.(md|markdown|txt)$/i, '').replace(/需求文档|需求说明|PRD/g, '').trim()
  }
  if (!appName) appName = '未命名文档'
  
  // 2. 统计信息
  const wordCount = mdContent.replace(/\s+/g, '').length
  const sectionCount = (mdContent.match(/^##\s+/gm) || []).length
  
  // 3. 简单渲染预览（安全的HTML，只处理标题和列表）
  let renderedHtml = mdContent
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')  // 转义HTML
    .replace(/^### (.+)$/gm, '<h4 style="margin:12px 0 4px;color:var(--text-primary)">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin:16px 0 6px;color:var(--text-primary);border-bottom:1px solid var(--border-color,#eee);padding-bottom:4px;">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="margin:0 0 8px;font-size:20px;">$1</h2>')
    .replace(/^- \[x\] (.+)$/gm, '<div style="margin:2px 0;">✅ $1</div>')
    .replace(/^- \[ \] (.+)$/gm, '<div style="margin:2px 0;opacity:0.5;">⬜ $1</div>')
    .replace(/^- (.+)$/gm, '<div style="margin:2px 0;">• $1</div>')
    .replace(/```([\s\S]*?)```/g, '<pre style="background:#f5f7fa;padding:12px;border-radius:6px;font-size:13px;line-height:1.6;white-space:pre-wrap;overflow-x:auto;">$1</pre>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '<br/>')
  
  // 4. 设置预览数据
  importData.value = {
    appName,
    contact: '',
    budget: '',
    expectedTime: '',
    _rawMarkdown: mdContent,
    _renderedHtml: renderedHtml,
    _wordCount: wordCount,
    _sectionCount: sectionCount
  }
  
  showImportPreview.value = true
}

// ⭐ 确认导入（整篇MD存入需求池）
function confirmImport() {
  if (!importData.value.appName?.trim()) {
    ElMessage.warning('项目名称不能为空')
    return
  }
  
  const reqData = {
    appName: importData.value.appName,
    contact: importData.value.contact,
    budget: importData.value.budget,
    expectedTime: importData.value.expectedTime,
    // ⭐ 关键：整篇原始MD存储，立项时直接给AI
    rawMarkdown: importData.value._rawMarkdown,
    _source: 'md_import',
    // 从MD中提取的简要背景（用于列表显示）
    background: extractBrief(importData.value._rawMarkdown)
  }
  
  poolStore.addRequirement(reqData)
  showImportPreview.value = false
  activeTab.value = 'pending'
  
  ElMessage.success(`「${reqData.appName}」已导入需求池！`)
}

// 提取简要背景（用于需求卡片显示）
function extractBrief(md) {
  // 尝试找「项目背景」或「核心痛点」相关段落
  const bgMatch = md.match(/(?:项目背景|核心痛点|产品定位)[：:]*\s*\n+```?\n?([\s\S]*?)(?:\n```|\n##|\n---)/i)
  if (bgMatch) return bgMatch[1].trim().slice(0, 200)
  
  // 找第一个 > 引用
  const quoteMatch = md.match(/^>\s*(.+)/m)
  if (quoteMatch) return quoteMatch[1].trim()
  
  // 兜底：取第一级标题后的前200字
  const afterH1 = md.replace(/^#\s+.+\n/, '').trim()
  return afterH1.slice(0, 200).replace(/[#\-*>`]/g, '').trim()
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

/* ⭐ 新增需求入口 */
.add-requirement-section {
  margin-bottom: 24px;
}

.add-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.add-card {
  padding: 28px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px dashed var(--border-color);
}

.add-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}

.add-card.dragging {
  border-color: #409eff;
  background: rgba(64, 158, 255, 0.08);
  box-shadow: 0 0 20px rgba(64, 158, 255, 0.15);
}

.add-card-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.add-card h4 {
  margin: 0 0 6px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.add-card p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

/* 快速描述弹窗 */
.quick-input-form {
  max-height: 60vh;
  overflow-y: auto;
}

/* 导入预览 */
.import-preview {
  max-height: 65vh;
  overflow-y: auto;
}

.md-preview-section {
  margin-top: 16px;
  border: 1px solid var(--border-color, #eee);
  border-radius: 8px;
  overflow: hidden;
}

.md-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-tertiary, #f5f7fa);
  border-bottom: 1px solid var(--border-color, #eee);
}

.md-preview-header h4 {
  margin: 0;
  font-size: 14px;
}

.md-preview-body {
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary, #666);
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
