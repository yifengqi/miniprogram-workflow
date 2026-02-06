<template>
  <div class="submissions-page">
    <div class="page-header">
      <h1 class="page-title">客户提交记录</h1>
      <p class="page-desc">查看客户填写的需求收集表</p>
    </div>
    
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">
          <el-icon><Document /></el-icon>
          提交记录
        </h3>
        <div class="header-actions">
          <el-input 
            v-model="searchText" 
            placeholder="搜索项目名称或联系方式" 
            style="width: 200px"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" @click="copyPublicUrl">
            <el-icon><Link /></el-icon>
            复制表单链接
          </el-button>
          <el-button @click="generateQRCode">
            <el-icon><PictureRounded /></el-icon>
            生成二维码
          </el-button>
        </div>
      </div>
      
      <el-table :data="filteredSubmissions" style="width: 100%" stripe>
        <el-table-column prop="id" label="提交ID" width="180" />
        <el-table-column prop="data.appName" label="项目名称" width="150" />
        <el-table-column prop="data.contact" label="联系方式" width="150" />
        <el-table-column label="提交时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.submittedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row)">查看详情</el-button>
            <el-button size="small" type="primary" @click="importToProject(row)">导入项目</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div v-if="filteredSubmissions.length === 0" class="empty-state">
        <el-empty description="暂无提交记录">
          <el-button type="primary" @click="copyPublicUrl">分享表单链接</el-button>
        </el-empty>
      </div>
    </div>
    
    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="需求详情" width="80%" top="5vh">
      <div v-if="selectedSubmission" class="detail-content markdown-preview" v-html="detailHtml"></div>
      <template #footer>
        <el-button @click="exportMarkdown">导出Markdown</el-button>
        <el-button type="primary" @click="importToProject(selectedSubmission)">导入到项目</el-button>
      </template>
    </el-dialog>
    
    <!-- 二维码弹窗 -->
    <el-dialog v-model="qrcodeVisible" title="表单二维码" width="400px">
      <div class="qrcode-content">
        <div ref="qrcodeContainer" class="qrcode-container"></div>
        <p class="qrcode-hint">客户可扫描此二维码填写需求</p>
        <el-input v-model="publicUrl" readonly>
          <template #append>
            <el-button @click="copyPublicUrl">复制</el-button>
          </template>
        </el-input>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import { useProjectStore } from '@/stores/project'

const router = useRouter()
const projectStore = useProjectStore()

const submissions = ref([])
const searchText = ref('')
const detailVisible = ref(false)
const qrcodeVisible = ref(false)
const selectedSubmission = ref(null)
const qrcodeContainer = ref(null)

const publicUrl = computed(() => {
  return window.location.origin + '/public-form'
})

const filteredSubmissions = computed(() => {
  if (!searchText.value) return submissions.value
  
  const keyword = searchText.value.toLowerCase()
  return submissions.value.filter(s => 
    s.data.appName?.toLowerCase().includes(keyword) ||
    s.data.contact?.toLowerCase().includes(keyword) ||
    s.id.toLowerCase().includes(keyword)
  )
})

