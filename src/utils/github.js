import { ElMessage, ElNotification } from 'element-plus'

/**
 * GitHub服务
 * 用于自动推送Demo代码到GitHub
 */
class GitHubService {
  constructor() {
    this.apiBase = 'https://api.github.com'
    this.token = null
  }
  
  /**
   * 设置GitHub Token
   */
  setToken(token) {
    this.token = token
    localStorage.setItem('github_token', token)
  }
  
  /**
   * 获取Token
   */
  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('github_token')
    }
    return this.token
  }
  
  /**
   * 检查Token是否配置
   */
  isConfigured() {
    return !!this.getToken()
  }
  
  /**
   * 创建仓库
   * @param {Object} config - 仓库配置
   * @returns {Promise<Object>} 仓库信息
   */
  async createRepository(config) {
    if (!this.isConfigured()) {
      throw new Error('请先配置GitHub Token')
    }
    
    const response = await fetch(`${this.apiBase}/user/repos`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${this.getToken()}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: config.repoName,
        description: config.description,
        private: config.private !== false,
        auto_init: true  // 自动初始化README
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '创建仓库失败')
    }
    
    const repo = await response.json()
    
    ElNotification({
      title: '✅ 仓库创建成功',
      message: `GitHub仓库「${repo.name}」已创建`,
      type: 'success'
    })
    
    return repo
  }
  
  /**
   * 推送文件到仓库
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名
   * @param {Array} files - 文件列表
   * @param {Function} onProgress - 进度回调
   */
  async pushFiles(owner, repo, files, onProgress) {
    if (!this.isConfigured()) {
      throw new Error('请先配置GitHub Token')
    }
    
    const totalFiles = files.length
    let completedFiles = 0
    
    for (const file of files) {
      try {
        // 创建或更新文件
        await this.createOrUpdateFile(owner, repo, file.path, file.content)
        
        completedFiles++
        
        if (onProgress) {
          onProgress({
            total: totalFiles,
            completed: completedFiles,
            current: file.path,
            percentage: Math.round((completedFiles / totalFiles) * 100)
          })
        }
        
        // 避免API限流
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`推送文件失败: ${file.path}`, error)
        throw new Error(`推送文件「${file.path}」失败: ${error.message}`)
      }
    }
    
    ElNotification({
      title: '🎉 代码推送完成',
      message: `已成功推送 ${totalFiles} 个文件到GitHub`,
      type: 'success',
      duration: 5000
    })
  }
  
  /**
   * 创建或更新单个文件
   */
  async createOrUpdateFile(owner, repo, path, content) {
    // 先检查文件是否存在
    let sha = null
    try {
      const checkResponse = await fetch(
        `${this.apiBase}/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: {
            'Authorization': `token ${this.getToken()}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )
      
      if (checkResponse.ok) {
        const existing = await checkResponse.json()
        sha = existing.sha
      }
    } catch (error) {
      // 文件不存在，继续创建
    }
    
    // 创建或更新文件
    const response = await fetch(
      `${this.apiBase}/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${this.getToken()}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Add ${path}`,
          content: btoa(unescape(encodeURIComponent(content))),  // Base64编码
          sha: sha || undefined
        })
      }
    )
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '推送失败')
    }
    
    return await response.json()
  }
  
  /**
   * 获取用户信息
   */
  async getUserInfo() {
    if (!this.isConfigured()) {
      throw new Error('请先配置GitHub Token')
    }
    
    const response = await fetch(`${this.apiBase}/user`, {
      headers: {
        'Authorization': `token ${this.getToken()}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    
    if (!response.ok) {
      throw new Error('获取用户信息失败，Token可能无效')
    }
    
    return await response.json()
  }
  
  /**
   * 获取仓库列表
   */
  async getRepositories() {
    if (!this.isConfigured()) {
      throw new Error('请先配置GitHub Token')
    }
    
    const response = await fetch(`${this.apiBase}/user/repos?per_page=100&sort=updated`, {
      headers: {
        'Authorization': `token ${this.getToken()}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    
    if (!response.ok) {
      throw new Error('获取仓库列表失败')
    }
    
    return await response.json()
  }
}

// 单例导出
export const githubService = new GitHubService()
