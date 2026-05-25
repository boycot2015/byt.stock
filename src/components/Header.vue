<template>
  <div class="header shadow-sm py-3 bg-[var(--color-bg)]">
    <div class="max-w-full md:max-w-6xl lg:max-w-[1280px] mx-auto px-4 flex items-center justify-between">
      <div class="search-box flex items-center w-full md:w-[auto] gap-2">
        <Search class="!w-full md:w-100 min-w-[260px] flex-1" @select="handleSelectStock" />
        <ThemeSwitch class="md:!hidden" />
      </div>
      <NavBar @logout="logout" />
    </div>
  </div>
</template>

<script setup lang="ts">
import router from '@/router'
import Search from './Search.vue'
import NavBar from './NavBar.vue'
import ThemeSwitch from './ThemeSwitch.vue'
import { useStockStore } from '@/store/stock'
import { useUserStore } from '@/store/user'
import { nextTick } from 'vue'
const userStore = useUserStore()
const stockStore = useStockStore()

const handleSelectStock = (code: string) => {
  stockStore.setCurrentStockCode(code) // 直接修改store状态，兼容没有set方法的情况
  router.push({ name: 'Home', params: { code } })
  nextTick(() => {
    const detailEl = document.querySelector('.stock-detail') as HTMLElement | null
    detailEl?.scrollIntoView({ behavior: 'smooth' })
  })
}

const logout = () => {
  userStore.logout()
  router.push({ name: 'Login' })
}
</script>