const detailHtml = computed(() => {
  if (!selectedSubmission.value) return ''
  
  const form = selectedSubmission.value.data
  let md = `# ${form.appName || '未命名项目'} - 需求文档\n\n`
  md += `> 提交ID：${selectedSubmission.value.id}\n`
  md += `> 提交时间：${formatDate(selectedSubmission.value.submittedAt)}\n`
  md += `> 联系方式：${form.contact}\n\n`
  
  md += `## 一、项目基本信息\n\n`
  md += `**项目背景**：${form.background || '未填写'}\n\n`
  md += `**小程序名称**：${form.appName || '未填写'}\n\n`
  md += `**小程序类型**：${[...form.appType, form.appTypeOther].filter(Boolean).join('、') || '未填写'}\n\n`
  
  md += `## 二、用户相关\n\n`
  md += `**目标用户**：${form.targetUser || '未填写'}\n\n`
  md += `**使用场景**：${form.userScenario || '未填写'}\n\n`
  md += `**用户规模**：${form.userScale || '未填写'}\n\n`
  
  md += `## 三、核心功能\n\n`
  md += `### P0（必须实现）\n${form.featuresP0 || '未填写'}\n\n`
  md += `### P1（希望实现）\n${form.featuresP1 || '未填写'}\n\n`
  md += `### P2（锦上添花）\n${form.featuresP2 || '未填写'}\n\n`
  md += `**登录需求**：${form.needLogin || '未填写'}\n\n`
  if (form.loginType?.length) {
    md += `**登录方式**：${form.loginType.join('、')}\n\n`
  }
  
  md += `## 四、管理后台\n\n`
  md += `**是否需要**：${form.needAdmin || '未填写'}\n\n`
  if (form.needAdmin === '需要') {
    md += `**使用者**：${form.adminUser || '未填写'}\n\n`
    md += `**功能需求**：${form.adminFeatures || '未填写'}\n\n`
  }
  
  md += `## 五、数据与支付\n\n`
  md += `**存储数据**：${form.dataStorage || '未填写'}\n\n`
  md += `**内容来源**：${form.contentSource?.join('、') || '未填写'}\n\n`
  md += `**导入导出**：${form.importExport?.join('、') || '不需要'}\n\n`
  md += `**支付需求**：${form.needPayment || '未填写'}\n\n`
  if (form.needPayment === '需要微信支付') {
    md += `**支付场景**：${form.paymentScenario || '未填写'}\n\n`
    md += `**退款需求**：${form.needRefund || '未填写'}\n\n`
  }
  
  md += `## 六、设计与技术\n\n`
  md += `**参考项目**：${form.reference || '无'}\n\n`
  md += `**UI风格**：${form.uiStyle || '未填写'}\n\n`
  md += `**色调偏好**：${form.colorPreference || '无特别要求'}\n\n`
  md += `**小程序账号**：${form.hasAppId || '未填写'}${form.appId ? ` (AppID: ${form.appId})` : ''}\n\n`
  md += `**后端服务**：${form.backend || '未填写'}\n\n`
  
  md += `## 七、时间与预算\n\n`
  md += `**期望上线时间**：${form.timeline || '未填写'}\n\n`
  md += `**预算范围**：${form.budget || '未填写'}\n\n`
  md += `**运营成本预期**：${form.operationCost || '未填写'}\n\n`
  
  if (form.otherNotes) {
    md += `## 其他说明\n\n${form.otherNotes}\n`
  }
  
  return marked(md)
})

// 加载提交记录
function loadSubmissions() {
  const data = localStorage.getItem('public_submissions')
  if (data) {
    submissions.value = JSON.parse(data)
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString('zh-CN')
}

function copyPublicUrl() {
  navigator.clipboard.writeText(publicUrl.value)
  ElMessage.success('链接已复制到剪贴板')
}

function viewDetail(submission) {
  selectedSubmission.value = submission
  detailVisible.value = true
}

function exportMarkdown() {
  if (!selectedSubmission.value) return
  
  const form = selectedSubmission.value.data
  const filename = `需求-${form.appName || 'unnamed'}-${selectedSubmission.value.id}.md`
  
  // 生成纯文本 Markdown
  const md = detailHtml.value.replace(/<[^>]+>/g, '')
  
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('已导出Markdown文件')
}

function importToProject(submission) {
  // 创建新项目
  const projectName = submission.data.appName || '未命名项目'
  projectStore.createProject(projectName, `导入自客户提交 ${submission.id}`)
  
  // 导入需求数据
  projectStore.saveRequirement(submission.data)
  
  ElMessage.success(`已导入到项目「${projectName}」`)
  router.push('/requirement')
}

async function generateQRCode() {
  qrcodeVisible.value = true
  
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
      text: publicUrl.value,
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff'
    })
  }
}

// 组件挂载时加载数据
loadSubmissions()

// 定时刷新（检查新提交）
setInterval(() => {
  loadSubmissions()
}, 5000)
</script>

<style scoped>
.submissions-page {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.empty-state {
  padding: 40px 0;
}

.detail-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 20px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.qrcode-content {
  text-align: center;
}

.qrcode-container {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.qrcode-hint {
  color: var(--text-secondary);
  margin-bottom: 16px;
}

:deep(.el-table) {
  background: transparent;
}
</style>
