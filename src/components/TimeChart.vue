<template>
  <div class="time-chart-wrapper">
    <div v-if="!simple && stats.maxPricePercent !== 0"
      class="chart-stats-bar flex justify-between items-center p-1 text-xs bg-[var(--color-bg)] border-b border-[var(--border-color)] mt-1">
      <div class="flex items-center gap-4">
        <span class="text-gray-500">
          最高: <span class="text-red-500 font-medium">{{ stats.maxPricePercent.toFixed(2) }}%</span>
          <span class="text-gray-400 ml-1">({{ stats.maxPrice.toFixed(isFound ? 3 : 2) }})</span>
        </span>
        <span class="text-gray-500">
          最低: <span class="text-green-500 font-medium">{{ stats.minPricePercent.toFixed(2) }}%</span>
          <span class="text-gray-400 ml-1">({{ stats.minPrice.toFixed(isFound ? 3 : 2) }})</span>
        </span>
      </div>
    </div>
    <v-chart ref="chartRef" :option="chartOption" class="kline-chart rounded" :class="className || '!h-80'"
      autoresize />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, shallowRef, computed } from 'vue'
import VChart from 'vue-echarts'
import type { ECharts, EChartsOption } from 'echarts'
import { useChart } from '@/hooks/useChart'
import { checkIsFound } from '@/utils/index'

const { getCommonOption } = useChart()

interface TimeDataItem {
  time: string
  price: number
  preClose: number
  avgPrice?: number
  volume?: number
}

const props = defineProps<{
  data: TimeDataItem[] | any[]
  className?: string
  simple?: boolean
  code?: string
}>()
const mode = ref<'simple' | 'default'>(props.simple ? 'simple' : 'default')
const chartRef = ref<InstanceType<typeof VChart>>()
const chartOption = shallowRef<any>({})

const stats = ref({
  maxPricePercent: 0,
  minPricePercent: 0,
  maxPrice: 0,
  minPrice: 0,
})

const isFound = computed(() => {
  if (!props.data?.length) return false
  return checkIsFound(props.code || '')
})

let lastDataLength = 0

function parseTimeStr(timeStr: string): number {
  if (timeStr.includes(' ')) {
    const [datePart, timePart] = timeStr.split(' ')
    const date = new Date()
    if (datePart.includes('-')) {
      const parts = datePart.split('-').map(Number)
      if (parts.length === 3) {
        date.setFullYear(parts[0], parts[1] - 1, parts[2])
      } else if (parts.length === 2) {
        date.setFullYear(new Date().getFullYear(), parts[0] - 1, parts[1])
      }
    }
    if (timePart) {
      const [hour, minute] = timePart.split(':').map(Number)
      date.setHours(hour, minute, 0, 0)
    }
    return date.getTime()
  } else {
    const [hour, minute] = timeStr.split(':').map(Number)
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).getTime()
  }
}

watch(() => props.data, async (newData, oldData) => {
  if (!newData?.length) {
    chartOption.value = {}
    lastDataLength = 0
    return
  }

  await nextTick()

  const hasDate = (d: any[]) => d.length > 0 && (d[0].time?.includes(' ') || d[0].time?.includes('-'))
  const formatChanged = oldData && oldData.length > 0 && newData.length > 0 && hasDate(newData) !== hasDate(oldData)

  if (!formatChanged && lastDataLength > 0 && newData.length >= lastDataLength && chartRef.value?.chart) {
    updateSeriesData(newData)
  } else {
    chartOption.value = generateTimeOption(newData)
  }

  lastDataLength = newData.length
}, { deep: false, immediate: true })

function updateSeriesData(data: TimeDataItem[]) {
  const chart = chartRef.value?.chart as ECharts | undefined
  if (!chart) return

  const fullOption = generateTimeOption(data) as EChartsOption
  if (!fullOption?.series) return

  chart.setOption({ series: fullOption.series })
}

