<template>
  <div class="checklist-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">非功能性检查清单</h1>
        <p class="page-desc">
          {{ projectStore.currentProject ? `当前项目：${projectStore.currentProject.name}` : '通用检查清单' }}
        </p>
      </div>
      <div class="header-actions">
        <el-button @click="resetChecklist">
          <el-icon><RefreshRight /></el-icon>
          重置
        </el-button>
        <el-button type="primary" @click="exportChecklist">
          <el-icon><Download /></el-icon>
          导出待办
        </el-button>
      </div>
    </div>
    
    <!-- 进度概览 -->
    <div class="progress-overview card">
      <div class="progress-stats">
        <div class="progress-circle">
          <el-progress 
            type="circle" 
            :percentage="overallProgress" 
            :width="100"
            :stroke-width="8"
            :color="progressColor"
          >
            <template #default>
              <span class="progress-text">{{ completedCount }}/{{ totalCount }}</span>
            </template>
          </el-progress>
        </div>
        <div class="progress-info">
          <h3>完成进度</h3>
          <p>已完成 {{ completedCount }} 项，剩余 {{ totalCount - completedCount }} 项</p>
          <div class="category-progress">
            <div v-for="cat in categories" :key="cat.name" class="cat-item">
              <span class="cat-name">{{ cat.name }}</span>
              <el-progress 
                :percentage="cat.progress" 
                :stroke-width="6"
                :show-text="false"
              />
              <span class="cat-count">{{ cat.completed }}/{{ cat.total }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 检查清单 -->
    <div class="checklist-sections">
      <div v-for="section in checklistData" :key="section.id" class="section card">
        <div class="section-header" @click="section.collapsed = !section.collapsed">
          <div class="section-title">
            <el-icon class="collapse-icon" :class="{ collapsed: section.collapsed }">
              <ArrowDown />
            </el-icon>
            <h3>{{ section.title }}</h3>
          </div>
          <div class="section-progress">
            <el-progress 
              :percentage="getSectionProgress(section)" 
              :stroke-width="6"
              :show-text="false"
              style="width: 100px"
            />
            <span>{{ getSectionCompleted(section) }}/{{ getSectionTotal(section) }}</span>
          </div>
        </div>
        
        <el-collapse-transition>
          <div v-show="!section.collapsed" class="section-content">
            <div v-for="group in section.groups" :key="group.id" class="check-group">
              <h4 class="group-title">
                {{ group.title }}
                <el-tag v-if="group.required" type="danger" size="small">必须</el-tag>
                <el-tag v-else-if="group.important" type="warning" size="small">重要</el-tag>
              </h4>
              
              <div v-if="group.description" class="group-desc">{{ group.description }}</div>
              
              <div class="check-items">
                <div 
                  v-for="item in group.items" 
                  :key="item.id"
                  class="check-item"
                  :class="{ checked: isChecked(item.id) }"
                >
                  <el-checkbox 
                    :model-value="isChecked(item.id)"
                    @change="toggleCheck(item.id)"
                  >
                    {{ item.label }}
                  </el-checkbox>
                  <div v-if="item.tip" class="item-tip">{{ item.tip }}</div>
                </div>
              </div>
            </div>
          </div>
        </el-collapse-transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useProjectStore } from '@/stores/project'

const projectStore = useProjectStore()

// 检查状态
const checkedItems = ref({})

