import { getStore } from "@edgeone/pages-blob";

// ============================================================
// 存储抽象层：优先 Pages Blob，本地开发自动降级到内存
// ============================================================

// 内存存储（本地开发兜底）
class MemoryBlob {
  constructor() { this.map = new Map() }
  async get(key, { type } = {}) {
    const v = this.map.get(key)
    if (v === undefined) return null
    return type === "json" ? v : (typeof v === "string" ? v : JSON.stringify(v))
  }
  async setJSON(key, value) { this.map.set(key, value) }
  async set(key, value) { this.map.set(key, value) }
  async delete(key) { this.map.delete(key) }
  async list({ prefix } = {}) {
    const blobs = [...this.map.keys()]
      .filter((k) => !prefix || k.startsWith(prefix))
      .map((k) => ({ key: k, etag: "" }))
    return { blobs }
  }
}

let _store = null
function getBlobStore() {
  if (_store) return _store
  try {
    _store = getStore("stock-store")
  } catch (e) {
    console.warn("[blob] Pages Blob not available, falling back to in-memory store:", e.message)
    _store = new MemoryBlob()
  }
  return _store
}

/**
 * 存储工具：基于 @edgeone/pages-blob 原生 API
 * - 所有写入统一走 setJSON（自动带 application/json），规避 COS Param Invalid
 * - 值统一包装为 { t, v } 结构，t 表示类型，v 表示原值
 * - TTL 用辅助键 `${key}:__exp` 存储到期时间戳（秒），读取时惰性检查
 */

async function blobGet(key, { type } = {}) {
  const store = getBlobStore()
  // TTL 检查（TTL 辅助键也是 JSON 存储：{ exp: 时间戳秒数 }）
  try {
    const expObj = await store.get(`${key}:__exp`, { type: "json" })
    if (expObj && typeof expObj.exp === "number" && Date.now() / 1000 > expObj.exp) {
      await store.delete(key).catch(() => {})
      await store.delete(`${key}:__exp`).catch(() => {})
      return null
    }
  } catch (_) {
    /* ignore */
  }
  return await store.get(key, { type: "json" })
}

async function blobPut(key, value, { expirationTtl } = {}) {
  const store = getBlobStore()
  // 优先尝试 setJSON；若是字符串则 JSON.parse 后再写
  let payload = value
  if (typeof value === "string") {
    // 字符串：统一包成对象避免 set 缺 Content-Type
    payload = { __str: value }
  } else if (value === null || value === undefined) {
    payload = { __null: true }
  }
  await store.setJSON(key, payload)
  // TTL 辅助键（用数字值）
  if (expirationTtl && Number.isFinite(expirationTtl)) {
    const expireAt = Math.floor(Date.now() / 1000) + expirationTtl
    await store.setJSON(`${key}:__exp`, { exp: expireAt }).catch((e) =>
      console.warn(`[blob] ttl put failed for ${key}:`, e?.message),
    )
  }
}

async function blobDelete(key) {
  const store = getBlobStore()
  try { await store.delete(key) } catch (_) {}
  try { await store.delete(`${key}:__exp`) } catch (_) {}
}

/**
 * 获取用户数据（读 user:xxx 键，值为 JSON 对象）
 */
async function getUserByUsername(username) {
  const raw = await blobGet(`user:${username}`)
  if (!raw || raw.__null) return null
  // 可能存储的是字符串化的 JSON，也可能直接是对象
  if (raw.__str) {
    try { return JSON.parse(raw.__str) } catch (_) { return null }
  }
  return raw
}

/**
 * 获取字符串值（email:xxx / userid:xxx / token:xxx 等映射键）
 */
async function getBlobString(key) {
  const raw = await blobGet(key)
  if (!raw || raw.__null) return null
  if (raw.__str) return raw.__str
  // 兼容老数据
  if (typeof raw === "string") return raw
  return raw
}

/**
 * 写入字符串值（用 { __str: value } 包装，统一走 setJSON）
 */
async function putBlobString(key, value, opts = {}) {
  await blobPut(key, String(value), opts)
}

