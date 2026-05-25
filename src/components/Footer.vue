<template>
  <!-- 底部导航 -->
  <div>
    <div
      class="footer md:hidden bg-[var(--color-bg)] w-full shadow-inner border-t border-[var(--border-color)] py-3 px-6 fixed bottom-0 left-0 right-0">
      <!-- 直接复用NavBar组件，传入mobile模式 -->
      <NavBar mode="mobile" @logout="handleLogout" />
    </div>
    <div class="h-20 md:hidden"></div>
  </div>
</template>

<script setup lang="ts">
import NavBar from './NavBar.vue'
import { useUserStore } from '@/store/user'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'

const userStore = useUserStore()
const router = useRouter()

const handleLogout = () => {
  userStore.logout()
  message.success('退出登录成功')
  router.replace({ name: 'Login' })
}
</script>
