# Cloudflare Workers 部署 aktools 股票接口说明

## 前置准备
1. 注册 Cloudflare 账号：https://dash.cloudflare.com/sign-up
2. 安装 wrangler CLI 工具：
```bash
npm install -g wrangler
```

## 部署步骤
1. 登录 Cloudflare 账号：
```bash
wrangler login
```
按照提示完成登录授权。

2. 配置AK-API-KEY环境变量：
```bash
wrangler secret put AK_API_KEY
```
按照提示输入你获取的aktools API密钥。

> API密钥获取方式：访问 https://aktools.clarkke.com 或 https://github.com/akfamily/aktools 申请获取免费API密钥，或自行部署aktools服务。

3. 部署 Worker：
```bash
wrangler deploy
```

4. 部署成功后，你会得到一个类似 `https://stock-api.your-name.workers.dev` 的访问地址，这就是你的API接口地址。

## 前端配置修改
修改 `src/utils/request.js` 中的 baseURL 为你部署后的Worker地址：
```javascript
const service = axios.create({
  baseURL: 'https://stock-api.your-name.workers.dev', // 替换成你的Worker地址
  timeout: 10000
})
```

## 已适配的接口列表
| 接口路径 | 功能说明 |
| --- | --- |
| `/market/index` | 获取大盘指数（上证指数、深证成指、创业板指） |
| `/stock/search?keyword=xxx` | 搜索股票 |
| `/stock/quote?code=xxx` | 获取个股实时行情 |
| `/stock/kline?code=xxx&period=daily&count=100` | 获取K线数据 |
| `/stock/time-kline?code=xxx` | 获取分时K线数据 |
| `/stock/depth?code=xxx` | 获取盘口买卖五档数据 |
| `/market/rank?type=rise&count=20` | 获取行情排行榜 |
| `/user/self-stocks` | 获取自选股列表（默认返回空，可自行扩展KV存储） |
| `/user/self-stock` | 操作自选股（默认返回成功，可自行扩展KV存储） |

## 可选扩展
如果需要持久化存储自选股数据，可以开启 Cloudflare KV 存储：
1. 在 wrangler.toml 中添加 KV 命名空间配置
2. 修改 worker.js 中相关接口的实现，使用 KV 存储数据

## 注意事项
- 本实现使用了公开的 aktools 接口 `http://aktools.clarkke.com/api/public/`，如果接口不稳定，建议自行部署 aktools 服务
- 接口请求频率限制以 aktools 官方为准，如有需要可以在 Worker 中添加缓存逻辑减少请求