/**
 * context.request

{
body:ReadableStream{
  locked:false
},
bodyUsed:false,
cache:'default',
credentials:'same-origin',
destination:'',
headers:Headers{
},
integrity:'',
method:'GET',
mode:'cors',
redirect:'follow',
referrer:'about:client',
referrerPolicy:'',
url:'https://fae7a964-055a-44b2-9f09-8c8433c87243.edgeone.site/api/index',
cf:{
  geo:{
    asn:4134,
    countryName:'China',
    countryCodeAlpha2:'CN',
    countryCodeAlpha3:'CHN',
    countryCodeNumeric:'156',
    regionName:'Guangdong',
    regionCode:'CN-GD',
    cityName:'Shenzhen',
    continent:'',
    latitude:22.555160522460938,
    longitude:114.05387878417969,
    cisp:'中国电信'
  },
  tls:{
    version:'TLS1.3',
    cipher:'TLS_AES_256_GCM_SHA384',
    clientHelloLength:'1617',
    clientCiphersSha1:'kXrN3VEKDdzz2cPKTQaKzpxVTxQ=',
    clientRandom:'IJCFlWETazw6MwgZpyw4Z5ssrbwG0JZckzpkmWm1Ir0=',
    clientExtensionsSha1:'qVED19fS2O5Dk56tD75RlZLV86A=',
    clientExtensionsSha1Le:'oPPVkpVRvg+tnpND7tjS19cDUak='
  },
  httpProtocol:'HTTP/1.1',
  clientPort:49818,
  uuid:'2273205920185977099',
  clientIp:'113.89.232.80'
},
eo:{
  geo:{
    asn:4134,
    countryName:'China',
    countryCodeAlpha2:'CN',
    countryCodeAlpha3:'CHN',
    countryCodeNumeric:'156',
    regionName:'Guangdong',
    regionCode:'CN-GD',
    cityName:'Shenzhen',
    continent:'',
    latitude:22.555160522460938,
    longitude:114.05387878417969,
    cisp:'中国电信'
  },
  tls:{
    version:'TLS1.3',
    cipher:'TLS_AES_256_GCM_SHA384',
    clientHelloLength:'1617',
    clientCiphersSha1:'kXrN3VEKDdzz2cPKTQaKzpxVTxQ=',
    clientRandom:'IJCFlWETazw6MwgZpyw4Z5ssrbwG0JZckzpkmWm1Ir0=',
    clientExtensionsSha1:'qVED19fS2O5Dk56tD75RlZLV86A=',
    clientExtensionsSha1Le:'oPPVkpVRvg+tnpND7tjS19cDUak='
  },
  httpProtocol:'HTTP/1.1',
  clientPort:49818,
  uuid:'2273205920185977099',
  clientIp:'113.89.232.80'
},
version:'HTTP/1.1',
maxFollow:12
}
 */
// ============================================================
// 纯 JS 实现 SHA-256 + PBKDF2（EdgeOne 边缘环境无 crypto.subtle）
// ============================================================

// 安全随机数：优先 crypto.getRandomValues，没有则退化
function secureRandomBytes(n) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(n)
    crypto.getRandomValues(arr)
    return arr
  }
  // 退化方案：Math.random + 时间熵（仅用于非密码学随机，如 token）
  const arr = new Uint8Array(n)
  const t = Date.now()
  for (let i = 0; i < n; i++) {
    arr[i] = Math.floor(Math.random() * 256) ^ ((t >> (i % 4) * 8) & 0xff)
  }
  return arr
}

// SHA-256 纯 JS 实现
const SHA256_K = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
])

function sha256(message) {
  // message: Uint8Array
  const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19])
  const bitLen = message.length * 8

  // padding
  const blockLen = Math.ceil((message.length + 9) / 64) * 64
  const padded = new Uint8Array(blockLen)
  padded.set(message)
  padded[message.length] = 0x80
  const view = new DataView(padded.buffer)
  // 64-bit big-endian length (high 32 bits always 0 for our size)
  view.setUint32(blockLen - 8, 0)
  view.setUint32(blockLen - 4, bitLen)

  const W = new Uint32Array(64)
  for (let block = 0; block < blockLen; block += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(block + i * 4)
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3)
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10)
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0
    }

    let [a,b,c,d,e,f,g,h] = H
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + ch + SHA256_K[i] + W[i]) | 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) | 0
      h = g
      g = f
      f = e
      e = (d + temp1) | 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) | 0
    }
    H[0] = (H[0] + a) | 0
    H[1] = (H[1] + b) | 0
    H[2] = (H[2] + c) | 0
    H[3] = (H[3] + d) | 0
    H[4] = (H[4] + e) | 0
    H[5] = (H[5] + f) | 0
    H[6] = (H[6] + g) | 0
    H[7] = (H[7] + h) | 0
  }

  const out = new Uint8Array(32)
  const outView = new DataView(out.buffer)
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, H[i])
  return out
}

function rotr(x, n) { return ((x >>> n) | (x << (32 - n))) | 0 }

// HMAC-SHA256
function hmacSha256(key, message) {
  // key, message: Uint8Array
  let k = key
  if (k.length > 64) {
    k = sha256(k)
  }
  const kPadded = new Uint8Array(64)
  kPadded.set(k)

  const oPad = new Uint8Array(64)
  const iPad = new Uint8Array(64)
  for (let i = 0; i < 64; i++) {
    oPad[i] = kPadded[i] ^ 0x5c
    iPad[i] = kPadded[i] ^ 0x36
  }
  const inner = new Uint8Array(64 + message.length)
  inner.set(iPad)
  inner.set(message, 64)
  const innerHash = sha256(inner)

  const outer = new Uint8Array(64 + 32)
  outer.set(oPad)
  outer.set(innerHash, 64)
  return sha256(outer)
}

