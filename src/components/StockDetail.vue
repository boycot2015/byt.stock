<template>
  <div class="stock-detail p-4 shadow-sm mb-4" :style="{ backgroundColor: themeToken.colorBgContainer }">
    <div class="stock-header flex-col md:flex-row mb-4 gap-4 flex justify-between lg:items-center">
      <div>
        <h3 class="text-xl font-bold">
          {{ stockInfo?.name }} <span class="text-sm text-gray-500"> {{ stockInfo?.code }}</span>
        </h3>
        <div v-if="stockInfo?.change !== undefined" class="mt-1">
          <span :class="stockInfo?.change >= 0 ? 'text-red-500' : 'text-green-500'" class="text-3xl font-bold">
            {{ stockInfo?.price.toFixed(2) }}
          </span>
          <span :class="stockInfo?.change >= 0 ? 'text-red-500' : 'text-green-500'" class="text-xl ml-4"> {{
            stockInfo?.change >= 0 ? '+' : '' }}{{ stockInfo?.change.toFixed(2) }} ({{ stockInfo?.changePercent >= 0 ?
              '+' : '' }}{{ stockInfo?.changePercent.toFixed(2) }}%) </span>
        </div>
        <!-- <div class="mt-2 text-sm text-gray-600" v-if="userStore.userInfo">
          当前可用资金：¥{{ userStore.userInfo?.balance?.toFixed(2) || '0.00' }}
        </div> -->
      </div>
      <div class="flex gap-2 justify-between">
        <a-button type="primary" class="!flex !items-center" @click="handleAddSelf">
          <StarOutlined /> {{ isSelfStock ? '已自选' : '加自选' }}
        </a-button>
        <a-button type="danger" @click="showTradeModal('sell')"> 卖出 </a-button>
        <a-button type="success" @click="showTradeModal('buy')"> 买入 </a-button>
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
      <!-- K线图区域 -->
      <div class="kline-section col-span-1 xl:col-span-2 rounded-lg h-100">
        <div class="w-full">
          <a-tabs v-model="period" @change="changePeriod">
            <a-tab-pane key="time" type="default" size="small" tab="分时"> </a-tab-pane>
            <a-tab-pane key="day" type="default" size="small" tab="日K"> </a-tab-pane>
            <a-tab-pane key="week" type="default" size="small" tab="周K"> </a-tab-pane>
            <a-tab-pane key="month" type="default" size="small" tab="月K"> </a-tab-pane>
          </a-tabs>
        </div>
        <v-chart v-if="period === 'time'" :option="timeKlineOption" class="kline-chart !h-80 rounded" autoresize />
        <v-chart v-else :option="option" class="kline-chart !h-80 rounded" autoresize />
      </div>
      <!-- 盘口数据 -->
      <div class="depth-section p-2 rounded-lg">
        <h4 class="font-medium !mb-3">买卖盘口</h4>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <h5 class="text-sm text-gray-500 mb-2">买盘</h5>
            <div v-for="(item, index) in depthData?.bids" :key="`bid-${index}`"
              class="flex justify-between items-center py-1 text-sm">
              <span :class="'text-red-500'">
                {{ (item.price || 0).toFixed(2) }}
              </span>
              <span :class="'text-red-500'"> {{ formatVolume(item.volume) }}手 </span>
            </div>
          </div>
          <div>
            <h5 class="text-sm text-gray-500 mb-2">卖盘</h5>
            <div v-for="(item, index) in depthData?.asks" :key="`ask-${index}`"
              class="flex justify-between items-center py-1 text-sm">
              <span :class="'text-green-500'">
                {{ (item.price || 0).toFixed(2) }}
              </span>
              <span :class="'text-green-500'"> {{ formatVolume(item.volume) }}手 </span>
            </div>
          </div>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>今开: {{ stockInfo?.open.toFixed(2) }}</div>
          <div>最高: {{ stockInfo?.high.toFixed(2) }}</div>
          <div>最低: {{ stockInfo?.low.toFixed(2) }}</div>
          <div>昨收: {{ stockInfo?.preClose.toFixed(2) }}</div>
          <div>成交量: {{ (stockInfo?.volume || 0) / 10000 }}万手</div>
          <div>成交额: {{ stockInfo?.amount.toFixed(2) }}亿</div>
          <div>换手率: {{ stockInfo?.turnoverRate.toFixed(2) }}%</div>
          <div>市盈率: {{ stockInfo?.pe.toFixed(2) }}</div>
          <div>总市值: {{ stockInfo?.marketValue.toFixed(2) }}亿</div>
        </div>
      </div>
    </div>
    <!-- 交易模态框 -->
    <a-modal :open="tradeModalVisible" :title="tradeType === 'buy' ? '买入股票(模拟)' : '卖出股票(模拟)'" @ok="handleTrade"
      @cancel="tradeModalVisible = false">
      <a-form :model="tradeForm" layout="vertical">
        <a-form-item label="股票代码">
          <a-input :value="stockInfo?.code" disabled />
        </a-form-item>
        <a-form-item label="股票名称">
          <a-input :value="stockInfo?.name" disabled />
        </a-form-item>
        <a-form-item label="交易价格">
          <a-input-number v-model="tradeForm.price" :min="0" :step="0.01" class="w-full" />
        </a-form-item>
        <a-form-item label="交易数量（股，必须是100的整数倍）">
          <a-input-number v-model="tradeForm.quantity" :min="100" :step="100" class="w-full" />
        </a-form-item>
        <a-form-item label="交易总额">
          <span class="text-lg font-medium">¥{{ (tradeForm.price * tradeForm.quantity).toFixed(2) }}</span>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive, onUnmounted } from 'vue'
