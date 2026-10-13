import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Stock {
  code: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  amount: number
  high: number
  low: number
  open: number
}
type Market = 'cn' | 'hk' | 'us'
export const useStockStore = defineStore(
  'stock',
  () => {
    const selfStocks = ref<Stock[]>([])
    const currentStockCode = ref('399006')
    const currentPeriod = ref('time')
    const currentMarket = ref<Market>('cn')
    function addSelfStock(stock: Stock) {
      const index = selfStocks.value.findIndex((item) => item.code === stock.code)
      if (index === -1) {
        selfStocks.value.push(stock)
      }
    }

    function removeSelfStock(code: string) {
      selfStocks.value = selfStocks.value.filter((item) => item.code !== code)
    }

    function setCurrentStockCode(code: string) {
      currentStockCode.value = code
    }

    function updateSelfStocks(stocks: Stock[]) {
      selfStocks.value = stocks
    }

    function setCurrentPeriod(period: string) {
      currentPeriod.value = period
    }
    function setCurrentMarket (market: Market) {
      currentMarket.value = market
    }
    return {
      selfStocks,
      currentStockCode,
      currentPeriod,
      currentMarket,
      addSelfStock,
      removeSelfStock,
      setCurrentPeriod,
      setCurrentMarket,
      setCurrentStockCode,
      updateSelfStocks,
    }
  },
  {
    persist: {
      pick: ['selfStocks', 'currentStockCode', 'currentPeriod', 'currentMarket'],
    },
  },
)
