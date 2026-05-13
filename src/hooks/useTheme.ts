import { computed } from 'vue'
import { theme } from 'ant-design-vue'
import { useDark } from '@vueuse/core'
export const useTheme = () => {
  const isDark = useDark()
  const { defaultAlgorithm, defaultSeed, darkAlgorithm } = theme
  const themeToken = computed(() => (isDark.value ? darkAlgorithm(defaultSeed) : defaultAlgorithm(defaultSeed)))
  return {
    themeToken,
    darkAlgorithm,
    defaultAlgorithm,
  }
}
