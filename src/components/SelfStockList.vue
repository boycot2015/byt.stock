<template>
  <div class="self-stock-list shadow-sm mb-4 bg-[var(--color-bg)]">
    <div class="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
      <h3 class="text-lg font-medium">自选股</h3>
      <div class="flex items-center gap-2">
        <span class="text-sm text-[var(--color-primary)] cursor-pointer" @click="visible = true">+ 添加</span>
        <a-dropdown>
          <a class="text-sm text-gray-500 cursor-pointer flex items-center gap-1">
            {{ sortLabel }}
            <span class="rotate-90">
              <SwapOutlined v-if="sortOrder === 'default'" />
              <SwapLeftOutlined v-else-if="sortOrder.includes('desc')" />
              <SwapRightOutlined v-else-if="sortOrder.includes('asc')" />
            </span>
          </a>
          <template #overlay>
            <a-menu>
              <a-menu-item key="default" @click="handleSort('default')">默认</a-menu-item>
              <a-menu-item key="changePercent-desc" @click="handleSort('changePercent-desc')">
                涨跌幅
                <span class="sort-icon">
                  <SwapLeftOutlined />
                </span>
              </a-menu-item>
              <a-menu-item key="changePercent-asc" @click="handleSort('changePercent-asc')">
                涨跌幅
                <span class="sort-icon">
                  <SwapRightOutlined />
                </span>
              </a-menu-item>
              <a-menu-item key="price-desc" @click="handleSort('price-desc')">
                价格
                <span class="sort-icon">
                  <SwapLeftOutlined />
                </span>
              </a-menu-item>
              <a-menu-item key="price-asc" @click="handleSort('price-asc')">
                价格
                <span class="sort-icon">
                  <SwapRightOutlined />
                </span>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <span class="text-xl text-gray-500 cursor-pointer" @click="toggleEditMode">
          <SettingOutlined />
        </span>
      </div>
    </div>

    <div v-if="editMode" class="flex justify-between items-center px-3 py-4 border-b border-[var(--border-color)]">
      <div class="flex items-center gap-2">
        <a-checkbox :checked="allSelected" @change="handleSelectAll">全选</a-checkbox>
        <span class="text-sm text-gray-500">已选 {{ selectedCodes.length }} 项</span>
      </div>
      <div class="flex items-center gap-2">
        <a-button size="small" @click="handleBatchDelete">删除</a-button>
      </div>
    </div>

    <div class="stock-list overflow-auto flex flex-col" :style="{ maxHeight: maxHeight }">
      <div v-for="(item, index) in sortedStockList" :key="item.code"
        class="stock-item p-3 border-b border-[var(--border-color)] cursor-pointer hover:bg-[var(--hover-bg)] flex items-center gap-3"
        :class="{
          'bg-[var(--primary-bg)]': item.code === currentCode,
          'opacity-50': dragIndex !== null && dragIndex !== index
        }" draggable="true" @dragstart="handleDragStart(index)" @dragover.prevent @drop="handleDrop(index)"
        @click="handleSelectStock(item.code)">
        <a-checkbox v-if="editMode" :checked="selectedCodes.includes(item.code)"
          @click.stop="toggleSelect(item.code)" />

        <!-- <span class="text-gray-400 cursor-move" draggable="false">
          <UnorderedListOutlined />
        </span> -->

        <div class="flex-1 min-w-0">
          <div class="flex items-center">
            <span class="font-medium mr-2">{{ item.name }}</span>
            <span class="text-sm text-gray-500">{{ item.code }}</span>
          </div>
          <div class="text-sm text-gray-500 mt-1">成交量: {{ formatVolume(item.volume) }}手</div>
        </div>

        <div class="text-right">
          <span :class="item.change >= 0 ? 'text-red-500' : 'text-green-500'" class="text-lg font-medium">
            {{ item.price.toFixed(2) }}
          </span>
          <div class="mt-1">
            <span :class="item.change >= 0 ? 'text-red-500' : 'text-green-500'" class="text-sm">
              {{ item.change >= 0 ? '+' : '' }}{{ item.change.toFixed(2) }}
            </span>
            <span :class="item.changePercent >= 0 ? 'text-red-500' : 'text-green-500'" class="text-sm ml-2">
              {{ item.changePercent >= 0 ? '+' : '' }}{{ item.changePercent.toFixed(2) }}%
            </span>
          </div>
        </div>

        <a-dropdown v-if="editMode" @click.stop>
          <a class="flex items-center ml-2 text-gray-500" title="操作">
            <MoreOutlined />
          </a>
          <template #overlay>
            <a-menu>
              <a-menu-item key="top" @click="handleTop(index)" :disabled="index === 0">
                <span class="sort-icon">
                  <SwapLeftOutlined />
                </span>
                <span>置顶</span>
              </a-menu-item>
              <a-menu-item key="bottom" @click="handleBottom(index)" :disabled="index === sortedStockList.length - 1">
                <span class="sort-icon">
                  <SwapRightOutlined />
                </span>
                <span>置底</span>
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item key="delete" @click="handleDelete(item.code)" danger>
                <DeleteOutlined />
                <span>删除</span>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </div>

    <a-modal title="添加自选股" :open="visible" width="400px" @cancel="visible = false" @ok="handleAddStock">
      <Search style="width: 100%" @select="(code) => (selectedCode = code)" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getSelfStocks, type StockQuote, operateSelfStock } from '@/api/stock'
