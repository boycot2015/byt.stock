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
      <div class="flex space-x-2 justify-between">
        <a-button type="primary" class="!flex !items-center" @click="handleAddSelf">
          <StarOutlined /> {{ isSelfStock ? '已自选' : '加自选' }}
        </a-button>
        <a-button type="danger" @click="showTradeModal('sell')"> 卖出 </a-button>
        <a-button type="success" @click="showTradeModal('buy')"> 买入 </a-button>
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
      <!-- K线图区域 -->
      <div class="kline-section col-span-1 xl:col-span-2 rounded-lg h-95">
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
        <h4 class="font-medium mb-3">买卖盘口</h4>
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
    <a-modal v-model="tradeModalVisible" :title="tradeType === 'buy' ? '买入股票' : '卖出股票'" @ok="handleTrade"
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
import { message } from 'ant-design-vue'
import { useTheme } from '@/hooks/useTheme'
import { useTradingTime } from '@/hooks/useTradingTime'
const { themeToken } = useTheme()
const { getPollInterval } = useTradingTime()

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
// 格式化成交量：自动转万/亿单位，取绝对值
const formatVolume = (vol: number) => {
  const absVol = Math.abs(vol || 0)
  if (absVol >= 100000000) {
    return (absVol / 100000000).toFixed(2) + '亿'
  } else if (absVol >= 10000) {
    return (absVol / 10000).toFixed(2) + '万'
  }
  return absVol.toString()
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
  console.log(depthData.value);

  let kline
  if (isPooTime.value) {
    kline = await getStockTimeKline(currentCode.value)
  } else {
    kline = await getStockKline(currentCode.value, period.value)
  }
  klineData.value = kline as unknown as KlineItem[]
  const dataMap: Record<string, KlineItem[]> = {
    time: kline as unknown as KlineItem[],
    day: (kline as unknown as KlineItem[]).slice(-500),
    week: (kline as unknown as KlineItem[]).slice(-300),
    month: kline as unknown as KlineItem[],
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

  const timeData: number[] = []
  const pricePercents: number[] = []
  const avgPercents: number[] = []
  const volumes: number[] = []

  data.forEach((item) => {
    const time = generateTimeData(item.time)
    // 过滤休市时间数据
    if ((time >= new Date(new Date().setHours(9, 30, 0, 0)).getTime() && time <= breakStart) || (time >= breakEnd && time <= new Date(new Date().setHours(15, 0, 0, 0)).getTime())) {
      timeData.push(time)
      pricePercents.push(covertToPercent(item.price))
      avgPercents.push(covertToPercent(item.avgPrice))
      volumes.push(item.volume)
    }
  })

  // 计算Y轴范围
  const allPercents = [...pricePercents, ...avgPercents]
  const minPercent = Math.min(...allPercents)
  const maxPercent = Math.max(...allPercents)
  // console.log(minPercent, maxPercent, pricePercents)
  // 直接构造完整的分时K线配置
  const newTimeKlineOption = {
    ...option, // 保留基础配置
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
        splitLine: { show: false },
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
        scale: true,
        show: false,
        min: minPercent,
        max: maxPercent,
        splitArea: {
          show: true,
        },
        // markLine: {
        //   silent: true,
        //   data: [{ y: 0 }],
        //   lineStyle: {
        //     color: '#999',
        //     type: 'dashed',
        //     width: 1
        //   },
        //   label: {
        //     show: true,
        //     position: 'end',
        //     formatter: '昨收',
        //     fontSize: 10
        //   }
        // }
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

watch(currentCode, () => {
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
