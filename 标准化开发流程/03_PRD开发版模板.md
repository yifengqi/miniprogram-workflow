# 🔧 PRD开发版模板 - 技术需求文档

> 本文档给AI写代码时参考，包含完整的技术细节
> 目标：AI看完就能直接开始开发，减少来回确认

---

## 使用说明

**给AI的提示**：
- 包含所有技术实现细节
- 数据库设计要精确到字段
- 接口要定义清楚输入输出
- 包含错误处理和边界情况
- 参考星见项目的实践经验

---

# [项目名称] 技术需求文档

**版本**：v1.0  
**日期**：[日期]  
**技术栈**：UniApp + Vue3 + 微信云开发

---

## 一、技术架构

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        微信小程序                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              UniApp + Vue 3 + Composition API            │   │
│  │  pages/    components/    utils/    store/               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ wx.cloud.callFunction
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      微信云开发                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   云函数      │  │   云数据库    │  │   云存储      │          │
│  │  Node.js 18  │  │  MongoDB     │  │  文件/图片    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ (可选)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Web 管理后台                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │        Vue 3 + Element Plus + Vite                       │   │
│  │        @cloudbase/js-sdk (匿名登录)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                   部署到云开发静态托管                           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 技术选型

| 层级 | 技术栈 | 版本 | 说明 |
|------|--------|------|------|
| 小程序框架 | UniApp | 最新 | 跨平台开发框架 |
| 前端框架 | Vue 3 | 3.x | Composition API |
| 构建工具 | Vite | 5.x | 快速构建 |
| 云开发SDK | wx-server-sdk | ~2.6.3 | **必须用2.6.x** |
| Web后台UI | Element Plus | 2.6.x | 管理后台UI库 |
| Web云开发SDK | @cloudbase/js-sdk | 2.x | Web端调用云函数 |

### 1.3 项目目录结构

```
项目根目录/
├── pages/                    # 小程序页面
│   ├── home/                 # 首页
│   │   └── index.vue
│   ├── user/                 # 我的
│   │   └── index.vue
│   ├── login/                # 登录
│   │   └── index.vue
│   └── ...
│
├── components/               # 公共组件
│   ├── Toast.vue
│   ├── LoadingOverlay.vue
│   └── ...
│
├── utils/                    # 工具函数
│   ├── cloudRequest.js       # 云函数调用封装
│   ├── validate.js           # 验证函数
│   ├── security.js           # 安全函数
│   ├── cache.js              # 缓存管理
│   └── index.js              # 通用工具
│
├── store/                    # 状态管理
│   └── user.js               # 用户状态
│
├── static/                   # 静态资源
│   └── images/
│
├── cloudfunctions/           # 云函数
│   ├── [function-name]/
│   │   ├── index.js
│   │   ├── package.json
│   │   └── config.json
│   └── ...
│
├── admin-web/                # Web管理后台（可选）
│   ├── src/
│   │   ├── views/
│   │   ├── router/
│   │   ├── utils/
│   │   └── ...
│   └── ...
│
├── App.vue                   # 应用入口
├── main.js                   # 主入口
├── pages.json                # 页面配置
├── manifest.json             # 应用配置
├── uni.scss                  # 全局样式变量
└── vite.config.js            # Vite配置
```

---

## 二、数据库设计

### 2.1 集合清单

| 集合名 | 说明 | 权限 |
|--------|------|------|
| users | 用户表 | read: doc._id == auth.uid, write: false |
| [collection] | [说明] | [权限] |

### 2.2 users 用户表

```javascript
{
  _id: ObjectId,                     // MongoDB自动生成
  uid: String,                       // 业务主键，如 "XJ-12345678"
  openid: String,                    // 微信openid（唯一）
  unionid: String,                   // 微信unionid（可选）
  phone: String,                     // 手机号（可选，唯一）
  
  // 基本信息
  name: String,                      // 真实姓名
  nickname: String,                  // 昵称
  avatar: String,                    // 头像URL
  gender: Number,                    // 性别 0未知 1男 2女
  
  // 角色权限
  role: Number,                      // 角色 1普通用户 6领队 9管理员
  status: String,                    // 状态 active/disabled
  
  // 统计字段
  order_count: Number,               // 订单数
  
  // 时间戳
  created_at: Date,                  // 创建时间
  updated_at: Date,                  // 更新时间
  last_login_at: Date,               // 最后登录时间
  
  // 软删除
  deleted: Boolean,                  // 是否删除
  deleted_at: Date                   // 删除时间
}
```

