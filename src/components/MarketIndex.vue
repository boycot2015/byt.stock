<template>
  <div class="market-index p-4 shadow-sm mb-4 bg-[var(--color-bg)]">
    <div class="flex justify-between items-center !mb-3">
      <h3 class="text-lg font-medium">大盘指数</h3>
      <div class="flex items-center gap-2">
        <span v-for="tab in marketTabs" :key="tab.value"
          class="px-3 py-1 text-sm cursor-pointer rounded-full transition-colors"
          :class="currentMarket === tab.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="changeMarket(tab.value)">
          {{ tab.label }}
        </span>
        <a-button type="primary" size="small" @click="toggleSimple">{{ simple ? '预览' : '列表' }}</a-button>
      </div>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="item in indexList" :key="item.code"
        :class="item.change >= 0 ? 'bg-[var(--error-bg)]' : 'bg-[var(--success-bg)]'"
        class="index-item p-4 rounded-lg cursor-pointer hover:shadow-md transition-shadow" @click="handleClick(item)">
        <div class="flex justify-center md:justify-between items-center mb-2">
          <span class="font-medium">{{ item.name }}</span>
          <span class="text-sm text-gray-500 hidden md:block">{{ item.code }}</span>
        </div>
        <TimeChart :data="item.data || []" v-if="!simple && currentMarket === 'cn'" :simple="true" className="!h-15 md:!h-30" />
        <div class="flex items-center justify-between flex-col md:flex-row md:items-end">
          <span class="text-xl md:text-2xl font-bold">{{ item.price.toFixed(2) }}</span>
          <div class="text-right">
            <span :class="item.change >= 0 ? 'text-red-500' : 'text-green-500'" class="text-md md:text-lg font-medium">
              {{ item.change >= 0 ?
                '+' : '' }}{{ item.change.toFixed(2) }} </span>
            <span :class="item.changePercent >= 0 ? 'text-red-500' : 'text-green-500'" class="text-sm ml-2"> {{
              item.changePercent >= 0 ? '+' : '' }}{{ item.changePercent.toFixed(2) }}% </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getMarketIndex, getStockTimeKline, type MarketIndex as MarketIndexType } from '@/api/stock'
import { useStockStore } from '@/store/stock'
import { useTradingTime } from '@/hooks/useTradingTime'
import TimeChart from './TimeChart.vue'
const { getPollInterval } = useTradingTime()
const stockStore = useStockStore()
const indexList = ref<MarketIndexType[]>([])
const simple = ref(true)
const marketTabs = [
  { label: 'A股', value: 'cn' },
  { label: '港股', value: 'hk' },
  { label: '美股', value: 'us' },
]
const currentMarket = ref('cn')
const fetchData = async () => {
  indexList.value = await getMarketIndex(currentMarket.value)
  if (!simple.value && currentMarket.value === 'cn')
    await Promise.allSettled(indexList.value.map(async (item) => {
      const quote = await getStockTimeKline(item.code.slice(-6))
      item.data = quote || []
    }))
}
const handleClick = (item: MarketIndexType) => {
  // 仅 A 股指数可跳转到个股详情（代码取后 6 位）
  if (currentMarket.value === 'cn') {
    stockStore.setCurrentStockCode(item.code.slice(-6))
  }
}
const changeMarket = (market: string) => {
  currentMarket.value = market
  fetchData()
}
const toggleSimple = () => {
  simple.value = !simple.value
  !simple.value && fetchData()
}
onMounted(() => {
  fetchData()
  setInterval(fetchData, getPollInterval.value)
})
</script>
