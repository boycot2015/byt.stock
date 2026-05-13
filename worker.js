// 密码工具函数 - 安全哈希存储
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)

  const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits'])
  const keyBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256)

  return btoa(String.fromCharCode(...salt)) + ':' + btoa(String.fromCharCode(...new Uint8Array(keyBits)))
}

// 密码验证
async function verifyPassword(password, hash) {
  const [saltBase64, hashBase64] = hash.split(':')
  if (!saltBase64 || !hashBase64) return false

  const salt = new Uint8Array(
    atob(saltBase64)
      .split('')
      .map((c) => c.charCodeAt(0)),
  )
  const storedHash = atob(hashBase64)
    .split('')
    .map((c) => c.charCodeAt(0))

  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)
  const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits'])
  const keyBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256)
  const computedHash = Array.from(new Uint8Array(keyBits))

  // 安全比较，防止时序攻击
  if (computedHash.length !== storedHash.length) return false
  let diff = 0
  for (let i = 0; i < computedHash.length; i++) {
    diff |= computedHash[i] ^ storedHash[i]
  }
  return diff === 0
}

// 生成安全随机Token
function generateToken() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

// 获取节假日日期列表
function getHolidayDates(year) {
  const holidays = [`${year}-01-01`, `${year}-05-01`, `${year}-10-01`, `${year}-10-02`, `${year}-10-03`]

  const lunarHolidays = getLunarHolidays(year)
  return [...holidays, ...lunarHolidays]
}

// 获取农历节假日
function getLunarHolidays(year) {
  const lunarHolidays = {
    2024: ['2024-02-10', '2024-02-11', '2024-02-12', '2024-02-13', '2024-02-14', '2024-04-04', '2024-06-10', '2024-09-17'],
    2025: ['2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02', '2025-04-04', '2025-05-31', '2025-09-07'],
    2026: ['2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-04-04', '2026-06-20', '2026-09-27'],
    2027: ['2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09', '2027-02-10', '2027-04-04', '2027-06-09', '2027-09-15'],
    2028: ['2028-01-26', '2028-01-27', '2028-01-28', '2028-01-29', '2028-01-30', '2028-04-04', '2028-06-28', '2028-10-06'],
  }
  return lunarHolidays[year] || []
}

// 判断是否为周末
function isWeekend(dateStr) {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6
}

// 从第三方API获取节假日数据
async function fetchHolidayFromApi(date, env) {
  const year = date.split('-')[0]
  const weekend = isWeekend(date)

  const apiKey = env.JUHE_API_KEY || ''

  if (apiKey) {
    try {
      const juheUrl = `http://apis.juhe.cn/fapig/calendar/day?date=${date}&key=${apiKey}`
      const response = await fetch(juheUrl)
      const data = await response.json()
      if (data.error_code === 0 && data.result) {
        const holiday = data.result.holiday || {}
        return {
          date: date,
          isHoliday: holiday.status === 1 || weekend,
          isWeekend: weekend,
          isWorkday: !(holiday.status === 1 || weekend),
          holidayName: holiday.name || null,
          source: 'juhe',
        }
      }
    } catch (e) {
      console.log('聚合数据API调用失败，尝试备用方案:', e.message)
    }
  }

  try {
    const tianqiUrl = `http://api.k780.com/?app=life.workday&date=${date}&appkey=10003&sign=b59bc3ef6191eb9f747dd4e83c99f2a4&format=json`
    const response = await fetch(tianqiUrl)
    const data = await response.json()
    if (data.success === '1' && data.result) {
      const workday = data.result.workmk === '1'
      return {
        date: date,
        isHoliday: !workday || weekend,
        isWeekend: weekend,
        isWorkday: workday && !weekend,
        holidayName: data.result.worknm || null,
        source: 'k780',
      }
    }
  } catch (e) {
    console.log('天气网API调用失败，使用本地数据:', e.message)
  }

  const holidays = getHolidayDates(year)
  const isLocalHoliday = holidays.includes(date)

  return {
    date: date,
    isHoliday: isLocalHoliday || weekend,
    isWeekend: weekend,
    isWorkday: !(isLocalHoliday || weekend),
    holidayName: null,
    source: 'local',
  }
}

