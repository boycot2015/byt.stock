<template>
  <div class="header shadow-sm py-3 bg-[var(--color-bg)]">
    <div class="max-w-full md:max-w-6xl lg:max-w-[1280px] mx-auto px-4 flex items-center justify-between">
      <div class="search-box flex items-center w-full md:w-[auto]">
        <Search class="!w-full md:w-100" @select="handleSelectStock" />
      </div>
      <NavBar @logout="logout" />
    </div>
  </div>
</template>

<script setup lang="ts">
import router from '@/router'
import Search from './Search.vue'
import NavBar from './NavBar.vue'
import { useStockStore } from '@/store/stock'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const stockStore = useStockStore()

const handleSelectStock = (code: string) => {
  stockStore.setCurrentStockCode(code) // 直接修改store状态，兼容没有set方法的情况
  const detailEl = document.querySelector('.stock-detail') as HTMLElement | null
  detailEl?.scrollIntoView({ behavior: 'smooth' })
}

const logout = () => {
  userStore.logout()
  router.push({ name: 'Login' })
}
</script>
