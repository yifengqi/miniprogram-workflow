<template>
  <div class="app-container dark">
    <!-- 公共页面：无导航栏布局 -->
    <div v-if="isPublicPage" class="public-layout">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
    
    <!-- 管理页面：带侧边栏布局 -->
    <el-container v-else class="main-container">
      <!-- 侧边栏 -->
      <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar">
        <div class="logo">
          <el-icon :size="28"><Star /></el-icon>
          <span v-show="!isCollapse" class="logo-text">开发工作流</span>
        </div>
        
        <el-menu
          :default-active="currentRoute"
          :collapse="isCollapse"
          :router="true"
          class="sidebar-menu"
          background-color="transparent"
          text-color="#999"
          active-text-color="#D4AF37"
        >
          <el-menu-item index="/">
            <el-icon><HomeFilled /></el-icon>
            <span>项目首页</span>
          </el-menu-item>
          
          <el-menu-item index="/requirement-pool">
            <template #title>
              <span style="display: flex; align-items: center; gap: 8px;">
                <span>需求池</span>
                <el-badge 
                  v-if="poolStore.pendingCount > 0" 
                  :value="poolStore.pendingCount" 
                  :max="99"
                  style="margin-top: -2px;"
                />
              </span>
            </template>
            <el-icon><Inbox /></el-icon>
          </el-menu-item>
          
          <el-menu-item index="/prd">
            <el-icon><EditPen /></el-icon>
            <span>PRD生成</span>
          </el-menu-item>
          
          <el-menu-item index="/experience">
            <el-icon><Collection /></el-icon>
            <span>经验知识库</span>
          </el-menu-item>
          
          <el-menu-item index="/checklist">
            <el-icon><Finished /></el-icon>
            <span>检查清单</span>
          </el-menu-item>
          
          <el-menu-item index="/settings">
            <el-icon><Setting /></el-icon>
            <span>设置</span>
          </el-menu-item>
        </el-menu>
        
        <div class="collapse-btn" @click="isCollapse = !isCollapse">
          <el-icon>
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
        </div>
      </el-aside>
      
      <!-- 主内容区 -->
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useRequirementPoolStore } from '@/stores/requirementPool'  // ⭐ 新增

const route = useRoute()
const poolStore = useRequirementPoolStore()  // ⭐ 新增
const isCollapse = ref(false)

const currentRoute = computed(() => route.path)
const isPublicPage = computed(() => route.meta?.public === true)

// ⭐ 初始化需求池
onMounted(() => {
  poolStore.loadFromStorage()
})
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  background: var(--bg-primary);
}

.public-layout {
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.main-container {
  height: 100%;
}

.sidebar {
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--primary-color);
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
}

.logo-text {
  white-space: nowrap;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  padding-top: 10px;
}

.sidebar-menu .el-menu-item {
  margin: 4px 8px;
  border-radius: 8px;
}

.sidebar-menu .el-menu-item:hover {
  background: rgba(212, 175, 55, 0.1) !important;
}

.sidebar-menu .el-menu-item.is-active {
  background: rgba(212, 175, 55, 0.15) !important;
}

.collapse-btn {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  border-top: 1px solid var(--border-color);
  transition: color 0.3s;
}

.collapse-btn:hover {
  color: var(--primary-color);
}

.main-content {
  background: var(--bg-primary);
  padding: 24px;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
