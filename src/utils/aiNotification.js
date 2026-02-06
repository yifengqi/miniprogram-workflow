import { ElNotification } from 'element-plus'

/**
 * AI工作通知服务
 * 用于显示AI自动化进度通知
 */
class AINotificationService {
  constructor() {
    this.notifications = {}
  }
  
  /**
   * 显示任务开始通知
   */
  taskStart(taskId, title, message) {
    const notification = ElNotification({
      title,
      message,
      type: 'info',
      duration: 0,  // 不自动关闭
      position: 'bottom-right',
      customClass: 'ai-notification'
    })
    
    this.notifications[taskId] = notification
  }
  
  /**
   * 更新任务进度
   */
  taskProgress(taskId, message, progress) {
    // 关闭旧通知
    if (this.notifications[taskId]) {
      this.notifications[taskId].close()
    }
    
    // 显示新通知
    const notification = ElNotification({
      title: '🤖 AI处理中...',
      message: `${message} (${progress}%)`,
      type: 'info',
      duration: 0,
      position: 'bottom-right',
      customClass: 'ai-notification'
    })
    
    this.notifications[taskId] = notification
  }
  
  /**
   * 任务完成通知
   */
  taskComplete(taskId, title, message) {
    // 关闭进度通知
    if (this.notifications[taskId]) {
      this.notifications[taskId].close()
      delete this.notifications[taskId]
    }
    
    // 显示完成通知
    ElNotification({
      title,
      message,
      type: 'success',
      duration: 5000,
      position: 'bottom-right'
    })
  }
  
  /**
   * 任务失败通知
   */
  taskError(taskId, title, message) {
    // 关闭进度通知
    if (this.notifications[taskId]) {
      this.notifications[taskId].close()
      delete this.notifications[taskId]
    }
    
    // 显示错误通知
    ElNotification({
      title,
      message,
      type: 'error',
      duration: 8000,
      position: 'bottom-right'
    })
  }
  
  /**
   * 经验应用通知
   */
  experienceApplied(count, examples) {
    ElNotification({
      title: '💡 历史经验已应用',
      message: `系统已应用 ${count} 条历史经验，避免常见问题`,
      type: 'success',
      duration: 5000,
      position: 'bottom-right'
    })
  }
  
  /**
   * 智能提示通知
   */
  intelligentHint(hint) {
    ElNotification({
      title: '💡 智能提示',
      message: hint.message,
      type: 'warning',
      duration: 8000,
      position: 'bottom-right'
    })
  }
  
  /**
   * 项目完成通知
   */
  projectCompleted(projectName) {
    ElNotification({
      title: '🎉 项目完成',
      message: `「${projectName}」已完成，经验已记录到知识库`,
      type: 'success',
      duration: 8000,
      position: 'bottom-right'
    })
  }
  
  /**
   * 清除所有通知
   */
  clearAll() {
    Object.values(this.notifications).forEach(notification => {
      notification.close()
    })
    this.notifications = {}
  }
}

// 单例导出
export const aiNotification = new AINotificationService()