// 检查清单数据
const checklistData = reactive([
  {
    id: 'compliance',
    title: '一、合规与审核',
    collapsed: false,
    groups: [
      {
        id: 'privacy',
        title: '1.1 隐私协议',
        required: true,
        items: [
          { id: 'privacy-1', label: '已创建隐私政策页面' },
          { id: 'privacy-2', label: '首次使用时显示隐私弹窗' },
          { id: 'privacy-3', label: '用户不同意则限制功能' },
          { id: 'privacy-4', label: '隐私政策内容与实际收集信息一致' },
          { id: 'privacy-5', label: '已在小程序后台填写隐私保护指引' }
        ]
      },
      {
        id: 'agreement',
        title: '1.2 用户协议',
        required: true,
        items: [
          { id: 'agreement-1', label: '已创建用户协议页面' },
          { id: 'agreement-2', label: '注册/登录时需勾选同意' },
          { id: 'agreement-3', label: '协议内容与实际服务一致' }
        ]
      },
      {
        id: 'category',
        title: '1.3 小程序类目',
        required: true,
        items: [
          { id: 'category-1', label: '选择的类目与实际功能匹配' },
          { id: 'category-2', label: '如涉及特殊类目，已准备资质文件' }
        ]
      },
      {
        id: 'content',
        title: '1.4 内容审核',
        important: true,
        description: '如果有用户生成内容（UGC）',
        items: [
          { id: 'content-1', label: '已实现敏感词过滤' },
          { id: 'content-2', label: '已实现内容审核机制' },
          { id: 'content-3', label: '有内容举报功能' },
          { id: 'content-4', label: '有违规内容处理机制' }
        ]
      }
    ]
  },
  {
    id: 'permission',
    title: '二、权限管理',
    collapsed: false,
    groups: [
      {
        id: 'wx-permission',
        title: '2.1 微信权限申请',
        important: true,
        items: [
          { id: 'perm-1', label: '权限按需申请，不在启动时一次性申请' },
          { id: 'perm-2', label: '申请时说明用途' },
          { id: 'perm-3', label: '用户拒绝后有友好提示' },
          { id: 'perm-4', label: '提供去设置页面的入口' }
        ]
      },
      {
        id: 'db-permission',
        title: '2.2 数据库权限',
        required: true,
        items: [
          { id: 'db-1', label: '遵循最小权限原则' },
          { id: 'db-2', label: '读写权限分离' },
          { id: 'db-3', label: '写操作通过云函数进行' }
        ]
      }
    ]
  },
  {
    id: 'security',
    title: '三、安全防护',
    collapsed: false,
    groups: [
      {
        id: 'data-security',
        title: '3.1 数据安全',
        required: true,
        items: [
          { id: 'sec-1', label: '手机号脱敏显示（138****1234）' },
          { id: 'sec-2', label: '身份证脱敏显示' },
          { id: 'sec-3', label: '密码不明文存储' },
          { id: 'sec-4', label: '敏感信息加密存储' }
        ]
      },
      {
        id: 'api-security',
        title: '3.2 接口安全',
        required: true,
        items: [
          { id: 'api-1', label: '所有输入都有参数验证' },
          { id: 'api-2', label: '已做 XSS 防护' },
          { id: 'api-3', label: '已做防重复提交' }
        ]
      },
      {
        id: 'rate-limit',
        title: '3.3 请求频率限制',
        items: [
          { id: 'rate-1', label: '关键接口有频率限制' }
        ]
      }
    ]
  },
  {
    id: 'error',
    title: '四、错误处理与用户反馈',
    collapsed: false,
    groups: [
      {
        id: 'error-tip',
        title: '4.1 错误提示',
        required: true,
        items: [
          { id: 'err-1', label: '错误提示用户友好' },
          { id: 'err-2', label: '不暴露技术细节给用户' },
          { id: 'err-3', label: '错误详情记录到日志' }
        ]
      },
      {
        id: 'loading',
        title: '4.2 加载状态',
        required: true,
        items: [
          { id: 'load-1', label: '有全局加载提示' },
          { id: 'load-2', label: '列表页有骨架屏或加载动画' }
        ]
      },
      {
        id: 'empty',
        title: '4.3 空状态处理',
        required: true,
        items: [
          { id: 'empty-1', label: '列表为空时显示空状态提示' },
          { id: 'empty-2', label: '有引导用户操作的按钮' }
        ]
      },
      {
        id: 'network',
        title: '4.4 网络异常处理',
        required: true,
        items: [
          { id: 'net-1', label: '监听网络状态变化' },
          { id: 'net-2', label: '请求有超时处理' },
          { id: 'net-3', label: '关键请求有重试机制' },
          { id: 'net-4', label: '有本地缓存机制' }
        ]
      }
    ]
  },
  {
    id: 'performance',
    title: '五、性能优化',
    collapsed: false,
    groups: [
      {
        id: 'first-screen',
        title: '5.1 首屏加载优化',
        important: true,
        items: [
          { id: 'perf-1', label: '使用分包加载' },
          { id: 'perf-2', label: '配置预加载规则' },
          { id: 'perf-3', label: '首屏加载时间 < 3秒' }
        ]
      },
      {
        id: 'image',
        title: '5.2 图片优化',
        important: true,
        items: [
          { id: 'img-1', label: '使用图片懒加载' },
          { id: 'img-2', label: '上传图片有压缩' },
          { id: 'img-3', label: '列表使用缩略图' }
        ]
      },
      {
        id: 'cache',
        title: '5.3 数据缓存',
        items: [
          { id: 'cache-1', label: '常用数据有本地缓存' },
          { id: 'cache-2', label: '缓存有过期机制' }
        ]
      },
      {
        id: 'list',
        title: '5.4 列表性能',
        items: [
          { id: 'list-1', label: '长列表使用虚拟列表或分页' },
          { id: 'list-2', label: '列表滚动流畅' }
        ]
      }
    ]
  },
  {
    id: 'compatibility',
    title: '六、兼容性检查',
    collapsed: false,
    groups: [
      {
        id: 'device',
        title: '6.1 设备兼容',
        required: true,
        items: [
          { id: 'dev-1', label: 'iPhone 小屏（SE）测试通过' },
          { id: 'dev-2', label: 'iPhone 标准屏测试通过' },
          { id: 'dev-3', label: 'iPhone 大屏（Max）测试通过' },
          { id: 'dev-4', label: 'Android 测试通过' },
          { id: 'dev-5', label: '使用 rpx 适配不同屏幕' },
          { id: 'dev-6', label: '已做安全区域适配' }
        ]
      },
      {
        id: 'version',
        title: '6.2 系统版本兼容',
        required: true,
        items: [
          { id: 'ver-1', label: '检查API兼容性（canIUse）' },
          { id: 'ver-2', label: '已设置最低基础库版本（≥2.20.0）' }
        ]
      },
      {
        id: 'dark',
        title: '6.3 深色模式适配',
        items: [
          { id: 'dark-1', label: '支持系统深色模式切换' }
        ]
      }
    ]
  },
  {
    id: 'cloud',
    title: '七、云开发检查',
    collapsed: false,
    groups: [
      {
        id: 'cloud-function',
        title: '7.1 云函数配置',
        required: true,
        items: [
          { id: 'cf-1', label: 'wx-server-sdk 版本为 ~2.6.3', tip: '不能使用 3.x 版本！' },
          { id: 'cf-2', label: 'config.json 格式正确（无空 env 字段）' },
          { id: 'cf-3', label: '已配置合适的超时时间' }
        ]
      },
      {
        id: 'db-index',
        title: '7.2 数据库索引',
        important: true,
        items: [
          { id: 'idx-1', label: '查询字段已建立索引' },
          { id: 'idx-2', label: '排序字段已建立索引' },
          { id: 'idx-3', label: '复合查询使用复合索引' }
        ]
      },
      {
        id: 'quota',
        title: '7.3 配额监控',
        items: [
          { id: 'quota-1', label: '了解云函数调用次数限制' },
          { id: 'quota-2', label: '了解数据库读写次数限制' },
          { id: 'quota-3', label: '了解云存储容量限制' }
        ]
      }
    ]
  },
  {
    id: 'final',
    title: '八、上线前终极检查',
    collapsed: false,
    groups: [
      {
        id: 'function-check',
        title: '8.1 功能检查',
        required: true,
        items: [
          { id: 'final-1', label: '所有主要功能已测试' },
          { id: 'final-2', label: '边界情况已处理' },
          { id: 'final-3', label: '错误提示已完善' }
        ]
      },
      {
        id: 'publish',
        title: '8.2 发布前准备',
        required: true,
        items: [
          { id: 'pub-1', label: '测试账号已准备' },
          { id: 'pub-2', label: '版本号已更新' },
          { id: 'pub-3', label: '更新日志已写' },
          { id: 'pub-4', label: '已备份当前版本' }
        ]
      }
    ]
  }
])

