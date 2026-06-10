<template>
  <!-- 桌面端导航模式（默认） -->
  <div v-if="mode === 'desktop'" class="nav md:flex hidden items-center space-x-8">
    <span v-for="item in navItems" :key="item.route" class="cursor-pointer flex items-center"
      :class="{ 'text-blue-600 font-medium': route.name === item.route }" @click="onClick(item)">
      <component :is="item.icon" class="mr-1" /> {{ item.label }}
    </span>
    <div class="hidden md:block">
      <ThemeSwitch />
    </div>
    <a-avatar :src="userStore.userInfo?.avatar">
      <template #icon>
        <UserOutlined />
      </template>
    </a-avatar>
    <a-button type="link" @click="emit('logout')">退出登录</a-button>
  </div>

  <!-- 移动端底部导航模式 -->
  <div v-else class="flex justify-between items-center w-full">
    <span v-for="item in navItems" :key="item.route" class="flex flex-col items-center cursor-pointer"
      :class="{ 'text-blue-600 font-medium': route.name === item.route }" @click="onClick(item)">
      <component :is="item.icon" class="text-xl mb-1" />
      <span class="text-xs">{{ item.mobileLabel || item.label }}</span>
    </span>
    <span class="flex flex-col items-center cursor-pointer" @click="$emit('logout')">
      <UserOutlined class="text-xl mb-1" />
      <span class="text-xs">退出</span>
    </span>
  </div>
</template>

<script lang="ts" setup>
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import LineChartOutlined from '@ant-design/icons-vue/LineChartOutlined'
import StarOutlined from '@ant-design/icons-vue/StarOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import ThemeSwitch from './ThemeSwitch.vue'
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 统一导航配置，无冗余，两端共用
const navItems = [
  { label: '行情', icon: LineChartOutlined, route: 'Home' },
  { label: '自选股票/ETF', mobileLabel: '自选', icon: StarOutlined, route: 'SelfStock' },
  // { label: '排名', icon: FileTextOutlined, route: 'MarketRank' },
  { label: '资讯', icon: FileTextOutlined, route: 'News' },
]
const onClick = (item: { route: string }) => {
  router.push({ name: item.route })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
// 定义模式，支持桌面端/移动端底部导航
defineProps({
  mode: {
    type: String as () => 'desktop' | 'mobile',
    default: 'desktop',
  },
})

// 暴露退出登录事件给父组件
const emit = defineEmits(['logout'])
</script>
