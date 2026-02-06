import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // AI 配置
  const apiUrl = ref(localStorage.getItem('ai_api_url') || 'https://api.openai.com/v1/chat/completions')
  const apiKey = ref(localStorage.getItem('ai_api_key') || '')
  const model = ref(localStorage.getItem('ai_model') || 'gpt-4o')
  
  // 预设模型选项
  const modelOptions = [
    { label: 'GPT-4o (OpenAI)', value: 'gpt-4o' },
    { label: 'GPT-4o-mini (OpenAI)', value: 'gpt-4o-mini' },
    { label: 'GPT-3.5-turbo (OpenAI)', value: 'gpt-3.5-turbo' },
    { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
    { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
    { label: 'DeepSeek Chat', value: 'deepseek-chat' },
    { label: 'DeepSeek Coder', value: 'deepseek-coder' },
    { label: '自定义', value: 'custom' }
  ]
  
  // 常用 API 端点
  const apiEndpoints = [
    { label: 'OpenAI 官方', value: 'https://api.openai.com/v1/chat/completions' },
    { label: 'Anthropic Claude', value: 'https://api.anthropic.com/v1/messages' },
    { label: 'DeepSeek', value: 'https://api.deepseek.com/v1/chat/completions' },
    { label: '自定义中转站', value: 'custom' }
  ]
  
  // 保存设置
  function saveSettings() {
    localStorage.setItem('ai_api_url', apiUrl.value)
    localStorage.setItem('ai_api_key', apiKey.value)
    localStorage.setItem('ai_model', model.value)
  }
  
  // 检查配置是否完整
  function isConfigured() {
    return apiUrl.value && apiKey.value && model.value
  }
  
  // 监听变化自动保存
  watch([apiUrl, apiKey, model], saveSettings)
  
  return {
    apiUrl,
    apiKey,
    model,
    modelOptions,
    apiEndpoints,
    saveSettings,
    isConfigured
  }
})
