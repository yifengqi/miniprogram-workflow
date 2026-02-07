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
      
      <!-- Demo生成中（增强版进度） -->
      <div v-else-if="generatingDemo" class="card generating-card">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <div style="flex: 1;">
          <h4>正在生成Demo代码...</h4>
          <p v-if="demoStepInfo.step === 1">
            第1步：AI正在规划项目架构和文件清单...
          </p>
          <p v-else-if="demoStepInfo.step === 2">
            第2步：逐个文件生成代码 — {{ demoStepInfo.current || '准备中...' }}
          </p>
          <p v-else>
            AI正在根据PRD生成小程序代码（分步生成，更稳定）
          </p>
          <el-progress 
            :percentage="demoStepInfo.percentage || demoProgress" 
            :status="(demoStepInfo.percentage || demoProgress) >= 100 ? 'success' : undefined"
            :stroke-width="12"
            style="margin-top: 12px; width: 100%;"
          />
          <div v-if="demoStepInfo.step" class="progress-detail">
            步骤 {{ demoStepInfo.step }}/2 · {{ demoStepInfo.current || '' }}
          </div>
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
        
        <!-- ⭐ 主操作区：保存代码 -->
        <div class="card save-card">
          <h3>💾 保存代码到本地</h3>
          <p class="save-desc">选择一个文件夹，代码会直接写入该目录，之后用 GitHub Desktop 做版本管理</p>
          
          <div class="save-actions">
            <el-button 
              type="primary" 
              size="large"
              @click="saveToLocalFolder"
              :loading="savingToFolder"
            >
              <el-icon><FolderAdd /></el-icon>
              {{ savedFolderName ? `更新到 ${savedFolderName}` : '选择文件夹保存' }}
            </el-button>
            
            <el-button 
              v-if="savedFolderName"
              type="success"
              size="large"
              @click="openInGitHubDesktop"
              :loading="generatingCommit"
            >
              <el-icon><Monitor /></el-icon>
              {{ generatingCommit ? 'AI 生成 commit...' : '用 GitHub Desktop 打开' }}
            </el-button>
            
            <el-button 
              size="large"
              @click="downloadAllCode"
            >
              <el-icon><Download /></el-icon>
              下载 ZIP
            </el-button>
          </div>
          
          <!-- 保存成功提示 -->
          <div v-if="saveResult" class="save-result" :class="saveResult.type">
            <template v-if="saveResult.type === 'success'">
              <div>✅ 已保存 {{ saveResult.fileCount }} 个文件到「{{ saveResult.folderName }}」</div>
              
              <!-- 显示 AI 生成的 commit message -->
              <div v-if="saveResult.commitMsg || lastCommitMessage" class="commit-preview">
                <div class="commit-label">📋 Commit Message（已复制到剪贴板）：</div>
                <div class="commit-box">
                  <div class="commit-summary">{{ (saveResult.commitMsg || lastCommitMessage).summary }}</div>
                  <div class="commit-desc">{{ (saveResult.commitMsg || lastCommitMessage).description }}</div>
                </div>
              </div>
              
              <div class="save-hint">
                双击项目中的 <code>open-github-desktop.command</code> → GitHub Desktop 打开 → Cmd+V 粘贴 commit message → Commit
              </div>
            </template>
            <span v-else>❌ {{ saveResult.message }}</span>
          </div>
        </div>
        
        <!-- 其他操作 -->
        <div class="card actions-card">
          <div class="actions-grid">
            <el-button 
              size="large"
              @click="viewSetupGuide"
            >
              <el-icon><Reading /></el-icon>
              使用说明
            </el-button>
            
            <el-button 
              type="success"
              size="large"
              @click="$router.push('/test')"
            >
              <el-icon><Checked /></el-icon>
              去测试
            </el-button>
            
            <el-button 
              type="warning"
              size="large"
              @click="goToIteration"
            >
              <el-icon><ChatDotRound /></el-icon>
              提交反馈/迭代
            </el-button>
            
            <el-button 
              v-if="projectStore.currentProject.githubRepo"
              size="large"
              @click="openGitHub"
            >
              <el-icon><Link /></el-icon>
              GitHub 仓库
            </el-button>
          </div>
        </div>
        
        <!-- ⭐ 快速部署指南 -->
        <div v-if="demoCode.deployGuide" class="card deploy-guide-card">
          <h3>🚀 快速部署指南</h3>
          
          <!-- 前置条件 -->
          <div v-if="demoCode.deployGuide.prerequisites?.length" class="guide-section">
            <h4>前置条件</h4>
            <ul class="prereq-list">
              <li v-for="(p, i) in demoCode.deployGuide.prerequisites" :key="i">{{ p }}</li>
            </ul>
          </div>
          
          <!-- 部署步骤 -->
          <div class="deploy-steps">
            <div 
              v-for="(step, i) in demoCode.deployGuide.steps || []" 
              :key="i" 
              class="deploy-step"
            >
              <div class="deploy-step-num">{{ i + 1 }}</div>
              <div class="deploy-step-body">
                <strong>{{ step.title }}</strong>
                <p>{{ step.detail }}</p>
                <div v-if="step.tip" class="deploy-tip">💡 {{ step.tip }}</div>
              </div>
            </div>
          </div>
          
          <!-- 环境配置 -->
          <div v-if="demoCode.deployGuide.envConfig?.length" class="guide-section">
            <h4>环境配置</h4>
            <el-table :data="demoCode.deployGuide.envConfig" size="small" stripe>
              <el-table-column prop="name" label="配置项" width="180" />
              <el-table-column prop="value" label="示例值" width="200" />
              <el-table-column prop="description" label="说明" />
            </el-table>
          </div>
          
          <!-- 常见问题 -->
          <div v-if="demoCode.deployGuide.commonIssues?.length" class="guide-section">
            <h4>⚠️ 常见问题</h4>
            <div 
              v-for="(issue, i) in demoCode.deployGuide.commonIssues" 
              :key="i" 
              class="issue-item"
            >
              <div class="issue-problem">❓ {{ issue.problem }}</div>
              <div class="issue-solution">✅ {{ issue.solution }}</div>
            </div>
          </div>
        </div>
        
        <!-- ⭐ 测试指南 -->
        <div v-if="demoCode.testGuide" class="card test-guide-card">
          <div class="card-title-row">
            <h3>🧪 测试指南</h3>
            <el-button type="primary" size="small" @click="$router.push('/test')">
              打开测试工作台 →
            </el-button>
          </div>
          
          <div v-if="demoCode.testGuide.testEnv" class="guide-section">
            <h4>测试环境</h4>
            <p class="guide-text">{{ demoCode.testGuide.testEnv }}</p>
          </div>
          
          <!-- 快速冒烟测试 -->
          <div v-if="demoCode.testGuide.quickTests?.length" class="guide-section">
            <h4>快速冒烟测试（先跑这几项）</h4>
            <div class="quick-tests">
              <div v-for="(t, i) in demoCode.testGuide.quickTests" :key="i" class="quick-test-item">
                <div class="qt-header">
                  <span class="qt-num">{{ i + 1 }}</span>
                  <strong>{{ t.name }}</strong>
                </div>
                <div class="qt-detail">
                  <div><span class="qt-label">操作：</span>{{ t.steps }}</div>
                  <div><span class="qt-label">预期：</span>{{ t.expected }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="demoCode.testGuide.testFlow" class="guide-section">
            <h4>推荐测试流程</h4>
            <p class="guide-text">{{ demoCode.testGuide.testFlow }}</p>
          </div>
          
          <div v-if="demoCode.testGuide.deviceTests" class="guide-section">
            <h4>📱 真机测试注意</h4>
            <p class="guide-text">{{ demoCode.testGuide.deviceTests }}</p>
          </div>
          
          <div v-if="demoCode.testGuide.performanceTips" class="guide-section">
            <h4>⚡ 性能关注点</h4>
            <p class="guide-text">{{ demoCode.testGuide.performanceTips }}</p>
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
        
        <!-- 使用说明对话框（兼容旧数据） -->
        <el-dialog
          v-model="setupDialogVisible"
          title="📖 使用说明"
          width="70%"
        >
          <div class="setup-guide">
            <!-- 新版：显示部署指南 -->
            <template v-if="demoCode.deployGuide">
              <h3>🚀 部署步骤</h3>
              <ol>
                <li v-for="(step, i) in demoCode.deployGuide.steps" :key="i">
                  <strong>{{ step.title }}</strong> — {{ step.detail }}
                  <span v-if="step.tip" style="color: #e6a23c;"> ({{ step.tip }})</span>
                </li>
              </ol>
              
              <h3 v-if="demoCode.deployGuide.commonIssues?.length">⚠️ 常见问题</h3>
              <ul v-if="demoCode.deployGuide.commonIssues?.length">
                <li v-for="(issue, i) in demoCode.deployGuide.commonIssues" :key="i">
                  {{ issue.problem }} → {{ issue.solution }}
                </li>
              </ul>
            </template>
            
            <!-- 旧版：显示setup -->
            <template v-else>
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
            </template>
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
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'
import { 
  InfoFilled, Loading, Link, Download, Upload, Reading, 
  Search, Document, CopyDocument, FolderOpened, ChatDotRound, Checked,
  FolderAdd, Monitor
} from '@element-plus/icons-vue'
import { useProjectStore } from '@/stores/project'
import { callAI } from '@/api/ai'
import { aiQueue } from '@/utils/aiQueue'
import { githubService } from '@/utils/github'
import JSZip from 'jszip'

const router = useRouter()
const projectStore = useProjectStore()

const generatingDemo = ref(false)
const demoProgress = ref(0)
const demoStepInfo = ref({})  // ⭐ 分步进度信息 { step, total, current, percentage }
const pushingToGithub = ref(false)
const setupDialogVisible = ref(false)
const fileSearchText = ref('')
const activeFiles = ref([])

// ⭐ 本地文件夹保存相关
const savingToFolder = ref(false)
const savedFolderName = ref('')
const saveResult = ref(null)
const lastCommitMessage = ref(null)  // { summary, description }
const generatingCommit = ref(false)
let savedDirHandle = null  // File System Access API 的目录句柄

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
    
    // ⭐ 读取分步进度信息
    const currentTask = aiQueue.currentTask
    if (currentTask?.taskType === 'generate_demo' && currentTask._progress) {
      demoStepInfo.value = currentTask._progress
      demoProgress.value = currentTask._progress.percentage || demoProgress.value
    } else {
      demoProgress.value = Math.min(95, demoProgress.value + 1)
    }
    
  } else if (hasPrdTask) {
    // PRD还在生成，Demo还没开始
    generatingDemo.value = true
    demoStepInfo.value = { step: 0, current: '正在生成PRD，完成后自动生成Demo...' }
    demoProgress.value = Math.min(30, demoProgress.value + 1)
  } else if (activeDemoCode.value) {
    // 刚完成生成 → 提示保存
    if (generatingDemo.value) {
      promptSaveAfterGeneration()
    }
    generatingDemo.value = false
    demoProgress.value = 100
    demoStepInfo.value = {}
  } else {
    // 没有任务也没有Demo，可能任务已失败
    if (generatingDemo.value && demoProgress.value > 0) {
      generatingDemo.value = false
      demoStepInfo.value = {}
    }
  }
}

