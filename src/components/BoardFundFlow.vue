<template>
  <div class="board-fund-flow p-4 shadow-sm mb-4 bg-[var(--color-bg)]">
    <!-- 板块类型 + 时间周期 切换 -->
    <div class="flex flex-wrap justify-between items-center !mb-3 gap-2">
      <div class="flex items-center gap-2">
        <span v-for="tab in sectorTabs" :key="tab.value"
          class="px-3 py-1 text-sm cursor-pointer rounded-full transition-colors"
          :class="currentSector === tab.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="changeSector(tab.value)">
          {{ tab.label }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <span v-for="tab in periodTabs" :key="tab.value"
          class="px-3 py-1 text-sm cursor-pointer rounded transition-colors"
          :class="currentPeriod === tab.value ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="changePeriod(tab.value)">
          {{ tab.label }}
        </span>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-gray-500 border-b border-[var(--border-color)]">
            <th class="text-left py-2 px-2 font-medium w-10">#</th>
            <th class="text-left py-2 px-2 font-medium">板块名称</th>
            <th class="text-right py-2 px-2 font-medium">今日涨跌幅</th>
            <th class="text-right py-2 px-2 font-medium">主力净流入(亿)</th>
            <th class="text-right py-2 px-2 font-medium">净占比</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.序号"
            class="border-b border-[var(--border-color)] hover:bg-[var(--hover-bg)]">
            <td class="py-2 px-2 text-gray-400">{{ item.序号 }}</td>
            <td class="py-2 px-2">
              <div class="font-medium">{{ item.名称 }}</div>
              <div class="text-xs text-gray-400">{{ item.板块类型 }}</div>
            </td>
            <td class="py-2 px-2 text-right" :class="item.今日涨跌幅 >= 0 ? 'text-red-500' : 'text-green-500'">
              {{ item.今日涨跌幅 >= 0 ? '+' : '' }}{{ item.今日涨跌幅.toFixed(2) }}%
            </td>
            <td class="py-2 px-2 text-right font-medium"
              :class="item['今日主力净流入-净额'] >= 0 ? 'text-red-500' : 'text-green-500'">
              {{ item['今日主力净流入-净额'] >= 0 ? '+' : '' }}{{ (item['今日主力净流入-净额'] / 1e8).toFixed(2) }}
            </td>
            <td class="py-2 px-2 text-right" :class="item['今日主力净流入-净占比'] >= 0 ? 'text-red-500' : 'text-green-500'">
              {{ item['今日主力净流入-净占比'] >= 0 ? '+' : '' }}{{ item['今日主力净流入-净占比'].toFixed(2) }}%
            </td>
          </tr>
          <tr v-if="!list.length">
            <td colspan="5" class="text-center py-8 text-gray-400">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getBoardFundFlow, type BoardFundFlowItem } from '@/api/stock'
import { useTradingTime } from '@/hooks/useTradingTime'

const { getPollInterval } = useTradingTime()

const sectorTabs = [
  { label: '行业', value: '行业资金流' },
  { label: '概念', value: '概念资金流' },
  { label: '地域', value: '地域资金流' },
]
const periodTabs = [
  { label: '今日', value: '今日' },
  { label: '5日', value: '5日' },
  { label: '10日', value: '10日' },
]

const currentSector = ref('行业资金流')
const currentPeriod = ref('今日')
const list = ref<BoardFundFlowItem[]>([])

const fetchData = async () => {
  list.value = await getBoardFundFlow(currentSector.value, currentPeriod.value)
}

const changeSector = (sector: string) => {
  currentSector.value = sector
  fetchData()
}
const changePeriod = (period: string) => {
  currentPeriod.value = period
  fetchData()
}

onMounted(() => {
  fetchData()
  setInterval(fetchData, getPollInterval.value)
})
</script>
