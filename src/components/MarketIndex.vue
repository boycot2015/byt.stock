<template>
  <div class="market-index p-4 shadow-sm mb-4 bg-[var(--color-bg)]">
    <h3 class="text-lg font-medium !mb-3">大盘指数</h3>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="item in indexList" :key="item.code"
        :class="item.change >= 0 ? 'bg-[var(--error-bg)]' : 'bg-[var(--success-bg)]'"
        class="index-item p-4 rounded-lg cursor-pointer hover:shadow-md transition-shadow" @click="handleClick(item)">
        <div class="flex justify-center md:justify-between items-center mb-2">
          <span class="font-medium">{{ item.name }}</span>
          <span class="text-sm text-gray-500 hidden md:block">{{ item.code }}</span>
        </div>
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
import { getMarketIndex, type MarketIndex as MarketIndexType } from '@/api/stock'
import { useStockStore } from '@/store/stock'
import { useTradingTime } from '@/hooks/useTradingTime'
import { useScroll } from '@/hooks/useScroll'
const { getPollInterval } = useTradingTime()
const { scrollToElement } = useScroll()
const stockStore = useStockStore()
const indexList = ref<MarketIndexType[]>([])

const fetchData = async () => {
  indexList.value = await getMarketIndex()
}
const handleClick = (item: MarketIndexType) => {
  stockStore.setCurrentStockCode(item.code.slice(-6))
  scrollToElement('.stock-detail')
}
onMounted(() => {
  fetchData()
  setInterval(fetchData, getPollInterval.value)
})
</script>
