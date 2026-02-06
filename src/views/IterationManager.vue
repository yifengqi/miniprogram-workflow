<template>
  <div class="iteration-page">
    <div class="page-header">
      <h1 class="page-title">迭代管理</h1>
      <p class="page-desc">
        {{ projectStore.currentProject ? `当前项目：${projectStore.currentProject.name}` : '请先选择一个项目' }}
      </p>
    </div>
    
    <template v-if="projectStore.currentProject">
      <!-- 统计卡片 -->
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">总迭代</div>
          </div>
        </div>
        <div class="stat-card success">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.completed }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div>
        <div class="stat-card warning">
          <div class="stat-icon">⏳</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.pending }}</div>
            <div class="stat-label">处理中</div>
          </div>
        </div>
        <div class="stat-card danger">
          <div class="stat-icon">🐛</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.bugs }}</div>
            <div class="stat-label">Bug修复</div>
          </div>
        </div>
      </div>
      
      <!-- 提交反馈按钮 -->
      <div class="card action-card">
        <div class="action-content">
          <div class="action-icon">💬</div>
          <div class="action-info">
            <h3>发现问题或想要优化？</h3>
            <p>提交反馈，AI将自动分析并生成优化方案</p>
          </div>
          <el-button type="primary" size="large" @click="showFeedbackDialog = true">
            <el-icon><Plus /></el-icon>
            提交反馈
          </el-button>
        </div>
      </div>
      
      <!-- 迭代列表 -->
      <div class="card iterations-card">
        <div class="card-header">
          <h3>迭代历史</h3>
          <el-select v-model="filterStatus" placeholder="筛选状态" style="width: 150px;">
            <el-option label="全部" value="all" />
            <el-option label="待处理" value="pending" />
            <el-option label="分析中" value="analyzing" />
            <el-option label="方案就绪" value="solution_ready" />
            <el-option label="已完成" value="completed" />
            <el-option label="失败" value="failed" />
          </el-select>
        </div>
        
        <el-empty v-if="filteredIterations.length === 0" description="暂无迭代记录">
          <el-button type="primary" @click="showFeedbackDialog = true">提交第一个反馈</el-button>
        </el-empty>
        
        <div v-else class="iterations-list">
          <div 
            v-for="iteration in filteredIterations" 
            :key="iteration.id"
            class="iteration-item"
            :class="[`status-${iteration.status}`]"
          >
            <div class="iteration-header">
              <div class="iteration-title-section">
                <el-tag :type="getStatusType(iteration.status)" size="large">
                  {{ getStatusText(iteration.status) }}
                </el-tag>
                <h4>{{ iteration.version }} - {{ getFeedbackTypeText(iteration.feedback.type) }}</h4>
                <el-tag :type="getSeverityType(iteration.feedback.severity)" size="small">
                  {{ iteration.feedback.severity }}
                </el-tag>
              </div>
              <span class="iteration-time">{{ formatTime(iteration.createdAt) }}</span>
            </div>
            
            <div class="iteration-body">
              <p class="iteration-desc">{{ iteration.feedback.description }}</p>
              
              <!-- 分析结果 -->
              <div v-if="iteration.analysis" class="iteration-section">
                <h5>🔍 问题分析</h5>
                <div class="analysis-content">
                  <div class="analysis-item">
                    <span class="label">类别：</span>
                    <el-tag size="small">{{ iteration.analysis.category }}</el-tag>
                  </div>
                  <div class="analysis-item">
                    <span class="label">复杂度：</span>
                    <el-tag size="small" :type="getComplexityType(iteration.analysis.estimatedComplexity)">
                      {{ iteration.analysis.estimatedComplexity }}
                    </el-tag>
                  </div>
                  <div class="analysis-item full">
                    <span class="label">根本原因：</span>
                    <span>{{ iteration.analysis.rootCause }}</span>
                  </div>
                  <div v-if="iteration.analysis.affectedFiles?.length" class="analysis-item full">
                    <span class="label">影响文件：</span>
                    <span>{{ iteration.analysis.affectedFiles.join(', ') }}</span>
                  </div>
                </div>
              </div>
              
              <!-- 优化方案 -->
              <div v-if="iteration.solution" class="iteration-section">
                <h5>💡 优化方案</h5>
                <div class="solution-content">
                  <p class="solution-approach">{{ iteration.solution.approach }}</p>
                  <div class="solution-stats">
                    <el-tag size="small">改动 {{ iteration.solution.codeChanges?.length || 0 }} 个文件</el-tag>
                    <el-tag size="small" type="info">预计 {{ iteration.solution.estimatedTime || '未知' }} 分钟</el-tag>
                  </div>
                  <el-button 
                    size="small" 
                    @click="viewSolution(iteration)"
                    style="margin-top: 8px;"
                  >
                    查看详细方案
                  </el-button>
                </div>
              </div>
              
              <!-- 执行结果 -->
              <div v-if="iteration.result" class="iteration-section">
                <h5>✅ 执行结果</h5>
                <div class="result-content">
                  <el-tag size="small" type="success">修改 {{ iteration.result.filesModified }} 个文件</el-tag>
                  <el-tag size="small" type="success">{{ iteration.result.linesChanged || 0 }} 行代码</el-tag>
                  <span class="result-time">完成于 {{ formatTime(iteration.result.deployedAt) }}</span>
                </div>
              </div>
            </div>
            
            <div class="iteration-actions">
              <template v-if="iteration.status === 'solution_ready'">
                <el-button 
                  type="primary" 
                  size="small"
                  :loading="applyingIteration === iteration.id"
                  @click="confirmAndApply(iteration)"
                >
                  <el-icon><Check /></el-icon>
                  确认并应用
                </el-button>
                <el-button size="small" @click="viewSolution(iteration)">
                  查看方案
                </el-button>
              </template>
              <template v-else-if="iteration.status === 'completed'">
                <el-button size="small" @click="viewDetails(iteration)">
                  查看详情
                </el-button>
              </template>
              <template v-else-if="iteration.status === 'failed'">
                <el-button size="small" type="warning" @click="retryIteration(iteration)">
                  <el-icon><Refresh /></el-icon>
                  重试
                </el-button>
              </template>
              <el-button size="small" type="danger" @click="deleteIteration(iteration)">
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </template>
    
    <!-- 未选择项目 -->
    <div v-else class="empty-state">
      <el-icon><FolderOpened /></el-icon>
      <p>请先在首页创建或选择一个项目</p>
      <el-button type="primary" @click="$router.push('/')">去首页</el-button>
    </div>
    
    <!-- 提交反馈对话框 -->
    <el-dialog
      v-model="showFeedbackDialog"
      title="提交反馈"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="feedbackForm" label-width="100px">
        <el-form-item label="反馈类型" required>
          <el-select v-model="feedbackForm.type" placeholder="选择类型">
            <el-option label="🐛 Bug修复" value="bug" />
            <el-option label="✨ 新功能" value="feature" />
            <el-option label="⚡ 性能优化" value="optimization" />
            <el-option label="🎨 UI改进" value="ui" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="严重程度" required>
          <el-select v-model="feedbackForm.severity" placeholder="选择严重程度">
            <el-option label="🔴 严重" value="critical" />
            <el-option label="🟠 高" value="high" />
            <el-option label="🟡 中" value="medium" />
            <el-option label="🟢 低" value="low" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="问题描述" required>
          <el-input
            v-model="feedbackForm.description"
            type="textarea"
            :rows="4"
            placeholder="详细描述遇到的问题或想要的功能..."
          />
        </el-form-item>
        
        <el-form-item label="期望行为">
          <el-input
            v-model="feedbackForm.expectedBehavior"
            type="textarea"
            :rows="2"
            placeholder="您期望的正确行为或结果（可选）"
          />
        </el-form-item>
        
        <el-form-item label="实际行为">
          <el-input
            v-model="feedbackForm.actualBehavior"
            type="textarea"
            :rows="2"
            placeholder="实际发生的行为或结果（可选）"
          />
        </el-form-item>
        
        <el-form-item label="版本类型">
          <el-radio-group v-model="feedbackForm.versionType">
            <el-radio label="patch">修订版 (v1.0.1)</el-radio>
            <el-radio label="minor">次版本 (v1.1)</el-radio>
            <el-radio label="major">主版本 (v2.0)</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showFeedbackDialog = false">取消</el-button>
        <el-button 
          type="primary" 
          :loading="submitting"
          @click="submitFeedback"
        >
          提交并开始分析
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 方案详情对话框 -->
    <el-dialog
      v-model="showSolutionDialog"
      title="优化方案详情"
      width="80%"
      :close-on-click-modal="false"
    >
      <div v-if="currentSolution" class="solution-detail">
        <h3>整体方案</h3>
        <p class="solution-approach-detail">{{ currentSolution.approach }}</p>
        
        <h3>代码改动</h3>
        <div 
          v-for="(change, index) in currentSolution.codeChanges" 
          :key="index"
          class="code-change"
        >
          <div class="change-header">
            <el-tag :type="getChangeType(change.type)">{{ change.type }}</el-tag>
            <span class="change-file">{{ change.file }}</span>
          </div>
          <p class="change-explanation">{{ change.explanation }}</p>
          
          <div class="code-comparison">
            <div v-if="change.before" class="code-before">
              <h5>修改前</h5>
              <pre><code>{{ change.before }}</code></pre>
            </div>
            <div class="code-after">
              <h5>修改后</h5>
              <pre><code>{{ change.after }}</code></pre>
            </div>
          </div>
        </div>
        
        <h3>测试计划</h3>
        <p>{{ currentSolution.testPlan }}</p>
        
        <div v-if="currentSolution.risks?.length" class="risks-section">
          <h3>⚠️ 风险提示</h3>
          <ul>
            <li v-for="(risk, index) in currentSolution.risks" :key="index">{{ risk }}</li>
          </ul>
        </div>
        
        <div v-if="currentSolution.bestPractices?.length" class="practices-section">
          <h3>💡 最佳实践</h3>
          <ul>
            <li v-for="(practice, index) in currentSolution.bestPractices" :key="index">{{ practice }}</li>
          </ul>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showSolutionDialog = false">关闭</el-button>
        <el-button 
          v-if="currentIteration?.status === 'solution_ready'"
          type="primary"
          :loading="applyingIteration === currentIteration.id"
          @click="confirmAndApply(currentIteration)"
        >
          确认并应用
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Check, Refresh, FolderOpened } from '@element-plus/icons-vue'
import { useProjectStore } from '@/stores/project'
import { useIterationStore } from '@/stores/iteration'
import { aiQueue } from '@/utils/aiQueue'

