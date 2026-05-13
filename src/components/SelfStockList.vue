<template>
  <div class="self-stock-list p-4 shadow-sm mb-4 bg-[var(--color-bg)]">
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-lg font-medium">自选股</h3>
      <span class="text-sm text-blue-600 cursor-pointer" @click="visible = true">+ 添加</span>
    </div>
    <div class="stock-list overflow-auto flex flex-col gap-2" :style="{ maxHeight: maxHeight }">
      <div v-for="item in stockList" :key="item.code"
        class="stock-item p-3 border-b border-[var(--border-color)] cursor-pointer hover:bg-[var(--hover-bg)] flex justify-between items-center"
        :class="item.code === currentCode ? 'bg-[var(--primary-bg)]' : ''" @click="handleSelectStock(item.code)">
        <div>
          <div class="flex items-center">
            <span class="font-medium mr-2">{{ item.name }}</span>
            <span class="text-sm text-gray-500">{{ item.code }}</span>
          </div>
          <div class="text-sm text-gray-500 mt-1">成交量: {{ (item.volume / 10000).toFixed(2) }}万手</div>
        </div>
        <div class="text-right">
          <span :class="item.change >= 0 ? 'text-red-500' : 'text-green-500'" class="text-lg font-medium">
            {{ item.price.toFixed(2) }}
          </span>
          <div class="mt-1">
            <span :class="item.change >= 0 ? 'text-red-500' : 'text-green-500'" class="text-sm"> {{ item.change >= 0 ?
              '+' : '' }}{{ item.change.toFixed(2) }} </span>
            <span :class="item.changePercent >= 0 ? 'text-red-500' : 'text-green-500'" class="text-sm ml-2"> {{
              item.changePercent >= 0 ? '+' : '' }}{{ item.changePercent.toFixed(2) }}% </span>
          </div>
        </div>
      </div>
    </div>
    <a-modal title="添加自选股" :open="visible" width="400px" @cancel="visible = false" @ok="handleAddStock">
      <Search style="width: 100%" @select="(code) => (selectedCode = code)" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getSelfStocks, type StockQuote, operateSelfStock } from '@/api/stock'
import { useStockStore } from '@/store/stock'
import Search from './Search.vue'
import { message } from 'ant-design-vue'
defineProps({
  maxHeight: {
    type: String,
    default: '370px',
  },
})
const visible = ref(false)
const selectedCode = ref('')
const stockStore = useStockStore()
const stockList = ref<StockQuote[]>([])
const currentCode = computed(() => stockStore.currentStockCode)

const fetchData = async () => {
  stockList.value = await getSelfStocks()
  stockStore.updateSelfStocks(stockList.value)
}
const handleAddStock = async () => {
  let res = await operateSelfStock(selectedCode.value, 'add')
  if (res.success) {
    fetchData()
    visible.value = false
    message.success('添加成功')
  }
}
const handleSelectStock = (code: string) => {
  stockStore.setCurrentStockCode(code)
  document.querySelector('.stock-detail')?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => {
  fetchData()
  setInterval(fetchData, 3000)
})
</script>