import { StarOutlined } from '@ant-design/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { AxisBreak } from 'echarts/features.js'
import { CandlestickChart, LineChart, BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, GridComponent, VisualMapComponent, LegendComponent, DataZoomComponent } from 'echarts/components'
import type { EChartsOption } from 'echarts'
import { getStockQuote, getStockDepth, operateSelfStock, type StockQuote, type DepthData, getStockKline, type KlineItem, getStockTimeKline } from '@/api/stock'
import { useStockStore } from '@/store/stock'
import { useUserStore } from '@/store/user'
import axios from '@/utils/request'
import { formatVolume as formatVolumeUtil } from '@/utils/index'
import { message } from 'ant-design-vue'
import { useTheme, useDark } from '@/hooks/useTheme'
import { useTradingTime } from '@/hooks/useTradingTime'
const { themeToken } = useTheme()
const { getPollInterval } = useTradingTime()
const { isDark } = useDark()

use([CanvasRenderer, CandlestickChart, LineChart, BarChart, AxisBreak, TitleComponent, VisualMapComponent, TooltipComponent, GridComponent, LegendComponent, DataZoomComponent])

const stockStore = useStockStore()
const userStore = useUserStore()
const stockInfo = ref<StockQuote>()
const depthData = ref<DepthData>()
const klineData = ref<KlineItem[]>()
const period = ref('time')
const currentCode = computed(() => stockStore.currentStockCode)
const tradeModalVisible = ref(false)
const tradeType = ref<'buy' | 'sell'>('buy')
const tradeForm = ref({
  quantity: 100,
  price: 0,
})
const pollTimer = ref<number | null>(null)
const isPooTime = computed(() => period.value === 'time')
const formatVolume = (vol: number) => {
  const absVol = Math.abs(vol || 0)
  return formatVolumeUtil(absVol)
}

const startPolling = () => {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
  }
  pollTimer.value = window.setInterval(async () => {
    fetchData()
  }, getPollInterval.value)
}

const isSelfStock = computed(() => {
  return stockStore.selfStocks.some((item) => item.code === currentCode.value)
})

