<template>
  <div class="settings-page">
    <div class="page-header">
      <h1 class="page-title">设置</h1>
      <p class="page-desc">配置AI接口和管理数据</p>
    </div>
    
    <!-- AI 配置 -->
    <div class="card settings-section">
      <div class="card-header">
        <h3 class="card-title">
          <el-icon><Connection /></el-icon>
          AI 接口配置
        </h3>
      </div>
      
      <el-form label-position="top" class="settings-form">
        <el-form-item label="API 端点">
          <el-select v-model="selectedEndpoint" placeholder="选择预设或自定义" @change="onEndpointChange">
            <el-option 
              v-for="ep in settingsStore.apiEndpoints" 
              :key="ep.value" 
              :label="ep.label" 
              :value="ep.value" 
            />
          </el-select>
          <el-input 
            v-if="selectedEndpoint === 'custom'" 
            v-model="settingsStore.apiUrl" 
            placeholder="请输入 API 端点 URL"
            class="custom-input"
          />
        </el-form-item>
        
        <el-form-item label="API Key">
          <el-input 
            v-model="settingsStore.apiKey" 
            type="password" 
            show-password
            placeholder="请输入 API Key"
          />
          <div class="form-tip">
            API Key 仅保存在浏览器本地，不会上传到服务器
          </div>
        </el-form-item>
        
        <el-form-item label="模型">
          <el-select v-model="settingsStore.model" placeholder="选择模型">
            <el-option 
              v-for="m in settingsStore.modelOptions" 
              :key="m.value" 
              :label="m.label" 
              :value="m.value" 
            />
          </el-select>
          <el-input 
            v-if="settingsStore.model === 'custom'" 
            v-model="customModel" 
            placeholder="请输入模型名称"
            class="custom-input"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="testConnection" :loading="testing">
            测试连接
          </el-button>
          <el-tag v-if="testResult === 'success'" type="success" class="test-result">
            连接成功
          </el-tag>
          <el-tag v-else-if="testResult === 'error'" type="danger" class="test-result">
            连接失败
          </el-tag>
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 数据管理 -->
    <div class="card settings-section">
      <div class="card-header">
        <h3 class="card-title">
          <el-icon><Files /></el-icon>
          数据管理
        </h3>
      </div>
      
      <div class="data-actions">
        <div class="data-action-item">
          <div class="data-action-info">
            <h4>导出数据</h4>
            <p>将所有项目和设置导出为 JSON 文件</p>
          </div>
          <el-button @click="exportData">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
        </div>
        
        <div class="data-action-item">
          <div class="data-action-info">
            <h4>导入数据</h4>
            <p>从 JSON 文件恢复数据</p>
          </div>
          <el-button @click="triggerImport">
            <el-icon><Upload /></el-icon>
            导入
          </el-button>
          <input 
            ref="fileInput" 
            type="file" 
            accept=".json" 
            style="display: none" 
            @change="importData"
          />
        </div>
        
        <div class="data-action-item danger">
          <div class="data-action-info">
            <h4>清除所有数据</h4>
            <p>删除所有项目和本地缓存数据，此操作不可恢复</p>
          </div>
          <el-button type="danger" @click="clearData">
            <el-icon><Delete /></el-icon>
            清除
          </el-button>
        </div>
      </div>
    </div>
    
    <!-- 关于 -->
    <div class="card settings-section">
      <div class="card-header">
        <h3 class="card-title">
          <el-icon><InfoFilled /></el-icon>
          关于
        </h3>
      </div>
      
      <div class="about-info">
        <p><strong>小程序开发工作流</strong> v1.0.0</p>
        <p>基于星见StelRen项目实践经验，专为AI协作开发设计</p>
        <p class="muted">数据存储在浏览器本地，请定期导出备份</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSettingsStore } from '@/stores/settings'
import { useProjectStore } from '@/stores/project'
import { useExperienceStore } from '@/stores/experience'
import { callAI } from '@/api/ai'

const settingsStore = useSettingsStore()
const projectStore = useProjectStore()
const experienceStore = useExperienceStore()

const selectedEndpoint = ref('custom')
const customModel = ref('')
const testing = ref(false)
const testResult = ref(null)
const fileInput = ref(null)

onMounted(() => {
  // 检查当前 API URL 是否匹配预设
  const matched = settingsStore.apiEndpoints.find(ep => ep.value === settingsStore.apiUrl)
  selectedEndpoint.value = matched ? matched.value : 'custom'
})

function onEndpointChange(value) {
  if (value !== 'custom') {
    settingsStore.apiUrl = value
  }
}

async function testConnection() {
  if (!settingsStore.apiKey) {
    ElMessage.warning('请先填写 API Key')
    return
  }
  
  testing.value = true
  testResult.value = null
  
  try {
    const result = await callAI([{ role: 'user', content: 'Hello, respond with "OK" only.' }])
    testResult.value = result ? 'success' : 'error'
    if (result) {
      ElMessage.success('连接测试成功')
    }
  } catch (error) {
    testResult.value = 'error'
    ElMessage.error('连接测试失败: ' + (error.message || '未知错误'))
  } finally {
    testing.value = false
  }
}

function exportData() {
  const data = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    projects: projectStore.projects,
    experiences: experienceStore.experiences,
    settings: {
      apiUrl: settingsStore.apiUrl,
      model: settingsStore.model
      // 不导出 API Key
    }
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `workflow-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('数据已导出')
}

function triggerImport() {
  fileInput.value?.click()
}

function importData(event) {
  const file = event.target.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      
      if (data.projects) {
        projectStore.importData({ projects: data.projects })
      }
      if (data.experiences) {
        experienceStore.experiences = data.experiences
      }
      if (data.settings) {
        if (data.settings.apiUrl) settingsStore.apiUrl = data.settings.apiUrl
        if (data.settings.model) settingsStore.model = data.settings.model
      }
      
      ElMessage.success('数据导入成功')
    } catch (error) {
      ElMessage.error('导入失败：文件格式错误')
    }
  }
  reader.readAsText(file)
  
  // 重置 input
  event.target.value = ''
}

function clearData() {
  ElMessageBox.confirm(
    '确定要清除所有数据吗？此操作不可恢复！',
    '警告',
    {
      type: 'warning',
      confirmButtonText: '确定清除',
      cancelButtonText: '取消'
    }
  ).then(() => {
    projectStore.clearAllData()
    localStorage.removeItem('experiences')
    experienceStore.experiences = []
    ElMessage.success('数据已清除')
  }).catch(() => {})
}
</script>

<style scoped>
.settings-page {
  max-width: 800px;
  margin: 0 auto;
}

.settings-section {
  margin-bottom: 24px;
}

.card-header .el-icon {
  margin-right: 8px;
}

.settings-form {
  max-width: 500px;
}

.custom-input {
  margin-top: 8px;
}

.form-tip {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.test-result {
  margin-left: 12px;
}

.data-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.data-action-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.data-action-item.danger {
  border: 1px solid rgba(245, 108, 108, 0.3);
}

.data-action-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: var(--text-primary);
}

.data-action-info p {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.about-info p {
  margin: 0 0 8px 0;
  color: var(--text-secondary);
}

.about-info .muted {
  color: var(--text-muted);
  font-size: 12px;
}
</style>
