const stocks = [
  {
    code: '600519',
    name: '贵州茅台',
    price: 1780.0,
    change: 40.68,
    changePercent: 2.34,
    volume: 23000,
    amount: 40.94,
    high: 1785.0,
    low: 1735.0,
    open: 1742.0,
  },
  {
    code: '300750',
    name: '宁德时代',
    price: 215.6,
    change: 3.32,
    changePercent: 1.56,
    volume: 58000,
    amount: 12.54,
    high: 218.5,
    low: 212.3,
    open: 213.5,
  },
  {
    code: '002594',
    name: '比亚迪',
    price: 238.9,
    change: -2.1,
    changePercent: -0.87,
    volume: 125000,
    amount: 29.86,
    high: 243.5,
    low: 236.8,
    open: 241.0,
  },
]
export default [
  // 模拟大盘指数数据
  {
    url: '/api/v1/market/index',
    method: 'get',
    response: () => {
      return {
        code: 0,
        msg: 'success',
        data: [
          {
            code: 'sh000001',
            name: '上证指数',
            price: 3215.56,
            change: 26.12,
            changePercent: 0.82,
            volume: 2345.67,
            amount: 3456.78,
          },
          {
            code: 'sz399001',
            name: '深证成指',
            price: 11234.67,
            change: 116.89,
            changePercent: 1.05,
            volume: 3456.78,
            amount: 4567.89,
          },
          {
            code: 'sz399006',
            name: '创业板指',
            price: 2256.78,
            change: 27.68,
            changePercent: 1.23,
            volume: 1234.56,
            amount: 2345.67,
          },
        ],
      }
    },
  },
  // 模拟自选股列表
  {
    url: '/api/v1/user/self-stocks',
    method: 'get',
    response: () => {
      return {
        code: 0,
        msg: 'success',
        data: stocks,
      }
    },
  },
  // 模拟股票搜索
  {
    url: '/api/v1/stock/search',
    method: 'get',
    response: () => {
      // query里可以拿到keyword参数
      return {
        code: 0,
        msg: 'success',
        data: [
          {
            code: '002594',
            name: '比亚迪',
            pinyin: 'byd',
            market: 'sz',
          },
          {
            code: '600519',
            name: '贵州茅台',
            pinyin: 'gzmt',
            market: 'sh',
          },
          {
            code: '300750',
            name: '宁德时代',
            pinyin: 'ndsd',
            market: 'sz',
          },
        ],
      }
    },
  },
  // 模拟个股实时行情
  {
    url: '/api/v1/stock/quote',
    method: 'get',
    response: ({ query }: any) => {
      const code = query.code
      const stocks: any = {
        '002594': {
          code: '002594',
          name: '比亚迪',
          price: 238.9,
          change: -2.1,
          changePercent: -0.87,
          volume: 125000,
          amount: 29.86,
          high: 243.5,
          low: 236.8,
          open: 241.0,
          preClose: 241.0,
          turnoverRate: 1.23,
          pe: 25.6,
          marketValue: 6987.65,
        },
        '300750': {
          code: '300750',
          name: '宁德时代',
          price: 215.6,
          change: 3.32,
          changePercent: 1.56,
          volume: 58000,
          amount: 12.54,
          high: 218.5,
          low: 212.3,
          open: 213.5,
          preClose: 213.5,
          turnoverRate: 0.18,
          pe: 25.6,
          marketValue: 12345.67,
        },
        '600519': {
          code: '600519',
          name: '贵州茅台',
          price: 1780.0,
          change: 40.68,
          changePercent: 2.34,
          volume: 23000,
          amount: 40.94,
          high: 1785.0,
          low: 1735.0,
          open: 1742.0,
          preClose: 1739.32,
          turnoverRate: 0.18,
          pe: 32.4,
          marketValue: 22345.67,
        },
      }
      return {
        code: 0,
        msg: 'success',
        data: stocks[code || '002594'] || stocks['002594'],
      }
    },
  },
  // 模拟K线数据
  {
    url: '/api/v1/stock/kline',
    method: 'get',
    response: () => {
      const data = []
      let basePrice = 230
      for (let i = 30; i >= 0; i--) {
        const open = basePrice + Math.random() * 10 - 5
        const close = open + Math.random() * 10 - 5
        const high = Math.max(open, close) + Math.random() * 5
        const low = Math.min(open, close) - Math.random() * 5
        const date = new Date()
        date.setDate(date.getDate() - i)
        data.push({
          time: date.toISOString().split('T')[0],
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume: Math.floor(Math.random() * 100000 + 10000),
        })
        basePrice = close
      }
      return {
        code: 0,
        msg: 'success',
        data,
      }
    },
  },
  // 模拟分时K线数据
  {
    url: '/api/v1/stock/time-kline',
    method: 'get',
    response: ({ query }: any) => {
      const data = []
      const code = query.code || '002594'
      // 获取对应股票的昨收价
      const basePrice = code === '002594' ? 238.9 : code === '600519' ? 1780 : 215.6
      let currentPrice = basePrice
      const stock = stocks.find((item) => item.code === code)
      // 生成上午交易时间 9:30 - 11:30，共120分钟
      for (let i = 0; i < 120; i++) {
        const hour = i < 30 ? 9 : 10
        const minute = i < 30 ? 30 + i : i - 30
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        // 价格波动
        const change = (Math.random() * 0.02 - 0.01) * basePrice
        currentPrice = Number((currentPrice + change).toFixed(2))
        const avgPrice = Number((currentPrice + (Math.random() * 0.5 - 0.25)).toFixed(2))
        const volume = Math.floor(Math.random() * 10000 + 1000)
        data.push({
          time: timeStr,
          price: currentPrice,
          avgPrice,
          volume,
          preClose: basePrice,
        })
      }

      // 生成下午交易时间 13:00 - 15:00，共120分钟
      for (let i = 0; i < 120; i++) {
        const hour = i < 60 ? 13 : 14
        const minute = i < 60 ? i : i - 60
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const change = (Math.random() * 0.02 - 0.01) * basePrice
        currentPrice = Number((currentPrice + change).toFixed(2))
        const avgPrice = Number((currentPrice + (Math.random() * 0.5 - 0.25)).toFixed(2))
        const volume = Math.floor(Math.random() * 10000 + 1000)
        if (i === 119) {
          currentPrice = basePrice + (stock?.change || 0) || 0
        }
        data.push({
          time: timeStr,
          price: currentPrice,
          avgPrice,
          volume,
          preClose: basePrice,
        })
      }

      return {
        code: 0,
        msg: 'success',
        data,
      }
    },
  },
  // 模拟盘口数据
  {
    url: '/api/v1/stock/depth',
    method: 'get',
    response: () => {
      const basePrice = 238.9
      const asks = []
      const bids = []
      for (let i = 0; i < 5; i++) {
        asks.push({
          price: Number((basePrice + 0.1 * (i + 1)).toFixed(2)),
          volume: Math.floor(Math.random() * 500 + 50),
        })
        bids.push({
          price: Number((basePrice - 0.1 * (i + 1)).toFixed(2)),
          volume: Math.floor(Math.random() * 500 + 50),
        })
      }
      return {
        code: 0,
        msg: 'success',
        data: {
          asks,
          bids: bids.reverse(),
        },
      }
    },
  },
  // 模拟行情排行
  {
    url: '/api/v1/market/rank',
    method: 'get',
    response: () => {
      const data = []
      const names = ['某某科技', '某某股份', '某某集团', '某某药业', '某某能源', '某某电子', '某某医疗', '某某汽车']
      for (let i = 0; i < 8; i++) {
        data.push({
          rank: i + 1,
          code: `300${100 + i}`,
          name: names[i],
          price: Number((Math.random() * 100 + 10).toFixed(2)),
          changePercent: Number((Math.random() * 20 - 5).toFixed(2)),
          volume: Math.floor(Math.random() * 1000000 + 100000),
        })
      }
      data.sort((a, b) => b.changePercent - a.changePercent)
      return {
        code: 0,
        msg: 'success',
        data,
      }
    },
  },
  // 模拟操作自选股
  {
    url: '/api/v1/user/self-stock',
    method: 'post',
    response: () => {
      return {
        code: 0,
        msg: 'success',
        data: {},
      }
    },
  },
  // 模拟登录
  {
    url: '/api/v1/login',
    method: 'post',
    response: ({ body }: any) => {
      const { username, password } = body
      if ((username === 'admin' || username === 'admin@example.com') && password === '123456') {
        return {
          code: 0,
          msg: '登录成功',
          data: {
            token: 'mock-token-' + Date.now(),
            user: {
              id: 1,
              username: 'admin',
              email: 'admin@example.com',
              balance: 100000,
            },
          },
        }
      }
      return {
        code: 400,
        msg: '用户名或密码错误，测试账号：admin/123456',
      }
    },
  },
  // 模拟注册
  {
    url: '/api/v1/register',
    method: 'post',
    response: () => {
      return {
        code: 0,
        msg: '注册成功',
      }
    },
  },
  // 模拟交易
  {
    url: '/api/v1/trade',
    method: 'post',
    response: () => {
      return {
        code: 0,
        msg: '交易成功',
      }
    },
  },
]

console.log('Mock 数据已加载')