// K线图配置
const option = reactive<EChartsOption>({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
    },
  },
  legend: {
    show: false,
    // data: ['K线', '成交量']
  },
  grid: [
    {
      top: '0%',
      left: '10%',
      right: '10%',
      height: '60%',
    },
    {
      left: '10%',
      right: '10%',
      top: '80%',
      height: '40%',
    },
  ],
  xAxis: [
    {
      type: 'category',
      boundaryGap: true,
      axisLine: { onZero: false },
      splitLine: { show: false },
      data: [],
    },
    {
      type: 'category',
      gridIndex: 1,
      boundaryGap: true,
      axisLine: { onZero: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      data: [],
    },
  ],
  yAxis: [
    {
      scale: true,
      splitArea: {
        show: true,
      },
    },
    {
      scale: true,
      gridIndex: 1,
      splitNumber: 2,
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
  ],
  dataZoom: [
    {
      show: false,
      type: 'inside',
      xAxisIndex: [0, 1],
      minSpan: 20,
      start: 90,
      end: 100,
    },
  ],
  series: [
    {
      name: 'K线',
      type: 'candlestick',
      data: [] as any[],
      itemStyle: {
        color: '#ef232a',
        color0: '#14b936',
        borderColor: '#ef232a',
        borderColor0: '#14b936',
      },
    },
    {
      name: '成交量',
      type: 'bar',
      xAxisIndex: 1,
      yAxisIndex: 1,
      data: [],
      itemStyle: {
        color: function (params: any) {
          const dataList = (option.series as any[])?.[0]?.data as number[][]
          if (!dataList || !dataList[params.dataIndex]) return '#ef232a'
          return dataList[params.dataIndex][1] > dataList[params.dataIndex][0] ? '#ef232a' : '#14b936'
        },
      },
    },
  ],
})
const timeKlineOption = reactive<EChartsOption>({})
const fetchData = async () => {
  stockInfo.value = await getStockQuote(currentCode.value)
  depthData.value = await getStockDepth(currentCode.value)
  // console.log(depthData.value);

  let kline
  if (isPooTime.value) {
    kline = await getStockTimeKline(currentCode.value)
  } else {
    kline = await getStockKline(currentCode.value, period.value)
  }
  klineData.value = kline as unknown as KlineItem[]
  const dataMap: Record<string, KlineItem[]> = {
    time: kline as unknown as KlineItem[],
    day: (kline as unknown as KlineItem[]).slice(-800),
    week: (kline as unknown as KlineItem[]).slice(-300),
    month: (kline as unknown as KlineItem[]).slice(-100),
  }
  if (isPooTime.value) {
    updateTimeKlineChart(dataMap['time'])
  } else {
    updateKlineChart(dataMap[period.value])
  }
}

const updateKlineChart = (data: KlineItem[]) => {
  const dates: string[] = []
  const klineValues: number[][] = []
  const volumes: number[] = []
  data.forEach((item) => {
    dates.push(item.time)
    klineValues.push([item.open, item.close, item.low, item.high])
    volumes.push(item.volume)
  })
    ; (option.xAxis as any)[0].data = dates
    ; (option.xAxis as any)[1].data = dates
    ; (option.series as any)[0].type = 'candlestick'
    ; (option.series as any)[0].data = klineValues
    ; (option.series as any)[1].data = volumes
    ; (option.dataZoom as any)[0].minSpan = period.value === 'day' ? 10 : period.value === 'week' ? 30 : 80
  // 移除分时相关的系列和配置
  if ((option.series as any).length > 2) {
    ; (option.series as any).splice(2, 2)
  }
  if (Array.isArray(option.yAxis) && option.yAxis[0]) {
    delete (option.yAxis[0] as any).markLine
  }
}

