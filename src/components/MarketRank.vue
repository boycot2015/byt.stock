<template>
  <div class="market-rank p-4 shadow-sm bg-[var(--color-bg)]">
    <div class="tabs flex border-b border-[var(--border-color)] mb-3">
      <span v-for="tab in tabs" :key="tab.value" class="pb-2 px-4 cursor-pointer text-sm font-medium"
        :class="{ 'border-b-2 border-blue-600 text-blue-600': currentTab === tab.value }" @click="changeTab(tab.value)">
        {{ tab.label }}
      </span>
    </div>
    <div class="rank-list">
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div v-for="item in rankList" :key="item.code"
          class="rank-item p-3 border-b border-[var(--border-color)] hover:bg-[var(--hover-bg)] cursor-pointer flex justify-between items-center"
          @click="handleClick(item)">
          <div class="flex items-center">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3"
              :class="item.rank <= 3 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'">
              {{ item.rank }}
            </span>
            <div class="flex flex-col justify-between gap-2">
              <div class="font-medium">{{ item.name }}</div>
              <div class="text-sm text-gray-500">{{ item.code }}</div>
            </div>
          </div>
          <div class="flex items-center">
            <div class="text-right mr-3">
              <span class="font-medium">{{ item.price.toFixed(2) }}</span>
              <span :class="item.changePercent >= 0 ? 'text-red-500' : 'text-green-500'"
                class="text-sm ml-3 font-medium"> {{ item.changePercent >= 0 ? '+' : '' }}{{
                  item.changePercent.toFixed(2) }}% </span>
            </div>
            <!-- 自选操作按钮 -->
            <a-button size="small" type="primary" ghost :danger="selectedStocks.includes(item.code)"
              @click.stop="toggleSelfStock(item)">
              {{ selectedStocks.includes(item.code) ? '已添加' : '+自选' }}
            </a-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getMarketRank, type RankItem, operateSelfStock } from '@/api/stock'
import { useStockStore } from '@/store/stock'
import { message } from 'ant-design-vue'
import request from '@/utils/request'

const tabs = [
  { label: '热门榜', value: 'amount' },
  { label: '飙升榜', value: 'increase' },
  // { label: '热门榜', value: 'decrease' },
  // { label: '换手率榜', value: 'turnover' }
]

const currentTab = ref('amount')
const rankList = ref<RankItem[]>([])
// 自选股状态管理
const selectedStocks = ref<string[]>([])

const fetchData = async () => {
  rankList.value = await getMarketRank(currentTab.value)
}

// 组件加载时获取已添加的自选股列表
const getSelfStocks = async () => {
  try {
    const res: any = await request({
      url: '/user/self-stocks',
      method: 'GET',
    })
    if (res) {
      selectedStocks.value = res.map((item: any) => item.code)
    }
  } catch (e) {
    console.error('获取自选股列表失败', e)
  }
}

// 切换自选股状态
const toggleSelfStock = async (item: RankItem) => {
  try {
    const isSelected = selectedStocks.value.includes(item.code)
    const action = isSelected ? 'delete' : 'add'
    let res = await operateSelfStock(item.code, action)
    if (res.success) {
      fetchData()
      message.success('操作成功')
    }

    // 更新本地状态
    if (isSelected) {
      selectedStocks.value = selectedStocks.value.filter((code) => code !== item.code)
    } else {
      selectedStocks.value.push(item.code)
    }
  } catch (e) {
    console.error('操作自选股失败', e)
  }
}

const changeTab = (tab: string) => {
  currentTab.value = tab
  fetchData()
}
const handleClick = (item: RankItem) => {
  useStockStore().setCurrentStockCode(item.code)
}
onMounted(() => {
  fetchData()
  getSelfStocks()
})
</script>
