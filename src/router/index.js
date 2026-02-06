import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '项目首页' }
  },
  {
    path: '/requirement',
    name: 'Requirement',
    component: () => import('@/views/RequirementForm.vue'),
    meta: { title: '需求收集' }
  },
  {
    path: '/prd',
    name: 'PRD',
    component: () => import('@/views/PRDGenerator.vue'),
    meta: { title: 'PRD生成' }
  },
  {
    path: '/experience',
    name: 'Experience',
    component: () => import('@/views/ExperienceLibrary.vue'),
    meta: { title: '经验知识库' }
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
