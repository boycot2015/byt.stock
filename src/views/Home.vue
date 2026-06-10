<template>
  <div class="app min-h-screen">
    <div class="max-w-full md:max-w-6xl lg:max-w-[1280px] mx-auto p-4">
      <MarketIndex />
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="col-span-1 md:col-span-3">
          <StockDetail />
        </div>
        <div class="hidden md:block md:col-span-2 lg:col-span-1">
          <SelfStockList />
        </div>
      </div>
      <a-tabs v-if="isFound" class="bg-[var(--color-bg)] !mb-4" :tabBarStyle="{
        backgroundColor: 'var(--color-bg)',
        padding: '0 10px',
        marginBottom: '0px',
      }">
        <a-tab-pane tab="动态" key="news">
          <StockNews :default-code="currentStockCode" class="!p-0" />
        </a-tab-pane>
        <a-tab-pane tab="成分股" key="holdings">
          <Holdings :code="currentStockCode" />
        </a-tab-pane>
      </a-tabs>
      <StockNews v-else :default-code="currentStockCode" class="mb-4" />
      <MarketRank />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarketIndex from '@/components/MarketIndex.vue'
import SelfStockList from '@/components/SelfStockList.vue'
import StockDetail from '@/components/StockDetail.vue'
import Holdings from '@/components/Holdings.vue'
import MarketRank from '@/components/MarketRank.vue'
import StockNews from '@/components/StockNews.vue'
import { useStockStore } from '@/store/stock'

const stockStore = useStockStore()
const currentStockCode = computed(() => stockStore.currentStockCode)
const isFound = computed(() => currentStockCode.value && ['00', '15', '16', '51', '52', '58'].includes(currentStockCode.value.slice(0, 2)))
</script>
