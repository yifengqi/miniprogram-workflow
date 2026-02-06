// Vercel Serverless Function - AI 代理接口
// 用于解决前端跨域问题

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    const { apiUrl, apiKey, model, messages, maxTokens = 4096, temperature = 0.7 } = req.body
    
    if (!apiUrl || !apiKey || !messages) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }
    
    // 判断是 Anthropic 还是 OpenAI 格式
    const isAnthropic = apiUrl.includes('anthropic')
    
    let response
    
    if (isAnthropic) {
      // Anthropic Claude API
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: messages.filter(m => m.role !== 'system'),
          system: messages.find(m => m.role === 'system')?.content
        })
      })
    } else {
      // OpenAI 兼容格式
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: false
        })
      })
    }
    
    const data = await response.json()
    
    if (!response.ok) {
      return res.status(response.status).json(data)
    }
    
    return res.status(200).json(data)
    
  } catch (error) {
    console.error('Proxy error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
