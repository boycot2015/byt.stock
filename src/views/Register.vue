<template>
  <div class="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-bold">创建新账户</h2>
      <p class="mt-2 text-center text-sm">
        已有账户？
        <router-link to="/login" class="font-medium text-blue-600 hover:text-blue-500"> 立即登录 </router-link>
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-[var(--color-bg)] py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <a-form :model="registerForm" layout="vertical" @finish="handleRegister">
          <a-form-item label="用户名" name="username" :rules="[
            { required: true, message: '请输入用户名' },
            { min: 3, max: 20, message: '用户名长度3-20位' },
          ]">
            <a-input v-model:value="registerForm.username" size="large" placeholder="请输入用户名" />
          </a-form-item>

          <a-form-item label="邮箱" name="email" :rules="[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入正确的邮箱格式' },
          ]">
            <a-input v-model:value="registerForm.email" size="large" placeholder="请输入邮箱" />
          </a-form-item>

          <a-form-item label="密码" name="password" :rules="[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码长度至少6位' },
          ]">
            <a-input-password v-model:value="registerForm.password" size="large" placeholder="请输入密码" />
          </a-form-item>

          <a-form-item label="确认密码" name="confirmPassword" :rules="[
            { required: true, message: '请确认密码' },
            { validator: checkPassword, trigger: 'blur' },
          ]">
            <a-input-password v-model:value="registerForm.confirmPassword" size="large" placeholder="请再次输入密码" />
          </a-form-item>

          <a-form-item>
            <a-button type="primary" html-type="submit" size="large" block :loading="loading"> 注册 </a-button>
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
import axios from '@/utils/request'

const router = useRouter()
const loading = ref(false)
const registerForm = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const checkPassword = (_rule: any, value: string) => {
  if (value && value !== registerForm.value.password) {
    return Promise.reject(new Error('两次输入的密码不一致'))
  }
  return Promise.resolve()
}

const handleRegister = async () => {
  try {
    loading.value = true
    await axios.post('/user/register', {
      username: registerForm.value.username,
      email: registerForm.value.email,
      password: registerForm.value.password,
    })
    message.success('注册成功，请登录')
    router.replace({ name: 'Login' })
  } catch (err: any) {
    message.error(err.response?.data?.msg || '注册失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>
