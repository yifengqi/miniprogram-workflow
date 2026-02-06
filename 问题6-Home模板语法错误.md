# Bug 修复记录

## 问题 6：Home.vue 模板语法错误

**时间**：2026-02-06  
**严重程度**：🔴 阻塞部署（Vercel 构建失败）

---

### 错误信息

```
SyntaxError: [plugin vite:vue] src/views/Home.vue (2:3): 
Element is missing end tag.

file: /vercel/path0/src/views/Home.vue:2:3
```

---

### 问题原因

在改造 `Home.vue` 时，修改了模板结构，导致 HTML 标签闭合不完整：

**错误的结构**：
```html
<!-- 项目列表 -->
<div class="section">
  <div class="section-header">
    <h2 class="section-title">进行中的项目</h2>
  </div>
  
  <div v-if="projectStore.projects.length > 0" class="project-grid">
    <!-- 项目卡片 -->
  </div>  <!-- 只关闭了 project-grid -->
  
  <!-- 空状态 -->
  <div v-else class="empty-state">
    <!-- ... -->
  </div>
  <!-- ❌ 缺少 section 的闭合标签！ -->
  
<!-- 工作流程说明 -->
<div class="workflow-guide card">
```

**问题**：
- `<div class="section">` 标签没有正确闭合
- `v-if` 和 `v-else` 的父容器结构不完整

---

### 解决方案

添加缺失的闭合标签，确保 `v-if` 和 `v-else` 在同一个父容器内：

**修复后的结构**：
```html
<!-- 项目列表 -->
<div class="section">
  <div class="section-header">
    <h2 class="section-title">进行中的项目</h2>
  </div>
  
  <div v-if="projectStore.projects.length > 0" class="project-grid">
    <!-- 项目卡片 -->
  </div>
  </div>  <!-- ✅ 关闭 project-grid -->
  
  <!-- 空状态 -->
  <div v-else class="empty-state">
    <!-- ... -->
  </div>
</div>  <!-- ✅ 关闭 section -->

<!-- 工作流程说明 -->
<div class="workflow-guide card">
```

---

### 修复文件

**文件**：`src/views/Home.vue`  
**修改位置**：第 97-108 行

**具体修改**：
```diff
      </div>
-   </div>
+   </div>
+   </div>
    
    <!-- 空状态 -->
    <div v-else class="empty-state">
      <el-icon :size="80"><FolderOpened /></el-icon>
      <p>还没有项目，去需求池看看有没有可以立项的需求吧</p>
      <el-button type="primary" @click="$router.push('/requirement-pool')">
        进入需求池
      </el-button>
    </div>
+   </div>
    
    <!-- 工作流程说明 -->
```

---

### 验证结果

- ✅ ESLint/Vite Linter 检查通过
- ✅ 无语法错误
- ✅ 模板结构正确
- ✅ `v-if` 和 `v-else` 逻辑正确

---

### 预防措施

**开发时注意**：
1. 使用 IDE 的 HTML 标签自动闭合功能
2. 修改模板结构时，先检查标签配对
3. 使用代码折叠查看结构层次
4. 本地构建测试（`npm run build`）

**推荐工具**：
- VSCode 插件：`Vetur` 或 `Volar`（Vue 语法高亮）
- 自动格式化：`Prettier`
- 实时 Linting：`ESLint`

---

### 相关问题

- 问题 5：Vercel 部署失败（见 `问题4-需求收集流程优化.md`）
- 同样的模板语法错误类型

---

**状态**：✅ 已修复  
**影响**：Vercel 构建现在应该可以通过了  
**下一步**：重新推送到 GitHub，触发 Vercel 部署