// 从请求获取用户ID（支持X-User-Id和Bearer Token两种方式）
async function getUserIdFromRequest(request, env) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  let userId = request.headers.get('x-user-id')

  // 优先从Bearer Token获取用户ID
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const tokenUserId = await env.STOCK_KV.get(`token:${token}`)
    if (tokenUserId) userId = tokenUserId
  }

  return userId || 'default_user'
}
const isShStock = (code) => code.startsWith('6') || code.startsWith('00')
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    let path = url.pathname
    const method = request.method

    // 兼容/api/v1前缀
    path = path.replace('/api/v1', '')

    // 统一JSON响应工具 - 和mock格式对齐
    const json = (data, businessCode = 0, msg = 'success', httpStatus = 200) =>
      new Response(
        JSON.stringify({
          code: businessCode,
          msg,
          data,
        }),
        {
          status: httpStatus,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
          },
        },
      )

    // GBK解码工具
    const decodeGBK = async (res) => {
      const buffer = await res.arrayBuffer()
      return new TextDecoder('gbk').decode(buffer)
    }

    // 批量获取股票实时行情
    const batchGetStockQuotes = async (codes) => {
      const result = []
      for (const code of codes) {
        try {
          const market = isShStock(code) ? 'sh' : 'sz'
          const res = await fetch(`http://hq.sinajs.cn/list=${market}${code}`, {
            headers: { Referer: 'https://finance.sina.com.cn' },
          })
          const text = await decodeGBK(res)
          const match = text.match(/var hq_str_\w+="([^"]+)"/)
          if (match) {
            const arr = match[1].split(',')
            const price = parseFloat(arr[3])
            const preClose = parseFloat(arr[2])
            const change = price - preClose
            const changePercent = preClose ? (change / preClose) * 100 : 0
            result.push({
              code,
              name: arr[0],
              price,
              change: Number(change.toFixed(2)),
              changePercent: Number(changePercent.toFixed(2)),
              volume: parseInt(arr[8]) || 0,
              amount: parseFloat(arr[9]) || 0,
              high: parseFloat(arr[4]) || 0,
              low: parseFloat(arr[5]) || 0,
              open: parseFloat(arr[1]) || 0,
              preClose,
              turnoverRate: parseFloat(arr[10] / 100) || 0,
              pe: parseFloat(arr[12]) || 0,
              marketValue: parseFloat(arr[17]) || 0,
            })
          }
        } catch (e) {
          console.error(`获取股票${code}行情失败:`, e)
        }
      }
      return result
    }

    // OPTIONS预检请求处理
    if (method === 'OPTIONS') return json({ code: 200 })

    // 健康检查
    if (path === '/') return json({ code: 200, msg: '✅ 股票API服务正常运行' })

    try {
      // ==============================================
      // 1. 获取大盘指数 匹配接口: GET /market/index
      // ==============================================
      if (path === '/market/index' && method === 'GET') {
        // 新增科创50/上证50/沪深300/中证500/中证1000 主流宽基指数
        const res = await fetch('http://hq.sinajs.cn/list=sh000001,sz399001,sz399006,sh000688,sh000016,sz399300,sh000905,sh000852', {
          headers: { Referer: 'https://finance.sina.com.cn' },
        })
        const text = await decodeGBK(res)
        const lines = text.split('\n').filter((line) => line.trim())
        const result = []

        for (const line of lines) {
          const match = line.match(/var hq_str_(\w+)="([^"]+)"/)
          if (!match) continue
          const [_, code, dataStr] = match
          const arr = dataStr.split(',')
          const price = parseFloat(arr[3])
          const preClose = parseFloat(arr[2])
          const change = price - preClose
          const changePercent = preClose ? (change / preClose) * 100 : 0

          result.push({
            code, // 保留sh/sz前缀和mock对齐
            name: arr[0],
            price,
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
            volume: parseInt(arr[8]) || 0,
            amount: parseFloat(arr[9]) || 0,
          })
        }
        return json(result)
      }

      // ==============================================
      // 2. 获取自选股列表 匹配接口: GET /user/self-stocks
      // ==============================================
      if (path === '/user/self-stocks' && method === 'GET') {
        try {
          // 支持Token和X-User-Id两种用户识别方式
          const userId = await getUserIdFromRequest(request, env)
          // 从KV读取用户自选股代码列表
          const stockCodes = (await env.STOCK_KV.get(`user:${userId}:stocks`, { type: 'json' })) || []
          // 批量获取股票实时行情
          const stockList = await batchGetStockQuotes(stockCodes)
          return json(stockList)
        } catch (e) {
          return json([], 500, `获取自选股失败: ${e.message}`)
        }
      }

      // ==============================================
      // 3. 搜索股票 匹配接口: GET /stock/search?keyword=xxx
      // ==============================================
      if (path === '/stock/search' && method === 'GET') {
        const keyword = url.searchParams.get('keyword') || ''
        if (!keyword) return json(null, 400, '缺少搜索关键词')

        // 替换为新浪稳定搜索接口，无需token，支持代码/名称/拼音全匹配
        const res = await fetch(`https://suggest3.sinajs.cn/suggest/key=${encodeURIComponent(keyword)}&name=suggest_stock`, {
          headers: { Referer: 'https://finance.sina.com.cn' },
        })
        const text = await decodeGBK(res)
        // 判断搜索类型：是否为6位纯数字股票代码搜索
        const isCodeSearch = /^\d{6}$/.test(keyword.trim())
        // 解析新浪返回的js格式数据
        const dataStr = text.match(/"([^"]+)"/)?.[1] || ''
        console.log(dataStr, 'dataStr')

        let list = dataStr
          .split(';')
          .filter((item) => item)
          .map((item) => {
            const arr = item.split(',')
            const fullCode = arr[3] || ''
            const market = fullCode.startsWith('sh') ? 'sh' : fullCode.startsWith('sz') ? 'sz' : 'other'
            const code = fullCode.replace(/^sh|^sz/g, '')
            return {
              code, // 统一返回纯6位数字代码，和现有接口字段一致
              name: arr[4] || '', // 股票名称，强制非空
              market,
            }
          })
        // 代码搜索场景：仅保留完全匹配的结果，排在最前
        if (isCodeSearch) {
          list = list.filter((item) => item.code === keyword.trim()).concat(list.filter((item) => item.code !== keyword.trim()))
        }
        // 最多返回10条结果，过滤名称为空的异常数据
        list = list.filter((item) => item.name).slice(0, 10)
        return json(list)
      }

      // ==============================================
      // 4. 获取个股实时行情 匹配接口: GET /stock/quote?code=xxx
      // ==============================================
      if (path === '/stock/quote' && method === 'GET') {
        const code = url.searchParams.get('code') || ''
        if (!/^\d{6}$/.test(code)) return json(null, 400, '请输入有效的6位股票代码')

        const market = isShStock(code) ? 'sh' : 'sz'
        const res = await fetch(`http://hq.sinajs.cn/list=${market}${code}`, {
          headers: { Referer: 'https://finance.sina.com.cn' },
        })

        const text = await decodeGBK(res)
        // console.log(text, code, 'data');
        const match = text.match(/var hq_str_(\w+)="([^"]+)"/)
        if (!match) return json(null, 404, '未找到该股票数据')

        const arr = match[2].split(',')
        const price = parseFloat(arr[3])
        const preClose = parseFloat(arr[2])
        const change = price - preClose
        const changePercent = preClose ? (change / preClose) * 100 : 0

        return json({
          code,
          name: arr[0],
          price,
          change: Number(change.toFixed(2)),
          changePercent: Number(changePercent.toFixed(2)),
          volume: parseInt(arr[8] / 100000) || 0,
          amount: parseFloat(arr[9] / 10000000000) || 0,
          high: parseFloat(arr[4]) || 0,
          low: parseFloat(arr[5]) || 0,
          open: parseFloat(arr[1]) || 0,
          preClose,
          turnoverRate: parseFloat(arr[10] / 100) || 0,
          pe: parseFloat(arr[12]) || 0,
          marketValue: parseFloat(arr[17]) || 0,
        })
      }

      // ==============================================
      // 5. 获取K线数据 匹配接口: GET /stock/kline?code=xxx&period=xxx&count=xxx
      // ==============================================
      if (path === '/stock/kline' && method === 'GET') {
        const code = url.searchParams.get('code') || ''
        const period = url.searchParams.get('period') || 'day'
        const count = parseInt(url.searchParams.get('count') || '100')

        if (!/^\d{6}$/.test(code)) return json(null, 400, '请输入有效的6位股票代码')

        const market = isShStock(code) ? '1' : '0'
        let periodId,
          adjust = 'qfq'

        switch (period) {
          case 'day':
            periodId = 101
            break
          case 'week':
            periodId = 102
            break
          case 'month':
            periodId = 103
            break
          case '1min':
            periodId = 1
            break
          case '5min':
            periodId = 5
            break
          case '15min':
            periodId = 15
            break
          case '30min':
            periodId = 30
            break
          case '60min':
            periodId = 60
            break
          default:
            return json(null, 400, '无效的周期参数，支持：day/week/month/1min/5min/15min/30min/60min')
        }

        const res = await fetch(`https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${market}.${code}&ut=7e18b5514514e48b4864a7a89e73e62d&fields1=f1%2Cf2%2Cf3%2Cf4%2Cf5%2Cf6&fields2=f51%2Cf52%2Cf53%2Cf54%2Cf55%2Cf56%2Cf57&klt=${periodId}&fqt=${adjust === 'qfq' ? 1 : adjust === 'hfq' ? 2 : 0}&beg=0&end=20500101&lmt=${count}`)
        const result = await res.json()
        const klines = result?.data?.klines || []

        const data = klines.map((line) => {
          const [time, open, close, high, low, volume, amount] = line.split(',')
          return {
            time: time.includes(' ') ? time.split(' ')[0] : time,
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close),
            volume: parseInt(volume),
          }
        })
        return json(data)
      }

      // ==============================================
      // 6. 获取分时K线数据 匹配接口: GET /stock/time-kline?code=xxx
      // ==============================================
      if (path === '/stock/time-kline' && method === 'GET') {
        const code = url.searchParams.get('code') || ''
        // console.log(code, 'trends');
        if (!/^\d{6}$/.test(code)) return json(null, 400, '请输入有效的6位股票代码')
        const market = isShStock(code) ? '1' : '0'
        const res = await fetch(`https://push2.eastmoney.com/api/qt/stock/trends2/get?secid=${market}.${code}&ut=7e18b5514514e48b4864a7a89e73e62d&fields1=f1%2Cf2%2Cf3%2Cf4%2Cf5%2Cf6%2Cf7%2Cf8%2Cf9%2Cf10%2Cf11%2Cf12%2Cf13&fields2=f51%2Cf52%2Cf53%2Cf54%2Cf55%2Cf56%2Cf57%2Cf58&iscr=0&iscca=0`)
        const result = await res.json()
        const trends = result?.data?.trends || []
        // console.log(result?.data, 'trends');
        // 获取昨收价，兼容不同返回结构
        const preClose = result?.data?.preClose || parseFloat(result?.data?.qt?.[Object.keys(result?.data?.qt || {})[0]]?.[4]) || 0
        try {
          // 分时成交量买卖盘正负区分：上涨为买盘(+)，下跌为卖盘(-)
          const data = []
          let lastPrice = preClose // 初始对比基准为昨收价
          for (const line of trends) {
            const [time, price, avg, newPrice, newPrice2, volume] = line.split(',')
            const currentPrice = parseFloat(price)
            let vol = parseInt(volume) || 0 // 容错处理，避免NaN

            // 买卖盘方向判断
            if (currentPrice > lastPrice) {
              vol = Math.abs(vol) // 价格上涨：主动性买盘，正
            } else if (currentPrice < lastPrice) {
              vol = -Math.abs(vol) // 价格下跌：主动性卖盘，负
            } else {
              // 价格平盘时，符号继承上一笔的方向，保持数据连续性
              vol = lastPrice > preClose ? Math.abs(vol) : -Math.abs(vol)
            }

            data.push({
              preClose,
              time: time.split(' ')[1] || time, // 提取HH:mm部分和mock对齐
              price: currentPrice,
              avgPrice: parseFloat(avg),
              volume: vol,
            })
            lastPrice = currentPrice // 更新上一笔价格用于下一次对比
          }
          return json(data)
        } catch (e) {
          return json([], 500, `获取分时K线数据失败: ${e.message}`)
        }
      }

      // ==============================================
      // 7. 获取盘口数据 匹配接口: GET /stock/depth?code=xxx
      // ==============================================
      if (path === '/stock/depth' && method === 'GET') {
        const code = url.searchParams.get('code') || ''
        if (!/^\d{6}$/.test(code)) return json(null, 400, '请输入有效的6位股票代码')

        const market = isShStock(code) ? 'sh' : 'sz'
        // 改用东方财富稳定盘口接口
        const secid = (code.startsWith('6') || code.startsWith('00') ? '1' : '0') + '.' + code
        const fields = Array.from({ length: 200 }, (_, i) => `f${i + 1}`).join(',')
        // https://push2.eastmoney.com/api/qt/stock/get?ut=fa5fd1943c7b386f172d6893dbfba10b&invt=2&fltt=2&fields=f43,f57,f58,f169,f170,f46,f44,f51,f168,f47,f164,f116,f60,f45,f52,f50,f48,f167,f117,f71,f161,f49,f530,f135,f136,f137,f138,f139,f141,f142,f144,f145,f147,f148,f140,f143,f146,f149,f55,f62,f162,f92,f173,f104,f105,f84,f85,f183,f184,f185,f186,f187,f188,f189,f190,f191,f192,f107,f111,f86,f177,f78,f110,f262,f263,f264,f267,f268,f250,f251,f252,f253,f254,f255,f256,f257,f258,f266,f269,f270,f271,f273,f274,f275,f127,f199,f128,f193,f196,f194,f195,f197,f80,f280,f281,f282,f284,f285,f286,f287&secid=0.000100
        const res = await fetch(`https://push2.eastmoney.com/api/qt/stock/get?fields=${fields}&invt=1&fltt=2&secid=${secid}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        })
        const result = await res.json()
        // console.log(result, fields, 'depth');
        const data = result?.data
        if (!data || !data.f46) return json(null, 404, '未找到该股票盘口数据')
        const asks = []
        const bids = []

        // 卖1到卖5：f46(卖1价),f47(卖1量),f48(卖2价),f49(卖2量)...
        for (let i = 0; i <= 2; i++) {
          const price = data[`f${44 + i}`]
          const volume = parseInt(data[`f${47 + i}`] / 1000) || 0
          asks.push({
            price: price || 0,
            volume: volume || 0,
          })
        }

        // 买1到买5：f56(买1价),f57(买1量),f58(买2价),f59(买2量)...
        for (let i = 0; i < 3; i++) {
          const price = data[`f${174 + i * 5}`] || data[`f${60}`]
          const volume = parseInt(data[`f${84 + i}`] / 1000) || 0
          bids.push({
            price: price || 0,
            volume: volume || 0,
          })
        }

        return json({ asks, bids })
      }

      // ==============================================
      // 8. 获取行情排行 匹配接口: GET /market/rank?type=xxx&count=xxx
      // ==============================================
      if (path === '/market/rank' && method === 'GET') {
        const type = url.searchParams.get('type') || 'rise'
        const count = parseInt(url.searchParams.get('count') || '20')

        const baseUrl = `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=${count}&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f2,f3,f4,f5,f6,f12,f14`
        let apiUrl

        switch (type) {
          case 'rise':
            apiUrl = baseUrl + '&po=1&fid=f3'
            break // 涨幅
          case 'fall':
            apiUrl = baseUrl + '&po=0&fid=f3'
            break // 跌幅
          case 'volume':
            apiUrl = baseUrl + '&po=1&fid=f5'
            break // 成交量
          case 'amount':
            apiUrl = baseUrl + '&po=1&fid=f6'
            break // 成交额
          default:
            apiUrl = baseUrl + '&po=1&fid=f3'
        }

        const res = await fetch(apiUrl)
        const result = await res.json()
        const data = result?.data?.diff || []
        // console.log(data, 'rank');
        const list = Object.values(data).map((item, index) => ({
          rank: index + 1,
          code: item.f12,
          name: item.f14,
          price: item.f2 === '-' ? 0 : parseFloat(item.f2),
          changePercent: item.f3 === '-' ? 0 : parseFloat(item.f3),
          volume: item.f5 === '-' ? 0 : parseInt(item.f5),
        }))
        return json(list)
      }

      // ==============================================
      // 9. 操作自选股 匹配接口: POST /user/self-stock
      // ==============================================
      if (path === '/user/self-stock' && method === 'POST') {
        try {
          const body = await request.json()
          const { code, action } = body

          if (!/^\d{6}$/.test(code)) return json(null, 400, '请输入有效的6位股票代码')
          if (!['add', 'delete'].includes(action)) return json(null, 400, 'action只能是add或delete')

          // 支持Token和X-User-Id两种用户识别方式
          const userId = await getUserIdFromRequest(request, env)
          // 读取现有自选股列表
          let stockCodes = (await env.STOCK_KV.get(`user:${userId}:stocks`, { type: 'json' })) || []

          if (action === 'add') {
            // 去重添加
            if (!stockCodes.includes(code)) {
              stockCodes.push(code)
            }
          } else if (action === 'delete') {
            // 删除指定股票
            stockCodes = stockCodes.filter((item) => item !== code)
          }

          // 保存到KV
          await env.STOCK_KV.put(`user:${userId}:stocks`, JSON.stringify(stockCodes))

          return json({ success: true })
        } catch (e) {
          return json({ success: false }, 500, `操作自选股失败: ${e.message}`)
        }
      }

      // ==============================================
      // 10. 用户注册接口 匹配接口: POST /user/register
      // ==============================================
      if (path === '/user/register' && method === 'POST') {
        try {
          const body = await request.json()
          const { username, password, email } = body

          // 参数校验
          if (!username || username.length < 3 || username.length > 20) {
            return json(null, 400, '用户名长度必须在3-20位之间')
          }
          if (!password || password.length < 6 || password.length > 32) {
            return json(null, 400, '密码长度必须在6-32位之间')
          }
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (email && !emailRegex.test(email)) {
            return json(null, 400, '请输入有效的邮箱地址')
          }

          // 唯一性校验
          const existingUser = await env.STOCK_KV.get(`user:${username}`)
          if (existingUser) {
            return json(null, 400, '用户名已存在')
          }
          if (email) {
            const existingEmail = await env.STOCK_KV.get(`email:${email}`)
            if (existingEmail) {
              return json(null, 400, '邮箱已被注册')
            }
          }

          // 密码哈希存储
          const passwordHash = await hashPassword(password)
          const userId = generateToken()

          // 存储用户信息
          const userInfo = {
            id: userId,
            username,
            email: email || '',
            passwordHash,
            balance: 100000, // 默认初始资金10万
            createdAt: new Date().toISOString(),
          }
          await env.STOCK_KV.put(`user:${username}`, JSON.stringify(userInfo))
          if (email) {
            await env.STOCK_KV.put(`email:${email}`, username)
          }
          await env.STOCK_KV.put(`userid:${userId}`, username)

          // 生成登录Token，有效期7天
          const token = generateToken()
          await env.STOCK_KV.put(`token:${token}`, userId, { expirationTtl: 60 * 60 * 24 * 7 })

          return json(
            {
              token,
              user: {
                id: userId,
                username,
                email: email || '',
                balance: 100000,
              },
            },
            0,
            '注册成功',
          )
        } catch (e) {
          return json(null, 500, `注册失败: ${e.message}`)
        }
      }

      // ==============================================
      // 11. 用户登录接口 匹配接口: POST /user/login
      // ==============================================
      if (path === '/user/login' && method === 'POST') {
        try {
          const body = await request.json()
          const { username, password } = body

          if (!username || !password) {
            return json(null, 400, '用户名和密码不能为空')
          }

          // 查找用户
          const userStr = await env.STOCK_KV.get(`user:${username}`)
          if (!userStr) {
            return json(null, 400, '用户名或密码错误')
          }
          const userInfo = JSON.parse(userStr)

          // 验证密码
          const passwordValid = await verifyPassword(password, userInfo.passwordHash)
          if (!passwordValid) {
            return json(null, 400, '用户名或密码错误')
          }

          // 生成新的Token，有效期7天
          const token = generateToken()
          await env.STOCK_KV.put(`token:${token}`, userInfo.id, { expirationTtl: 60 * 60 * 24 * 7 })

          return json(
            {
              token,
              user: {
                id: userInfo.id,
                username: userInfo.username,
                email: userInfo.email || '',
                balance: userInfo.balance,
              },
            },
            0,
            '登录成功',
          )
        } catch (e) {
          return json(null, 500, `登录失败: ${e.message}`)
        }
      }
      // ==============================================
      // 12. 节假日查询接口 匹配接口: GET /holiday
      // ==============================================
      if (path === '/holiday' && method === 'GET') {
        try {
          const url = new URL(request.url)
          const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]
          console.log(date, 'date')
          const holidayData = await fetchHolidayFromApi(date, env)

          return json({
            date: holidayData.date,
            isHoliday: holidayData.isHoliday,
            isWeekend: holidayData.isWeekend,
            isWorkday: holidayData.isWorkday,
            holidayName: holidayData.holidayName || null,
            source: holidayData.source,
          })
        } catch (e) {
          return json(null, 500, `查询节假日失败: ${e.message}`)
        }
      }

      // 404
      return json(null, 404, '接口不存在')
    } catch (e) {
      return json(null, 500, `服务器错误: ${e.message}`)
    }
  },
}
