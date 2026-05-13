<template>
  <div class="app min-h-screen">
    <div class="max-w-full md:max-w-6xl lg:max-w-[1280px] mx-auto p-4">
      <MarketIndex />
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="col-span-1 md:col-span-3">
          <StockDetail />
        </div>
        <div class="col-span-1 md:col-span-2 lg:col-span-1">
          <SelfStockList />
        </div>
      </div>
      <MarketRank />
    </div>
  </div>
</template>

<script setup lang="ts">
import MarketIndex from '@/components/MarketIndex.vue'
import SelfStockList from '@/components/SelfStockList.vue'
import StockDetail from '@/components/StockDetail.vue'
import MarketRank from '@/components/MarketRank.vue'
</script>