const updateTimeKlineChart = (data: any[]) => {
  const preClose = data[0]?.preClose || 0
  // 转换价格为涨跌幅百分比
  const covertToPercent = (price: number) => {
    return Number((((price - preClose) / preClose) * 100).toFixed(2))
  }

  // 处理时间和休市
  const generateTimeData = (timeStr: string) => {
    const [hour, minute] = timeStr.split(':').map(Number)
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).getTime()
  }

  const breakStart = new Date(new Date().setHours(11, 30, 0, 0)).getTime()
  const breakEnd = new Date(new Date().setHours(13, 0, 0, 0)).getTime()

  const dataMap = new Map<number, { price: number; avgPrice: number; volume: number }>()
  let lastDataTime = 0
  data.forEach((item) => {
    const time = generateTimeData(item.time)
    dataMap.set(time, {
      price: item.price,
      avgPrice: item.avgPrice,
      volume: item.volume
    })
    if (time > lastDataTime) {
      lastDataTime = time
    }
  })

  const timeData: number[] = []
  const pricePercents: number[] = []
  const avgPercents: number[] = []
  const volumes: number[] = []
  const timeToVolumeMap = new Map<number, number | null>()

  const session1Start = new Date(new Date().setHours(9, 30, 0, 0)).getTime()
  const session1End = breakStart
  const session2Start = breakEnd
  const session2End = new Date(new Date().setHours(15, 0, 0, 0)).getTime()

  let currentPrice = 0
  let currentAvg = 0
  let currentVolume = 0
  let hasData = false

  const generateMinuteData = (start: number, end: number) => {
    let current = start
    while (current <= end) {
      const existingData = dataMap.get(current)
      if (existingData) {
        currentPrice = existingData.price
        currentAvg = existingData.avgPrice
        currentVolume = existingData.volume
        hasData = true
      }

      timeData.push(current)

      if (hasData && current <= lastDataTime) {
        pricePercents.push(covertToPercent(currentPrice))
        avgPercents.push(covertToPercent(currentAvg))
        volumes.push(currentVolume)
        timeToVolumeMap.set(current, currentVolume)
      } else {
        pricePercents.push(null as unknown as number)
        avgPercents.push(null as unknown as number)
        volumes.push(null as unknown as number)
        timeToVolumeMap.set(current, null)
      }

      current += 60 * 1000
    }
  }

  generateMinuteData(session1Start, session1End)
  generateMinuteData(session2Start, session2End)

  // const validPercents = [...pricePercents, ...avgPercents].filter((p): p is number => p !== null)
  // const minPercent = validPercents.length > 0 ? Math.min(...validPercents) : -10
  // const maxPercent = validPercents.length > 0 ? Math.max(...validPercents) : 10

  const lastValidPricePercent = pricePercents.filter((p): p is number => p !== null).pop() || 0
  // console.log(minPercent, maxPercent, pricePercents)
  // 直接构造完整的分时K线配置
  const newTimeKlineOption = {
    ...option, // 保留基础配置
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: (params: any) => {
        let result = ''
        params.forEach((item: any) => {
          const time = item.value[0]
          const value = item.value[1]
          let color = '#999'

          if (item.seriesName === '成交量') {
            const volumeValue = timeToVolumeMap.get(time)
            if (volumeValue !== null && volumeValue !== undefined) {
              color = volumeValue >= 0 ? '#ef232a' : '#14b936'
            }
          } else {
            if (value > 0) {
              color = '#ef232a'
            } else if (value < 0) {
              color = '#14b936'
            }
          }

          result += `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:${color};"></span>`
          if (item.seriesName === '成交量') {
            result += `${item.seriesName}: ${value !== null ? formatVolume(value) : '-'}`
          } else {
            result += `${item.seriesName}: ${value !== null ? value.toFixed(2) + '%' : '-'}`
          }
          result += '<br/>'
        })
        return result
      },
    },
    grid: [
      {
        top: '0%',
        left: '0%',
        right: '10%',
        height: '60%',
      },
      {
        left: '0%',
        right: '10%',
        top: '70%',
        height: '36%',
      },
    ],
    xAxis: [
      {
        type: 'time',
        axisLabel: {
          alignMaxLabel: 'center',
          verticalAlign: 'middle',
          hideOverlap: true,
          align: 'center', // 标签文字水平居中
          margin: 10, // 标签与轴线的距离
          rotate: 0, // 可选：旋转角度，0 表示水平
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: themeToken.value.colorBorder,
            type: 'solid' // 设置为实线
          }
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: themeToken.value.colorBorder,
            type: 'dashed' // 设置为虚线
          }
        },
        axisTick: {
          show: false,
        },
        breaks: [
          {
            start: breakStart,
            end: breakEnd,
            gap: 0,
          },
        ],
        breakLabelLayout: {
          moveOverlap: true,
        },
        breakArea: {
          expandOnClick: false,
          zigzagAmplitude: 0,
          zigzagZ: 200,
        },
        // splitLine: { show: false },
      },
      {
        type: 'time',
        gridIndex: 1,
        boundaryGap: [0, 0],
        axisLabel: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        breaks: [
          {
            start: breakStart,
            end: breakEnd,
            gap: 0,
          },
        ],
        breakArea: {
          show: false,
          expandOnClick: false,
          zigzagAmplitude: 0,
          zigzagZ: 0,
        },
      },
    ],
    yAxis: [
      {
        type: 'value',
        scale: false,
        show: false,
        min: function (value: { min: number; max: number }) {
          const maxAbs = Math.max(Math.abs(value.min), Math.abs(value.max))
          return -maxAbs
        },
        max: function (value: { min: number; max: number }) {
          const maxAbs = Math.max(Math.abs(value.min), Math.abs(value.max))
          return maxAbs
        },
        axisLabel: {
          show: true,
          formatter: '{value}%',
          fontSize: 10,
          color: themeToken.value.colorTextSecondary,
        },
        axisLine: {
          show: false,
          lineStyle: {
            color: themeToken.value.colorBorder,
          },
        },
        axisTick: {
          show: false,
          lineStyle: {
            color: themeToken.value.colorBorder,
          },
        },
        splitLine: {
          show: false,
          lineStyle: {
            type: 'solid',
            color: themeToken.value.colorBorder,
          }
        },
        splitArea: {
          show: false,
        },
        markLine: {
          silent: true,
          data: [{ yAxis: lastValidPricePercent }],
          lineStyle: {
            color: '#999',
            type: 'dashed',
            width: 1,
          },
          label: {
            show: true,
            position: 'end',
            formatter: (params: any) => `${params.value.toFixed(2)}%`,
            fontSize: 10,
            color: themeToken.value.colorTextSecondary,
          },
        },
      },
      {
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
    ],
    series: [
      // 价格折线
      {
        name: '涨跌幅',
        type: 'line',
        data: timeData.map((time, index) => [time, pricePercents[index]]),
        lineStyle: {
          width: 1,
          // color: '#14b936'
        },
        symbol: 'none',
        smooth: false,
      },
      // 成交量
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: timeData.map((time, index) => [time, Math.abs(volumes[index])]),
        itemStyle: {
          color: (params: any) => {
            const percent = volumes[params.dataIndex]
            return percent >= 0 ? '#ef232a' : '#14b936'
          },
        },
      },
      // // 均价折线
      // {
      //   name: '均价',
      //   type: 'line',
      //   data: timeData.map((time, index) => [time, avgPercents[index]]),
      //   lineStyle: {
      //     width: 1,
      //     color: '#faad14'
      //   },
      //   symbol: 'none',
      //   smooth: false
      // }
    ],
    visualMap: [
      {
        show: false,
        dimension: 1,
        seriesIndex: 0,
        pieces: [
          { value: 0, color: 'white' },
          { lt: 0, color: 'red' },
          { gt: 0, color: 'green' },
        ],
      },
    ],
    dataZoom: null as unknown as any,
  }
  // 赋值更新响应式timeKlineOption
  Object.assign(timeKlineOption, newTimeKlineOption)
}

