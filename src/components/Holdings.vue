<template>
    <a-spin :spinning="loading" class="w-full h-full">
        <div v-if="holdings.length" class="holdings-table">
            <a-table :dataSource="holdings" :pagination="false" size="small" :scroll="{ y: 400 }"
                @row-click="handleRowClick"
                :customRow="(record: Holding) => ({ onClick: () => handleRowClick(record) })">
                <a-table-column title="名称" dataIndex="name" :key="'name'">
                    <template #default="{ record }">
                        <span>{{ record.name }}</span>
                        <span class="stock-code ml-0 md:ml-2">{{ record.stockCode }}</span>
                    </template>
                </a-table-column>
                <a-table-column title="占比" dataIndex="proportion" :sorter="sortByField('proportion', true)"
                    :key="'proportion'" align="right">
                    <template #default="{ record }">
                        {{ record.proportion }}%
                    </template>
                </a-table-column>
                <a-table-column title="涨跌幅" dataIndex="change" :sorter="sortByField('change', true)" :key="'change'"
                    align="right">
                    <template #default="{ record }">
                        <span :class="getChangeClass(record.change)">
                            {{ record.change || '--' }}%
                        </span>
                    </template>
                </a-table-column>
                <a-table-column title="最新价" :sorter="sortByField('price', true)" dataIndex="price" :key="'price'"
                    align="right">
                    <template #default="{ record }">
                        <span :class="getChangeClass(record.change)">{{ record.price || '--' }}</span>
                    </template>
                </a-table-column>
            </a-table>
        </div>
        <a-empty v-else-if="!loading" description="暂无持仓数据" />
    </a-spin>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { getStockQuote, type StockQuote, getStockHoldings, type Holding } from '@/api/stock'
import { useTradingTime } from '@/hooks/useTradingTime'
import { useStockStore } from '@/store/stock'
const stockStore = useStockStore()
const { getPollInterval } = useTradingTime()
const props = defineProps<{
    code: string
}>()

const emit = defineEmits<{
    (e: 'select', stockCode: string): void
}>()

const holdings = ref<Holding[]>([])
const loading = ref(false)
const pollTimer = ref<number | null>(null)

const fetchData = async () => {
    if (!props.code) return
    loading.value = true
    try {
        const res = await getStockHoldings(props.code)
        const list: Holding[] = res?.holdings || []

        // 并行查询每个股票的实时行情
        if (list.length > 0) {
            const quotePromises = list.map(item => getStockQuote(item.stockCode))
            const quotes = await Promise.allSettled(quotePromises)

            list.forEach((item, index) => {
                const quoteResult = quotes[index]
                if (quoteResult.status === 'fulfilled' && quoteResult.value) {
                    const quote = quoteResult.value as StockQuote
                    item.name = quote.name || item.name || ''
                    item.price = quote.price || item.price || 0
                    item.change = quote.changePercent || item.change || 0
                    item.volume = quote.volume || item.volume || 0
                    item.amount = quote.amount || item.amount || 0
                    item.high = quote.high || item.high || 0
                    item.low = quote.low || item.low || 0
                    // 如果接口返回了涨跌幅，使用实时数据
                    if (quote.changePercent) {
                        item.change = quote.changePercent
                    }
                }
            })
        }

        holdings.value = list
    } catch (e) {
        console.error('获取基金持仓失败:', e)
    } finally {
        loading.value = false
    }
}

const getChangeClass = (change: string | number | undefined) => {
    if (!change) return ''
    const val = parseFloat(change.toString())
    return val > 0 ? 'text-up' : val < 0 ? 'text-down' : ''
}

// 通用排序方法
const sortByField = (field: keyof Holding, desc = false) => {
    return (a: Holding, b: Holding) => {
        const aVal = a[field] || 0
        const bVal = b[field] || 0
        const diff = parseFloat(bVal.toString()) - parseFloat(aVal.toString())
        return desc ? diff : -diff
    }
}

// 点击行选择股票
const handleRowClick = (record: Holding) => {
    if (record.stockCode) {
        stockStore.setCurrentStockCode(record.stockCode)
        emit('select', record.stockCode)
    }
}

const startPolling = () => {
    if (pollTimer.value) {
        clearInterval(pollTimer.value)
    }
    pollTimer.value = window.setInterval(async () => {
        fetchData()
    }, getPollInterval.value) // 定时刷新
}

const stopPolling = () => {
    if (pollTimer.value) {
        clearInterval(pollTimer.value)
        pollTimer.value = null
    }
}

onMounted(() => {
    fetchData()
    startPolling()
})

onUnmounted(() => {
    stopPolling()
})

watch(() => props.code, () => {
    fetchData()
    startPolling()
})

</script>

<style scoped>
.holdings-table .stock-code {
    font-size: 12px;
    color: #888;
}

.text-up {
    color: #ef232a;
}

.text-down {
    color: #14b936;
}

:deep(.ant-table-thead > tr > th) {
    background: transparent !important;
    font-size: 13px;
    color: #888;
    font-weight: normal;
}

:deep(.ant-table-tbody > tr > td) {
    font-size: 13px;
}
</style>
