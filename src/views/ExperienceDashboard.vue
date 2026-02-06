<template>
  <div class="experience-dashboard">
    <div class="page-header">
      <h1 class="page-title">经验知识库</h1>
      <p class="page-desc">查看系统积累的经验和智能提示规则</p>
    </div>
    
    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card card">
        <div class="stat-icon">📚</div>
        <div class="stat-content">
          <div class="stat-value">{{ experienceStore.stats.totalProjects }}</div>
          <div class="stat-label">累积项目</div>
        </div>
      </div>
      
      <div class="stat-card card">
        <div class="stat-icon">💡</div>
        <div class="stat-content">
          <div class="stat-value">{{ experienceStore.stats.totalExperiences }}</div>
          <div class="stat-label">经验条目</div>
        </div>
      </div>
      
      <div class="stat-card card">
        <div class="stat-icon">🎯</div>
        <div class="stat-content">
          <div class="stat-value">{{ experienceStore.stats.activeRules }}</div>
          <div class="stat-label">活跃规则</div>
        </div>
      </div>
      
      <div class="stat-card card">
        <div class="stat-icon">📈</div>
        <div class="stat-content">
          <div class="stat-value">{{ totalHitCount }}</div>
          <div class="stat-label">规则触发次数</div>
        </div>
      </div>
    </div>
    
    <!-- 智能提示规则列表 -->
    <div class="card">
      <div class="card-header">
        <h3>智能提示规则</h3>
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          添加规则
        </el-button>
      </div>
      
      <el-table :data="experienceStore.intelligentRules" stripe>
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="rule-detail">
              <p><strong>触发条件：</strong>{{ row.trigger }}</p>
              <p><strong>提示内容：</strong>{{ row.action }}</p>
              <p><strong>来源项目：</strong>{{ row.projectName }}</p>
              <p><strong>创建时间：</strong>{{ formatTime(row.createdAt) }}</p>
              <p><strong>触发次数：</strong>{{ row.hitCount }} 次</p>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="触发词" prop="trigger" width="120" />
        <el-table-column label="提示内容" prop="action" show-overflow-tooltip />
        <el-table-column label="来源" prop="projectName" width="150" />
        <el-table-column label="触发次数" width="100">
          <template #default="{ row }">
            <el-tag>{{ row.hitCount }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" @change="toggleRule(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button 
              type="danger" 
              size="small"
              @click="deleteRule(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <!-- ⭐ 标签索引统计 -->
    <div class="card">
      <div class="card-header">
        <h3>标签索引统计</h3>
        <el-button @click="rebuildIndex">
          <el-icon><Refresh /></el-icon>
          重建索引
        </el-button>
      </div>
      
      <div class="tags-cloud">
        <el-tag 
          v-for="(expIds, tag) in experienceStore.tagsIndex" 
          :key="tag"
          size="large"
          class="tag-item"
          :type="getTagType(tag)"
        >
          {{ tag }} ({{ expIds.length }})
        </el-tag>
      </div>
      
      <el-alert 
        type="info" 
        :closable="false"
        style="margin-top: 16px"
      >
        标签索引可将经验查询速度提升10倍以上！通过标签快速定位相关经验。
      </el-alert>
    </div>
    
    <!-- 经验列表 -->
    <div class="card" v-if="experienceStore.experiences.length > 0">
      <div class="card-header">
        <h3>项目经验总结</h3>
      </div>
      
      <div class="experiences-list">
        <div 
          v-for="exp in experienceStore.experiences" 
          :key="exp.id"
          class="experience-item"
        >
          <div class="exp-header">
            <div class="exp-title-section">
              <h4>{{ exp.projectName }}</h4>
              <div class="exp-badges">
                <el-tag v-if="exp.mustRead" type="danger" size="small">⭐必读</el-tag>
                <el-tag type="warning" size="small">优先级 {{ exp.priority }}/5</el-tag>
                <el-tag type="info" size="small">使用 {{ exp.useCount || 0 }}次</el-tag>
              </div>
            </div>
            <el-tag type="info">{{ formatTime(exp.timestamp) }}</el-tag>
          </div>
          
          <div class="exp-tags" v-if="exp.tags && exp.tags.length > 0">
            <el-tag 
              v-for="tag in exp.tags" 
              :key="tag" 
              size="small"
              class="exp-tag"
            >
              {{ tag }}
            </el-tag>
          </div>
          
          <div class="exp-content">
            <div v-if="exp.analysis?.keyIssues?.length > 0">
              <strong>关键问题：</strong>
              <ul>
                <li v-for="(issue, i) in exp.analysis.keyIssues" :key="i">
                  {{ issue.title }}
                </li>
              </ul>
            </div>
            
            <div v-if="exp.analysis?.lessons?.length > 0">
              <strong>经验教训：</strong>
              <ul>
                <li v-for="(lesson, i) in exp.analysis.lessons" :key="i">
                  {{ lesson }}
                </li>
              </ul>
            </div>
          </div>
          
          <div class="exp-actions">
            <el-button 
              v-if="!exp.applied"
              type="primary" 
              size="small"
              @click="applyExperience(exp)"
            >
              应用改进
            </el-button>
            <el-tag v-else type="success">已应用</el-tag>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 添加规则对话框 -->
    <el-dialog v-model="showAddDialog" title="添加智能提示规则" width="600px">
      <el-form :model="newRule" label-width="100px">
        <el-form-item label="触发词">
          <el-input 
            v-model="newRule.trigger" 
            placeholder="如：抢票、电商、预约"
          />
        </el-form-item>
        
        <el-form-item label="提示内容">
          <el-input 
            v-model="newRule.action" 
            type="textarea"
            :rows="4"
            placeholder="当检测到触发词时，显示的提示内容"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="addRule">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { useExperienceStore } from '@/stores/experience'

const experienceStore = useExperienceStore()

const showAddDialog = ref(false)
const newRule = ref({
  trigger: '',
  action: ''
})

// 计算总触发次数
const totalHitCount = computed(() => {
  return experienceStore.intelligentRules.reduce((sum, rule) => {
    return sum + (rule.hitCount || 0)
  }, 0)
})

// 格式化时间
function formatTime(timestamp) {
  if (!timestamp) return '未知'
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取标签类型
function getTagType(tag) {
  if (tag.startsWith('type:')) return 'success'
  if (tag.startsWith('stage:')) return 'warning'
  if (tag.startsWith('issue:')) return 'danger'
  return 'info'
}

// 重建索引
function rebuildIndex() {
  ElMessageBox.confirm(
    '重建索引将遍历所有经验并更新标签索引，确定继续吗？',
    '重建标签索引',
    {
      confirmButtonText: '重建',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    experienceStore.rebuildTagsIndex()
    ElMessage.success('标签索引已重建')
  })
}

// 切换规则状态
function toggleRule(rule) {
  experienceStore.saveToStorage()
  ElMessage.success(rule.enabled ? '规则已启用' : '规则已禁用')
}

// 删除规则
function deleteRule(rule) {
  ElMessageBox.confirm(
    '确定删除此规则吗？',
    '确认删除',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const index = experienceStore.intelligentRules.findIndex(r => r.id === rule.id)
    if (index !== -1) {
      experienceStore.intelligentRules.splice(index, 1)
      experienceStore.saveToStorage()
      ElMessage.success('规则已删除')
    }
  })
}

// 添加规则
function addRule() {
  if (!newRule.value.trigger || !newRule.value.action) {
    ElMessage.warning('请填写完整信息')
    return
  }
  
  experienceStore.intelligentRules.push({
    id: `rule-${Date.now()}`,
    source: '手动添加',
    projectName: '自定义规则',
    trigger: newRule.value.trigger,
    action: newRule.value.action,
    enabled: true,
    createdAt: new Date().toISOString(),
    hitCount: 0
  })
  
  experienceStore.saveToStorage()
  
  ElMessage.success('规则已添加')
  showAddDialog.value = false
  newRule.value = { trigger: '', action: '' }
}

// 应用经验
function applyExperience(exp) {
  experienceStore.applyImprovements(exp)
  ElMessage.success('经验改进已应用到系统')
}
</script>

<style scoped>
.experience-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.stat-icon {
  font-size: 48px;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: var(--primary-color);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
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
  font-weight: 600;
}

.rule-detail {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 4px;
}

.rule-detail p {
  margin: 8px 0;
  line-height: 1.6;
}

.experiences-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.experience-item {
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.exp-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.exp-title-section {
  flex: 1;
}

.exp-header h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
}

.exp-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.exp-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.exp-tag {
  font-size: 12px;
}

.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.tag-item {
  cursor: pointer;
  transition: transform 0.2s;
}

.tag-item:hover {
  transform: scale(1.05);
}

.exp-content {
  margin-bottom: 16px;
}

.exp-content strong {
  color: var(--primary-color);
}

.exp-content ul {
  margin: 8px 0;
  padding-left: 24px;
}

.exp-content li {
  margin: 4px 0;
  line-height: 1.6;
}

.exp-actions {
  display: flex;
  gap: 12px;
}
</style>
