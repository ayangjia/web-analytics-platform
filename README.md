# 网站分析平台 (Web Analytics Platform)

一个完整的网站访问统计、点击追踪和转化分析平台。

## 🚀 功能特性

### 核心功能
- **页面访问追踪** - 自动记录每个页面的浏览量、停留时间
- **点击热力图** - 追踪用户点击行为，分析交互热点
- **流量来源分析** - 识别访问来源（搜索引擎、社交媒体、直接访问等）
- **转化目标追踪** - 自定义转化事件，统计转化率
- **设备与浏览器分析** - 了解用户使用的设备和浏览器分布
- **实时数据面板** - 可视化展示所有统计数据

### 技术特点
- 🎯 轻量级追踪脚本（~10KB）
- 🔒 隐私友好，支持匿名化 IP
- 📱 支持单页应用（SPA）
- 🌐 跨域追踪支持
- 💾 本地 SQLite 数据库存储
- 📊 可视化数据仪表盘

## 📁 项目结构

```
web-analytics-platform/
├── backend/           # Node.js 后端 API
│   ├── server.js      # 主服务器文件
│   └── package.json   # 依赖配置
├── frontend/          # 前端仪表盘
│   └── index.html     # 数据展示页面
├── tracker-sdk/       # 追踪 SDK
│   └── analytics.js   # 前端追踪脚本
└── database/          # SQLite 数据库
    └── analytics.db   # 数据存储
```

## 🛠️ 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 启动服务器

```bash
npm start
# 或开发模式
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

### 3. 访问仪表盘

打开浏览器访问：`http://localhost:3000`

### 4. 添加网站

1. 点击"添加网站"按钮
2. 输入网站名称和域名
3. 获取 API Key

### 5. 嵌入追踪代码

将以下代码添加到您网站的 `<head>` 标签中：

```html
<script src="http://localhost:3000/tracker-sdk/analytics.js"></script>
<script>
  Analytics.init({
    apiKey: 'YOUR_API_KEY',
    debug: false  // 开发模式设为 true
  });
</script>
```

## 📊 API 接口

### 追踪接口

#### 页面访问
```http
POST /api/track/pageview
Content-Type: application/json

{
  "api_key": "your_api_key",
  "session_id": "session_uuid",
  "visitor_id": "visitor_uuid",
  "page_url": "https://example.com/page",
  "page_title": "页面标题",
  "referrer": "https://google.com",
  "user_agent": "Mozilla/5.0...",
  "screen_resolution": "1920x1080",
  "language": "zh-CN"
}
```

#### 自定义事件
```http
POST /api/track/event
Content-Type: application/json

{
  "api_key": "your_api_key",
  "session_id": "session_uuid",
  "visitor_id": "visitor_uuid",
  "event_name": "button_click",
  "event_category": "engagement",
  "event_action": "click",
  "event_label": "submit_button",
  "event_value": 1,
  "page_url": "https://example.com/page"
}
```

#### 转化追踪
```http
POST /api/track/conversion
Content-Type: application/json

{
  "api_key": "your_api_key",
  "session_id": "session_uuid",
  "visitor_id": "visitor_uuid",
  "goal_name": "purchase",
  "goal_value": 99.99,
  "page_url": "https://example.com/thank-you"
}
```

### 统计接口

#### 概览统计
```http
GET /api/stats/:siteId/overview?period=7d
```

#### 流量来源
```http
GET /api/stats/:siteId/sources?period=7d
```

#### 热门页面
```http
GET /api/stats/:siteId/pages?period=7d
```

#### 设备统计
```http
GET /api/stats/:siteId/devices?period=7d
```

#### 转化统计
```http
GET /api/stats/:siteId/conversions?period=7d
```

#### 趋势数据
```http
GET /api/stats/:siteId/trends?period=7d
```

## 🔧 SDK 使用方法

### 初始化

```javascript
Analytics.init({
  apiKey: 'YOUR_API_KEY',
  apiUrl: 'http://localhost:3000/api',  // 可选，自定义 API 地址
  debug: false,                          // 可选，开启调试模式
  trackClicks: true,                     // 可选，追踪点击
  trackForms: true,                      // 可选，追踪表单
  trackErrors: true,                     // 可选，追踪错误
  anonymizeIp: false                     // 可选，匿名化 IP
});
```

### 追踪自定义事件

```javascript
// 简单事件
Analytics.trackEvent('video_play');

// 带属性的事件
Analytics.trackEvent('purchase', {
  category: 'ecommerce',
  action: 'buy',
  label: 'product_123',
  value: 99.99
});
```

### 追踪转化

```javascript
Analytics.trackConversion('signup', 0);
Analytics.trackConversion('purchase', 199.99);
```

### 设置用户属性

```javascript
Analytics.setUserProperties({
  plan: 'premium',
  signup_date: '2024-01-01'
});
```

### 计时追踪

```javascript
Analytics.startTimer('checkout');
// ... 用户完成结账
Analytics.stopTimer('checkout');
```

## 📈 数据指标说明

| 指标 | 说明 |
|------|------|
| 页面浏览量 (Pageviews) | 页面被加载的总次数 |
| 独立访客 (Unique Visitors) | 不重复的用户数量 |
| 会话数 (Sessions) | 用户访问会话数，30分钟无活动算新会话 |
| 平均停留时间 | 用户在页面上的平均停留时长 |
| 跳出率 | 只浏览一个页面就离开的访问占比 |
| 转化率 | 完成转化目标的访问占比 |

## 🔒 隐私说明

- 支持 IP 匿名化
- 不收集个人身份信息
- 会话数据本地存储
- 符合 GDPR 要求

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
