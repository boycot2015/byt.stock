# BYT Stock - 股票行情数据看板

一个基于 Vue 3 + TypeScript + Vite 构建的现代化股票行情数据看板应用。

## 功能特性

- **用户认证** - 登录/注册功能，支持 token 持久化存储
- **数据看板** - 实时展示大盘指数、自选股列表、行情排行
- **股票详情** - 个股实时行情、K线图、分时图、盘口数据
- **股票搜索** - 支持股票名称/拼音/代码搜索
- **自选股管理** - 添加/删除自选股
- **资讯页面** - 股票相关资讯展示

## 技术栈

- **框架**: Vue 3.4+ (Composition API)
- **语言**: TypeScript 5.2+
- **构建工具**: Vite 5.2+
- **UI 框架**: Ant Design Vue 4.2+
- **状态管理**: Pinia 3.0+
- **路由**: Vue Router 4.3+
- **图表**: ECharts 6.0 + vue-echarts 8.0
- **样式**: Tailwind CSS 4.2+
- **HTTP 客户端**: Axios 1.15+
- **Mock 数据**: MockJS 1.1+

## 项目结构

```
src/
├── api/                 # API 接口定义
│   └── stock.ts         # 股票相关接口
├── assets/              # 静态资源
├── components/          # 组件
│   ├── Header.vue       # 顶部导航栏
│   ├── Footer.vue       # 底部信息
│   ├── NavBar.vue       # 侧边导航
│   ├── MarketIndex.vue  # 大盘指数组件
│   ├── MarketRank.vue   # 行情排行组件
│   ├── SelfStockList.vue# 自选股列表
│   ├── StockDetail.vue  # 股票详情组件
│   └── Search.vue       # 搜索组件
├── mock/                # Mock 数据
│   └── index.ts         # Mock 接口配置
├── router/              # 路由配置
│   └── index.ts         # 路由定义与守卫
├── store/               # Pinia 状态管理
│   ├── stock.ts         # 股票数据状态
│   └── user.ts          # 用户状态
├── utils/               # 工具函数
│   ├── index.ts         # 通用工具
│   └── request.ts       # HTTP 请求封装
├── views/               # 页面视图
│   ├── Home.vue         # 首页数据看板
│   ├── News.vue         # 资讯页面
│   ├── Login.vue        # 登录页面
│   └── Register.vue     # 注册页面
├── App.vue              # 根组件
├── main.ts              # 应用入口
└── style.css            # 全局样式
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:5173 查看应用。

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

### 代码检查

```bash
npm run lint
```

## 测试账号

为方便测试，提供以下测试账号：

- **用户名**: `admin` 或 `admin@example.com`
- **密码**: `123456`

## API 接口

应用支持以下核心接口：

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/v1/market/index` | GET | 获取大盘指数 |
| `/api/v1/user/self-stocks` | GET | 获取自选股列表 |
| `/api/v1/stock/search` | GET | 搜索股票 |
| `/api/v1/stock/quote` | GET | 获取个股实时行情 |
| `/api/v1/stock/kline` | GET | 获取 K 线数据 |
| `/api/v1/stock/time-kline` | GET | 获取分时 K 线 |
| `/api/v1/stock/depth` | GET | 获取盘口数据 |
| `/api/v1/market/rank` | GET | 获取行情排行 |
| `/api/v1/user/self-stock` | POST | 操作自选股 |
| `/api/v1/login` | POST | 用户登录 |
| `/api/v1/register` | POST | 用户注册 |

## 路由配置

| 路径 | 名称 | 组件 | 权限 |
|------|------|------|------|
| `/login` | Login | Login.vue | 访客 |
| `/register` | Register | Register.vue | 访客 |
| `/` | Home | Home.vue | 需登录 |
| `/news` | News | News.vue | 需登录 |

## 许可证

MIT