**索引**：
```javascript
// 唯一索引
{ openid: 1 } unique
{ uid: 1 } unique
{ phone: 1 } unique sparse

// 查询索引
{ role: 1, status: 1 }
{ deleted: 1 }
```

### 2.3 [其他集合]

> 按相同格式补充其他数据库集合设计

---

## 三、云函数设计

### 3.1 云函数清单

| 云函数名 | 说明 | 操作列表 |
|---------|------|---------|
| login | 登录相关 | wxLogin, phoneLogin, getToken |
| user | 用户管理 | getInfo, updateInfo, getList |
| [name] | [说明] | [操作列表] |

### 3.2 云函数标准格式

**目录结构**：
```
cloudfunctions/[function-name]/
├── index.js          # 主入口
├── package.json      # 依赖配置
└── config.json       # 云函数配置
```

**package.json**（统一格式）：
```json
{
  "name": "function-name",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

**config.json**（统一格式）：
```json
{
  "permissions": {
    "openapi": []
  }
}
```
**注意**：不要包含 `"env": ""` 字段！

**index.js 模板**：
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 统一返回格式
const success = (data, message = '成功') => ({
  success: true,
  code: 200,
  message,
  data
})

const fail = (code, message, data = null) => ({
  success: false,
  code,
  message,
  data
})

exports.main = async (event, context) => {
  const { action, ...params } = event
  const { OPENID, UNIONID } = cloud.getWXContext()
  
  try {
    switch (action) {
      case 'action1':
        return await action1(params, OPENID)
      case 'action2':
        return await action2(params, OPENID)
      default:
        return fail(400, `未知操作: ${action}`)
    }
  } catch (error) {
    console.error('云函数错误:', error)
    return fail(500, error.message || '服务器错误')
  }
}

// 操作1
async function action1(params, openid) {
  // 参数验证
  const { param1, param2 } = params
  if (!param1) {
    return fail(400, '缺少参数 param1')
  }
  
  // 业务逻辑
  // ...
  
  return success({ result: '...' })
}
```

### 3.3 login 云函数

**操作列表**：

| 操作 | 说明 | 参数 | 返回 |
|------|------|------|------|
| wxLogin | 微信登录 | - | { isNewUser, userInfo } |
| phoneLogin | 手机号登录 | { code } | { userInfo } |
| register | 注册 | { phone, name } | { userInfo } |

**接口详细设计**：

```javascript
// wxLogin - 微信静默登录
// 输入：无（自动获取openid）
// 返回：
{
  success: true,
  data: {
    isNewUser: Boolean,     // 是否新用户
    userInfo: {             // 用户信息（已存在用户返回）
      uid: String,
      nickname: String,
      avatar: String,
      role: Number
    }
  }
}

// phoneLogin - 手机号快捷登录
// 输入：
{ 
  code: String              // button获取的code，用于解密手机号
}
// 返回：同 wxLogin
```

### 3.4 [其他云函数]

> 按相同格式补充其他云函数设计

---

## 四、页面设计

