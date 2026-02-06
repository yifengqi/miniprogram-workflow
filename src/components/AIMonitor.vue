<template>
  <div>
    <!-- 浮动按钮 -->
    <div 
      class="monitor-fab"
      :class="{ 'has-error': hasError, 'has-running': hasRunning }"
      @click="aiLogger.isOpen = !aiLogger.isOpen"
    >
      <span v-if="hasRunning" class="fab-dot running"></span>
      <span v-else-if="hasError" class="fab-dot error"></span>
      🤖
    </div>
    
    <!-- 监控面板 -->
    <el-drawer 
      v-model="aiLogger.isOpen" 
      title="🤖 AI 任务监控" 
      direction="rtl" 
      size="550px"
      :z-index="9999"
    >
      <div class="monitor-panel">
        <!-- 操作栏 -->
        <div class="monitor-toolbar">
          <el-tag type="info" size="small">{{ aiLogger.logs.length }} 条记录</el-tag>
          <el-button size="small" @click="aiLogger.clear()">清空日志</el-button>
        </div>
        
        <!-- 日志列表 -->
        <div v-if="aiLogger.logs.length === 0" class="empty-logs">
          暂无AI调用记录
        </div>
        
        <div 
          v-for="log in aiLogger.logs" 
          :key="log.id"
          class="log-item"
          :class="log.status"
        >
          <!-- 日志头部 -->
          <div class="log-header" @click="toggleLog(log.id)">
            <div class="log-status-icon">
              <span v-if="log.status === 'running'" class="dot running">⏳</span>
              <span v-else-if="log.status === 'success'" class="dot success">✅</span>
              <span v-else class="dot error">❌</span>
            </div>
            <div class="log-info">
              <strong>{{ taskTypeLabel(log.taskType) }}</strong>
              <span class="log-time">{{ formatTime(log.startTime) }}</span>
            </div>
            <div class="log-meta">
              <el-tag v-if="log.duration" size="small" type="info">
                {{ (log.duration / 1000).toFixed(1) }}s
              </el-tag>
              <el-tag v-if="log.output.contentLength" size="small">
                {{ formatSize(log.output.contentLength) }}
              </el-tag>
            </div>
          </div>
          
          <!-- 展开详情 -->
          <div v-if="expandedId === log.id" class="log-detail">
            <!-- 错误信息 -->
            <div v-if="log.output.error" class="detail-section error-section">
              <h5>❌ 错误信息</h5>
              <pre class="error-content">{{ log.output.error }}</pre>
            </div>
            
            <!-- 输入摘要 -->
            <div class="detail-section">
              <h5>📤 输入</h5>
              <p class="input-summary">{{ log.input.summary }}</p>
              <el-tag size="small" type="info">Prompt长度: {{ formatSize(log.input.promptLength) }}</el-tag>
            </div>
            
            <!-- AI原始输出 -->
            <div v-if="log.output.rawContent" class="detail-section">
              <div class="section-header">
                <h5>📥 AI原始返回</h5>
                <el-button size="small" @click="copyContent(log.output.rawContent)">
                  复制全部
                </el-button>
              </div>
              <pre class="raw-output">{{ log.output.rawContent }}</pre>
            </div>
            
            <!-- 解析结果 -->
            <div v-if="log.output.parsedContent" class="detail-section">
              <h5>✅ 解析结果</h5>
              <pre class="parsed-output">{{ JSON.stringify(log.output.parsedContent, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { aiLogger } from '@/utils/aiLogger'

const expandedId = ref(null)

const hasError = computed(() => aiLogger.logs.some(l => l.status === 'error'))
const hasRunning = computed(() => aiLogger.logs.some(l => l.status === 'running'))

function toggleLog(id) {
  expandedId.value = expandedId.value === id ? null : id
}

function taskTypeLabel(type) {
  const labels = {
    generate_demo: 'Demo代码生成',
    generate_prd_client: '客户版PRD',
    generate_prd_dev: '开发版PRD',
    analyze_feedback: '反馈分析',
    generate_solution: '方案生成',
    apply_iteration: '应用迭代',
    generate_requirement: '需求文档生成'
  }
  return labels[type] || type
}

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('zh-CN')
}

function formatSize(bytes) {
  if (bytes < 1000) return bytes + '字'
  return (bytes / 1000).toFixed(1) + 'K字'
}

async function copyContent(content) {
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped>
.monitor-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-card, #1a1a2e);
  border: 2px solid var(--border-color, #333);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  cursor: pointer;
  z-index: 9998;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  transition: all 0.3s;
}

.monitor-fab:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0,0,0,0.4);
}

.monitor-fab.has-error {
  border-color: #f56c6c;
  animation: pulse-error 2s infinite;
}

.monitor-fab.has-running {
  border-color: #409eff;
  animation: pulse-running 1.5s infinite;
}

.fab-dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.fab-dot.running { background: #409eff; }
.fab-dot.error { background: #f56c6c; }

@keyframes pulse-error {
  0%, 100% { box-shadow: 0 4px 12px rgba(245,108,108,0.3); }
  50% { box-shadow: 0 4px 20px rgba(245,108,108,0.6); }
}

@keyframes pulse-running {
  0%, 100% { box-shadow: 0 4px 12px rgba(64,158,255,0.3); }
  50% { box-shadow: 0 4px 20px rgba(64,158,255,0.6); }
}

/* 监控面板 */
.monitor-panel {
  height: 100%;
  overflow-y: auto;
}

.monitor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 12px;
  border-bottom: 1px solid var(--border-color, #333);
  margin-bottom: 12px;
}

.empty-logs {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary, #999);
  font-size: 14px;
}

/* 日志项 */
.log-item {
  border: 1px solid var(--border-color, #333);
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
}

.log-item.error { border-color: rgba(245,108,108,0.4); }
.log-item.running { border-color: rgba(64,158,255,0.4); }

.log-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.log-header:hover {
  background: rgba(255,255,255,0.03);
}

.log-status-icon { font-size: 18px; }

.log-info {
  flex: 1;
}

.log-info strong {
  display: block;
  font-size: 14px;
  color: var(--text-primary, #eee);
}

.log-time {
  font-size: 12px;
  color: var(--text-secondary, #999);
}

.log-meta {
  display: flex;
  gap: 6px;
}

/* 展开详情 */
.log-detail {
  padding: 0 12px 12px;
  border-top: 1px solid var(--border-color, #333);
}

.detail-section {
  margin-top: 12px;
}

.detail-section h5 {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--text-primary, #eee);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-summary {
  font-size: 13px;
  color: var(--text-secondary, #999);
  margin: 0 0 6px;
  word-break: break-all;
}

.error-section {
  background: rgba(245,108,108,0.1);
  padding: 10px;
  border-radius: 6px;
}

.error-content {
  color: #f56c6c;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.raw-output, .parsed-output {
  background: rgba(0,0,0,0.3);
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.5;
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-secondary, #ccc);
  margin: 0;
}
</style>
