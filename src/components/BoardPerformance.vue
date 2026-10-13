<template>
  <div v-if="loaded" class="board-performance p-4 shadow-sm mb-4 bg-[var(--color-bg)]">
    <div class="flex justify-between items-center !mb-3">
        <div class="flex items-center gap-4">
            <h3 class="text-lg font-medium">板块表现</h3>
            <!-- 视图切换：涨跌幅 / 主力净流入 -->
            <div class="flex gap-2">
              <span v-for="tab in tabs" :key="tab.value"
                class="px-4 py-1.5 text-sm cursor-pointer rounded-full transition-colors"
                :class="activeTab === tab.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                @click="activeTab = tab.value">
                {{ tab.label }}
              </span>
            </div>
        </div>
      <span class="text-sm text-gray-400 cursor-pointer hover:text-gray-600" @click="goMore">更多 &gt;</span>
    </div>
    <!-- 涨跌幅：涨跌各取前三，彩色网格 -->
    <div v-if="activeTab === 'change'" class="grid grid-cols-3 gap-2 md:gap-3">
      <div v-for="item in changeTiles" :key="`c-${item.序号}`"
        class="p-3 md:p-4 rounded-lg cursor-default transition-transform hover:scale-[1.02]"
        :class="item.今日涨跌幅 >= 0 ? 'bg-[var(--error-bg)]' : 'bg-[var(--success-bg)]'">
        <div class="font-medium truncate" :title="item.名称">{{ item.名称 }}</div>
        <div class="text-lg md:text-xl font-bold mt-1"
          :class="item.今日涨跌幅 >= 0 ? 'text-red-500' : 'text-green-500'">
          {{ fmtPercent(item.今日涨跌幅) }}
        </div>
      </div>
    </div>
    <!-- 主力净流入：流入/流出各取前三，柱状图 -->
    <div v-else class="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3 items-end">
      <div v-for="item in flowTiles" :key="`f-${item.序号}`" class="flex flex-col items-center min-w-0">
        <span class="text-sm font-medium !mb-1 whitespace-nowrap"
          :class="item['今日主力净流入-净额'] >= 0 ? 'text-red-500' : 'text-green-500'">
          {{ fmtYi(item['今日主力净流入-净额']) }}
        </span>
        <div class="w-full rounded-md transition-all"
          :style="{ height: barHeight(item) + 'px' }"
          :class="item['今日主力净流入-净额'] >= 0 ? 'bg-red-500' : 'bg-green-500'" />
        <span class="text-xs md:text-sm text-gray-600 mt-2 w-full text-center truncate" :title="item.名称">
          {{ item.名称 }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getBoardFundFlow, type BoardFundFlowItem } from '@/api/stock'
import { useTradingTime } from '@/hooks/useTradingTime'

const { getPollInterval } = useTradingTime()
const list = ref<BoardFundFlowItem[]>([])
const loaded = ref(false)
let timer: number | undefined

const tabs = [
  { label: '涨跌幅', value: 'change' },
  { label: '主力净流入', value: 'flow' }
] as const
const activeTab = ref<'change' | 'flow'>('change')

// 涨跌幅视图：涨幅前三 + 跌幅前三
const changeTiles = computed(() => {
  if (!list.value.length) return []
  const sorted = [...list.value].sort((a, b) => b.今日涨跌幅 - a.今日涨跌幅)
  return [...sorted.slice(0, 3), ...sorted.slice(-3)]
})

// 主力净流入视图：流入前三（降序）+ 流出前三（按流出额降序）
const flowTiles = computed(() => {
  if (!list.value.length) return []
  const sorted = [...list.value].sort(
    (a, b) => a['今日主力净流入-净额'] - b['今日主力净流入-净额']
  )
  return [...sorted.slice(-3).reverse(), ...sorted.slice(0, 3)]
})

// 柱高按 |净额| 归一化到 16px ~ 104px
const maxAbs = computed(() =>
  Math.max(...flowTiles.value.map((i) => Math.abs(i['今日主力净流入-净额'])), 1)
)
const barHeight = (item: BoardFundFlowItem) =>
  16 + Math.round((Math.abs(item['今日主力净流入-净额']) / maxAbs.value) * 88)

const fmtPercent = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
const fmtYi = (v: number) => `${v >= 0 ? '+' : ''}${(v / 1e8).toFixed(1)}亿`

const goMore = () => {
  document.getElementById('board-fund-flow')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const fetchData = async () => {
  try {
    list.value = (await getBoardFundFlow('行业资金流', '今日')) || []
  } catch {
    list.value = []
  }
  loaded.value = list.value.length > 0
}

onMounted(() => {
  fetchData()
  timer = window.setInterval(fetchData, getPollInterval.value)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