const router = useRouter()
const projectStore = useProjectStore()
const iterationStore = useIterationStore()

const showFeedbackDialog = ref(false)
const showSolutionDialog = ref(false)
const submitting = ref(false)
const applyingIteration = ref(null)
const filterStatus = ref('all')
const currentIteration = ref(null)
const currentSolution = ref(null)

// 反馈表单
const feedbackForm = ref({
  type: 'bug',
  severity: 'medium',
  description: '',
  expectedBehavior: '',
  actualBehavior: '',
  versionType: 'patch'
})

// 计算属性
const iterations = computed(() => {
  if (!projectStore.currentProject) return []
  return iterationStore.getProjectIterations(projectStore.currentProject.id)
})

const filteredIterations = computed(() => {
  if (filterStatus.value === 'all') return iterations.value
  return iterations.value.filter(iter => iter.status === filterStatus.value)
})

const stats = computed(() => {
  if (!projectStore.currentProject) return { total: 0, completed: 0, pending: 0, bugs: 0 }
  return iterationStore.getStats(projectStore.currentProject.id)
})

// 提交反馈
async function submitFeedback() {
  if (!feedbackForm.value.description) {
    ElMessage.warning('请填写问题描述')
    return
  }
  
  try {
    submitting.value = true
    
    // 创建迭代
    const iteration = iterationStore.createIteration(
      projectStore.currentProject.id,
      feedbackForm.value,
      feedbackForm.value.versionType
    )
    
    ElMessage.success('反馈已提交，AI正在分析...')
    
    // 触发AI分析
    aiQueue.addTask(projectStore.currentProject.id, 'analyze_feedback', 'high', {
      iterationId: iteration.id,
      feedback: feedbackForm.value
    })
    
    // 关闭对话框并重置表单
    showFeedbackDialog.value = false
    feedbackForm.value = {
      type: 'bug',
      severity: 'medium',
      description: '',
      expectedBehavior: '',
      actualBehavior: '',
      versionType: 'patch'
    }
    
  } catch (error) {
    ElMessage.error('提交失败: ' + (error.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

// 查看方案
function viewSolution(iteration) {
  currentIteration.value = iteration
  currentSolution.value = iteration.solution
  showSolutionDialog.value = true
}

// 查看详情
function viewDetails(iteration) {
  currentIteration.value = iteration
  currentSolution.value = iteration.solution
  showSolutionDialog.value = true
}

// 确认并应用
async function confirmAndApply(iteration) {
  try {
    await ElMessageBox.confirm(
      `确认应用优化方案吗？这将更新项目代码并升级到 ${iteration.version}。`,
      '确认应用',
      {
        confirmButtonText: '确认应用',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    applyingIteration.value = iteration.id
    
    // 确认方案
    iterationStore.confirmSolution(iteration.id)
    
    // 触发应用任务
    aiQueue.addTask(projectStore.currentProject.id, 'apply_iteration', 'high', {
      iterationId: iteration.id
    })
    
    ElMessage.success('开始应用优化方案...')
    showSolutionDialog.value = false
    
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('应用失败: ' + (error.message || '未知错误'))
    }
  } finally {
    applyingIteration.value = null
  }
}

// 重试迭代
function retryIteration(iteration) {
  ElMessage.info('重新分析中...')
  aiQueue.addTask(projectStore.currentProject.id, 'analyze_feedback', 'high', {
    iterationId: iteration.id,
    feedback: iteration.feedback
  })
}

// 删除迭代
async function deleteIteration(iteration) {
  try {
    await ElMessageBox.confirm(
      '确认删除这个迭代记录吗？',
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    iterationStore.deleteIteration(iteration.id)
    ElMessage.success('已删除')
    
  } catch (error) {
    // 用户取消
  }
}

// 辅助函数
function getStatusType(status) {
  const types = {
    'pending': 'info',
    'analyzing': 'warning',
    'analyzed': 'warning',
    'solution_ready': 'success',
    'applying': 'warning',
    'completed': 'success',
    'failed': 'danger'
  }
  return types[status] || 'info'
}

function getStatusText(status) {
  const texts = {
    'pending': '待处理',
    'analyzing': '分析中',
    'analyzed': '已分析',
    'solution_ready': '方案就绪',
    'applying': '应用中',
    'completed': '已完成',
    'failed': '失败'
  }
  return texts[status] || status
}

function getFeedbackTypeText(type) {
  const texts = {
    'bug': 'Bug修复',
    'feature': '新功能',
    'optimization': '性能优化',
    'ui': 'UI改进'
  }
  return texts[type] || type
}

function getSeverityType(severity) {
  const types = {
    'critical': 'danger',
    'high': 'warning',
    'medium': 'info',
    'low': 'success'
  }
  return types[severity] || 'info'
}

function getComplexityType(complexity) {
  const types = {
    'simple': 'success',
    'medium': 'warning',
    'complex': 'danger'
  }
  return types[complexity] || 'info'
}

function getChangeType(type) {
  const types = {
    'modify': 'warning',
    'add': 'success',
    'delete': 'danger'
  }
  return types[type] || 'info'
}

function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}

// 初始化
onMounted(() => {
  iterationStore.loadFromStorage()
})
</script>

<style scoped>
.iteration-page {
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

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.stat-card.success {
  border-left: 4px solid #67c23a;
}

.stat-card.warning {
  border-left: 4px solid #e6a23c;
}

.stat-card.danger {
  border-left: 4px solid #f56c6c;
}

.stat-icon {
  font-size: 32px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

/* 卡片 */
.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
}

/* 操作卡片 */
.action-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.action-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.action-icon {
  font-size: 48px;
  flex-shrink: 0;
}

.action-info {
  flex: 1;
}

.action-info h3 {
  margin: 0 0 8px 0;
  color: white;
  font-size: 20px;
}

.action-info p {
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

/* 迭代列表 */
.iterations-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.iteration-item {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s;
}

.iteration-item:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.iteration-item.status-solution_ready {
  border-color: #67c23a;
  background: #f0f9ff;
}

.iteration-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.iteration-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.iteration-title-section h4 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.iteration-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.iteration-body {
  margin-bottom: 12px;
}

.iteration-desc {
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  line-height: 1.6;
}

.iteration-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed var(--border-color);
}

.iteration-section h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-primary);
}

/* 分析内容 */
.analysis-content {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.analysis-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.analysis-item.full {
  grid-column: 1 / -1;
  flex-direction: column;
  align-items: flex-start;
}

.analysis-item .label {
  font-weight: 600;
  color: var(--text-secondary);
}

/* 方案内容 */
.solution-content {
  font-size: 14px;
}

.solution-approach {
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  line-height: 1.6;
}

.solution-stats {
  display: flex;
  gap: 8px;
}

/* 结果内容 */
.result-content {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.result-time {
  color: var(--text-secondary);
  margin-left: auto;
}

/* 操作按钮 */
.iteration-actions {
  display: flex;
  gap: 8px;
}

/* 方案详情 */
.solution-detail h3 {
  margin: 24px 0 12px 0;
  font-size: 18px;
}

.solution-detail h3:first-child {
  margin-top: 0;
}

.solution-approach-detail {
  color: var(--text-secondary);
  line-height: 1.8;
}

.code-change {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.change-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.change-file {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: var(--text-primary);
}

.change-explanation {
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  line-height: 1.6;
}

.code-comparison {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 12px;
}

.code-before,
.code-after {
  background: var(--bg-tertiary);
  border-radius: 6px;
  overflow: hidden;
}

.code-before h5,
.code-after h5 {
  margin: 0;
  padding: 8px 12px;
  background: #2d2d2d;
  color: white;
  font-size: 12px;
}

.code-before pre,
.code-after pre {
  margin: 0;
  padding: 12px;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
}

.code-before pre code,
.code-after pre code {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.risks-section,
.practices-section {
  background: var(--bg-tertiary);
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
}

.risks-section h3,
.practices-section h3 {
  margin-top: 0;
}

.risks-section ul,
.practices-section ul {
  margin: 8px 0 0 0;
  padding-left: 24px;
}

.risks-section li,
.practices-section li {
  margin-bottom: 8px;
  line-height: 1.6;
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