// 从项目或本地存储加载检查状态
onMounted(() => {
  const saved = projectStore.currentProject?.checklistProgress || 
                JSON.parse(localStorage.getItem('checklist_progress') || '{}')
  checkedItems.value = saved
})

// 保存检查状态
watch(checkedItems, (val) => {
  if (projectStore.currentProject) {
    projectStore.saveChecklistProgress({ ...val })
  } else {
    localStorage.setItem('checklist_progress', JSON.stringify(val))
  }
}, { deep: true })

// 监听项目切换
watch(() => projectStore.currentProjectId, () => {
  if (projectStore.currentProject?.checklistProgress) {
    checkedItems.value = { ...projectStore.currentProject.checklistProgress }
  } else {
    checkedItems.value = {}
  }
})

// 计算总数
const totalCount = computed(() => {
  let count = 0
  checklistData.forEach(section => {
    section.groups.forEach(group => {
      count += group.items.length
    })
  })
  return count
})

const completedCount = computed(() => {
  return Object.values(checkedItems.value).filter(Boolean).length
})

const overallProgress = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((completedCount.value / totalCount.value) * 100)
})

const progressColor = computed(() => {
  if (overallProgress.value < 30) return '#f56c6c'
  if (overallProgress.value < 70) return '#e6a23c'
  return '#67c23a'
})