// ⭐ Demo 生成完成后自动提示保存
let hasPrompted = false
function promptSaveAfterGeneration() {
  if (hasPrompted) return
  hasPrompted = true
  
  setTimeout(() => {
    const supportsFSA = 'showDirectoryPicker' in window
    
    ElNotification({
      title: '🎉 Demo 代码已生成',
      message: supportsFSA 
        ? '点击「选择文件夹保存」将代码保存到本地，然后用 GitHub Desktop 管理版本。'
        : '点击「下载 ZIP」保存代码到本地。',
      type: 'success',
      duration: 10000
    })
  }, 1000)
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

// ⭐ 保存到本地文件夹（File System Access API）
async function saveToLocalFolder() {
  // 检查浏览器是否支持
  if (!('showDirectoryPicker' in window)) {
    ElMessage.warning('当前浏览器不支持文件夹选择，请使用 Chrome / Edge 浏览器，或使用「下载 ZIP」方式')
    return
  }
  
  try {
    savingToFolder.value = true
    saveResult.value = null
    
    // 选择目录（如果之前选过，尝试复用）
    const dirHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'desktop'
    })
    
    savedDirHandle = dirHandle
    savedFolderName.value = dirHandle.name
    
    const projectName = demoCode.value.projectName || projectStore.currentProject.name
    
    // 创建项目子目录
    const projectDir = await dirHandle.getDirectoryHandle(projectName, { create: true })
    
    let fileCount = 0
    
    // 写入所有文件
    const allFiles = [
      ...(demoCode.value.files || []),
      ...(demoCode.value.cloudFunctions || [])
    ]
    
    for (const file of allFiles) {
      await writeFileToDir(projectDir, file.path, file.content || '')
      fileCount++
    }
    
    // 写入 README.md
    const readme = generateLocalReadme()
    await writeFileToDir(projectDir, 'README.md', readme)
    fileCount++
    
    // 写入 .gitignore
    const gitignore = `node_modules/\n.DS_Store\nminiprogram_npm/\n`
    await writeFileToDir(projectDir, '.gitignore', gitignore)
    fileCount++
    
    // ⭐ 写入一键打开 GitHub Desktop 的脚本（macOS .command 文件）
    const openScript = `#!/bin/bash
# ============================================
# 一键初始化 Git 并打开 GitHub Desktop
# 由星见开发工作流自动生成
# ============================================
cd "$(dirname "$0")"

echo "========================================"
echo "  🚀 项目部署助手"
echo "========================================"
echo ""

# ---- 第1步：检查 Git 是否安装 ----
if ! command -v git &> /dev/null; then
  echo "❌ 错误：未检测到 Git"
  echo ""
  echo "请先安装 Git："
  echo "  方法1: 打开终端，输入 xcode-select --install"
  echo "  方法2: 从 https://git-scm.com/download/mac 下载"
  echo ""
  osascript -e 'display alert "未检测到 Git" message "请先安装 Git：\\n\\n打开终端输入: xcode-select --install\\n\\n或从 https://git-scm.com 下载" as critical buttons {"去安装","取消"} default button 1' 2>/dev/null
  if [ $? -eq 0 ]; then
    xcode-select --install 2>/dev/null
  fi
  exit 1
fi

echo "✅ Git 已安装: $(git --version)"

# ---- 第2步：检查 GitHub Desktop 是否安装 ----
GITHUB_DESKTOP_PATH="/Applications/GitHub Desktop.app"
if [ ! -d "$GITHUB_DESKTOP_PATH" ]; then
  # 也检查用户目录
  GITHUB_DESKTOP_PATH="$HOME/Applications/GitHub Desktop.app"
fi

if [ ! -d "$GITHUB_DESKTOP_PATH" ]; then
  echo ""
  echo "❌ 错误：未检测到 GitHub Desktop"
  echo ""
  echo "========================================" 
  echo "  请先安装 GitHub Desktop"
  echo "  下载地址: https://desktop.github.com/"
  echo "========================================"
  echo ""
  
  # 弹出 macOS 原生对话框
  CHOICE=$(osascript -e 'display alert "未检测到 GitHub Desktop" message "需要安装 GitHub Desktop 才能进行版本管理和代码部署。\\n\\n点击「去下载」打开下载页面。" as critical buttons {"取消","去下载"} default button "去下载"' 2>/dev/null)
  
  if echo "$CHOICE" | grep -q "去下载"; then
    open "https://desktop.github.com/"
  fi
  
  echo "安装完成后，请再次双击此文件。"
  exit 1
fi

echo "✅ GitHub Desktop 已安装"

# ---- 第3步：初始化 Git 仓库 ----
if [ ! -d ".git" ]; then
  echo ""
  echo "🔧 初始化 Git 仓库..."
  git init
  git add .
  
  # 如果有 commit-message.txt，用它来做首次提交
  if [ -f "commit-message.txt" ]; then
    git commit -m "$(head -1 commit-message.txt)" -m "$(tail -n +3 commit-message.txt)" 2>/dev/null
    echo "✅ 已自动完成首次 commit"
  fi
  
  echo "✅ Git 仓库已初始化"
else
  echo "✅ Git 仓库已存在"
fi

# ---- 第4步：打开 GitHub Desktop ----
echo ""
echo "🚀 正在打开 GitHub Desktop..."
open -a "GitHub Desktop" "$(pwd)"

echo ""
echo "========================================"
echo "  ✅ 全部完成！"
echo "  请在 GitHub Desktop 中："
echo "  1. 确认文件变更"
echo "  2. 填写 commit message (Cmd+V 粘贴)"
echo "  3. 点击 Commit → Publish/Push"
echo "========================================"
echo ""
echo "按任意键关闭此窗口..."
read -n 1
`
    await writeFileToDir(projectDir, 'open-github-desktop.command', openScript)
    fileCount++
    
    // ⭐ AI 生成 commit message 并复制到剪贴板
    const commitMsg = await generateCommitMessage()
    if (commitMsg) {
      // 写入 commit-message.txt 方便查看
      await writeFileToDir(projectDir, 'commit-message.txt', `${commitMsg.summary}\n\n${commitMsg.description}`)
      
      // 自动复制到剪贴板
      try {
        await navigator.clipboard.writeText(`${commitMsg.summary}\n\n${commitMsg.description}`)
        lastCommitMessage.value = commitMsg
      } catch (e) {
        console.warn('剪贴板写入失败:', e)
      }
    }
    
    saveResult.value = {
      type: 'success',
      fileCount,
      folderName: `${dirHandle.name}/${projectName}`,
      commitMsg
    }
    
    // 记住目录名
    localStorage.setItem(`demo_save_dir_${projectStore.currentProject.id}`, dirHandle.name)
    
    ElNotification({
      title: '✅ 代码已保存',
      message: commitMsg 
        ? `${fileCount} 个文件已保存。Commit message 已复制到剪贴板，双击 open-github-desktop.command 即可打开。`
        : `${fileCount} 个文件已保存。双击项目中的 open-github-desktop.command 可一键打开 GitHub Desktop。`,
      type: 'success',
      duration: 10000
    })
    
  } catch (error) {
    if (error.name === 'AbortError') {
      // 用户取消选择
      return
    }
    saveResult.value = {
      type: 'error',
      message: error.message
    }
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    savingToFolder.value = false
  }
}

