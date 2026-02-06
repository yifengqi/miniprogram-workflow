# 🚀 Demo快速启动指南

> 本文档帮助快速搭建可运行的Demo，用于与客户确认核心功能和UI风格
> 目标：1-2天内出一个可体验的版本

---

## 一、Demo的目标

### 1.1 Demo应该包含什么

**必须有**：
- 核心页面框架（首页、我的）
- 主要交互流程（如：浏览 → 详情 → 操作）
- 确定的UI风格和配色
- 基本的数据展示（可用假数据）

**可以暂时没有**：
- 完整的登录流程
- 真实的支付功能
- 复杂的业务逻辑
- 后台管理系统

### 1.2 Demo的价值

```
客户看到Demo后能回答：
✅ 整体风格是否满意？
✅ 核心操作流程是否清晰？
✅ 有没有遗漏的重要功能？
✅ 优先级排序是否需要调整？
```

---

## 二、快速启动步骤

### 步骤1：创建项目（5分钟）

**使用HBuilderX创建**：
```
文件 → 新建 → 项目 → uni-app → Vue3版本 → 选择目录
```

**或使用命令行**：
```bash
# 使用官方模板
npx degit dcloudio/uni-preset-vue#vite-ts my-project
cd my-project
npm install
```

### 步骤2：配置云开发（10分钟）

1. **开通云开发**
   - 微信开发者工具 → 云开发 → 开通
   - 创建环境，记录环境ID

2. **配置manifest.json**
```json
{
  "mp-weixin": {
    "appid": "您的AppID",
    "setting": {
      "urlCheck": false
    }
  }
}
```

3. **创建云函数目录**
```
mkdir -p cloudfunctions
```

### 步骤3：建立基础目录结构（10分钟）

```bash
# 创建目录
mkdir -p pages/home
mkdir -p pages/user  
mkdir -p pages/login
mkdir -p components
mkdir -p utils
mkdir -p static/images
mkdir -p cloudfunctions
```

### 步骤4：配置pages.json（5分钟）

```json
{
  "pages": [
    {
      "path": "pages/home/index",
      "style": {
        "navigationBarTitleText": "首页"
      }
    },
    {
      "path": "pages/user/index",
      "style": {
        "navigationBarTitleText": "我的"
      }
    },
    {
      "path": "pages/login/index",
      "style": {
        "navigationBarTitleText": "登录",
        "navigationStyle": "custom"
      }
    }
  ],
  "globalStyle": {
    "navigationBarTextStyle": "white",
    "navigationBarTitleText": "项目名称",
    "navigationBarBackgroundColor": "#000000",
    "backgroundColor": "#000000"
  },
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#D4AF37",
    "backgroundColor": "#111111",
    "borderStyle": "black",
    "list": [
      {
        "pagePath": "pages/home/index",
        "text": "首页"
      },
      {
        "pagePath": "pages/user/index",
        "text": "我的"
      }
    ]
  }
}
```

### 步骤5：设置全局样式（10分钟）

**uni.scss**：
```scss
// 主题色
$primary-color: #D4AF37;
$text-primary: #FFFFFF;
$text-secondary: #999999;
$bg-primary: #000000;
$bg-secondary: #111111;
$bg-card: #1a1a1a;

// 字体
$font-size-sm: 26rpx;
$font-size-base: 28rpx;
$font-size-lg: 32rpx;
$font-size-xl: 36rpx;

// 间距
$spacing-sm: 16rpx;
$spacing-base: 24rpx;
$spacing-lg: 32rpx;

// 圆角
$radius-base: 16rpx;
$radius-lg: 24rpx;
```

**App.vue**：
```vue
<script setup>
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('App Launch')
  
  // 初始化云开发（如果需要）
  // wx.cloud.init({ env: '您的环境ID' })
})
</script>

<style>
/* 全局样式 */
page {
  background-color: #000000;
  color: #FFFFFF;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 通用类 */
.page-container {
  min-height: 100vh;
  padding: 32rpx;
  box-sizing: border-box;
}

.card {
  background: #1a1a1a;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.btn-primary {
  background: linear-gradient(135deg, #D4AF37, #B8941F);
  color: #000000;
  border-radius: 16rpx;
  padding: 24rpx 48rpx;
  text-align: center;
  font-weight: 600;
}

.text-primary {
  color: #FFFFFF;
}

.text-secondary {
  color: #999999;
}

.text-gold {
  color: #D4AF37;
}
</style>
```

### 步骤6：创建首页（30分钟）

