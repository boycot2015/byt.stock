<template>
  <div class="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-bold">登录您的账户</h2>
      <p class="mt-2 text-center text-sm">
        还没有账户？
        <router-link to="/register" class="font-medium text-blue-600 hover:text-blue-500"> 立即注册 </router-link>
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-[var(--color-bg)] py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <a-form :model="loginForm" layout="vertical" @finish="handleLogin">
          <a-form-item label="用户名/邮箱" name="username" :rules="[{ required: true, message: '请输入用户名/邮箱' }]">
            <a-input v-model:value="loginForm.username" size="large" placeholder="请输入用户名或邮箱" />
          </a-form-item>

          <a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
            <a-input-password v-model:value="loginForm.password" size="large" placeholder="请输入密码" />
          </a-form-item>

          <a-form-item>
            <a-button type="primary" html-type="submit" size="large" block :loading="loading"> 登录 </a-button>
          </a-form-item>
        </a-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import request from '@/utils/request'
import { useUserStore, type UserInfo } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const loginForm = ref({
  username: '',
  password: '',
})

const handleLogin = async () => {
  try {
    loading.value = true
    const res = await request<any, { token: string; user: UserInfo }>({
      url: '/user/login',
      method: 'POST',
      data: loginForm.value,
    })
    userStore.setToken(res.token)
    userStore.setUserInfo(res.user)
    message.success('登录成功')
    router.push({ name: 'Home' })
  } catch (err: any) {
    message.error(err?.msg || '登录失败，请检查用户名和密码')
  } finally {
    loading.value = false
  }
}
</script>
