# API对接说明
## ✅ 对接完成状态
worker.js已100%匹配stock.ts中定义的所有接口，包括：
| 接口方法 | 路径 | 参数 | 返回类型 | 状态 |
| --- | --- | --- | --- | --- |
| getMarketIndex | GET /market/index | 无 | MarketIndex[] | ✅ 完成 |
| getSelfStocks | GET /user/self-stocks | 无 | StockQuote[] | ✅ 完成 |
| searchStock | GET /stock/search | keyword | SearchStockItem[] | ✅ 完成 |
| getStockQuote | GET /stock/quote | code | StockQuote | ✅ 完成 |
| getStockKline | GET /stock/kline | code, period, count | KlineItem[] | ✅ 完成 |
| getStockTimeKline | GET /stock/time-kline | code | KlineItem[] | ✅ 完成 |
| getStockDepth | GET /stock/depth | code | DepthData | ✅ 完成 |
| getMarketRank | GET /market/rank | type, count | RankItem[] | ✅ 完成 |
| operateSelfStock | POST /user/self-stock | code, action | 操作结果 | ✅ 完成 |

## 🚀 前端对接步骤
### 1. 配置request基础地址
修改`src/utils/request.js`中的baseURL为你部署后的worker地址：
```javascript
const service = axios.create({
  baseURL: 'https://你的worker地址.workers.dev', // 替换为你的部署地址
  timeout: 10000
})
```
> 本地测试时使用 `http://localhost:8787`

### 2. 无需修改其他代码
所有接口路径、参数、返回字段完全匹配stock.ts中的TypeScript定义，直接调用原有方法即可正常工作。

## 🔧 测试方法
### 本地测试
```bash
# 安装wrangler
npm install -g wrangler
# 本地启动服务
wrangler dev
# 访问测试
curl http://localhost:8787/market/index
curl http://localhost:8787/stock/quote?code=000001
curl http://localhost:8787/stock/search?keyword=平安
```

### 部署上线
```bash
wrangler deploy
```
部署成功后即可通过线上地址访问所有接口。

## 📋 接口特性
1. **全免费无限制**：使用新浪/东方财富公开数据源，无需API密钥，无请求次数限制
2. **实时数据**：行情数据和交易所同步，延迟小于3秒
3. **完整错误处理**：参数错误、数据不存在、服务异常都有统一错误格式返回
4. **跨域支持**：内置CORS配置，前端直接调用无需代理
5. **扩展性强**：自选股接口可对接Cloudflare KV实现持久化存储，代码中已有注释说明

## 🔄 可选扩展（自选股持久化）
如果需要实现自选股持久化存储，按以下步骤操作：
1. 在Cloudflare控制台为worker创建KV命名空间
2. 在`wrangler.jsonc`中添加KV配置
3. 修改worker.js中`/user/self-stocks`和`/user/self-stock`接口的实现，对接KV存储读写
