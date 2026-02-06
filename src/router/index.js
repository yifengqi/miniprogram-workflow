import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '项目首页' }
  },
  {
    path: '/requirement-pool',  // ⭐ 新增：需求池
    name: 'RequirementPool',
    component: () => import('@/views/RequirementPool.vue'),
    meta: { title: '需求池' }
  },
  {
    path: '/public-form',
    name: 'PublicRequirement',
    component: () => import('@/views/PublicRequirement.vue'),
    meta: { title: '需求收集表', public: true }
  },
  {
    path: '/prd',
    name: 'PRD',
    component: () => import('@/views/PRDGenerator.vue'),
    meta: { title: 'PRD生成' }
  },
  {
    path: '/demo',
    name: 'Demo',
    component: () => import('@/views/DemoViewer.vue'),
    meta: { title: 'Demo代码' }
  },
  {
    path: '/experience',
    name: 'Experience',
    component: () => import('@/views/ExperienceLibrary.vue'),
    meta: { title: '经验知识库' }
  },
  {
    path: '/experience-dashboard',  // ⭐ 新增：经验管理
    name: 'ExperienceDashboard',
    component: () => import('@/views/ExperienceDashboard.vue'),
    meta: { title: '经验管理' }
  },
  {
    path: '/checklist',
    name: 'Checklist',
    component: () => import('@/views/Checklist.vue'),
    meta: { title: '检查清单' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '设置' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || '工作流'} - 小程序开发`
  next()
})

export default router