import { formatVolume } from '@/utils/index'
import { useStockStore } from '@/store/stock'
import Search from './Search.vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { useTradingTime } from '@/hooks/useTradingTime'
import { useScroll } from '@/hooks/useScroll'
import {
  SwapOutlined,
  SettingOutlined,
  SwapLeftOutlined,
  SwapRightOutlined,
  DeleteOutlined,
  MoreOutlined,
} from '@ant-design/icons-vue'

const { getPollInterval } = useTradingTime()
const { scrollToElement } = useScroll()
const router = useRouter()

defineProps({
  maxHeight: {
    type: String,
    default: '398px',
  },
})

const visible = ref(false)
const selectedCode = ref('')
const stockStore = useStockStore()
const stockList = ref<StockQuote[]>([])
const currentCode = computed(() => stockStore.currentStockCode)
const editMode = ref(false)
const selectedCodes = ref<string[]>([])
const sortKey = ref('default')
const sortOrder = ref<'asc' | 'desc' | 'price-desc' | 'price-asc' | 'default'>('default')
const dragIndex = ref<number | null>(null)

const sortLabel = computed(() => {
  const labels: Record<string, string> = {
    'default': '默认',
    'changePercent-desc': '涨跌幅',
    'changePercent-asc': '涨跌幅',
    'price-desc': '价格',
    'price-asc': '价格',
  }
  return labels[`${sortKey.value}-${sortOrder.value}`] || labels['default']
})

const sortedStockList = computed(() => {
  const list = [...stockList.value]
  if (sortKey.value === 'default') {
    return list
  }

  const key = sortKey.value as keyof StockQuote
  list.sort((a, b) => {
    const valA = a[key] as number
    const valB = b[key] as number
    if (sortOrder.value.includes('desc')) {
      return valB - valA
    }
    return valA - valB
  })
  return list
})

const allSelected = computed(() => {
  return sortedStockList.value.length > 0 &&
    sortedStockList.value.every(item => selectedCodes.value.includes(item.code))
})

const fetchData = async () => {
  stockList.value = await getSelfStocks()
  stockStore.updateSelfStocks(stockList.value)
}

const handleAddStock = async () => {
  let res = await operateSelfStock(selectedCode.value, 'add')
  if (res.success) {
    fetchData()
    visible.value = false
    message.success('添加成功')
  }
}

const handleSelectStock = (code: string) => {
  if (editMode.value) return
  stockStore.setCurrentStockCode(code)
  router.push({ name: 'Home', query: { code } })
  scrollToElement('.stock-detail')
}

const toggleEditMode = () => {
  editMode.value = !editMode.value
  if (!editMode.value) {
    selectedCodes.value = []
  }
}

const toggleSelect = (code: string) => {
  const index = selectedCodes.value.indexOf(code)
  if (index > -1) {
    selectedCodes.value.splice(index, 1)
  } else {
    selectedCodes.value.push(code)
  }
}

const handleSelectAll = (e: { target: { checked: boolean } }) => {
  if (e.target.checked) {
    selectedCodes.value = sortedStockList.value.map(item => item.code)
  } else {
    selectedCodes.value = []
  }
}

const handleSort = (sortStr: string) => {
  const [key, order] = sortStr.split('-')
  sortKey.value = key
  sortOrder.value = (order as 'asc' | 'desc') || 'default'
}

const handleDragStart = (index: number) => {
  dragIndex.value = index
}

const handleDrop = async (dropIndex: number) => {
  if (dragIndex.value === null || dragIndex.value === dropIndex) {
    dragIndex.value = null
    return
  }

  const list = [...stockList.value]
  const [draggedItem] = list.splice(dragIndex.value, 1)
  list.splice(dropIndex, 0, draggedItem)
  stockList.value = list

  await updateOrder(list.map(item => item.code))
  dragIndex.value = null
}

const handleTop = async (index: number) => {
  if (index === 0) return

  const list = [...stockList.value]
  const [item] = list.splice(index, 1)
  list.unshift(item)
  stockList.value = list

  await updateOrder(list.map(item => item.code))
  message.success('已置顶')
}

const handleBottom = async (index: number) => {
  if (index === stockList.value.length - 1) return

  const list = [...stockList.value]
  const [item] = list.splice(index, 1)
  list.push(item)
  stockList.value = list

  await updateOrder(list.map(item => item.code))
  message.success('已置底')
}

const handleDelete = async (code: string) => {
  const res = await operateSelfStock(code, 'delete')
  if (res.success) {
    stockList.value = stockList.value.filter(item => item.code !== code)
    selectedCodes.value = selectedCodes.value.filter(c => c !== code)
    message.success('删除成功')
  }
}

const handleBatchDelete = async () => {
  if (selectedCodes.value.length === 0) {
    message.warning('请选择要删除的股票')
    return
  }

  for (const code of selectedCodes.value) {
    await operateSelfStock(code, 'delete')
  }

  stockList.value = stockList.value.filter(item => !selectedCodes.value.includes(item.code))
  message.success('批量删除成功')
  selectedCodes.value = []
}

const updateOrder = async (codes: string[]) => {
  try {
    await operateSelfStock(codes, 'order')
    // message.success('排序更新')
    fetchData()
    selectedCodes.value = []
  } catch (e) {
    console.log('更新排序失败:', e)
  }
}

onMounted(() => {
  fetchData()
  setInterval(fetchData, getPollInterval.value)
})
</script>
<style>
.sort-icon {
  display: inline-block;
  transform: rotate(90deg) !important;
}
</style>
