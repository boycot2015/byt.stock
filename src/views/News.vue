<template>
  <div class="app min-h-screen">
    <div class="max-w-full md:max-w-6xl lg:max-w-[1280px] mx-auto p-4">
      <div class="news-page">
        <div class="news-header p-4 shadow-sm mb-4 bg-[var(--color-bg)]">
          <h2 class="text-xl font-medium mb-4">财经资讯</h2>
          <div class="category-tabs flex flex-wrap gap-2">
            <button
              v-for="item in categories"
              :key="item.value"
              @click="currentCategory = item.value"
              :class="[
                'px-4 py-2 rounded-full text-sm transition-colors',
                currentCategory === item.value
                  ? 'bg-[var(--color-primary)] !text-[var(--hover-bg)]'
                  : 'hover:bg-[var(--hover-bg)]',
              ]"
            >
              {{ item.label }}
            </button>
          </div>
        </div>

        <div class="news-content grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="lg:col-span-2">
            <div class="news-list p-4 shadow-sm bg-[var(--color-bg)]">
              <div
                v-for="news in newsList"
                :key="news.id"
                class="news-item p-4 border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--hover-bg)] cursor-pointer transition-colors"
                @click="openNews(news)"
              >
                <div class="flex gap-4">
                  <div class="flex-1">
                    <h3 class="text-lg font-medium mb-2 line-clamp-2">{{ news.title }}</h3>
                    <p v-if="news.summary" class="text-sm text-gray-500 mb-2 line-clamp-2">
                      {{ news.summary }}
                    </p>
                    <div class="flex items-center gap-4 text-sm text-gray-400">
                      <span>{{ news.source }}</span>
                      <span>{{ formatTime(news.publishTime) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="loading" class="text-center py-8">
                <a-spin size="large" />
              </div>

              <div v-if="!loading && newsList.length === 0" class="text-center py-8 text-gray-500">
                暂无新闻数据
              </div>
            </div>

            <div v-if="!loading && newsList.length > 0" class="pagination mt-4 flex justify-center">
              <a-pagination
                :current="currentPage"
                :page-size="pageSize"
                :total="total"
                @change="handlePageChange"
              />
            </div>
          </div>

          <div class="lg:col-span-1">
            <div class="stock-news p-4 shadow-sm bg-[var(--color-bg)]">
              <h3 class="text-lg font-medium mb-4">个股动态</h3>
              <div class="search-stock mb-4">
                <a-input
                  v-model:value="stockCode"
                  placeholder="输入股票代码"
                  class="w-full"
                  @pressEnter="fetchStockNews"
                />
                <a-button type="primary" block @click="fetchStockNews" class="!mt-2">
                  查询
                </a-button>
              </div>

              <div v-if="stockNewsData" class="stock-info mb-4 p-3 bg-[var(--hover-bg)] rounded">
                <div class="flex justify-between items-center mb-2">
                  <span class="font-medium">{{ stockNewsData.stock?.name }}</span>
                  <span class="text-sm text-gray-500">{{ stockNewsData.stock?.code }}</span>
                </div>
                <div class="flex items-center gap-4">
                  <span
                    :class="[
                      'text-xl font-medium',
                      stockNewsData.stock?.change >= 0 ? 'text-red-500' : 'text-green-500',
                    ]"
                  >
                    {{ stockNewsData.stock?.price.toFixed(2) }}
                  </span>
                  <span
                    :class="stockNewsData.stock?.change >= 0 ? 'text-red-500' : 'text-green-500'"
                  >
                    {{ stockNewsData.stock?.change >= 0 ? '+' : '' }}
                    {{ stockNewsData.stock?.changePercent.toFixed(2) }}%
                  </span>
                </div>
              </div>

              <div class="stock-news-list">
                <div
                  v-for="news in stockNewsList"
                  :key="news.id"
                  class="p-3 border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--hover-bg)] cursor-pointer transition-colors"
                  @click="openNews(news)"
                >
                  <h4 class="text-sm font-medium line-clamp-2 mb-1">{{ news.title }}</h4>
                  <span class="text-xs text-gray-400">{{ news.source }}</span>
                </div>
                <div v-if="stockNewsList.length === 0" class="text-center py-4 text-gray-500 text-sm">
                  请输入股票代码查询
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { getNewsList, getStockNews, type NewsItem, type StockNewsData } from '@/api/stock'
import { message } from 'ant-design-vue'

const categories = [
  { label: '股票', value: 'stock' },
  { label: '基金', value: 'fund' },
  { label: '债券', value: 'bond' },
  { label: '外汇', value: 'forex' },
  { label: '期货', value: 'futures' },
  { label: '全球', value: 'global' },
  { label: '经济', value: 'economy' },
  { label: '公司', value: 'company' },
]

const currentCategory = ref('stock')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const loading = ref(false)
const newsList = ref<NewsItem[]>([])

const stockCode = ref('399006')
const stockNewsData = ref<StockNewsData | null>(null)
const stockNewsList = computed(() => stockNewsData.value?.list || [])
watch(currentCategory, () => fetchNews())
const fetchNews = async () => {
  loading.value = true
  try {
    const data = await getNewsList(currentCategory.value, currentPage.value, pageSize.value)
    newsList.value = data.list
    total.value = 999
  } catch (error) {
    message.error('获取新闻失败')
  } finally {
    loading.value = false
  }
}

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

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchNews()
}

const formatTime = (time: string) => {
  if (!time) return ''
  const date = new Date(time)
  if (isNaN(date.getTime())) return time
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return time.slice(0, 10)
}

const openNews = (news: NewsItem) => {
  if (news.url) {
    window.open(news.url, '_blank')
  }
}

onMounted(() => {
  fetchNews()
  fetchStockNews()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
