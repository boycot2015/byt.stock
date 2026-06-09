<template>
  <v-chart :option="chartOption" class="kline-chart rounded" :class="className || '!h-80'" autoresize />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { AxisBreak } from 'echarts/features.js'
import { CandlestickChart, LineChart, BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, GridComponent, VisualMapComponent, LegendComponent, DataZoomComponent } from 'echarts/components'
// import type { EChartsOption } from 'echarts'
import { type KlineItem } from '@/api/stock'
import { useTheme } from '@/hooks/useTheme'
use([CanvasRenderer, CandlestickChart, LineChart, BarChart, AxisBreak, TitleComponent, VisualMapComponent, TooltipComponent, GridComponent, LegendComponent, DataZoomComponent])
const { themeToken } = useTheme()
const props = defineProps<{
  data: KlineItem[],
  className?: string
  simple?: boolean
}>()

const chartOption = computed<any>(() => {
  return generateTimeOption(props.data)
})

function generateTimeOption(data: any[]) {
  if (!data?.length) return {}

  const preClose = data[0]?.preClose || 0
  const covertToPercent = (price: number) => {
    return Number((((price - preClose) / preClose) * 100).toFixed(2))
  }

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
  const volumes: number[] = []
  const timeToVolumeMap = new Map<number, number | null>()

  const session1Start = new Date(new Date().setHours(9, 30, 0, 0)).getTime()
  const session1End = breakStart
  const session2Start = breakEnd
  const session2End = new Date(new Date().setHours(15, 0, 0, 0)).getTime()

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
        volumes.push(currentVolume)
        timeToVolumeMap.set(current, currentVolume)
      } else {
        pricePercents.push(null as unknown as number)
        volumes.push(null as unknown as number)
        timeToVolumeMap.set(current, null)
      }

      current += 60 * 1000
    }
  }

  generateMinuteData(session1Start, session1End)
  generateMinuteData(session2Start, session2End)

  const lastValidPricePercent = pricePercents.filter((p): p is number => p !== null).pop() || 0

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
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
            color = value > 0 ? '#ef232a' : value < 0 ? '#14b936' : '#999'
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
      { top: '0%', left: '0%', right: '10%', height: '60%' },
      { left: '0%', right: '10%', top: '70%', height: '36%' },
    ],
    xAxis: props.simple ? [{
      type: 'time',
      axisLabel: {
        show: false,
        alignMaxLabel: 'center',
        verticalAlign: 'middle',
        hideOverlap: true,
        align: 'center',
        margin: 10,
      },
      splitLine: {
        show: false,
        lineStyle: { color: themeToken.value.colorBorder, type: 'solid' }
      },
      axisLine: {
        show: false,
        lineStyle: { color: themeToken.value.colorBorder, type: 'dashed' }
      },
      axisTick: { show: false },
      breaks: [{ start: breakStart, end: breakEnd, gap: 0 }],
      breakArea: {
        expandOnClick: false,
        zigzagAmplitude: 0,
        zigzagZ: 200,
      },
    },] : [
      {
        type: 'time',
        axisLabel: {
          alignMaxLabel: 'center',
          verticalAlign: 'middle',
          hideOverlap: true,
          align: 'center',
          margin: 10,
        },
        splitLine: {
          show: true,
          lineStyle: { color: themeToken.value.colorBorder, type: 'solid' }
        },
        axisLine: {
          show: true,
          lineStyle: { color: themeToken.value.colorBorder, type: 'dashed' }
        },
        axisTick: { show: false },
        breaks: [{ start: breakStart, end: breakEnd, gap: 0 }],
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
        breaks: [{ start: breakStart, end: breakEnd, gap: 0 }],
        breakArea: {
          show: false,
          expandOnClick: false,
          zigzagAmplitude: 0,
          zigzagZ: 0,
        },
      },
    ],
    yAxis: props.simple ? [{
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
      splitLine: { show: false },
      markLine: {
        silent: true,
        data: [{ yAxis: lastValidPricePercent }],
        lineStyle: { color: '#999', type: 'dashed', width: 1 },
        label: {
          show: true,
          position: 'end',
          formatter: (params: any) => `${params.value.toFixed(2)}%`,
          fontSize: 10,
          color: themeToken.value.colorTextSecondary,
        },
      },
    },] : [
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
        splitLine: { show: false },
        markLine: {
          silent: true,
          data: [{ yAxis: lastValidPricePercent }],
          lineStyle: { color: '#999', type: 'dashed', width: 1 },
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
    series: props.simple ? [
      {
        name: '涨跌幅',
        type: 'line',
        data: timeData.map((time, index) => [time, pricePercents[index]]),
        lineStyle: { width: 1 },
        symbol: 'none',
        smooth: false,
      },
    ] : [
      {
        name: '涨跌幅',
        type: 'line',
        data: timeData.map((time, index) => [time, pricePercents[index]]),
        lineStyle: { width: 1 },
        symbol: 'none',
        smooth: false,
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
      },
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