// 分类进度
const categories = computed(() => {
  return checklistData.map(section => {
    let total = 0
    let completed = 0
    section.groups.forEach(group => {
      group.items.forEach(item => {
        total++
        if (checkedItems.value[item.id]) completed++
      })
    })
    return {
      name: section.title.replace(/^[一二三四五六七八]、/, ''),
      total,
      completed,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  })
})

function isChecked(id) {
  return !!checkedItems.value[id]
}

function toggleCheck(id) {
  checkedItems.value[id] = !checkedItems.value[id]
}

function getSectionTotal(section) {
  let count = 0
  section.groups.forEach(group => {
    count += group.items.length
  })
  return count
}

function getSectionCompleted(section) {
  let count = 0
  section.groups.forEach(group => {
    group.items.forEach(item => {
      if (checkedItems.value[item.id]) count++
    })
  })
  return count
}

function getSectionProgress(section) {
  const total = getSectionTotal(section)
  const completed = getSectionCompleted(section)
  return total > 0 ? Math.round((completed / total) * 100) : 0
}

function resetChecklist() {
  ElMessageBox.confirm('确定要重置所有检查项吗？', '重置确认', {
    type: 'warning'
  }).then(() => {
    checkedItems.value = {}
    ElMessage.success('已重置')
  }).catch(() => {})
}

function exportChecklist() {
  let content = '# 非功能性检查待办清单\n\n'
  content += `项目：${projectStore.currentProject?.name || '通用'}\n`
  content += `导出时间：${new Date().toLocaleString()}\n`
  content += `完成进度：${completedCount.value}/${totalCount.value} (${overallProgress.value}%)\n\n`
  content += '---\n\n'
  
  checklistData.forEach(section => {
    content += `## ${section.title}\n\n`
    section.groups.forEach(group => {
      content += `### ${group.title}\n\n`
      group.items.forEach(item => {
        const checked = checkedItems.value[item.id] ? 'x' : ' '
        content += `- [${checked}] ${item.label}\n`
        if (item.tip) content += `  > ${item.tip}\n`
      })
      content += '\n'
    })
  })
  
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `检查清单_${projectStore.currentProject?.name || '通用'}_${new Date().toISOString().split('T')[0]}.md`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('清单已导出')
}
</script>

<style scoped>
.checklist-page {
  max-width: 900px;
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

.progress-overview {
  margin-bottom: 24px;
}

.progress-stats {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}

.progress-circle {
  flex-shrink: 0;
}

.progress-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.progress-info {
  flex: 1;
}

.progress-info h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.progress-info > p {
  margin: 0 0 16px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.category-progress {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.cat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cat-name {
  font-size: 12px;
  color: var(--text-muted);
  width: 80px;
  flex-shrink: 0;
}

.cat-item .el-progress {
  flex: 1;
}

.cat-count {
  font-size: 12px;
  color: var(--text-muted);
  width: 40px;
  text-align: right;
}

.checklist-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section {
  padding: 0;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.3s;
}

.section-header:hover {
  background: var(--bg-tertiary);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-title h3 {
  margin: 0;
  font-size: 15px;
  color: var(--text-primary);
}

.collapse-icon {
  transition: transform 0.3s;
}

.collapse-icon.collapsed {
  transform: rotate(-90deg);
}

.section-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.section-content {
  padding: 0 20px 20px;
  border-top: 1px solid var(--border-color);
}

.check-group {
  margin-top: 16px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--primary-color);
  font-weight: 500;
}

.group-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.check-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.check-item {
  padding: 8px 12px;
  border-radius: 6px;
  transition: background 0.3s;
}

.check-item:hover {
  background: var(--bg-tertiary);
}

.check-item.checked {
  opacity: 0.6;
}

.check-item.checked :deep(.el-checkbox__label) {
  text-decoration: line-through;
}

.item-tip {
  font-size: 11px;
  color: var(--warning-color);
  margin-left: 24px;
  margin-top: 2px;
}

:deep(.el-checkbox__label) {
  color: var(--text-secondary);
}

:deep(.el-checkbox.is-checked .el-checkbox__label) {
  color: var(--text-muted);
}
</style>
