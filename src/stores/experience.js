import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

// 初始经验数据（来自星见项目）
const initialExperiences = [
  {
    id: 'EXP-001',
    title: '云函数SDK版本问题',
    category: '云开发',
    severity: 'critical',
    problem: '云函数使用 wx-server-sdk 3.x 版本导致上传失败或运行时错误',
    symptom: '上传云函数时报错，或运行时出现 [ACCESS_TOKEN_DISABLED] 错误，或云函数调用返回空结果',
    cause: 'wx-server-sdk 3.x 版本与当前云开发环境不兼容',
    solution: '在 package.json 中强制指定版本：\n"wx-server-sdk": "~2.6.3"',
    benefit: '上传成功率: 0% → 100%',
    createdAt: '2026-02-06',
    updatedAt: '2026-02-06'
  },
  {
    id: 'EXP-002',
    title: '数据库权限问题',
    category: '云开发',
    severity: 'critical',
    problem: '数据库权限配置不当导致读写失败',
    symptom: '小程序端读取数据返回空数组，或写入数据报权限错误，或跨用户数据无法访问',
    cause: '1. 权限配置过于严格 2. 权限配置过于宽松存在安全风险 3. 不理解 doc._openid 和 auth.openid 的区别',
    solution: '读写分离策略：\n- 公开可读：{ "read": true, "write": false }\n- 仅自己可读：{ "read": "doc._openid == auth.openid", "write": false }\n- 所有写操作通过云函数进行',
    benefit: '权限错误数: 5+次/项目 → 0次',
    createdAt: '2026-02-06',
    updatedAt: '2026-02-06'
  },
  {
    id: 'EXP-003',
    title: '隐私合规问题',
    category: '合规',
    severity: 'critical',
    problem: '缺少隐私政策或用户协议导致审核不通过',
    symptom: '小程序提交审核被驳回，驳回原因：缺少隐私政策/用户隐私保护指引未填写',
    cause: '开发时忽略了合规要求',
    solution: '1. 隐私弹窗：首次进入小程序时弹出\n2. 隐私政策页面：完整的隐私政策文档\n3. 用户协议页面：完整的服务条款\n4. 后台配置：填写用户隐私保护指引',
    benefit: '审核通过率: 0% → 100%',
    createdAt: '2026-02-06',
    updatedAt: '2026-02-06'
  },
  {
    id: 'EXP-004',
    title: 'Web后台路由问题',
    category: '部署',
    severity: 'high',
    problem: 'Web管理后台部署到子目录后页面空白或路由失效',
    symptom: '访问管理后台显示空白页，或刷新页面后 404，或路由跳转失败',
    cause: 'vite.config.js 的 base 和 router 的 history 路径不一致',
    solution: '// vite.config.js\nbase: "/admin/"\n\n// router/index.js\nhistory: createWebHistory("/admin/")\n\n两者必须一致！',
    benefit: '部署调试时间: 3小时 → 10分钟',
    createdAt: '2026-02-06',
    updatedAt: '2026-02-06'
  },
  {
    id: 'EXP-005',
    title: 'CSS变量问题',
    category: '前端',
    severity: 'medium',
    problem: '不同模块使用的CSS变量名称不一致，导致样式异常',
    symptom: '按钮文字颜色看不清（黑色背景+黑色文字），或样式在某些页面正常某些页面异常',
    cause: '各模块独立开发时使用了不同的变量命名',
    solution: '在 App.vue 中统一定义所有CSS变量，并创建兼容别名',
    benefit: '样式调试时间: 1小时/页面 → 5分钟/页面',
    createdAt: '2026-02-06',
    updatedAt: '2026-02-06'
  },
  {
    id: 'EXP-006',
    title: '云函数配置问题',
    category: '云开发',
    severity: 'high',
    problem: '云函数 config.json 格式错误导致上传或运行失败',
    symptom: '云函数上传失败，或云函数运行时环境变量异常',
    cause: 'config.json 包含了空的 env 字段或其他格式问题',
    solution: '正确的 config.json 格式：\n{\n  "permissions": {\n    "openapi": []\n  }\n}\n\n不要包含空的 env 字段！',
    benefit: '配置错误次数: 频繁 → 0',
    createdAt: '2026-02-06',
    updatedAt: '2026-02-06'
  },
  {
    id: 'EXP-007',
    title: 'Vue3生命周期问题',
    category: '前端',
    severity: 'high',
    problem: 'Vue3 + UniApp 中生命周期钩子使用方式错误',
    symptom: 'TypeError: common_vendor.index.onPullDownRefresh is not a function，或页面生命周期不触发',
    cause: 'Vue3 <script setup> 中不能使用 uni.onXXX() 的方式',
    solution: '使用 @dcloudio/uni-app 导入：\nimport { onPullDownRefresh, onReachBottom, onLoad } from "@dcloudio/uni-app"',
    benefit: '运行时错误: 页面崩溃 → 正常运行',
    createdAt: '2026-02-06',
    updatedAt: '2026-02-06'
  },
  {
    id: 'EXP-008',
    title: '云存储URL问题',
    category: '云开发',
    severity: 'medium',
    problem: '云存储的 cloud:// 协议URL无法直接在小程序中显示图片',
    symptom: '图片显示不出来，或图片加载失败',
    cause: 'cloud:// 是云存储内部协议，需要转换为临时 HTTPS URL',
    solution: '使用 cloud.getTempFileURL() 批量转换：\nconst urls = await cloud.getTempFileURL({ fileList })',
    benefit: '图片显示成功率: 0% → 100%',
    createdAt: '2026-02-06',
    updatedAt: '2026-02-06'
  },
  {
    id: 'EXP-009',
    title: '导航栏适配问题',
    category: '前端',
    severity: 'medium',
    problem: '自定义导航栏在不同手机上对齐异常',
    symptom: '返回按钮与胶囊不对齐，或内容被导航栏遮挡，或状态栏区域显示异常',
    cause: '不同设备的状态栏高度和胶囊位置不同',
    solution: '动态获取系统信息计算高度：\nconst systemInfo = uni.getSystemInfoSync()\nconst menuButton = uni.getMenuButtonBoundingClientRect()\nconst navBarHeight = (menuButton.top - systemInfo.statusBarHeight) * 2 + menuButton.height',
    benefit: '适配机型覆盖: 部分机型 → 100%机型',
    createdAt: '2026-02-06',
    updatedAt: '2026-02-06'
  },
  {
    id: 'EXP-010',
    title: '网络异常处理',
    category: '用户体验',
    severity: 'medium',
    problem: '弱网或离线环境下用户体验差',
    symptom: '页面长时间loading无反馈，或操作失败无提示，或已输入的内容丢失',
    cause: '未做网络异常处理和本地缓存',
    solution: '1. 网络状态监听：uni.onNetworkStatusChange\n2. 请求超时处理：10秒超时\n3. 重试机制：失败后递增延迟重试\n4. 本地缓存：先显示缓存再请求最新',
    benefit: '弱网体验评分: 差 → 良好',
    createdAt: '2026-02-06',
    updatedAt: '2026-02-06'
  }
]