**pages/home/index.vue**：
```vue
<template>
  <view class="page-container">
    <!-- 头部欢迎 -->
    <view class="header">
      <text class="header__greeting">欢迎回来</text>
      <text class="header__name text-gold">{{ userName || '访客' }}</text>
    </view>
    
    <!-- 内容列表 -->
    <view class="content-list">
      <view 
        v-for="item in list" 
        :key="item.id" 
        class="card content-card"
        @tap="goDetail(item)"
      >
        <image 
          class="content-card__cover" 
          :src="item.cover" 
          mode="aspectFill"
        />
        <view class="content-card__info">
          <text class="content-card__title">{{ item.title }}</text>
          <text class="content-card__desc text-secondary">{{ item.desc }}</text>
        </view>
      </view>
    </view>
    
    <!-- 空状态 -->
    <view v-if="!list.length" class="empty-state">
      <text class="empty-state__text text-secondary">暂无内容</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const userName = ref('')
const list = ref([])

// 模拟数据（Demo阶段用）
const mockData = [
  {
    id: 1,
    title: '示例内容标题1',
    desc: '这是示例描述文字，展示卡片的基本布局效果',
    cover: 'https://picsum.photos/400/300?random=1'
  },
  {
    id: 2,
    title: '示例内容标题2',
    desc: '这是另一个示例内容的描述',
    cover: 'https://picsum.photos/400/300?random=2'
  },
  {
    id: 3,
    title: '示例内容标题3',
    desc: '点击卡片可以跳转到详情页面',
    cover: 'https://picsum.photos/400/300?random=3'
  }
]

onMounted(() => {
  loadData()
})

function loadData() {
  // Demo阶段直接使用模拟数据
  list.value = mockData
  
  // 正式版替换为云函数调用
  // const res = await wx.cloud.callFunction({ name: 'xxx', data: {} })
  // list.value = res.result.data
}

function goDetail(item) {
  uni.showToast({
    title: `点击了：${item.title}`,
    icon: 'none'
  })
  
  // 正式版跳转详情页
  // uni.navigateTo({ url: `/pages/detail/index?id=${item.id}` })
}
</script>

<style lang="scss" scoped>
.header {
  margin-bottom: 48rpx;
  
  &__greeting {
    display: block;
    font-size: 28rpx;
    color: #999999;
    margin-bottom: 8rpx;
  }
  
  &__name {
    font-size: 48rpx;
    font-weight: 700;
  }
}

.content-card {
  display: flex;
  gap: 24rpx;
  
  &__cover {
    width: 180rpx;
    height: 180rpx;
    border-radius: 16rpx;
    flex-shrink: 0;
  }
  
  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  
  &__title {
    font-size: 32rpx;
    font-weight: 600;
    margin-bottom: 12rpx;
    color: #FFFFFF;
  }
  
  &__desc {
    font-size: 26rpx;
    line-height: 1.5;
  }
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
  
  &__text {
    font-size: 28rpx;
  }
}
</style>
```

### 步骤7：创建"我的"页面（20分钟）

**pages/user/index.vue**：
```vue
<template>
  <view class="page-container">
    <!-- 用户信息卡片 -->
    <view class="user-card card">
      <view class="user-card__avatar-wrap">
        <image 
          class="user-card__avatar" 
          :src="userInfo.avatar || '/static/images/default-avatar.png'"
          mode="aspectFill"
        />
      </view>
      <view class="user-card__info">
        <text class="user-card__name">{{ userInfo.nickname || '未登录' }}</text>
        <text class="user-card__id text-secondary">{{ userInfo.uid || '点击登录' }}</text>
      </view>
      <view class="user-card__arrow">
        <text>›</text>
      </view>
    </view>
    
    <!-- 功能菜单 -->
    <view class="menu-section">
      <view 
        v-for="item in menuList" 
        :key="item.id" 
        class="menu-item card"
        @tap="handleMenu(item)"
      >
        <text class="menu-item__icon">{{ item.icon }}</text>
        <text class="menu-item__title">{{ item.title }}</text>
        <text class="menu-item__arrow">›</text>
      </view>
    </view>
    
    <!-- 退出按钮（已登录时显示） -->
    <view v-if="userInfo.uid" class="logout-btn" @tap="logout">
      <text>退出登录</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const userInfo = ref({
  avatar: '',
  nickname: '',
  uid: ''
})

const menuList = ref([
  { id: 1, icon: '📋', title: '我的订单', path: '/pages/orders/index' },
  { id: 2, icon: '❤️', title: '我的收藏', path: '/pages/favorites/index' },
  { id: 3, icon: '⚙️', title: '设置', path: '/pages/settings/index' },
  { id: 4, icon: '❓', title: '帮助与反馈', path: '/pages/help/index' }
])

function handleMenu(item) {
  uni.showToast({
    title: `点击了：${item.title}`,
    icon: 'none'
  })
  
  // 正式版跳转
  // uni.navigateTo({ url: item.path })
}

function logout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        uni.showToast({ title: '已退出', icon: 'none' })
        userInfo.value = {}
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.user-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 32rpx;
  
  &__avatar-wrap {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    overflow: hidden;
    border: 4rpx solid #D4AF37;
  }
  
  &__avatar {
    width: 100%;
    height: 100%;
  }
  
  &__info {
    flex: 1;
  }
  
  &__name {
    display: block;
    font-size: 36rpx;
    font-weight: 600;
    margin-bottom: 8rpx;
  }
  
  &__id {
    font-size: 26rpx;
  }
  
  &__arrow {
    font-size: 40rpx;
    color: #666666;
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  
  &__icon {
    font-size: 40rpx;
  }
  
  &__title {
    flex: 1;
    font-size: 30rpx;
  }
  
  &__arrow {
    font-size: 36rpx;
    color: #666666;
  }
}

.logout-btn {
  margin-top: 48rpx;
  text-align: center;
  color: #FF4D4F;
  font-size: 30rpx;
  padding: 24rpx;
}
</style>
```

