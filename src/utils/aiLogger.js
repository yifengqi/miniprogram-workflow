/**
 * AI 任务日志系统
 * 记录每次AI调用的输入、输出、状态，方便调试和监控
 */
import { reactive } from 'vue'

const MAX_LOGS = 50  // 最多保留50条

export const aiLogger = reactive({
  logs: [],
  isOpen: false,  // 监控面板是否打开
  
  /**
   * 记录一次AI调用开始
   */
  start(taskType, input) {
    const log = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      taskType,
      status: 'running',  // running | success | error
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null,
      
      // 输入
      input: {
        summary: summarizeInput(input),
        promptLength: JSON.stringify(input).length,
        detail: input  // 完整输入
      },
      
      // 输出
      output: {
        rawContent: '',     // AI返回的原始内容
        parsedContent: null, // 解析后的内容
        contentLength: 0,
        error: null
      }
    }
    
    this.logs.unshift(log)
    
    // 限制数量
    if (this.logs.length > MAX_LOGS) {
      this.logs.splice(MAX_LOGS)
    }
    
    return log.id
  },
  
  /**
   * 记录AI返回的原始内容（流式进度）
   */
  updateRawContent(logId, content) {
    const log = this.logs.find(l => l.id === logId)
    if (log) {
      log.output.rawContent = content
      log.output.contentLength = content.length
    }
  },
  
  /**
   * 记录成功
   */
  success(logId, parsedContent) {
    const log = this.logs.find(l => l.id === logId)
    if (log) {
      log.status = 'success'
      log.endTime = new Date().toISOString()
      log.duration = new Date(log.endTime) - new Date(log.startTime)
      log.output.parsedContent = parsedContent
    }
  },
  
  /**
   * 记录失败
   */
  error(logId, error, rawContent = '') {
    const log = this.logs.find(l => l.id === logId)
    if (log) {
      log.status = 'error'
      log.endTime = new Date().toISOString()
      log.duration = new Date(log.endTime) - new Date(log.startTime)
      log.output.error = error.message || String(error)
      if (rawContent) {
        log.output.rawContent = rawContent
        log.output.contentLength = rawContent.length
      }
    }
  },
  
  /**
   * 清空日志
   */
  clear() {
    this.logs.splice(0)
  },
  
  /**
   * 获取最新错误
   */
  getLatestError() {
    return this.logs.find(l => l.status === 'error')
  }
})

// 输入摘要
function summarizeInput(input) {
  if (typeof input === 'string') return input.slice(0, 100) + '...'
  if (input?.messages) {
    const userMsg = input.messages.find(m => m.role === 'user')
    return userMsg?.content?.slice(0, 100) + '...' || '(无用户消息)'
  }
  return JSON.stringify(input).slice(0, 100) + '...'
}
