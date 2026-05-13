import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface UserInfo {
  id: string
  username: string
  email: string
  avatar?: string
  balance: number
}

export const useUserStore = defineStore(
  'user',
  () => {
    // 响应式状态
    const userInfo = ref<UserInfo | null>(null)
    const token = ref('')

    // 计算属性（替代 getters）
    const isLoggedIn = computed(() => !!token.value && !!userInfo.value)

    // 方法（替代 actions）
    function setUserInfo(user: UserInfo) {
      userInfo.value = user
    }

    function setToken(newToken: string) {
      token.value = newToken
    }

    function logout() {
      userInfo.value = null
      token.value = ''
    }

    function updateBalance(balance: number) {
      if (userInfo.value) {
        userInfo.value = { ...userInfo.value, balance }
      }
    }

    return {
      // 状态
      userInfo,
      token,
      // 计算属性
      isLoggedIn,
      // 方法
      setUserInfo,
      setToken,
      logout,
      updateBalance,
    }
  },
  {
    // 持久化配置保持不变
    persist: {
      pick: ['userInfo', 'token'],
    },
  },
)