### 步骤8：运行测试（10分钟）

1. **在HBuilderX中**：运行 → 运行到小程序模拟器 → 微信开发者工具

2. **检查点**：
   - [ ] 页面能正常显示
   - [ ] TabBar切换正常
   - [ ] 点击交互有响应
   - [ ] 样式符合预期

---

## 三、Demo检查清单

### UI/UX检查

- [ ] 配色是否和谐
- [ ] 字体大小是否合适
- [ ] 间距是否舒适
- [ ] 交互反馈是否明确
- [ ] 加载状态是否有提示

### 功能检查

- [ ] 核心流程是否跑通
- [ ] 页面跳转是否正常
- [ ] 数据展示是否正确（即使是假数据）
- [ ] 点击响应是否正常

### 兼容性检查

- [ ] iOS模拟器测试
- [ ] Android模拟器测试（如果有）
- [ ] 真机预览测试

---

## 四、与客户确认Demo

### 4.1 确认清单

发给客户时附带以下问题：

```markdown
## Demo确认问卷

### 整体风格
1. 整体配色（黑金风格）是否满意？ □满意 □需调整：______
2. 字体大小是否合适？ □合适 □太大 □太小
3. 有没有参考的其他风格？ ______

### 核心功能
4. 首页展示的内容是否是您想要的？ □是 □否，应该是：______
5. 操作流程是否清晰？ □清晰 □有疑惑的地方：______
6. 有没有遗漏的重要功能？ ______

### 下一步
7. 哪些功能最紧急需要完善？ ______
8. 其他建议：______
```

### 4.2 常见调整

| 客户反馈 | 调整方案 |
|---------|---------|
| 颜色不喜欢 | 调整uni.scss中的颜色变量 |
| 字体太小 | 调整字体大小变量 |
| 想要更圆润的感觉 | 增大圆角值 |
| 少了XX功能 | 评估优先级，加入开发计划 |

---

## 五、Demo升级为正式版

### 5.1 替换模拟数据

```javascript
// Demo版（模拟数据）
const list = ref(mockData)

// 正式版（云函数）
const list = ref([])
onMounted(async () => {
  const res = await wx.cloud.callFunction({
    name: 'content',
    data: { action: 'getList' }
  })
  list.value = res.result.data
})
```

### 5.2 添加登录功能

```javascript
// 检查登录状态
const checkLogin = () => {
  const token = uni.getStorageSync('token')
  if (!token) {
    uni.navigateTo({ url: '/pages/login/index' })
    return false
  }
  return true
}

// 需要登录的操作前调用
const handleAction = () => {
  if (!checkLogin()) return
  // 继续操作...
}
```

### 5.3 添加加载状态

```vue
<template>
  <!-- 骨架屏 -->
  <view v-if="loading" class="skeleton">
    <view class="skeleton-item" v-for="i in 3" :key="i"></view>
  </view>
  
  <!-- 实际内容 -->
  <view v-else>
    <!-- ... -->
  </view>
</template>

<script setup>
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  await loadData()
  loading.value = false
})
</script>
```

### 5.4 添加下拉刷新

**pages.json**：
```json
{
  "path": "pages/home/index",
  "style": {
    "enablePullDownRefresh": true
  }
}
```

**页面代码**：
```javascript
import { onPullDownRefresh } from '@dcloudio/uni-app'

onPullDownRefresh(async () => {
  await loadData()
  uni.stopPullDownRefresh()
})
```

---

## 六、常用代码片段

### 6.1 云函数调用

```javascript
async function callCloud(name, data) {
  try {
    uni.showLoading({ title: '加载中' })
    const res = await wx.cloud.callFunction({ name, data })
    if (res.result?.success) {
      return res.result.data
    }
    throw new Error(res.result?.message || '请求失败')
  } catch (error) {
    uni.showToast({ title: error.message, icon: 'none' })
    throw error
  } finally {
    uni.hideLoading()
  }
}
```

### 6.2 分页加载

```javascript
const list = ref([])
const page = ref(1)
const hasMore = ref(true)
const loading = ref(false)

async function loadMore() {
  if (loading.value || !hasMore.value) return
  
  loading.value = true
  const newData = await callCloud('content', {
    action: 'getList',
    page: page.value,
    pageSize: 10
  })
  
  list.value = [...list.value, ...newData]
  hasMore.value = newData.length === 10
  page.value++
  loading.value = false
}
```

### 6.3 图片预览

```javascript
function previewImage(current, urls) {
  uni.previewImage({
    current,
    urls
  })
}
```

---

**文档版本**：v1.0  
**创建时间**：2026-02-06