/**
 * 递归创建目录并写入文件
 * path 可能是 "pages/index/index.js" 这种嵌套路径
 */
async function writeFileToDir(rootDir, filePath, content) {
  const parts = filePath.split('/')
  const fileName = parts.pop()
  
  // 逐层创建子目录
  let currentDir = rootDir
  for (const dirName of parts) {
    currentDir = await currentDir.getDirectoryHandle(dirName, { create: true })
  }
  
  // 写入文件
  const fileHandle = await currentDir.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

/**
 * 生成本地 README
 */
function generateLocalReadme() {
  const project = projectStore.currentProject
  const code = demoCode.value
  
  let md = `# ${code.projectName || project.name}\n\n`
  md += `> 由星见开发工作流自动生成 · ${new Date().toLocaleDateString('zh-CN')}\n\n`
  
  if (code.structure?.description) {
    md += `## 项目说明\n\n${code.structure.description}\n\n`
  }
  
  if (code.structure?.tree) {
    md += `## 项目结构\n\n\`\`\`\n${code.structure.tree}\n\`\`\`\n\n`
  }
  
  // 部署指南
  if (code.deployGuide?.steps) {
    md += `## 快速部署\n\n`
    code.deployGuide.steps.forEach((s, i) => {
      md += `### ${i + 1}. ${s.title}\n\n${s.detail}\n`
      if (s.tip) md += `\n> 💡 ${s.tip}\n`
      md += '\n'
    })
  } else if (code.setup?.steps) {
    md += `## 快速开始\n\n`
    code.setup.steps.forEach(s => { md += `- ${s}\n` })
    md += '\n'
  }
  
  // 测试指南
  if (code.testGuide?.quickTests) {
    md += `## 测试指南\n\n`
    if (code.testGuide.testEnv) md += `**测试环境**: ${code.testGuide.testEnv}\n\n`
    md += `### 快速冒烟测试\n\n`
    code.testGuide.quickTests.forEach((t, i) => {
      md += `${i + 1}. **${t.name}**\n   - 步骤: ${t.steps}\n   - 预期: ${t.expected}\n\n`
    })
  }
  
  // 常见问题
  if (code.deployGuide?.commonIssues) {
    md += `## 常见问题\n\n`
    code.deployGuide.commonIssues.forEach(i => {
      md += `**Q: ${i.problem}**\n\nA: ${i.solution}\n\n`
    })
  }
  
  return md
}

/**
 * ⭐ AI 生成 commit message
 */
async function generateCommitMessage() {
  const project = projectStore.currentProject
  if (!project) return null
  
  const phase = viewPhase.value
  const phaseNames = { 1: '骨架(MVP)', 2: '血肉(完整功能)', 3: '衣服(拓展功能)' }
  const code = demoCode.value
  const fileList = code.files?.map(f => f.path).join(', ') || ''
  
  try {
    const prompt = `请为以下代码提交生成 Git commit message（Summary 和 Description）。

项目名：${project.name}
阶段：Phase ${phase} - ${phaseNames[phase] || ''}
文件数：${code.files?.length || 0} 个
云函数：${code.cloudFunctions?.length || 0} 个
文件列表：${fileList.slice(0, 500)}

⚠️ 只输出纯JSON：
{
  "summary": "一行简洁的英文+中文摘要，50字以内，如: feat: Phase 1 骨架版 - 智能衣橱小程序核心功能",
  "description": "多行描述，说明本次提交包含什么，2-5行中文"
}`

    const response = await callAI([
      { role: 'system', content: '你是 Git 提交信息专家。只输出纯JSON。' },
      { role: 'user', content: prompt }
    ], { temperature: 0.3, maxTokens: 512 })
    
    // 简单解析
    let parsed
    try {
      parsed = JSON.parse(response)
    } catch {
      const match = response.match(/\{[\s\S]*\}/)
      if (match) parsed = JSON.parse(match[0])
    }
    
    return parsed || { 
      summary: `feat: Phase ${phase} ${project.name}`,
      description: `Phase ${phase} Demo 代码生成，共 ${code.files?.length || 0} 个文件`
    }
    
  } catch (error) {
    console.warn('AI 生成 commit message 失败，使用默认:', error)
    return {
      summary: `feat: Phase ${phase} ${project.name}`,
      description: `Phase ${phase} Demo 代码，${code.files?.length || 0} 个文件`
    }
  }
}

/**
 * ⭐ 打开 GitHub Desktop（带 AI commit message）
 */
async function openInGitHubDesktop() {
  if (!savedFolderName.value) {
    ElMessage.warning('请先保存代码到本地文件夹')
    return
  }
  
  // 如果还没有 commit message，先生成
  generatingCommit.value = true
  let commitMsg = lastCommitMessage.value
  if (!commitMsg) {
    commitMsg = await generateCommitMessage()
    lastCommitMessage.value = commitMsg
  }
  generatingCommit.value = false
  
  // 复制到剪贴板
  if (commitMsg) {
    try {
      await navigator.clipboard.writeText(`${commitMsg.summary}\n\n${commitMsg.description}`)
    } catch {}
  }
  
  const summaryPreview = commitMsg?.summary || 'feat: Phase X ...'
  const descPreview = commitMsg?.description || '...'
  
  ElMessageBox.alert(
    `<div style="line-height: 1.8;">
      <div style="background: #fdf6ec; border: 1px solid #e6a23c; padding: 10px 14px; border-radius: 8px; margin-bottom: 14px; font-size: 13px; color: #e6a23c;">
        ⚠️ <strong>前置检查：</strong>需要安装 <a href="https://desktop.github.com/" target="_blank" style="color: #e6a23c; text-decoration: underline;">GitHub Desktop</a>。
        双击脚本时如果未安装，会弹窗提示并引导下载。
      </div>

      <p><strong>📋 AI 生成的 Commit Message（已复制到剪贴板）：</strong></p>
      <div style="background: #1a1a2e; color: #67c23a; padding: 12px 16px; border-radius: 8px; margin: 8px 0 14px; font-family: monospace; font-size: 13px;">
        <div style="font-weight: 600; margin-bottom: 4px;">${summaryPreview}</div>
        <div style="color: #aaa; white-space: pre-line;">${descPreview}</div>
      </div>
      
      <p><strong>操作步骤：</strong></p>
      <ol>
        <li>在 Finder 中找到保存的项目文件夹「<code>${savedFolderName.value}</code>」</li>
        <li>双击 <strong style="color: #409eff;">open-github-desktop.command</strong>
          <ul style="margin: 4px 0; font-size: 13px; color: #999;">
            <li>首次可能提示"无法打开" → 右键 → 打开 → 信任即可</li>
            <li>脚本会自动检查 Git 和 GitHub Desktop 是否安装</li>
            <li>❌ 如果未安装，会<strong style="color: #f56c6c;">弹出提示窗口</strong>引导你下载</li>
          </ul>
        </li>
        <li>GitHub Desktop 打开后，显示所有文件变更</li>
        <li>左下角 Summary 栏 <strong>Cmd+V 粘贴</strong> commit message</li>
        <li>点击 <strong>Commit to main</strong> → <strong>Publish / Push</strong></li>
      </ol>
      
      <p style="margin-top: 12px; color: #67c23a;">
        💡 之后每次代码更新 → 保存到本地 → GitHub Desktop 自动显示 diff → 粘贴 commit → push
      </p>
    </div>`,
    '🚀 用 GitHub Desktop 提交代码',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '去操作',
      customStyle: { maxWidth: '600px' }
    }
  )
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

.progress-detail {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
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

/* ⭐ 保存代码卡片 */
.save-card {
  border: 2px solid rgba(64, 158, 255, 0.3);
  background: linear-gradient(135deg, rgba(64,158,255,0.03) 0%, white 100%);
}

.save-card h3 {
  margin: 0 0 4px;
}

.save-desc {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--text-secondary);
}

.save-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.save-result {
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
}

.save-result.success {
  background: rgba(103, 194, 58, 0.08);
  color: var(--text-primary);
}

.save-result.error {
  background: rgba(245, 108, 108, 0.08);
  color: #f56c6c;
}

.save-hint {
  color: var(--text-secondary);
  font-size: 13px;
  margin-top: 8px;
}

.save-hint code {
  background: rgba(64,158,255,0.1);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

/* Commit message 预览 */
.commit-preview {
  margin-top: 12px;
}

.commit-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.commit-box {
  background: #1a1a2e;
  padding: 12px 16px;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.commit-summary {
  color: #67c23a;
  font-weight: 600;
  margin-bottom: 4px;
}

.commit-desc {
  color: #aaa;
  white-space: pre-line;
  line-height: 1.6;
}

/* card title row */
.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-title-row h3 {
  margin: 0;
}

/* ⭐ 部署指南 */
.deploy-guide-card h3,
.test-guide-card h3 {
  margin: 0 0 16px;
}

.guide-section {
  margin-top: 20px;
}

.guide-section h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: var(--text-primary);
}

.guide-text {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.prereq-list {
  padding-left: 20px;
  margin: 0;
}

.prereq-list li {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 4px;
}

/* 部署步骤 */
.deploy-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.deploy-step {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.deploy-step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
}

.deploy-step-body {
  flex: 1;
}

.deploy-step-body strong {
  color: var(--text-primary);
  display: block;
  margin-bottom: 2px;
}

.deploy-step-body p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.deploy-tip {
  margin-top: 4px;
  font-size: 13px;
  color: #e6a23c;
  background: rgba(230,162,60,0.08);
  padding: 4px 10px;
  border-radius: 4px;
  display: inline-block;
}

/* 常见问题 */
.issue-item {
  padding: 10px 14px;
  background: var(--bg-tertiary, #f9f9f9);
  border-radius: 8px;
  margin-bottom: 8px;
}

.issue-problem {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.issue-solution {
  font-size: 13px;
  color: #67c23a;
}

/* ⭐ 测试指南 */
.quick-tests {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-test-item {
  border: 1px solid var(--border-color, #eee);
  border-radius: 8px;
  padding: 12px 14px;
}

.qt-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.qt-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #409eff;
  color: white;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.qt-detail {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
  padding-left: 32px;
}

.qt-label {
  color: var(--text-disabled, #aaa);
  font-size: 12px;
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
