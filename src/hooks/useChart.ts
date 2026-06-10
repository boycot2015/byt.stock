import { use } from 'echarts/core'
import VChart from 'vue-echarts'
import { CanvasRenderer } from 'echarts/renderers'
import { AxisBreak } from 'echarts/features.js'
import { CandlestickChart, LineChart, BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, GridComponent, VisualMapComponent, LegendComponent, DataZoomComponent } from 'echarts/components'
import { useTheme } from './useTheme'

let initialized = false

export function useChart() {
  if (!initialized) {
    use([CanvasRenderer, CandlestickChart, LineChart, BarChart, AxisBreak, TitleComponent, VisualMapComponent, TooltipComponent, GridComponent, LegendComponent, DataZoomComponent])
    initialized = true
  }

  const { themeToken } = useTheme()

  const getCommonOption = () => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    grid: {
      top: '5%',
      left: '5%',
      right: '5%',
      height: '55%',
    },
    textStyle: {
      color: themeToken.value.colorText,
    },
  })

  return {
    VChart,
    getCommonOption,
  }
}