function generateTimeOption(data: TimeDataItem[]) {
  if (!data?.length) return {}

  const preClose = data[0]?.preClose || 0
  const covertToPercent = (price: number) => {
    return Number((((price - preClose) / preClose) * 100).toFixed(2))
  }

  const isMultiDay = data.length > 0 && (data[0].time.includes(' ') || data[0].time.includes('-'))

  const dataMap = new Map<number, { price: number; avgPrice: number; volume: number }>()
  let lastDataTime = 0

  data.forEach((item) => {
    const time = parseTimeStr(item.time)
    dataMap.set(time, {
      price: item.price,
      avgPrice: item.avgPrice || item.price,
      volume: item.volume || 0,
    })
    if (time > lastDataTime) {
      lastDataTime = time
    }
  })

  const timeData: number[] = []
  const pricePercents: number[] = []
  const prices: number[] = []
  const volumes: number[] = []
  const timeToVolumeMap = new Map<number, number | null>()

  let currentPrice = 0
  let currentVolume = 0
  let hasData = false

  const generateMinuteData = (start: number, end: number) => {
    let current = start
    while (current <= end) {
      const existingData = dataMap.get(current)
      if (existingData) {
        currentPrice = existingData.price
        currentVolume = existingData.volume
        hasData = true
      }

      timeData.push(current)

      if (hasData && current <= lastDataTime) {
        pricePercents.push(covertToPercent(currentPrice))
        prices.push(currentPrice)
        volumes.push(currentVolume)
        timeToVolumeMap.set(current, currentVolume)
      } else {
        pricePercents.push(null as unknown as number)
        prices.push(null as unknown as number)
        volumes.push(null as unknown as number)
        timeToVolumeMap.set(current, null)
      }

      current += 60 * 1000
    }
  }

  let breaks: { start: number; end: number; gap?: number }[] = []

  if (isMultiDay) {
    const dateSet = new Set<string>()
    data.forEach((item) => {
      const time = parseTimeStr(item.time)
      const date = new Date(time)
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      dateSet.add(dateStr)
    })
    const dates = Array.from(dateSet).sort()

    for (let i = 1; i < dates.length; i++) {
      const prevParts = dates[i - 1].split('-').map(Number)
      const currParts = dates[i].split('-').map(Number)
      const lastDayEnd = new Date(prevParts[0], prevParts[1] - 1, prevParts[2], 15, 0, 0, 0).getTime()
      const currentDayStart = new Date(currParts[0], currParts[1] - 1, currParts[2], 9, 30, 0, 0).getTime()
      breaks.push({ start: lastDayEnd, end: currentDayStart, gap: 0 })
    }

    dates.forEach((dateStr) => {
      const parts = dateStr.split('-').map(Number)
      const year = parts[0]
      const month = parts[1] - 1
      const day = parts[2]

      const session1Start = new Date(year, month, day, 9, 30, 0, 0).getTime()
      const session1End = new Date(year, month, day, 11, 30, 0, 0).getTime()
      const session2Start = new Date(year, month, day, 13, 0, 0, 0).getTime()
      const session2End = new Date(year, month, day, 15, 0, 0, 0).getTime()

      breaks.push({ start: session1End, end: session2Start, gap: 0 })

      generateMinuteData(session1Start, session1End)
      generateMinuteData(session2Start, session2End)
    })
  } else {
    const breakStart = new Date(new Date().setHours(11, 30, 0, 0)).getTime()
    const breakEnd = new Date(new Date().setHours(13, 0, 0, 0)).getTime()

    const session1Start = new Date(new Date().setHours(9, 30, 0, 0)).getTime()
    const session1End = breakStart
    const session2Start = breakEnd
    const session2End = new Date(new Date().setHours(15, 0, 0, 0)).getTime()

    breaks = [{ start: breakStart, end: breakEnd, gap: 0 }]

    generateMinuteData(session1Start, session1End)
    generateMinuteData(session2Start, session2End)
  }

  const validPricePercents = pricePercents.filter((p): p is number => p !== null)
  const validPrices = prices.filter((p): p is number => p !== null)
  const lastValidPricePercent = validPricePercents.length > 0 ? validPricePercents[validPricePercents.length - 1] : 0

  if (validPricePercents.length > 0 && validPrices.length > 0) {
    stats.value = {
      maxPricePercent: Math.max(...validPricePercents),
      minPricePercent: Math.min(...validPricePercents),
      maxPrice: Math.max(...validPrices),
      minPrice: Math.min(...validPrices),
    }
  }

  const xAxis = [
    {
      type: 'time',
      axisLabel: {
        alignMaxLabel: 'right',
        alignMinLabel: 'left',
        verticalAlign: 'middle',
        hideOverlap: true,
        align: 'center',
        show: !props.simple,
        margin: 10,
        showMinLabel: true,
        showMaxLabel: true,
      },
      splitLine: {
        show: !props.simple,
        lineStyle: { color: '#e0e0e0', type: 'solid' },
      },
      axisLine: {
        show: !props.simple,
        lineStyle: { color: '#e0e0e0', type: 'dashed' },
      },
      axisTick: { show: false },
      breaks: breaks.length > 0 ? breaks : undefined,
      breakArea: {
        expandOnClick: false,
        zigzagAmplitude: 0,
        zigzagZ: 200,
      },
    },
    {
      type: 'time',
      gridIndex: 1,
      boundaryGap: [0, 0],
      axisLabel: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      breaks: breaks.length > 0 ? breaks : undefined,
      axisPointer: {
        label: {
          show: false,
        },
      },
      breakArea: {
        show: false,
        expandOnClick: false,
        zigzagAmplitude: 0,
        zigzagZ: 0,
      },
    },
  ]
  const yAxis = [
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
        color: '#666',
      },
      splitLine: { show: false },
      axisPointer: {
        show: true,
        snap: true,
        lineStyle: {
          type: 'dashed',
          color: '#999',
          width: 1,
        },
        label: {
          show: true,
          position: 'left',
          formatter: (params: any) => {
            const value = params.value
            return `${value.toFixed(2)}%`
          },
          padding: [2, 6],
          fontSize: 11,
          fontWeight: 'bold',
          color: '#fff',
        },
      } as any,
    },
    {
      scale: true,
      gridIndex: 1,
      splitNumber: 2,
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisPointer: {
        show: true,
        snap: true,
        lineStyle: {
          type: 'dashed',
          color: '#999',
          width: 1,
        },
        label: {
          show: true,
          position: 'left',
          formatter: (params: any) => {
            const value = params.value
            return `${value.toFixed(0)}`
          },
          padding: [2, 6],
          fontSize: 11,
          fontWeight: 'bold',
          color: '#fff',
        },
      } as any,
    },
  ]
  const series = [{
    name: '涨跌幅',
    type: 'line',
    data: timeData.map((time, index) => [time, pricePercents[index], prices[index]]),
    lineStyle: { width: 1 },
    symbol: 'none',
    smooth: false,
    markLine: {
      silent: true,
      symbol: 'none',
      data: [{
        yAxis: lastValidPricePercent,
      }],
      lineStyle: {
        type: 'dashed',
        width: 2,
        color: lastValidPricePercent > 0 ? '#ef232a' : lastValidPricePercent < 0 ? '#14b936' : '#999',
      },
      label: {
        show: false,
      },
    },
  },
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
  },]
  const modeMap = {
    simple: {
      xAxis: [xAxis[0]],
      yAxis: [yAxis[0]],
      series: [series[0]]
    },
    default: {
      xAxis,
      yAxis,
      series,
    }
  }
  return {
    ...getCommonOption(),
    axisPointer: {
      link: [{ xAxisIndex: 'all' }],
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        lineStyle: {
          type: 'dashed',
          width: 1,
          color: '#999',
        },
      },
      formatter: (params: any) => {
        let result = ''
        params.forEach((item: any) => {
          const time = item.value[0]
          const value = item.value[1]
          let color = '#999'
          if (result.includes(item.seriesName)) {
            return result
          }
          if (item.seriesName === '成交量') {
            const volumeValue = timeToVolumeMap.get(time)
            if (volumeValue !== null && volumeValue !== undefined) {
              color = volumeValue >= 0 ? '#ef232a' : '#14b936'
            }
          } else {
            color = value > 0 ? '#ef232a' : value < 0 ? '#14b936' : '#999'
          }

          result += `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:${color};"></span>`
          if (item.seriesName === '成交量') {
            result += `${item.seriesName}: ${value !== null ? formatVolume(value) : '-'}`
          } else {
            const price = item.value[2]
            result += `${item.seriesName}: ${value !== null ? value.toFixed(2) + '%' : '-'} `
            result += price !== null ? `(${price.toFixed(2)})` : ''
          }
          result += '<br/>'
        })
        return result
      },
    },
    grid: [
      { top: '0%', left: '0%', right: '10%', height: '60%' },
      { left: '0%', right: '10%', top: '70%', height: '36%' },
    ],
    ...modeMap[mode.value],
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
    dataZoom: null,
  }
}

function formatVolume(vol: number): string {
  if (vol >= 100000000) {
    return (vol / 100000000).toFixed(2) + '亿'
  } else if (vol >= 10000) {
    return (vol / 10000).toFixed(2) + '万'
  }
  return vol.toString()
}
</script>

<style scoped>
.kline-chart {
  width: 100%;
}
</style>
