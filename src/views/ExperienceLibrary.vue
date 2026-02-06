<template>
  <div class="experience-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">经验知识库</h1>
        <p class="page-desc">记录开发过程中的问题和解决方案，积累项目经验</p>
      </div>
      <div class="header-actions">
        <el-button @click="exportToMarkdown">
          <el-icon><Download /></el-icon>
          导出 Markdown
        </el-button>
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          添加经验
        </el-button>
      </div>
    </div>
    
    <!-- 筛选和搜索 -->
    <div class="filter-bar card">
      <el-input 
        v-model="searchKeyword" 
        placeholder="搜索问题、解决方案..."
        :prefix-icon="Search"
        clearable
        class="search-input"
      />
      <el-select v-model="filterCategory" placeholder="按分类筛选" clearable>
        <el-option 
          v-for="cat in experienceStore.categories" 
          :key="cat" 
          :label="cat" 
          :value="cat" 
        />
      </el-select>
      <el-select v-model="filterSeverity" placeholder="按严重程度" clearable>
        <el-option label="致命" value="critical" />
        <el-option label="严重" value="high" />
        <el-option label="一般" value="medium" />
      </el-select>
    </div>
    
    <!-- 统计信息 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{{ experienceStore.experiences.length }}</span>
        <span class="stat-label">总经验数</span>
      </div>
      <div class="stat-item">
        <span class="stat-value critical">{{ criticalCount }}</span>
        <span class="stat-label">致命问题</span>
      </div>
      <div class="stat-item">
        <span class="stat-value high">{{ highCount }}</span>
        <span class="stat-label">严重问题</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ experienceStore.categories.length }}</span>
        <span class="stat-label">分类数</span>
      </div>
    </div>
    
    <!-- 经验列表 -->
    <div class="experience-list">
      <div 
        v-for="exp in filteredExperiences" 
        :key="exp.id"
        class="experience-card card"
      >
        <div class="experience-header">
          <div class="experience-title-row">
            <span class="experience-id">{{ exp.id }}</span>
            <h3 class="experience-title">{{ exp.title }}</h3>
          </div>
          <div class="experience-meta">
            <el-tag size="small">{{ exp.category }}</el-tag>
            <el-tag 
              size="small" 
              :type="exp.severity === 'critical' ? 'danger' : exp.severity === 'high' ? 'warning' : 'info'"
            >
              {{ severityLabel(exp.severity) }}
            </el-tag>
          </div>
        </div>
        
        <div class="experience-content">
          <div class="content-section">
            <h4>问题描述</h4>
            <p>{{ exp.problem }}</p>
          </div>
          
          <div class="content-section">
            <h4>错误现象</h4>
            <p class="code-text">{{ exp.symptom }}</p>
          </div>
          
          <el-collapse>
            <el-collapse-item title="查看详细解决方案">
              <div class="content-section">
                <h4>原因分析</h4>
                <p>{{ exp.cause }}</p>
              </div>
              
              <div class="content-section">
                <h4>解决方案</h4>
                <pre class="solution-code">{{ exp.solution }}</pre>
              </div>
              
              <div class="content-section">
                <h4>优化收益</h4>
                <p class="benefit-text">{{ exp.benefit }}</p>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
        
        <div class="experience-footer">
          <span class="update-time">更新于 {{ exp.updatedAt }}</span>
          <div class="experience-actions">
            <el-button text size="small" @click="editExperience(exp)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button text size="small" type="danger" @click="deleteExperience(exp)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-if="filteredExperiences.length === 0" class="empty-state">
      <el-icon><Document /></el-icon>
      <p>{{ searchKeyword || filterCategory ? '没有找到匹配的经验' : '暂无经验记录' }}</p>
    </div>
    
    <!-- 添加/编辑对话框 -->
    <el-dialog 
      v-model="showAddDialog" 
      :title="editingExp ? '编辑经验' : '添加新经验'"
      width="700px"
      @close="resetForm"
    >
      <el-form :model="form" label-position="top">
        <el-row :gutter="16">
          <el-col :span="16">
            <el-form-item label="问题标题" required>
              <el-input v-model="form.title" placeholder="简要描述问题" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="分类" required>
              <el-select v-model="form.category" filterable allow-create placeholder="选择或创建分类">
                <el-option label="云开发" value="云开发" />
                <el-option label="前端" value="前端" />
                <el-option label="部署" value="部署" />
                <el-option label="合规" value="合规" />
                <el-option label="用户体验" value="用户体验" />
                <el-option label="性能" value="性能" />
                <el-option label="安全" value="安全" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="严重程度" required>
          <el-radio-group v-model="form.severity">
            <el-radio label="critical">致命（影响核心功能或上线）</el-radio>
            <el-radio label="high">严重（影响重要功能）</el-radio>
            <el-radio label="medium">一般（影响体验或效率）</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="问题描述" required>
          <el-input v-model="form.problem" type="textarea" :rows="2" placeholder="描述遇到的问题" />
        </el-form-item>
        
        <el-form-item label="错误现象" required>
          <el-input v-model="form.symptom" type="textarea" :rows="2" placeholder="描述错误表现、报错信息等" />
        </el-form-item>
        
        <el-form-item label="原因分析">
          <el-input v-model="form.cause" type="textarea" :rows="2" placeholder="分析问题产生的原因" />
        </el-form-item>
        
        <el-form-item label="解决方案" required>
          <el-input v-model="form.solution" type="textarea" :rows="4" placeholder="详细的解决步骤或代码" />
        </el-form-item>
        
        <el-form-item label="优化收益">
          <el-input v-model="form.benefit" placeholder="如：错误率 50% → 0%，调试时间 2小时 → 10分钟" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveExperience" :disabled="!isFormValid">
          {{ editingExp ? '保存' : '添加' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { useExperienceStore } from '@/stores/experience'

const experienceStore = useExperienceStore()

const searchKeyword = ref('')
const filterCategory = ref('')
const filterSeverity = ref('')
const showAddDialog = ref(false)
const editingExp = ref(null)

const form = reactive({
  title: '',
  category: '',
  severity: 'medium',
  problem: '',
  symptom: '',
  cause: '',
  solution: '',
  benefit: ''
})

// 统计
const criticalCount = computed(() => 
  experienceStore.experiences.filter(e => e.severity === 'critical').length
)

const highCount = computed(() => 
  experienceStore.experiences.filter(e => e.severity === 'high').length
)

// 筛选后的列表
const filteredExperiences = computed(() => {
  let list = experienceStore.experiences
  
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(e => 
      e.title.toLowerCase().includes(kw) ||
      e.problem.toLowerCase().includes(kw) ||
      e.solution.toLowerCase().includes(kw) ||
      e.symptom.toLowerCase().includes(kw)
    )
  }
  
  if (filterCategory.value) {
    list = list.filter(e => e.category === filterCategory.value)
  }
  
  if (filterSeverity.value) {
    list = list.filter(e => e.severity === filterSeverity.value)
  }
  
  return list
})

// 表单验证
const isFormValid = computed(() => {
  return form.title && form.category && form.problem && form.symptom && form.solution
})

function severityLabel(severity) {
  const map = { critical: '致命', high: '严重', medium: '一般' }
  return map[severity] || severity
}

function editExperience(exp) {
  editingExp.value = exp
  Object.assign(form, exp)
  showAddDialog.value = true
}

function deleteExperience(exp) {
  ElMessageBox.confirm('确定要删除这条经验吗？', '删除确认', {
    type: 'warning'
  }).then(() => {
    experienceStore.deleteExperience(exp.id)
    ElMessage.success('已删除')
  }).catch(() => {})
}

function saveExperience() {
  if (editingExp.value) {
    experienceStore.updateExperience(editingExp.value.id, { ...form })
    ElMessage.success('经验已更新')
  } else {
    experienceStore.addExperience({ ...form })
    ElMessage.success('经验已添加')
  }
  showAddDialog.value = false
  resetForm()
}

function resetForm() {
  editingExp.value = null
  Object.assign(form, {
    title: '',
    category: '',
    severity: 'medium',
    problem: '',
    symptom: '',
    cause: '',
    solution: '',
    benefit: ''
  })
}

function exportToMarkdown() {
  const content = experienceStore.exportToMarkdown()
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `经验知识库_${new Date().toISOString().split('T')[0]}.md`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('知识库已导出')
}
</script>

<style scoped>
.experience-page {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.search-input {
  flex: 1;
  max-width: 300px;
}

.stats-bar {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  padding: 16px 24px;
  background: var(--bg-card);
  border-radius: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--primary-color);
}

.stat-value.critical {
  color: var(--danger-color);
}

.stat-value.high {
  color: var(--warning-color);
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

.experience-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.experience-card {
  padding: 20px;
}

.experience-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.experience-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.experience-id {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 4px;
}

.experience-title {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.experience-meta {
  display: flex;
  gap: 8px;
}

.content-section {
  margin-bottom: 16px;
}

.content-section h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
}

.content-section p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.code-text {
  font-family: 'Monaco', 'Menlo', monospace;
  background: var(--bg-tertiary);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
}

.solution-code {
  background: var(--bg-tertiary);
  padding: 12px 16px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary);
  white-space: pre-wrap;
  margin: 0;
}

.benefit-text {
  color: var(--success-color) !important;
  font-weight: 500;
}

.experience-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.update-time {
  font-size: 12px;
  color: var(--text-muted);
}

.experience-actions {
  display: flex;
  gap: 8px;
}

:deep(.el-collapse-item__header) {
  background: transparent;
  border: none;
  color: var(--primary-color);
  font-size: 13px;
}

:deep(.el-collapse-item__wrap) {
  background: transparent;
  border: none;
}

:deep(.el-collapse-item__content) {
  padding-top: 16px;
}
</style>
