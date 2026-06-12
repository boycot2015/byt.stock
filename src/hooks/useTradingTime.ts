import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getHoliday } from '@/api/stock'

export function useTradingTime() {
  const isHolidayToday = ref(false)
  const holidayCheckTimer = ref<number | null>(null)

  const checkHoliday = async (date?: string) => {
    try {
      const response = await getHoliday(date || new Date().toISOString().split('T')[0])
      if (response) {
        isHolidayToday.value = response.isHoliday
      }
    } catch (e) {
      console.log('获取节假日信息失败:', e)
      isHolidayToday.value = false
    }
  }

  const isTradingTime = computed(() => {
    if (isHolidayToday.value) {
      return false
    }
    const now = new Date()
    const dayOfWeek = now.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false
    }
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const totalMinutes = hours * 60 + minutes
    const morningStart = 9 * 60 + 30
    const morningEnd = 11 * 60 + 30
    const afternoonStart = 13 * 60
    const afternoonEnd = 15 * 60
    return (totalMinutes >= morningStart && totalMinutes <= morningEnd) || (totalMinutes >= afternoonStart && totalMinutes <= afternoonEnd)
  })

  const getPollInterval = computed(() => {
    return isTradingTime.value ? 15000 : 600000
  })

  const startHolidayCheck = () => {
    if (holidayCheckTimer.value) {
      clearInterval(holidayCheckTimer.value)
    }
    holidayCheckTimer.value = window.setInterval(() => {
      checkHoliday()
    }, 3600000)
  }

  onMounted(() => {
    checkHoliday()
    startHolidayCheck()
  })

  onUnmounted(() => {
    if (holidayCheckTimer.value) {
      clearInterval(holidayCheckTimer.value)
      holidayCheckTimer.value = null
    }
  })

  return {
    isHolidayToday,
    isTradingTime,
    getPollInterval,
    checkHoliday,
  }
}
