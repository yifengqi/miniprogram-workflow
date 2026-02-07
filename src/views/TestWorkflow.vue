<template>
  <div class="test-page">
    <div class="page-header">
      <h1 class="page-title">测试工作台</h1>
      <p class="page-desc">
        {{ projectStore.currentProject ? `当前项目：${projectStore.currentProject.name}` : '请先选择一个项目' }}
      </p>
    </div>

    <template v-if="projectStore.currentProject">
      <!-- ⭐ Step 1: 环境准备指引 -->
      <div class="card setup-card">
        <div class="card-title-row">
          <h3>📱 第一步：环境准备</h3>
          <el-tag :type="envReady ? 'success' : 'warning'" size="small">
            {{ envReady ? '已确认就绪' : '待确认' }}
          </el-tag>
        </div>
        
        <el-steps :active="envStep" finish-status="success" simple style="margin: 16px 0;">
          <el-step title="下载代码" />
          <el-step title="打开开发者工具" />
          <el-step title="导入项目" />
          <el-step title="编译运行" />
        </el-steps>
        
        <el-collapse v-model="showEnvGuide">
          <el-collapse-item title="详细操作指引（点击展开）" name="guide">
            <div class="env-guide">
              <div class="guide-step">
                <div class="step-num">1</div>
                <div class="step-content">
                  <strong>下载代码包</strong>
                  <p>在「Demo代码」页面点击「下载完整代码」，获得 .zip 文件，解压到本地。</p>
                  <el-button size="small" type="primary" @click="$router.push('/demo')">
                    去下载代码
                  </el-button>
                </div>
              </div>
              
              <div class="guide-step">
                <div class="step-num">2</div>
                <div class="step-content">
                  <strong>安装微信开发者工具</strong>
                  <p>如果还没安装，从官方下载：</p>
                  <el-link type="primary" href="https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html" target="_blank">
                    微信开发者工具下载地址
                  </el-link>
                </div>
              </div>
              
              <div class="guide-step">
                <div class="step-num">3</div>
                <div class="step-content">
                  <strong>导入项目</strong>
                  <p>打开开发者工具 → 项目 → 导入项目 → 选择解压后的文件夹</p>
                  <p class="tip">💡 AppID 可以先选「测试号」，后面再换正式的</p>
                </div>
              </div>
              
              <div class="guide-step">
                <div class="step-num">4</div>
                <div class="step-content">
                  <strong>编译运行</strong>
                  <p>导入后自动编译，左侧模拟器会显示小程序界面。如果有云函数，需要先：</p>
                  <ul>
                    <li>开通云开发（云开发 → 开通）</li>
                    <li>右键 cloudfunctions 文件夹 → 上传并部署所有云函数</li>
                  </ul>
                </div>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
        
        <div style="margin-top: 12px; text-align: right;">
          <el-button 
            :type="envReady ? 'success' : 'primary'" 
            @click="confirmEnvReady"
          >
            {{ envReady ? '✅ 环境已就绪' : '确认环境已准备好' }}
          </el-button>
        </div>
      </div>

      <!-- ⭐ Step 2: 阶段选择 -->
      <div v-if="projectStore.currentProject.phases" class="card">
        <h3>📋 测试阶段</h3>
        <el-radio-group v-model="testPhase" size="default" style="margin-top: 8px;">
          <el-radio-button v-for="p in 3" :key="p" :value="p" :disabled="!getPhaseDemo(p)">
            Phase {{ p }} {{ phaseLabels[p] }}
            <el-tag v-if="getPhaseTestStatus(p) === 'passed'" type="success" size="small" style="margin-left:4px;">通过</el-tag>
            <el-tag v-else-if="getPhaseTestStatus(p) === 'partial'" type="warning" size="small" style="margin-left:4px;">部分</el-tag>
          </el-radio-button>
        </el-radio-group>
      </div>
      
      <!-- ⭐ AI 生成的测试指南（如果Demo里有） -->
      <div v-if="currentTestGuide" class="card ai-test-guide-card">
        <h3>📖 AI 测试指南</h3>
        
        <div v-if="currentTestGuide.testEnv" class="tg-section">
          <strong>测试环境：</strong>
          <span>{{ currentTestGuide.testEnv }}</span>
        </div>
        
        <div v-if="currentTestGuide.quickTests?.length" class="tg-section">
          <strong>⚡ 快速冒烟测试（先跑这几项确认基础功能正常）</strong>
          <div class="tg-quick-list">
            <div v-for="(t, i) in currentTestGuide.quickTests" :key="i" class="tg-quick-item">
              <span class="tg-num">{{ i + 1 }}</span>
              <div>
                <div class="tg-name">{{ t.name }}</div>
                <div class="tg-sub">步骤：{{ t.steps }}</div>
                <div class="tg-sub">预期：{{ t.expected }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="currentTestGuide.testFlow" class="tg-section">
          <strong>推荐测试流程：</strong>
          <p class="tg-text">{{ currentTestGuide.testFlow }}</p>
        </div>
        
        <div v-if="currentTestGuide.deviceTests" class="tg-section">
          <strong>📱 真机测试注意：</strong>
          <p class="tg-text">{{ currentTestGuide.deviceTests }}</p>
        </div>
        
        <div v-if="currentTestGuide.performanceTips" class="tg-section">
          <strong>⚡ 性能关注：</strong>
          <p class="tg-text">{{ currentTestGuide.performanceTips }}</p>
        </div>
      </div>

      <!-- ⭐ Step 3: 测试用例 -->
      <div class="card test-cases-card">
        <div class="card-title-row">
          <h3>🧪 测试用例</h3>
          <div class="test-actions">
            <el-button 
              type="primary" 
              :loading="generatingCases" 
              @click="generateTestCases"
              :disabled="!envReady"
            >
              {{ testCases.length ? '🔄 重新生成' : '🤖 AI生成测试用例' }}
            </el-button>
          </div>
        </div>
        
        <div v-if="generatingCases" class="generating-hint">
          <el-icon class="loading-icon"><Loading /></el-icon>
          AI 正在根据 PRD 和代码结构生成测试用例...
        </div>
        
        <div v-else-if="testCases.length === 0" class="empty-cases">
          <p>还没有测试用例，点击上方按钮让 AI 自动生成</p>
          <p class="sub-text">AI 会根据你的 PRD 文档和生成的代码，自动产出功能测试、边界测试、兼容性测试用例</p>
        </div>
        
        <template v-else>
          <!-- 测试进度总览 -->
          <div class="test-summary">
            <div class="summary-item passed">
              <span class="count">{{ passedCount }}</span>
              <span class="label">通过</span>
            </div>
            <div class="summary-item failed">
              <span class="count">{{ failedCount }}</span>
              <span class="label">失败</span>
            </div>
            <div class="summary-item blocked">
              <span class="count">{{ blockedCount }}</span>
              <span class="label">阻塞</span>
            </div>
            <div class="summary-item pending">
              <span class="count">{{ pendingCount }}</span>
              <span class="label">待测</span>
            </div>
            <div class="summary-progress">
              <el-progress 
                :percentage="testProgress" 
                :color="testProgress === 100 ? '#67c23a' : '#409eff'"
                :stroke-width="10"
              />
            </div>
          </div>

          <!-- 按分类显示测试用例 -->
          <div v-for="(group, category) in groupedCases" :key="category" class="test-group">
            <div class="group-header" @click="toggleGroup(category)">
              <span class="group-icon">{{ categoryIcons[category] || '📌' }}</span>
              <span class="group-title">{{ category }}</span>
              <span class="group-count">
                {{ getGroupProgress(group) }}
              </span>
              <el-icon class="group-arrow"><ArrowDown /></el-icon>
            </div>
            
            <div v-show="expandedGroups.includes(category)" class="group-body">
              <div 
                v-for="tc in group" 
                :key="tc.id" 
                class="test-case-item"
                :class="tc.status"
              >
                <div class="case-main">
                  <div class="case-priority" :class="tc.priority">
                    {{ tc.priority }}
                  </div>
                  <div class="case-info">
                    <div class="case-title">{{ tc.title }}</div>
                    <div class="case-steps" v-if="tc.steps">
                      <span class="steps-label">步骤：</span>{{ tc.steps }}
                    </div>
                    <div class="case-expected" v-if="tc.expected">
                      <span class="expected-label">预期：</span>{{ tc.expected }}
                    </div>
                  </div>
                </div>
                
                <div class="case-actions">
                  <el-button-group size="small">
                    <el-button 
                      :type="tc.status === 'passed' ? 'success' : 'default'"
                      @click="markCase(tc.id, 'passed')"
                    >✅</el-button>
                    <el-button 
                      :type="tc.status === 'failed' ? 'danger' : 'default'"
                      @click="markCase(tc.id, 'failed')"
                    >❌</el-button>
                    <el-button 
                      :type="tc.status === 'blocked' ? 'warning' : 'default'"
                      @click="markCase(tc.id, 'blocked')"
                    >🚫</el-button>
                  </el-button-group>
                  
                  <!-- 失败备注 -->
                  <el-input 
                    v-if="tc.status === 'failed' || tc.status === 'blocked'"
                    v-model="tc.remark" 
                    size="small" 
                    placeholder="备注问题描述..."
                    style="margin-top: 6px; width: 100%;"
                    @change="saveTestData"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- ⭐ Step 4: 测试报告 & 下一步 -->
      <div v-if="testCases.length > 0" class="card report-card">
        <h3>📊 测试报告</h3>
        
        <div v-if="testProgress < 100" class="report-hint">
          还有 {{ pendingCount }} 个用例未测试，完成后可生成报告
        </div>
        
        <template v-else>
          <div class="report-result" :class="failedCount === 0 ? 'all-pass' : 'has-fail'">
            <div class="report-icon">{{ failedCount === 0 ? '🎉' : '⚠️' }}</div>
            <div class="report-text">
              <h4>{{ failedCount === 0 ? '全部测试通过！' : `${failedCount} 个用例未通过` }}</h4>
              <p v-if="failedCount === 0">
                Phase {{ testPhase }} 测试通过，可以进入下一阶段
              </p>
              <p v-else>
                有 {{ failedCount }} 个失败 + {{ blockedCount }} 个阻塞，建议提交迭代修复
              </p>
            </div>
          </div>
          
          <div class="report-actions">
            <el-button 
              v-if="failedCount === 0" 
              type="success" 
              size="large"
              @click="confirmPhasePass"
            >
              ✅ 确认通过，进入下一阶段
            </el-button>
            
            <el-button 
              v-if="failedCount > 0" 
              type="warning" 
              size="large"
              @click="submitFailedAsIteration"
            >
              📝 将失败用例提交为迭代反馈
            </el-button>
            
            <el-button size="large" @click="exportReport">
              📄 导出测试报告
            </el-button>
          </div>
        </template>
      </div>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'
import { Loading, ArrowDown, FolderOpened } from '@element-plus/icons-vue'
import { useProjectStore } from '@/stores/project'
import { callAI } from '@/api/ai'
import { aiLogger } from '@/utils/aiLogger'

const router = useRouter()
const projectStore = useProjectStore()

// 状态
const envReady = ref(false)
const envStep = ref(0)
const showEnvGuide = ref([])
const testPhase = ref(projectStore.currentProject?.currentPhase || 1)
const testCases = ref([])
const generatingCases = ref(false)
const expandedGroups = ref([])

const phaseLabels = { 1: '骨架', 2: '血肉', 3: '衣服' }
const categoryIcons = {
  '核心功能测试': '🎯',
  '页面UI测试': '🖥️',
  '交互流程测试': '🔄',
  '边界条件测试': '⚡',
  '异常处理测试': '🛡️',
  '兼容性测试': '📱',
  '性能测试': '🚀',
  '数据测试': '💾'
}

// 当前阶段的测试指南（来自Demo生成）
const currentTestGuide = computed(() => {
  const project = projectStore.currentProject
  if (!project) return null
  const demo = project.phases?.[testPhase.value]?.demoCode || project.demoCode
  return demo?.testGuide || null
})

// 计算属性
const passedCount = computed(() => testCases.value.filter(t => t.status === 'passed').length)
const failedCount = computed(() => testCases.value.filter(t => t.status === 'failed').length)
const blockedCount = computed(() => testCases.value.filter(t => t.status === 'blocked').length)
const pendingCount = computed(() => testCases.value.filter(t => t.status === 'pending').length)

const testProgress = computed(() => {
  if (testCases.value.length === 0) return 0
  const done = testCases.value.filter(t => t.status !== 'pending').length
  return Math.round((done / testCases.value.length) * 100)
})

const groupedCases = computed(() => {
  const groups = {}
  testCases.value.forEach(tc => {
    const cat = tc.category || '其他'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(tc)
  })
  return groups
})

// 方法
function getPhaseDemo(p) {
  return projectStore.currentProject?.phases?.[p]?.demoCode
}

function getPhaseTestStatus(p) {
  const key = `test_phase_${projectStore.currentProject?.id}_${p}`
  const saved = localStorage.getItem(key)
  if (!saved) return null
  const data = JSON.parse(saved)
  const all = data.cases?.length || 0
  const passed = data.cases?.filter(c => c.status === 'passed').length || 0
  if (all === 0) return null
  if (passed === all) return 'passed'
  if (passed > 0) return 'partial'
  return null
}

function confirmEnvReady() {
  envReady.value = true
  envStep.value = 4
  ElMessage.success('环境确认就绪，可以开始测试了！')
}

function toggleGroup(category) {
  const idx = expandedGroups.value.indexOf(category)
  if (idx === -1) {
    expandedGroups.value.push(category)
  } else {
    expandedGroups.value.splice(idx, 1)
  }
}

function getGroupProgress(group) {
  const done = group.filter(t => t.status !== 'pending').length
  return `${done}/${group.length}`
}

function markCase(caseId, status) {
  const tc = testCases.value.find(t => t.id === caseId)
  if (tc) {
    tc.status = tc.status === status ? 'pending' : status  // 再次点击取消
    saveTestData()
  }
}

// AI 生成测试用例
async function generateTestCases() {
  const project = projectStore.currentProject
  if (!project) return
  
  const phase = testPhase.value
  const prdClient = project.phases?.[phase]?.prdClient || project.prdClient || ''
  const prdDev = project.phases?.[phase]?.prdDev || project.prdDev || ''
  const demoCode = project.phases?.[phase]?.demoCode || project.demoCode
  
  // 收集文件清单
  const fileList = demoCode?.files?.map(f => `${f.path} - ${f.description || ''}`).join('\n') || '(无)'
  
  generatingCases.value = true
  
  const logId = aiLogger.start('generate_test_cases', {
    projectId: project.id,
    phase
  })
  
  try {
    const prompt = `你是一个资深的微信小程序测试专家。请根据以下项目信息，生成一份完整的测试用例清单。

项目名：${project.name}
当前阶段：Phase ${phase} (${phaseLabels[phase]})

客户版PRD（摘要）：
${prdClient?.slice(0, 2000) || '(无)'}

开发版PRD（摘要）：
${prdDev?.slice(0, 2000) || '(无)'}

代码文件清单：
${fileList}

请按以下JSON数组格式输出测试用例：
[
  {
    "id": "tc_001",
    "category": "核心功能测试",
    "priority": "P0",
    "title": "测试用例标题",
    "steps": "操作步骤描述",
    "expected": "预期结果",
    "testEnv": "模拟器/真机/both"
  }
]

要求：
1. 根据PRD描述的功能点，每个功能至少1-2个测试用例
2. 分类要覆盖：核心功能测试、页面UI测试、交互流程测试、边界条件测试、异常处理测试、兼容性测试
3. priority: P0=必测(核心功能), P1=重要, P2=一般
4. Phase 1（骨架）重点测核心流程；Phase 2/3 增加完整性和边界测试
5. steps 写清楚在微信开发者工具/真机上的具体操作步骤
6. 测试用例数量：Phase 1 约 10-15 个，Phase 2 约 15-25 个，Phase 3 约 20-30 个
7. 只输出纯JSON数组，不要额外文字`
    
    const response = await callAI([
      { role: 'system', content: '你是微信小程序测试专家。只输出纯JSON数组，不加任何额外文字。' },
      { role: 'user', content: prompt }
    ], { temperature: 0.4, maxTokens: 4096 })
    
    aiLogger.updateRawContent(logId, response)
    
    // 解析
    let cases = parseTestCases(response)
    
    // 添加默认状态
    cases = cases.map((tc, i) => ({
      ...tc,
      id: tc.id || `tc_${String(i + 1).padStart(3, '0')}`,
      status: 'pending',
      remark: ''
    }))
    
    testCases.value = cases
    
    // 默认展开所有分组
    expandedGroups.value = [...new Set(cases.map(c => c.category))]
    
    saveTestData()
    aiLogger.success(logId, { casesCount: cases.length })
    
    ElMessage.success(`已生成 ${cases.length} 个测试用例`)
    
  } catch (error) {
    aiLogger.error(logId, error)
    ElMessage.error('生成测试用例失败: ' + error.message)
  } finally {
    generatingCases.value = false
  }
}

function parseTestCases(raw) {
  // 策略1: 直接解析
  try { return JSON.parse(raw) } catch {}
  
  // 策略2: 去markdown
  let cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  
  // 策略3: 提取 [ ... ]
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (match) {
    try { return JSON.parse(match[0]) } catch {}
    // 修复常见错误
    const fixed = match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')
    try { return JSON.parse(fixed) } catch {}
  }
  
  throw new Error('无法解析测试用例JSON')
}

// 数据持久化
function saveTestData() {
  const project = projectStore.currentProject
  if (!project) return
  const key = `test_phase_${project.id}_${testPhase.value}`
  localStorage.setItem(key, JSON.stringify({
    cases: testCases.value,
    updatedAt: new Date().toISOString()
  }))
}

function loadTestData() {
  const project = projectStore.currentProject
  if (!project) return
  const key = `test_phase_${project.id}_${testPhase.value}`
  const saved = localStorage.getItem(key)
  if (saved) {
    const data = JSON.parse(saved)
    testCases.value = data.cases || []
    expandedGroups.value = [...new Set(testCases.value.map(c => c.category))]
  } else {
    testCases.value = []
  }
}

// 确认阶段通过
async function confirmPhasePass() {
  try {
    await ElMessageBox.confirm(
      `Phase ${testPhase.value} 全部测试通过，确认进入下一阶段？`,
      '确认',
      { type: 'success' }
    )
    
    projectStore.selectProject(projectStore.currentProject.id)
    projectStore.completePhase(testPhase.value)
    
    ElNotification({
      title: '🎉 阶段通过',
      message: `Phase ${testPhase.value} 测试通过，已解锁下一阶段`,
      type: 'success'
    })
    
    // 切换到下一阶段
    if (testPhase.value < 3) {
      testPhase.value = testPhase.value + 1
    }
  } catch {}
}

// 将失败用例提交为迭代反馈
function submitFailedAsIteration() {
  const failedCases = testCases.value.filter(t => t.status === 'failed' || t.status === 'blocked')
  const feedbackText = failedCases.map(tc => 
    `【${tc.priority}】${tc.title}\n  状态: ${tc.status === 'failed' ? '失败' : '阻塞'}\n  步骤: ${tc.steps}\n  预期: ${tc.expected}\n  备注: ${tc.remark || '无'}`
  ).join('\n\n')
  
  // 存到 sessionStorage 传给迭代页面
  sessionStorage.setItem('iteration_feedback', feedbackText)
  sessionStorage.setItem('iteration_source', 'test_workflow')
  
  ElMessage.success('已准备反馈内容，跳转到迭代管理...')
  router.push('/iteration')
}

// 导出测试报告
function exportReport() {
  const project = projectStore.currentProject
  const phase = testPhase.value
  
  let report = `# 测试报告\n\n`
  report += `**项目**: ${project.name}\n`
  report += `**阶段**: Phase ${phase} (${phaseLabels[phase]})\n`
  report += `**日期**: ${new Date().toLocaleDateString('zh-CN')}\n\n`
  report += `## 测试汇总\n\n`
  report += `| 指标 | 数值 |\n|------|------|\n`
  report += `| 总用例数 | ${testCases.value.length} |\n`
  report += `| 通过 | ${passedCount.value} |\n`
  report += `| 失败 | ${failedCount.value} |\n`
  report += `| 阻塞 | ${blockedCount.value} |\n`
  report += `| 通过率 | ${testCases.value.length ? Math.round(passedCount.value / testCases.value.length * 100) : 0}% |\n\n`
  
  report += `## 详细用例\n\n`
  
  for (const [category, cases] of Object.entries(groupedCases.value)) {
    report += `### ${categoryIcons[category] || '📌'} ${category}\n\n`
    report += `| 优先级 | 用例 | 结果 | 备注 |\n|--------|------|------|------|\n`
    cases.forEach(tc => {
      const statusMap = { passed: '✅通过', failed: '❌失败', blocked: '🚫阻塞', pending: '⏳待测' }
      report += `| ${tc.priority} | ${tc.title} | ${statusMap[tc.status]} | ${tc.remark || '-'} |\n`
    })
    report += '\n'
  }
  
  // 失败详情
  const failedCases = testCases.value.filter(t => t.status === 'failed')
  if (failedCases.length > 0) {
    report += `## ❌ 失败用例详情\n\n`
    failedCases.forEach(tc => {
      report += `### ${tc.title}\n`
      report += `- **优先级**: ${tc.priority}\n`
      report += `- **步骤**: ${tc.steps}\n`
      report += `- **预期**: ${tc.expected}\n`
      report += `- **备注**: ${tc.remark || '无'}\n\n`
    })
  }
  
  // 下载
  const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `测试报告_${project.name}_Phase${phase}_${new Date().toISOString().slice(0,10)}.md`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('测试报告已导出')
}

// 监听阶段切换
watch(testPhase, () => {
  loadTestData()
})

onMounted(() => {
  loadTestData()
  // 恢复环境状态
  const envKey = `test_env_ready_${projectStore.currentProject?.id}`
  if (localStorage.getItem(envKey)) {
    envReady.value = true
    envStep.value = 4
  }
})

watch(envReady, (val) => {
  if (val && projectStore.currentProject) {
    localStorage.setItem(`test_env_ready_${projectStore.currentProject.id}`, '1')
  }
})
</script>

<style scoped>
.test-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px;
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

.card h3 {
  margin: 0 0 12px;
  color: var(--text-primary);
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title-row h3 {
  margin: 0;
}

/* 环境指引 */
.env-guide {
  padding: 8px 0;
}

.guide-step {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.step-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content strong {
  display: block;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.step-content p {
  margin: 4px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.step-content ul {
  padding-left: 20px;
  margin: 4px 0;
}

.step-content li {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 2px;
}

.tip {
  color: #e6a23c !important;
  font-size: 13px !important;
}

/* 测试摘要 */
.test-summary {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px;
  background: var(--bg-tertiary, #f9f9f9);
  border-radius: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
}

.summary-item .count {
  font-size: 24px;
  font-weight: 700;
}

.summary-item .label {
  font-size: 12px;
  color: var(--text-secondary);
}

.summary-item.passed .count { color: #67c23a; }
.summary-item.failed .count { color: #f56c6c; }
.summary-item.blocked .count { color: #e6a23c; }
.summary-item.pending .count { color: #909399; }

.summary-progress {
  flex: 1;
  min-width: 200px;
}

/* 测试分组 */
.test-group {
  border: 1px solid var(--border-color, #eee);
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  background: var(--bg-tertiary, #f9f9f9);
  transition: background 0.2s;
}

.group-header:hover {
  background: var(--bg-hover, #f0f0f0);
}

.group-icon { font-size: 18px; }
.group-title { font-weight: 600; flex: 1; color: var(--text-primary); }
.group-count { color: var(--text-secondary); font-size: 13px; }
.group-arrow { transition: transform 0.2s; }

/* 测试用例项 */
.test-case-item {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color, #f0f0f0);
  display: flex;
  gap: 12px;
  align-items: flex-start;
  transition: background 0.2s;
}

.test-case-item:hover {
  background: rgba(64, 158, 255, 0.03);
}

.test-case-item.passed {
  background: rgba(103, 194, 58, 0.05);
}

.test-case-item.failed {
  background: rgba(245, 108, 108, 0.05);
}

.test-case-item.blocked {
  background: rgba(230, 162, 60, 0.05);
}

.case-main {
  flex: 1;
  display: flex;
  gap: 10px;
}

.case-priority {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
  height: 20px;
  line-height: 20px;
}

.case-priority.P0 {
  background: rgba(245, 108, 108, 0.15);
  color: #f56c6c;
}

.case-priority.P1 {
  background: rgba(230, 162, 60, 0.15);
  color: #e6a23c;
}

.case-priority.P2 {
  background: rgba(144, 147, 153, 0.15);
  color: #909399;
}

.case-info {
  flex: 1;
}

.case-title {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.case-steps, .case-expected {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.steps-label, .expected-label {
  color: var(--text-disabled, #aaa);
  font-size: 12px;
}

.case-actions {
  flex-shrink: 0;
  min-width: 120px;
}

/* 生成中 */
.generating-hint {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  justify-content: center;
  color: var(--text-secondary);
}

.loading-icon {
  animation: spin 1s linear infinite;
  font-size: 20px;
  color: var(--el-color-primary);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-cases {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.empty-cases .sub-text {
  font-size: 13px;
  color: var(--text-disabled);
  margin-top: 8px;
}

/* 测试报告 */
.report-hint {
  text-align: center;
  color: var(--text-secondary);
  padding: 20px;
}

.report-result {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
}

.report-result.all-pass {
  background: linear-gradient(135deg, rgba(103,194,58,0.1) 0%, rgba(103,194,58,0.05) 100%);
  border: 1px solid rgba(103,194,58,0.2);
}

.report-result.has-fail {
  background: linear-gradient(135deg, rgba(245,108,108,0.1) 0%, rgba(245,108,108,0.05) 100%);
  border: 1px solid rgba(245,108,108,0.2);
}

.report-icon {
  font-size: 40px;
}

.report-text h4 {
  margin: 0 0 4px;
  color: var(--text-primary);
}

.report-text p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.report-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* AI测试指南卡片 */
.ai-test-guide-card {
  border-left: 4px solid #409eff;
}

.ai-test-guide-card h3 {
  margin: 0 0 16px;
}

.tg-section {
  margin-bottom: 16px;
}

.tg-section strong {
  color: var(--text-primary);
  font-size: 14px;
  display: block;
  margin-bottom: 6px;
}

.tg-section span {
  color: var(--text-secondary);
  font-size: 14px;
}

.tg-text {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.7;
}

.tg-quick-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.tg-quick-item {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-tertiary, #f9f9f9);
  border-radius: 8px;
}

.tg-num {
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
  margin-top: 2px;
}

.tg-name {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.tg-sub {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
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
  margin: 0 0 20px;
}
</style>
