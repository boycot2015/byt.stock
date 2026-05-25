import { computed } from 'vue'
import { theme } from 'ant-design-vue'
import { useDark as useDarkA } from '@vueuse/core'
export const useTheme = () => {
  const isDark = useDarkA()
  const { defaultAlgorithm, defaultSeed, darkAlgorithm } = theme

  const themeToken = computed(() => (isDark.value ? darkAlgorithm(defaultSeed) : defaultAlgorithm(defaultSeed)))
  return {
    isDark,
    themeToken,
    darkAlgorithm,
    defaultAlgorithm,
  }
}

export const useDark = () => {
  const isDark = useDarkA()
  const toggleDark = () => {
    isDark.value = !isDark.value
  }
  return {
    isDark,
    toggleDark,
  }
}