const changePeriod = (p: string) => {
  period.value = p
  fetchData()
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
  if (p === 'time') {
    startPolling()
  }
}

const handleAddSelf = async () => {
  if (isSelfStock.value) {
    await operateSelfStock(currentCode.value, 'delete')
    stockStore.removeSelfStock(currentCode.value)
  } else {
    await operateSelfStock(currentCode.value, 'add')
    if (stockInfo.value) {
      stockStore.addSelfStock(stockInfo.value)
    }
  }
}

const showTradeModal = (type: 'buy' | 'sell') => {
  tradeType.value = type
  tradeForm.value.price = stockInfo.value?.price || 0
  tradeModalVisible.value = true
}

const handleTrade = async () => {
  if (!stockInfo.value) return
  const totalAmount = tradeForm.value.price * tradeForm.value.quantity
  if (tradeType.value === 'buy' && totalAmount > (userStore.userInfo?.balance || 0)) {
    message.error('可用余额不足')
    return
  }
  try {
    await axios.post('/trade', {
      code: stockInfo.value.code,
      name: stockInfo.value.name,
      price: tradeForm.value.price,
      quantity: tradeForm.value.quantity,
      type: tradeType.value,
    })
    const newBalance = tradeType.value === 'buy' ? (userStore.userInfo?.balance || 0) - totalAmount : (userStore.userInfo?.balance || 0) + totalAmount
    userStore.updateBalance(newBalance)
    message.success(`${tradeType.value === 'buy' ? '买入' : '卖出'}成功`)
    tradeModalVisible.value = false
  } catch (err: any) {
    message.error(err.response?.data?.msg || '交易失败')
  }
}

watch([currentCode, isDark], () => {
  fetchData()
})

onMounted(() => {
  fetchData()
  if (period.value === 'time') {
    startPolling()
  }
})

onUnmounted(() => {
  // 组件销毁时清除轮询
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
})
</script>
