<template>
  <a-auto-complete v-model="state.value" placeholder="输入股票代码/名称/拼音搜索" :filter-option="false" :options="state.data" @search="fetchUser" @select="handleSelect">
    <!-- 自定义搜索结果项：显示名称+代码 -->
    <template #option="{ value, label }">
      <span class="flex justify-between w-full items-center">
        <span class="font-medium">{{ label }}</span>
        <span class="text-gray-500 text-xs ml-4">{{ value }}</span>
      </span>
    </template>
    <!-- 空状态/加载状态 -->
    <template v-if="state.value" #notFoundContent>
      <div v-if="state.fetching" class="text-center py-1">
        <a-spin size="small" />
      </div>
      <div v-else class="text-center py-1 text-gray-400 text-sm">未找到相关股票</div>
    </template>
  </a-auto-complete>
</template>
<script lang="ts" setup>
import { reactive, watch } from 'vue'
import { searchStock } from '@/api/stock'
import { debounce } from '@/utils/index'

const emit = defineEmits({
  select: (code: string) => code,
})
let lastFetchId = 0

const state = reactive({
  data: [] as { label: string; value: string }[], // 定义data类型解决never错误
  value: '',
  fetching: false,
})

const fetchUser = debounce(async (value: string) => {
  if (!value.trim()) {
    state.data = []
    return
  }
  lastFetchId += 1
  const fetchId = lastFetchId
  state.data = []
  state.fetching = true
  try {
    const response = await searchStock(value.trim())
    if (fetchId !== lastFetchId) return
    const data = (response || []).map((stock: any) => ({
      label: stock.name,
      value: stock.code,
    }))
    state.data = data
    console.log('搜索股票成功', data)
  } catch (e) {
    console.error('搜索股票失败', e)
  } finally {
    state.fetching = false
  }
}, 300)

// 选择股票后跳转到详情
const handleSelect = (code: string) => {
  emit('select', code)
  state.value = state.data.find((item) => item.value === code)?.label || ''
}

watch(
  () => state.value,
  () => {
    state.data = []
    state.fetching = false
  },
)
</script>
