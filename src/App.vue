<template>
  <a-config-provider :locale="zhCN" :theme="{
    algorithm: isDark ? [darkAlgorithm] : [],
  }">
    <a-layout :style="{
      '--primary-bg': themeToken.colorPrimaryBg,
      '--success-bg': themeToken.colorSuccessBg,
      '--color-text': themeToken.colorText,
      '--error-bg': themeToken.colorErrorBg,
      '--hover-bg': themeToken.colorBgLayout,
      '--color-bg': themeToken.colorBgContainer,
      '--color-primary': themeToken.colorPrimary,
      '--border-color': themeToken.colorBorderSecondary
    }">
      <a-affix top="0px" v-if="userStore.token">
        <Header />
      </a-affix>
      <router-view />
      <Footer />
      <a-affix :style="{ position: 'fixed', bottom: '50px', right: '10px' }" @click="toggleDark">
        <a-button type="link">
          <icon class="text-[var(--color-primary)]" v-if="!isDark">
            <template #component>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE -->
                <path fill="currentColor"
                  d="m15 8l-3-3l3-3l3 3zm5 3l-2-2l2-2l2 2zm-7.925 11q-2.1 0-3.937-.8t-3.2-2.162t-2.163-3.2t-.8-3.938q0-3.65 2.325-6.437T10.225 2q-.45 2.475.275 4.838t2.5 4.137t4.138 2.5t4.837.275q-.65 3.6-3.45 5.925T12.075 22m0-2q2.2 0 4.075-1.1t2.95-3.025q-2.15-.2-4.075-1.088t-3.45-2.412t-2.425-3.45T8.075 4.85Q6.15 5.925 5.063 7.813T3.975 11.9q0 3.375 2.363 5.738T12.075 20m-.5-7.625" />
              </svg>
            </template>
          </icon>
          <icon class="text-[var(--color-primary)]" v-else>
            <template #component>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE -->
                <path fill="currentColor"
                  d="M11 3V2q0-.425.288-.712T12 1t.713.288T13 2v1q0 .425-.288.713T12 4t-.712-.288T11 3m0 19v-1q0-.425.288-.712T12 20t.713.288T13 21v1q0 .425-.288.713T12 23t-.712-.288T11 22m11-9h-1q-.425 0-.712-.288T20 12t.288-.712T21 11h1q.425 0 .713.288T23 12t-.288.713T22 13M3 13H2q-.425 0-.712-.288T1 12t.288-.712T2 11h1q.425 0 .713.288T4 12t-.288.713T3 13m16.75-7.325l-.35.35q-.275.275-.687.275T18 6q-.275-.275-.288-.687t.263-.713l.375-.375q.275-.3.7-.3t.725.3t.288.725t-.313.725M6.025 19.4l-.375.375q-.275.3-.7.3t-.725-.3t-.288-.725t.313-.725l.35-.35q.275-.275.688-.275T6 18q.275.275.288.688t-.263.712m12.3.35l-.35-.35q-.275-.275-.275-.687T18 18q.275-.275.688-.287t.712.262l.375.375q.3.275.3.7t-.3.725t-.725.288t-.725-.313M4.6 6.025l-.375-.375q-.3-.275-.3-.7t.3-.725t.725-.288t.725.313l.35.35q.275.275.275.688T6 6q-.275.275-.687.288T4.6 6.025M7.75 16.25Q6 14.5 6 12t1.75-4.25T12 6t4.25 1.75T18 12t-1.75 4.25T12 18t-4.25-1.75m7.088-1.412Q16 13.675 16 12t-1.162-2.838T12 8T9.162 9.163T8 12t1.163 2.838T12 16t2.838-1.162M12 12" />
              </svg>
            </template>
          </icon>
        </a-button>
      </a-affix>
    </a-layout>
  </a-config-provider>
</template>

<script setup lang="ts">
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import { useDark } from '@vueuse/core';
import { useUserStore } from '@/store/user';
import Icon from '@ant-design/icons-vue';
import { useTheme } from '@/hooks/useTheme';
const userStore = useUserStore()
const { themeToken, darkAlgorithm } = useTheme()
const isDark = useDark();
const toggleDark = () => isDark.value = !isDark.value

</script>
<style scoped>
#app {
  width: 100%;
  height: 100%;
  margin: 0 auto;
}
</style>