### 4.1 pages.json 配置

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
        "text": "首页",
        "iconPath": "static/tabbar/home.png",
        "selectedIconPath": "static/tabbar/home-active.png"
      },
      {
        "pagePath": "pages/user/index",
        "text": "我的",
        "iconPath": "static/tabbar/user.png",
        "selectedIconPath": "static/tabbar/user-active.png"
      }
    ]
  }
}
```

### 4.2 页面清单

| 路径 | 页面名 | 功能说明 | 涉及云函数 |
|------|--------|---------|-----------|
| pages/home/index | 首页 | 展示内容列表 | content.getList |
| pages/user/index | 我的 | 个人中心 | user.getInfo |
| pages/login/index | 登录 | 用户登录注册 | login.* |

### 4.3 页面详细设计

#### pages/home/index.vue

**功能**：
- 展示活动列表
- 下拉刷新
- 点击跳转详情

**数据**：
```javascript
const activities = ref([])      // 活动列表
const loading = ref(false)      // 加载状态
const hasMore = ref(true)       // 是否有更多
const page = ref(1)             // 当前页码
```

**方法**：
```javascript
loadData()        // 加载数据
onRefresh()       // 下拉刷新
onLoadMore()      // 触底加载更多
goDetail(id)      // 跳转详情
```

**UI结构**：
```
┌─────────────────────────────────┐
│  导航栏：首页                    │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │     活动卡片1            │   │
│  │  封面 | 标题 | 时间      │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │     活动卡片2            │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │     活动卡片3            │   │
│  └─────────────────────────┘   │
│                                 │
│       [加载更多...]            │
│                                 │
├─────────────────────────────────┤
│  TabBar                         │
└─────────────────────────────────┘
```

---

## 五、接口规范

### 5.1 云函数调用规范

**前端调用封装** (`utils/cloudRequest.js`)：
```javascript
export async function callCloud(name, data = {}) {
  try {
    const res = await wx.cloud.callFunction({
      name,
      data
    })
    
    if (res.result?.success) {
      return res.result.data
    } else {
      throw new Error(res.result?.message || '请求失败')
    }
  } catch (error) {
    console.error(`云函数 ${name} 调用失败:`, error)
    throw error
  }
}

// 使用示例
const userInfo = await callCloud('user', { action: 'getInfo' })
```

### 5.2 统一返回格式

```javascript
// 成功
{
  success: true,
  code: 200,
  message: '成功',
  data: { ... }
}

// 失败
{
  success: false,
  code: 400,           // 4xx 客户端错误，5xx 服务端错误
  message: '错误信息',
  data: null
}
```

### 5.3 错误码定义

| 错误码 | 含义 | 处理方式 |
|--------|------|---------|
| 200 | 成功 | 正常处理 |
| 400 | 参数错误 | 提示用户检查输入 |
| 401 | 未登录 | 跳转登录页 |
| 403 | 无权限 | 提示无权限 |
| 404 | 资源不存在 | 提示不存在 |
| 500 | 服务器错误 | 提示稍后重试 |

---

## 六、样式规范

### 6.1 CSS变量定义 (uni.scss)

```scss
// 颜色
$primary-color: #D4AF37;       // 主色（金色）
$text-primary: #FFFFFF;        // 主要文字
$text-secondary: #999999;      // 次要文字
$bg-primary: #000000;          // 主背景
$bg-secondary: #111111;        // 次背景
$bg-card: #1a1a1a;             // 卡片背景
$border-color: #333333;        // 边框颜色

// 字体大小
$font-size-xs: 22rpx;
$font-size-sm: 26rpx;
$font-size-base: 28rpx;
$font-size-lg: 32rpx;
$font-size-xl: 36rpx;
$font-size-xxl: 44rpx;

// 间距
$spacing-xs: 8rpx;
$spacing-sm: 16rpx;
$spacing-base: 24rpx;
$spacing-lg: 32rpx;
$spacing-xl: 48rpx;

// 圆角
$radius-sm: 8rpx;
$radius-base: 16rpx;
$radius-lg: 24rpx;
$radius-full: 50%;
```

### 6.2 BEM命名规范

```scss
// Block__Element--Modifier
.activity-card { }
.activity-card__title { }
.activity-card__title--highlight { }

.button { }
.button--primary { }
.button--disabled { }
```

### 6.3 通用组件样式

```scss
// 页面容器
.page-container {
  min-height: 100vh;
  background: $bg-primary;
  padding: $spacing-lg;
}

// 卡片
.card {
  background: $bg-card;
  border-radius: $radius-lg;
  padding: $spacing-lg;
  margin-bottom: $spacing-base;
}

// 按钮
.btn-primary {
  background: $primary-color;
  color: #000000;
  border-radius: $radius-base;
  padding: $spacing-base $spacing-lg;
  text-align: center;
}
```

---

## 七、安全规范

### 7.1 数据库权限

| 集合 | 读权限 | 写权限 | 说明 |
|------|--------|--------|------|
| users | 仅自己 | 仅云函数 | 用户只能读自己的信息 |
| activities | 所有人 | 仅云函数 | 活动公开可读 |
| orders | 仅自己 | 仅云函数 | 订单私密 |

**权限配置示例**：
```json
{
  "read": "doc._openid == auth.openid",
  "write": false
}
```

### 7.2 输入验证

```javascript
// 在云函数中验证参数
function validatePhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

