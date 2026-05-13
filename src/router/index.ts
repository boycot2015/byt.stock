import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { guest: true, title: '登录' },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/Register.vue'),
      meta: { guest: true, title: '注册' },
    },
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/Home.vue'),
      meta: { requiresAuth: true, title: '数据看板' },
    },
    {
      path: '/News',
      name: 'News',
      component: () => import('@/views/News.vue'),
      meta: { requiresAuth: true, title: '资讯' },
    },
    {
      path: '/SelfStock',
      name: 'SelfStock',
      component: () => import('@/views/SelfStock.vue'),
      meta: { requiresAuth: true, title: '自选股' },
    },
    {
      path: '/MarketRank',
      name: 'MarketRank',
      component: () => import('@/views/MarketRank.vue'),
      meta: { requiresAuth: true, title: '市场排名' },
    },
  ],
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  document.title = '股票行情-' + (to.meta.title ? to.meta.title : '数据看板')
  if (to.meta.requiresAuth && !userStore.token) {
    next({ name: 'Login' })
  } else if (to.meta.guest && userStore.token) {
    next({ name: 'Home' })
  } else {
    next()
  }
})

export default router
