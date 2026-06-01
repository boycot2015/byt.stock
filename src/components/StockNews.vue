<template>
  <div class="stock-news p-4 shadow-sm bg-[var(--color-bg)]">
    <template v-if="!defaultCode">
      <h3 class="text-lg font-medium !mb-4">个股动态</h3>
      <div class="search-stock mb-4">
        <a-input v-model:value="stockCode" placeholder="输入股票代码" class="w-full" @pressEnter="fetchStockNews" />
        <a-button type="primary" block @click="fetchStockNews" class="!mt-2">
          查询
        </a-button>
      </div>

      <div v-if="stockNewsData" class="stock-info mb-4 p-3 bg-[var(--hover-bg)] rounded">
        <div class="flex justify-between items-center mb-2">
          <span class="font-medium">{{ stockNewsData.stock?.name }}</span>
          <span class="text-sm text-gray-500">{{ stockNewsData.stock?.code }}</span>
        </div>
        <div class="flex items-center gap-4" v-if="stockNewsData.stock">
          <span :class="[
            'text-xl font-medium',
            stockNewsData.stock?.change >= 0 ? 'text-red-500' : 'text-green-500',
          ]">
            {{ stockNewsData.stock?.price.toFixed(2) }}
          </span>
          <span :class="stockNewsData.stock?.change >= 0 ? 'text-red-500' : 'text-green-500'">
            {{ stockNewsData.stock?.change >= 0 ? '+' : '' }}
            {{ stockNewsData.stock?.changePercent.toFixed(2) }}%
          </span>
        </div>
      </div>
    </template>

    <div class="stock-news-list">
      <div v-for="news in stockNewsList" :key="news.id"
        class="p-3 border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--hover-bg)] cursor-pointer transition-colors"
        @click="openNews(news)">
        <h4 class="text-sm flex-1 font-medium line-clamp-2 mb-1">{{ news.title }}</h4>
        <div class="flex justify-between gap-2">
          <span class="text-xs text-gray-400">{{ news.publishTime }}</span>
          <span class="text-xs text-gray-400">{{ news.source }}</span>
        </div>
      </div>
      <div v-if="stockNewsList.length === 0" class="text-center py-4 text-gray-500 text-sm">
        请输入股票代码查询
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getStockNews, type NewsItem, type StockNewsData } from '@/api/stock'
import { message } from 'ant-design-vue'

const props = defineProps({
  defaultCode: {
    type: String,
    default: '',
  },
})

const stockCode = ref(props.defaultCode || '399006')
const stockNewsData = ref<StockNewsData | null>(null)
const stockNewsList = computed(() => stockNewsData.value?.list || [])

watch(() => props.defaultCode, (newCode) => {
  if (newCode) {
    stockCode.value = newCode
    fetchStockNews()
  }
})

const fetchStockNews = async () => {
  if (!stockCode.value || !/^\d{6}$/.test(stockCode.value)) {
    message.error('请输入有效的6位股票代码')
    return
  }
  try {
    const data = await getStockNews(stockCode.value, 10)
    stockNewsData.value = data
  } catch (error) {
    message.error('获取个股新闻失败')
  }
}

const openNews = (news: NewsItem) => {
  if (news.url) {
    window.open(news.url, '_blank')
  }
}

if (stockCode.value) {
  fetchStockNews()
}
</script>