function validateName(name) {
  if (!name || name.length < 2 || name.length > 20) {
    return false
  }
  return /^[\u4e00-\u9fa5a-zA-Z]+$/.test(name)
}

// 使用
if (!validatePhone(phone)) {
  return fail(400, '手机号格式不正确')
}
```

### 7.3 敏感数据脱敏

```javascript
// 手机号脱敏
function maskPhone(phone) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// 身份证脱敏
function maskIdCard(idCard) {
  return idCard.replace(/(\d{4})\d{10}(\d{4})/, '$1**********$2')
}
```

---

## 八、错误处理

### 8.1 前端错误处理

```javascript
// 统一错误处理
function handleError(error) {
  console.error('错误:', error)
  
  let message = '操作失败，请稍后重试'
  
  if (error.code === 401) {
    // 未登录，跳转登录
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  
  if (error.message) {
    message = error.message
  }
  
  uni.showToast({
    title: message,
    icon: 'none'
  })
}
```

### 8.2 云函数错误处理

```javascript
exports.main = async (event, context) => {
  try {
    // 业务逻辑
  } catch (error) {
    console.error('云函数错误:', error)
    
    // 记录错误日志（可选）
    await db.collection('error_logs').add({
      data: {
        function: 'functionName',
        error: error.message,
        stack: error.stack,
        event,
        created_at: db.serverDate()
      }
    })
    
    return fail(500, '服务器错误，请稍后重试')
  }
}
```

---

## 九、性能优化

### 9.1 数据库优化

- 建立必要的索引
- 使用 `field()` 只返回需要的字段
- 分页查询，每页10-20条
- 避免在循环中查询数据库

```javascript
// 好的做法
const res = await db.collection('users')
  .where({ status: 'active' })
  .field({ uid: true, nickname: true, avatar: true })
  .skip(page * 10)
  .limit(10)
  .get()

// 避免
for (const id of ids) {
  await db.collection('users').doc(id).get()  // 避免！
}

// 应该使用
const res = await db.collection('users')
  .where({ _id: _.in(ids) })
  .get()
```

### 9.2 前端优化

- 图片懒加载
- 骨架屏加载
- 分页加载
- 缓存常用数据

```javascript
// 缓存用户信息
const USER_CACHE_KEY = 'user_info'
const CACHE_DURATION = 5 * 60 * 1000  // 5分钟

async function getUserInfo() {
  const cached = uni.getStorageSync(USER_CACHE_KEY)
  if (cached && Date.now() - cached.time < CACHE_DURATION) {
    return cached.data
  }
  
  const data = await callCloud('user', { action: 'getInfo' })
  uni.setStorageSync(USER_CACHE_KEY, { data, time: Date.now() })
  return data
}
```

---

## 十、部署配置

### 10.1 小程序配置

**manifest.json 关键配置**：
```json
{
  "mp-weixin": {
    "appid": "您的AppID",
    "setting": {
      "urlCheck": false
    },
    "usingComponents": true
  }
}
```

### 10.2 云开发配置

**环境ID**：
```
cloud1-xxxxxxxxxx  // 替换为实际的环境ID
```

**云函数初始化**：
```javascript
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
```

### 10.3 Web后台部署配置

**vite.config.js**：
```javascript
export default defineConfig({
  plugins: [vue()],
  base: '/admin/',  // 部署子目录
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
```

**router/index.js**：
```javascript
const router = createRouter({
  history: createWebHistory('/admin/'),  // 与base一致
  routes
})
```

---

## 十一、开发检查清单

### 开始开发前
- [ ] 确认技术栈版本
- [ ] 创建项目目录结构
- [ ] 配置云开发环境
- [ ] 创建数据库集合并设置权限

### 每个功能开发后
- [ ] 参数验证完整
- [ ] 错误处理完善
- [ ] 代码有适当注释
- [ ] 在真机测试通过

### 提交前
- [ ] 检查console.log是否清理
- [ ] 检查硬编码的测试数据
- [ ] 检查敏感信息是否暴露
- [ ] 检查非功能性需求（见06_非功能性检查清单）

---

**文档版本**：v1.0  
**创建时间**：2026-02-06