// PBKDF2-HMAC-SHA256
function pbkdf2Sha256(password, salt, iterations, dkLen) {
  const encoder = new TextEncoder()
  const P = typeof password === 'string' ? encoder.encode(password) : password
  const S = typeof salt === 'string' ? encoder.encode(salt) : salt

  const hLen = 32
  const l = Math.ceil(dkLen / hLen)
  const dk = new Uint8Array(l * hLen)

  const saltWithIndex = new Uint8Array(S.length + 4)
  saltWithIndex.set(S)

  for (let i = 1; i <= l; i++) {
    saltWithIndex[S.length + 0] = (i >>> 24) & 0xff
    saltWithIndex[S.length + 1] = (i >>> 16) & 0xff
    saltWithIndex[S.length + 2] = (i >>> 8) & 0xff
    saltWithIndex[S.length + 3] = i & 0xff

    let u = hmacSha256(P, saltWithIndex)
    let t = new Uint8Array(u)
    for (let c = 1; c < iterations; c++) {
      u = hmacSha256(P, u)
      for (let j = 0; j < hLen; j++) t[j] ^= u[j]
    }
    dk.set(t, (i - 1) * hLen)
  }
  return dk.slice(0, dkLen)
}

// Base64 工具（Uint8Array <-> base64 string）
function bytesToBase64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}
function base64ToBytes(str) {
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// ============================================================
// 密码工具函数 - 安全哈希存储（纯 JS 实现，兼容 EdgeOne）
// ============================================================

// 注意：为适配 EdgeOne 边缘环境性能，默认迭代次数 10000
// 纯 JS PBKDF2 性能约 60ms/万次
const PBKDF2_DEFAULT_ITERATIONS = 10000
// 历史迭代次数（早期 crypto.subtle 版本）
const PBKDF2_LEGACY_ITERATIONS = 100000

// 存储格式：saltBase64:iterations:hashBase64
// 老格式（无迭代次数段）兼容：默认按 legacy 尝试，失败再试 default
async function hashPassword(password) {
  const salt = secureRandomBytes(16)
  const hash = pbkdf2Sha256(password, salt, PBKDF2_DEFAULT_ITERATIONS, 32)
  return bytesToBase64(salt) + ':' + PBKDF2_DEFAULT_ITERATIONS + ':' + bytesToBase64(hash)
}

async function verifyPassword(password, hash) {
  const parts = hash.split(':')
  if (parts.length < 2 || parts.length > 3) return false

  try {
    let saltBase64, hashBase64, iterations
    if (parts.length === 3) {
      // 新格式：salt:iter:hash
      ;[saltBase64, iterations, hashBase64] = parts
      iterations = parseInt(iterations, 10)
      if (!Number.isFinite(iterations) || iterations < 1) return false
    } else {
      // 老格式（2段）：先试 legacy 10万次，失败再试 default 1万次
      ;[saltBase64, hashBase64] = parts
    }

    const salt = base64ToBytes(saltBase64)
    const storedHash = base64ToBytes(hashBase64)

    function constantTimeEquals(a, b) {
      if (a.length !== b.length) return false
      let diff = 0
      for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
      return diff === 0
    }

    if (iterations) {
      const computed = pbkdf2Sha256(password, salt, iterations, 32)
      return constantTimeEquals(computed, storedHash)
    }

    // 老格式：先试 10 万次（旧 crypto.subtle 版本）
    const legacyHash = pbkdf2Sha256(password, salt, PBKDF2_LEGACY_ITERATIONS, 32)
    if (constantTimeEquals(legacyHash, storedHash)) return true

    // 再试 1 万次（早期误存的 default 数据）
    const defaultHash = pbkdf2Sha256(password, salt, PBKDF2_DEFAULT_ITERATIONS, 32)
    return constantTimeEquals(defaultHash, storedHash)
  } catch (_) {
    return false
  }
}

// 生成安全随机Token
function generateToken() {
  const array = secureRandomBytes(32)
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
async function fetchHolidayFromApi(date) {
  const year = date.split('-')[0]
  const weekend = isWeekend(date)

  const apiKey = (typeof process !== 'undefined' && process.env?.JUHE_API_KEY) || ''

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
async function getUserIdFromRequest(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  let userId = request.headers.get('x-user-id')

  // 优先从Bearer Token获取用户ID
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const tokenUserId = await getBlobString(`token:${token}`)
    if (tokenUserId) userId = tokenUserId
  }

  return userId || 'default_user'
}
// 上海指数代码列表（000开头）
const SH_INDEX_CODES = ['000001', '000016', '000905', '000688', '000852']

const isShStock = (code) => {
  // 上海指数（000开头特定代码）
  if (SH_INDEX_CODES.includes(code)) return true
  // 股票：60/68开头 = 上海
  if (code.startsWith('6') || code.startsWith('68')) return true
  // 基金：51/52/58开头 = 上海
  const prefix = code.substring(0, 2)
  if (['51', '52', '58'].includes(prefix)) return true
  return false
}

// 接口内存缓存（同 isolate 内共享）
const apiCache = new Map()

function getCached(key) {
  const item = apiCache.get(key)
  if (item && item.expireAt > Date.now()) {
    return item.data
  }
  if (item) apiCache.delete(key)
  return null
}

function setCache(key, data, ttlMs = 5000) {
  apiCache.set(key, { data, expireAt: Date.now() + ttlMs })
}
export default async function onRequest({ request }) {
    // Pages Blob 单例已在模块级初始化，直接使用 blobGet / blobPut / blobDelete / getUserByUsername / getBlobString / putBlobString

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

    // 根据分类获取新闻列表
    const fetchNewsByCategory = async (lid, page, count) => {
      const apiUrl = `https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=${lid}&num=${count}&page=${page}`
      const res = await fetch(apiUrl, {
        headers: { Referer: 'https://finance.sina.com.cn' },
      })
      const result = await res.json()

      if (!result || !result.result || !result.result.data) {
        return []
      }

      return result.result.data.map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary || '',
        source: item.source || '新浪财经',
        publishTime: item.pubtime,
        url: item.url,
      }))
    }

    // 根据股票代码获取个股行情动态
    const fetchStockNewsByCode = async (code, count) => {
      const market = isShStock(code) ? 'sh' : 'sz'
      const result = {}

      try {
        const stockApi = `http://hq.sinajs.cn/list=${market}${code}`
        const stockRes = await fetch(stockApi, {
          headers: { Referer: 'https://finance.sina.com.cn' },
        })
        const stockText = await decodeGBK(stockRes)
        const stockMatch = stockText.match(/var hq_str_\w+="([^"]+)"/)

        if (stockMatch) {
          const arr = stockMatch[1].split(',')
          const price = parseFloat(arr[3])
          const preClose = parseFloat(arr[2])
          const change = price - preClose
          const changePercent = preClose ? (change / preClose) * 100 : 0

          result.stock = {
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
          }
        }
      } catch (e) {
        console.error(`获取股票${code}行情失败:`, e)
      }

      const newsList = []
      const stockName = result.stock?.name || ''
      try {
        const eastmoneyUrl = `https://finance.eastmoney.com/`
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: `https://quote.eastmoney.com/${market}${code}.html`,
        }
        const res = await fetch(eastmoneyUrl, { headers })
        const html = await res.text()

        const listMatches = html.match(/<ul\s+class="list list_common dot"[^>]*>([\s\S]*?)<\/ul>/gi)
        if (listMatches) {
          const linkRegex = /<li>\s*<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>\s*<\/li>/gi
          let newsCount = 0
          for (const listContent of listMatches) {
            let match
            linkRegex.lastIndex = 0

            while ((match = linkRegex.exec(listContent)) !== null && newsCount < count) {
              const url = match[1]
              const title = match[2].trim()
              if (url.startsWith('https://finance.eastmoney.com/a/') && title) {
                const idMatch = url.match(/(\d+)\.html$/)
                newsList.unshift({
                  id: idMatch ? idMatch[1] : `em_${newsCount}`,
                  title,
                  summary: '',
                  source: '东方财富',
                  publishTime: new Date().toISOString().substring(0, 19).split('T')[0],
                  url,
                })
                newsCount++
              }
            }
          }
        }
      } catch (e) {
        console.error(`获取股票${code}东方财富新闻失败:`, e)
      }
      try {
        const newsApi = `https://suggest3.sinajs.cn/suggest/key=${encodeURIComponent(stockName + ' 股票')}&name=suggest_news`
        const newsRes = await fetch(newsApi, {
          headers: { Referer: 'https://finance.sina.com.cn' },
        })
        const newsText = await decodeGBK(newsRes)
        const newsMatch = newsText.match(/"([^"]+)"/)

        if (newsMatch) {
          const newsData = newsMatch[1]
            .split(';')
            .filter((item) => item)
            .slice(0, count)
          newsList.push(
            ...newsData
              .map((item, index) => {
                const arr = item.split(',')
                return {
                  id: `news_${code}_${index}`,
                  title: arr[1] || '',
                  summary: arr[2] || '',
                  source: arr[4] || '新浪财经',
                  publishTime: arr[5] || new Date().toISOString(),
                  url: arr[0] || '',
                }
              })
              .filter((item) => item.title),
          )
        }
      } catch (e) {
        console.error(`获取股票${code}新浪新闻失败:`, e)
      }

      result.news = newsList.slice(0, count).sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime))
      return result
    }

    // OPTIONS预检请求处理
    if (method === 'OPTIONS') return json({ code: 200 })

    // 健康检查
    if (path === '/index') return json({ code: 200, msg: '✅ 股票API服务正常运行' })

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
          const userId = await getUserIdFromRequest(request)
          // 从Pages Blob读取用户自选股代码列表
          const raw = await blobGet(`user:${userId}:stocks`)
          const stockCodes = Array.isArray(raw) ? raw : (raw?.__str ? JSON.parse(raw.__str) : [])
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
        list = list.filter((item) => item.name && item.code && (item.code.length === 6 || item.code.startsWith('sh') || item.code.startsWith('sz'))).slice(0, 10)
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

        const res = await fetch(`https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${market}.${code}&ut=7e18b5514514e48b4864a7a89e73e62d&fields1=f1%2Cf2%2Cf3%2Cf4%2Cf5%2Cf6%2Cf7%2Cf8%2Cf9%2Cf10%2Cf11%2Cf12%2Cf13&fields2=f51%2Cf52%2Cf53%2Cf54%2Cf55%2Cf56%2Cf57%2Cf58%2Cf59%2Cf60%2Cf61%2Cf62%2Cf63&klt=${periodId}&fqt=${adjust === 'qfq' ? 1 : adjust === 'hfq' ? 2 : 0}&beg=0&end=20500101&lmt=${count}`)
        const result = await res.json()
        const klines = result?.data?.klines || []

        const data = klines.map((line) => {
          const parts = line.split(',')
          const [time, open, close, high, low, volume, amount] = parts.slice(0, 7)
          // 均线数据：f58=5日均线, f59=10日均线, f60=20日均线
          const ma5 = parts[7] ? parseFloat(parts[7]) : null
          const ma10 = parts[8] ? parseFloat(parts[8]) : null
          const ma20 = parts[9] ? parseFloat(parts[9]) : null

          return {
            time: time.includes(' ') ? time.split(' ')[0] : time,
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close),
            volume: parseInt(volume),
            ma5,
            ma10,
            ma20,
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
        const cacheKey = `/stock/time-kline?code=${code}`
        const cached = getCached(cacheKey)
        if (cached) return json(cached)
        const market = isShStock(code) ? '1' : '0'
        const res = await fetch(`https://push2.eastmoney.com/api/qt/stock/trends2/get?secid=${market}.${code}&ut=7e18b5514514e48b4864a7a89e73e62d&fields1=f1%2Cf2%2Cf3%2Cf4%2Cf5%2Cf6%2Cf7%2Cf8%2Cf9%2Cf10%2Cf11%2Cf12%2Cf13&fields2=f51%2Cf52%2Cf53%2Cf54%2Cf55%2Cf56%2Cf57%2Cf58&iscr=0&iscca=0`)
        const result = await res.json()
        const trends = result?.data?.trends || []
        // console.log(result?.data, 'trends');
        // 获取昨收价，兼容不同返回结构
        const preClose = result?.data?.preClose || parseFloat(result?.data?.qt?.[Object.keys(result?.data?.qt || {})[0]]?.[4]) || 0
        try {
          // 分时成交量正负判断：基于量差值（当前成交量 vs 近5分钟平均）
          const data = []
          let lastPrice = preClose // 初始对比基准为昨收价
          const volumeHistory = [] // 存储历史成交量，用于计算5分钟平均

          for (const line of trends) {
            const [time, price, avg, newPrice, newPrice2, volume] = line.split(',')
            const currentPrice = parseFloat(price)
            let vol = parseInt(volume) || 0 // 容错处理，避免NaN

            // 计算近5分钟平均成交量
            const avgVolume = volumeHistory.length > 0 ? volumeHistory.reduce((sum, v) => sum + v, 0) / volumeHistory.length : vol

            // 根据量差值判断成交量正负
            const volumeDiff = vol - avgVolume
            if (volumeDiff > 0) {
              vol = Math.abs(vol) // 放量：当前成交量 > 近5分钟平均，正量
            } else if (volumeDiff < 0) {
              vol = -Math.abs(vol) // 缩量：当前成交量 < 近5分钟平均，负量
            } else {
              // 量能持平时，符号继承上一笔的方向，保持数据连续性
              vol = lastPrice > preClose ? Math.abs(vol) : -Math.abs(vol)
            }

            // 更新成交量历史（最多保留5个）
            volumeHistory.push(parseInt(volume) || 0)
            if (volumeHistory.length > 5) {
              volumeHistory.shift()
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
          setCache(cacheKey, data)
          return json(data)
        } catch (e) {
          return json([], 500, `获取分时K线数据失败: ${e.message}`)
        }
      }

      // ==============================================
      // 7. 获取5日分时K线数据 匹配接口: GET /stock/five-day-time-kline?code=xxx
      // ==============================================
      if (path === '/stock/five-day-time-kline' && method === 'GET') {
        const code = url.searchParams.get('code') || ''
        if (!/^\d{6}$/.test(code)) return json(null, 400, '请输入有效的6位股票代码')
        const cacheKey = `/stock/five-day-time-kline?code=${code}`
        const cached = getCached(cacheKey)
        if (cached) return json(cached)

        const market = isShStock(code) ? '1' : '0'

        // 使用东方财富的5日分时接口获取真实数据
        const getFiveDayTimeKline = async () => {
          try {
            // 东方财富5日分时接口，ndays=5表示获取5个交易日的分时数据
            const res = await fetch(`https://push2his.eastmoney.com/api/qt/stock/trends2/get?secid=${market}.${code}&ut=7e18b5514514e48b4864a7a89e73e62d&fields1=f1%2Cf2%2Cf3%2Cf4%2Cf5%2Cf6%2Cf7%2Cf8%2Cf9%2Cf10%2Cf11%2Cf12%2Cf13&fields2=f51%2Cf52%2Cf53%2Cf54%2Cf55%2Cf56%2Cf57%2Cf58&iscr=0&iscca=0&ndays=5`)

            if (!res.ok) {
              return json([], 500, '获取5日分时数据失败')
            }

            const result = await res.json()
            const trends = result?.data?.trends || []
            const preClose = result?.data?.preClose || parseFloat(result?.data?.qt?.[Object.keys(result?.data?.qt || {})[0]]?.[4]) || 0

            if (trends.length === 0) {
              return json([])
            }

            const allData = []
            const volumeHistory = [] // 存储历史成交量，用于计算5分钟平均
            let lastPrice = preClose

            for (const line of trends) {
              const parts = line.split(',')
              if (parts.length < 6) continue
              const [time, open, price, high, low, volume, avgPrice, changeAmount, changePercent, turnover] = parts
              // 解析时间和价格
              const currentPrice = parseFloat(price)
              const currentAvgPrice = parseFloat(avgPrice)
              let vol = parseInt(volume) || 0

              // 计算近5分钟平均成交量
              const avgVolume = volumeHistory.length > 0 ? volumeHistory.reduce((sum, v) => sum + v, 0) / volumeHistory.length : vol

              // 根据量差值判断成交量正负
              const volumeDiff = vol - avgVolume
              if (volumeDiff > 0) {
                vol = Math.abs(vol) // 放量，正量
              } else if (volumeDiff < 0) {
                vol = -Math.abs(vol) // 缩量，负量
              } else {
                vol = lastPrice > preClose ? Math.abs(vol) : -Math.abs(vol) // 量能持平，按价格趋势判断
              }

              // 更新成交量历史（最多保留5个）
              volumeHistory.push(parseInt(volume) || 0)
              if (volumeHistory.length > 5) {
                volumeHistory.shift()
              }

              allData.push({
                preClose,
                time: time,
                price: currentPrice,
                avgPrice: isNaN(currentAvgPrice) ? currentPrice : currentAvgPrice,
                volume: vol,
              })

              lastPrice = currentPrice
            }

            setCache(cacheKey, allData)
            return json(allData)
          } catch (e) {
            console.error('获取5日分时数据失败:', e)
            return json([], 500, `获取5日分时数据失败: ${e.message}`)
          }
        }

        return await getFiveDayTimeKline()
      }

      // ==============================================
      // 7. 获取盘口数据 匹配接口: GET /stock/depth?code=xxx
      // ==============================================
      if (path === '/stock/depth' && method === 'GET') {
        const code = url.searchParams.get('code') || ''
        if (!/^\d{6}$/.test(code)) return json(null, 400, '请输入有效的6位股票代码')

        const market = isShStock(code) ? 'sh' : 'sz'
        // 使用isShStock统一判断市场（已包含基金前缀51/52/58）
        const secid = (isShStock(code) ? '1' : '0') + '.' + code
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
      // 8. 获取基金/指数成分股列表 匹配接口: GET /stock/holdings?code=xxx
      // ==============================================
      if (path === '/stock/holdings' && method === 'GET') {
        const code = url.searchParams.get('code') || ''
        if (!/^\d{6}$/.test(code)) return json(null, 400, '请输入有效的6位代码')

        const prefix = code.substring(0, 2)
        const fundPrefixes = ['00', '15', '16', '51', '52', '58']
        const indexPrefixes = ['000', '399']

        if (!fundPrefixes.includes(prefix) && !indexPrefixes.includes(code.substring(0, 3))) {
          return json(null, 400, '该接口仅支持基金或指数代码')
        }

        const isFund = fundPrefixes.includes(prefix)

        try {
          if (isFund) {
            const year = new Date().getFullYear()
            const quarter = Math.ceil((new Date().getMonth() + 1) / 3)

            const res = await fetch(`https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${code}&topline=10&year=${year}&month=&rt=0.${Date.now()}`, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                Referer: `https://fundf10.eastmoney.com/ccmx_${code}.html`,
              },
            })

            const text = await res.text()
            const holdings = []
            const rowMatches = text.match(/<tr[\s\S]*?<\/tr>/g) || []

            for (const row of rowMatches) {
              if (row.includes('<th') || row.includes('股票代码') || row.includes('股票名称')) continue

              const tdMatches = row.match(/<td[\s\S]*?<\/td>/g) || []
              if (tdMatches.length < 7) continue

              const codeHtml = tdMatches[1] || ''
              const codeMatch = codeHtml.match(/>(\d{6})</)
              const stockCode = codeMatch ? codeMatch[1] : ''

              const nameHtml = tdMatches[2] || ''
              const nameMatch = nameHtml.match(/>([^<]+)</)
              const stockName = nameMatch ? nameMatch[1].trim() : ''

              const propHtml = tdMatches[6] || ''
              const propMatch = propHtml.match(/([\d.]+)%/)
              const proportion = propMatch ? propMatch[1] : '0'

              if (stockCode && stockName && proportion !== '0') {
                holdings.push({
                  stockCode,
                  name: stockName,
                  proportion,
                })
              }

              if (holdings.length >= 10) break
            }

            return json({
              fundCode: code,
              fundName: '',
              year,
              quarter,
              holdings,
            })
          } else {
            const res = await fetch(`https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=50&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f57&fs=b:${code}&fields=f12,f14,f57,f58,f62,f186,f66,f69,f71,f73,f74,f75,f76,f77,f78,f79,f80,f81,f82,f83,f84,f85,f86`, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                Referer: `https://quote.eastmoney.com/center/gridlist.html#index_component`,
              },
            })

            const data = await res.json()
            const holdings = []

            if (data && data.data && data.data.diff) {
              for (const item of data.data.diff.slice(0, 50)) {
                const stockCode = item.f12 || ''
                const stockName = item.f14 || ''
                const proportion = (item.f62 / 100).toFixed(2)

                if (stockCode && stockName) {
                  holdings.push({
                    stockCode,
                    name: stockName,
                    proportion,
                  })
                }
              }
            }

            return json({
              fundCode: code,
              fundName: '',
              year: new Date().getFullYear(),
              quarter: Math.ceil((new Date().getMonth() + 1) / 3),
              holdings,
            })
          }
        } catch (e) {
          console.error('获取持仓数据失败:', e)
          return json([], 500, `获取持仓数据失败: ${e.message}`)
        }
      }

      // ==============================================
      // 12. 获取行情排行 匹配接口: GET /market/rank?type=xxx&count=xxx
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
      // 支持操作: add(添加), delete(删除), order(排序)
      // ==============================================
      if (path === '/user/self-stock' && method === 'POST') {
        try {
          
          const body = await request.json()
          const { code, codes, action } = body

          if (!action || !['add', 'delete', 'order'].includes(action)) {
            return json(null, 400, 'action只能是add、delete或order')
          }

          const userId = await getUserIdFromRequest(request)
          const raw = await blobGet(`user:${userId}:stocks`)
          let stockCodes = Array.isArray(raw) ? raw : (raw?.__str ? JSON.parse(raw.__str) : [])

          if (action === 'order') {
            if (!Array.isArray(codes)) return json(null, 400, '批量排序时codes必须是数组')
            if (codes.length > 0 && !codes.every((c) => /^\d{6}$/.test(c))) {
              return json(null, 400, '股票代码必须是6位数字')
            }
            stockCodes = codes
          } else if (action === 'add') {
            if (code) {
              if (!/^\d{6}$/.test(code)) return json(null, 400, '请输入有效的6位股票代码')
              if (!stockCodes.includes(code)) {
                stockCodes.push(code)
              }
            } else if (Array.isArray(codes)) {
              if (codes.length > 0 && !codes.every((c) => /^\d{6}$/.test(c))) {
                return json(null, 400, '股票代码必须是6位数字')
              }
              codes.forEach((c) => {
                if (!stockCodes.includes(c)) {
                  stockCodes.push(c)
                }
              })
            } else {
              return json(null, 400, '添加操作需要提供code或codes参数')
            }
          } else if (action === 'delete') {
            if (code) {
              if (!/^\d{6}$/.test(code)) return json(null, 400, '请输入有效的6位股票代码')
              stockCodes = stockCodes.filter((item) => item !== code)
            } else if (Array.isArray(codes)) {
              if (codes.length > 0 && !codes.every((c) => /^\d{6}$/.test(c))) {
                return json(null, 400, '股票代码必须是6位数字')
              }
              stockCodes = stockCodes.filter((item) => !codes.includes(item))
            } else {
              return json(null, 400, '删除操作需要提供code或codes参数')
            }
          }

          await blobPut(`user:${userId}:stocks`, stockCodes)

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
          const existingUser = await getUserByUsername(username)
          if (existingUser) {
            return json(null, 400, '用户名已存在')
          }
          if (email) {
            const existingEmail = await getBlobString(`email:${email}`)
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
          try {
            await blobPut(`user:${username}`, userInfo)
          } catch (e) {
            console.error('[register] step1 put user failed:', e.message, e.stack)
            throw new Error(`存储用户信息失败(user:${username}): ${e.message}`)
          }
          if (email) {
            try {
              await putBlobString(`email:${email}`, username)
            } catch (e) {
              console.error('[register] step2 put email failed:', e.message, e.stack)
              throw new Error(`存储邮箱映射失败(email:${email}): ${e.message}`)
            }
          }
          try {
            await putBlobString(`userid:${userId}`, username)
          } catch (e) {
            console.error('[register] step3 put userid failed:', e.message, e.stack)
            throw new Error(`存储用户ID映射失败(userid:${userId}): ${e.message}`)
          }

          // 生成登录Token，有效期7天
          const token = generateToken()
          try {
            await putBlobString(`token:${token}`, userId, { expirationTtl: 60 * 60 * 24 * 7 })
          } catch (e) {
            console.error('[register] step4 put token failed:', e.message, e.stack)
            throw new Error(`存储登录Token失败(token:${token}): ${e.message}`)
          }

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
          console.error('[register] full error:', e.message, e.stack)
          return json(null, 500, `注册失败: ${e.message}`)
        }
      }

      // ==============================================
      // 11. 用户登录接口 匹配接口: POST /user/login
      // ==============================================
      if (path === '/user/login' && method === 'POST') {
        try {
          console.log(request.body, 'request.body');
          
          const body = await request.json()
          const { username, password } = body

          if (!username || !password) {
            return json(null, 400, '用户名和密码不能为空')
          }

          // 查找用户
          const userInfo = await getUserByUsername(username)
          if (!userInfo) {
            return json(null, 400, '用户名或密码错误')
          }

          // 验证密码
          const passwordValid = await verifyPassword(password, userInfo.passwordHash)
          if (!passwordValid) {
            return json(null, 400, '用户名或密码错误')
          }

          // 生成新的Token，有效期7天
          const token = generateToken()
          await putBlobString(`token:${token}`, userInfo.id, { expirationTtl: 60 * 60 * 24 * 7 })

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
          const holidayData = await fetchHolidayFromApi(date)

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

      // ==============================================
      // 13. 获取财经资讯接口 匹配接口: GET /news/list?category=xxx&page=xxx&count=xxx&code=xxx
      // ==============================================
      if (path === '/news/list' && method === 'GET') {
        try {
          const category = url.searchParams.get('category') || 'economy'
          const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
          const count = Math.min(50, Math.max(1, parseInt(url.searchParams.get('count') || '20')))
          const code = url.searchParams.get('code') || ''

          const categoryMap = {
            stock: 2509,
            fund: 2510,
            bond: 2511,
            forex: 2512,
            futures: 2513,
            global: 2514,
            economy: 2515,
            company: 2516,
          }

          if (!categoryMap[category]) {
            return json(null, 400, `无效的分类参数，支持: ${Object.keys(categoryMap).join(', ')}`)
          }

          const lid = categoryMap[category]
          let newsList = []
          if (code && /^\d{6}$/.test(code)) {
            const stockData = await fetchStockNewsByCode(code, count)
            return json({
              stock: stockData.stock || null,
              list: stockData.news || [],
              source: 'eastmoney',
              category,
              page,
              count,
              total: (stockData.news || []).length,
            })
          } else {
            newsList = await fetchNewsByCategory(lid, page, count)
            return json({
              list: newsList,
              source: 'sina',
              category,
              page,
              count,
              total: newsList.length,
            })
          }
        } catch (e) {
          console.error('获取财经资讯异常:', e)
          return json(null, 500, `获取财经资讯失败: ${e.message}`)
        }
      }

      // 404
      return json(null, 404, '接口不存在')
    } catch (e) {
      return json(null, 500, `服务器错误: ${e.message}`)
    }
  }