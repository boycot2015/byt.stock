import request from '@/utils/request'

export interface MarketIndex {
  code: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  amount: number
}

export interface StockQuote {
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
  preClose: number
  turnoverRate: number
  pe: number
  marketValue: number
}

export interface KlineItem {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface DepthData {
  asks: { price: number; volume: number; preClose: number }[]
  bids: { price: number; volume: number; preClose: number }[]
}

export interface RankItem {
  rank: number
  code: string
  name: string
  price: number
  changePercent: number
  volume: number
}

export interface SearchStockItem {
  code: string
  name: string
  pinyin: string
  market: string
}

export interface Holiday {
  date: string
  isHoliday: boolean
  isWeekend: boolean
  isWorkday: boolean
  holidayName: string | null
  source: string
}
// 获取大盘指数
export const getMarketIndex = () => {
  return request<any, MarketIndex[]>('/market/index', { method: 'GET' })
}

// 获取自选股列表
export const getSelfStocks = () => {
  return request<any, StockQuote[]>('/user/self-stocks', { method: 'GET' })
}

// 搜索股票
export const searchStock = (keyword: string) => {
  return request<any, SearchStockItem[]>('/stock/search', {
    method: 'GET',
    params: { keyword },
  })
}

// 获取个股实时行情
export const getStockQuote = (code: string = '399006') => {
  return request<any, StockQuote>('/stock/quote', {
    method: 'GET',
    params: { code },
  })
}

// 获取K线数据
export const getStockKline = (code: string, period: string, count = 100) => {
  return request<any, KlineItem[]>('/stock/kline', {
    method: 'GET',
    params: { code, period, count },
  })
}

// 获取分时K线数据
export const getStockTimeKline = (code: string) => {
  return request<any, KlineItem[]>('/stock/time-kline', {
    method: 'GET',
    params: { code },
  })
}

// 获取盘口数据
export const getStockDepth = (code: string) => {
  return request<any, DepthData>('/stock/depth', {
    method: 'GET',
    params: { code },
  })
}

// 获取行情排行
export const getMarketRank = (type: string, count = 20) => {
  return request<any, RankItem[]>('/market/rank', {
    method: 'GET',
    params: { type, count },
  })
}

// 操作自选股
export const operateSelfStock = (code: string, action: 'add' | 'delete') => {
  return request<any, { success: boolean }>('/user/self-stock', {
    method: 'POST',
    data: { code, action },
  })
}
// 获取节假日信息
export const getHoliday = (date: string) => {
  return request<any, Holiday>('/holiday', {
    method: 'GET',
    params: { date },
  })
}

export interface NewsItem {
  id: string
  title: string
  summary: string
  source: string
  publishTime: string
  url: string
}

export interface NewsData {
  list: NewsItem[]
  source: string
  category: string
  page: number
  count: number
  total: number
}

export interface StockNewsData {
  stock: StockQuote | null
  news: NewsItem[]
  source: string
  category: string
  page: number
  count: number
  total: number
}

// 获取财经资讯列表
export const getNewsList = (category: string = 'stock', page: number = 1, count: number = 20) => {
  return request<any, NewsData>('/news/list', {
    method: 'GET',
    params: { category, page, count },
  })
}

// 获取个股新闻
export const getStockNews = (code: string, count: number = 10) => {
  return request<any, StockNewsData>('/news/list', {
    method: 'GET',
    params: { code, count },
  })
}