export const useExperienceStore = defineStore('experience', () => {
  // 经验列表
  const experiences = ref(JSON.parse(localStorage.getItem('experiences') || 'null') || initialExperiences)
  
  // 分类列表
  const categories = computed(() => {
    const cats = new Set(experiences.value.map(e => e.category))
    return Array.from(cats)
  })
  
  // 按分类过滤
  function getByCategory(category) {
    if (!category) return experiences.value
    return experiences.value.filter(e => e.category === category)
  }
  
  // 搜索
  function search(keyword) {
    if (!keyword) return experiences.value
    const kw = keyword.toLowerCase()
    return experiences.value.filter(e => 
      e.title.toLowerCase().includes(kw) ||
      e.problem.toLowerCase().includes(kw) ||
      e.solution.toLowerCase().includes(kw)
    )
  }
  
  // 添加经验
  function addExperience(data) {
    const exp = {
      ...data,
      id: `EXP-${String(experiences.value.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    }
    experiences.value.unshift(exp)
    return exp
  }
  
  // 更新经验
  function updateExperience(id, data) {
    const index = experiences.value.findIndex(e => e.id === id)
    if (index !== -1) {
      experiences.value[index] = {
        ...experiences.value[index],
        ...data,
        updatedAt: new Date().toISOString().split('T')[0]
      }
    }
  }
  
  // 删除经验
  function deleteExperience(id) {
    const index = experiences.value.findIndex(e => e.id === id)
    if (index !== -1) {
      experiences.value.splice(index, 1)
    }
  }
  
  // 导出为 Markdown
  function exportToMarkdown() {
    let md = '# 经验知识库\n\n'
    md += `> 导出时间：${new Date().toLocaleString()}\n\n`
    
    const grouped = {}
    experiences.value.forEach(exp => {
      if (!grouped[exp.category]) grouped[exp.category] = []
      grouped[exp.category].push(exp)
    })
    
    for (const [category, exps] of Object.entries(grouped)) {
      md += `## ${category}\n\n`
      exps.forEach(exp => {
        const severityIcon = exp.severity === 'critical' ? '🔴' : exp.severity === 'high' ? '🟠' : '🟡'
        md += `### ${exp.id} ${exp.title}\n\n`
        md += `**严重程度**：${severityIcon} ${exp.severity}\n\n`
        md += `#### 问题描述\n${exp.problem}\n\n`
        md += `#### 错误现象\n${exp.symptom}\n\n`
        md += `#### 原因分析\n${exp.cause}\n\n`
        md += `#### 解决方案\n\`\`\`\n${exp.solution}\n\`\`\`\n\n`
        md += `#### 优化收益\n${exp.benefit}\n\n---\n\n`
      })
    }
    
    return md
  }
  
  // 监听变化自动保存
  watch(experiences, (val) => {
    localStorage.setItem('experiences', JSON.stringify(val))
  }, { deep: true })
  
  return {
    experiences,
    categories,
    getByCategory,
    search,
    addExperience,
    updateExperience,
    deleteExperience,
    exportToMarkdown
  }
})
