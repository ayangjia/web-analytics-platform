const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const UAParser = require('ua-parser-js');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/tracker-sdk', express.static(path.join(__dirname, '../tracker-sdk')));

// 数据存储路径
const DATA_DIR = path.join(__dirname, '../database');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 数据文件
const SITES_FILE = path.join(DATA_DIR, 'sites.json');
const PAGEVIEWS_FILE = path.join(DATA_DIR, 'pageviews.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const CONVERSIONS_FILE = path.join(DATA_DIR, 'conversions.json');
const TRAFFIC_SOURCES_FILE = path.join(DATA_DIR, 'traffic_sources.json');

// 初始化数据文件
function initDataFile(filePath, defaultData = []) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveData(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// 读取/写入数据
function readData(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

function writeData(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// 初始化
initDataFile(SITES_FILE, []);
initDataFile(PAGEVIEWS_FILE, []);
initDataFile(EVENTS_FILE, []);
initDataFile(CONVERSIONS_FILE, []);
initDataFile(TRAFFIC_SOURCES_FILE, []);

// 解析 UTM 参数
function parseUTMParams(url) {
  try {
    const urlObj = new URL(url);
    return {
      source: urlObj.searchParams.get('utm_source') || 'direct',
      medium: urlObj.searchParams.get('utm_medium') || 'none',
      campaign: urlObj.searchParams.get('utm_campaign'),
      term: urlObj.searchParams.get('utm_term'),
      content: urlObj.searchParams.get('utm_content')
    };
  } catch {
    return { source: 'direct', medium: 'none' };
  }
}

// 解析来源域名
function parseReferrer(referrer) {
  if (!referrer) return { domain: 'direct', type: 'direct' };
  try {
    const url = new URL(referrer);
    const domain = url.hostname.replace('www.', '');
    const searchEngines = ['google.com', 'bing.com', 'baidu.com', 'yahoo.com', 'sogou.com'];
    const socialMedia = ['facebook.com', 'twitter.com', 'linkedin.com', 'weibo.com', 'weixin.qq.com', 'douban.com'];
    
    if (searchEngines.some(se => domain.includes(se))) return { domain, type: 'search' };
    if (socialMedia.some(sm => domain.includes(sm))) return { domain, type: 'social' };
    return { domain, type: 'referral' };
  } catch {
    return { domain: 'unknown', type: 'unknown' };
  }
}

// 解析 User Agent
function parseUserAgent(userAgent) {
  try {
    const ua = new UAParser(userAgent);
    const result = ua.getResult();
    return {
      browser: result.browser?.name || 'Unknown',
      browser_version: result.browser?.version?.split(' ')[0] || '',
      os: result.os?.name || 'Unknown',
      os_version: result.os?.version || '',
      device_type: result.device?.type || 'desktop'
    };
  } catch {
    return { browser: 'Unknown', browser_version: '', os: 'Unknown', os_version: '', device_type: 'desktop' };
  }
}

// ==================== API 路由 ====================

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 注册新网站
app.post('/api/sites', (req, res) => {
  const { name, domain } = req.body;
  if (!name || !domain) {
    return res.status(400).json({ error: 'Name and domain are required' });
  }

  const sites = readData(SITES_FILE);
  
  // 检查域名是否已存在
  if (sites.some(s => s.domain === domain)) {
    return res.status(409).json({ error: 'Domain already exists' });
  }

  const site = {
    id: uuidv4(),
    name,
    domain,
    api_key: uuidv4().replace(/-/g, ''),
    created_at: new Date().toISOString()
  };

  sites.push(site);
  writeData(SITES_FILE, sites);
  
  res.status(201).json(site);
});

// 获取网站列表
app.get('/api/sites', (req, res) => {
  const sites = readData(SITES_FILE);
  res.json(sites.map(s => ({
    id: s.id,
    name: s.name,
    domain: s.domain,
    created_at: s.created_at
  })));
});

// 获取单个网站
app.get('/api/sites/:id', (req, res) => {
  const sites = readData(SITES_FILE);
  const site = sites.find(s => s.id === req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  res.json(site);
});

// 追踪页面访问
app.post('/api/track/pageview', (req, res) => {
  const {
    api_key,
    session_id,
    visitor_id,
    page_url,
    page_title,
    referrer,
    user_agent,
    screen_resolution,
    language
  } = req.body;

  // 验证 API Key
  const sites = readData(SITES_FILE);
  const site = sites.find(s => s.api_key === api_key);
  if (!site) return res.status(401).json({ error: 'Invalid API key' });

  // 解析 User Agent
  const uaInfo = parseUserAgent(user_agent || req.headers['user-agent']);
  
  // 解析来源
  const utm = parseUTMParams(page_url);
  const ref = parseReferrer(referrer);

  // 记录页面访问
  const pageview = {
    id: Date.now().toString(),
    site_id: site.id,
    session_id,
    visitor_id,
    page_url,
    page_title: page_title || '',
    referrer: referrer || '',
    user_agent: user_agent || '',
    browser: uaInfo.browser,
    browser_version: uaInfo.browser_version,
    os: uaInfo.os,
    os_version: uaInfo.os_version,
    device_type: uaInfo.device_type,
    screen_resolution: screen_resolution || '',
    language: language || '',
    country: '',
    city: '',
    timestamp: new Date().toISOString()
  };

  const pageviews = readData(PAGEVIEWS_FILE);
  pageviews.push(pageview);
  writeData(PAGEVIEWS_FILE, pageviews);

  // 如果是新会话，记录流量来源
  const trafficSources = readData(TRAFFIC_SOURCES_FILE);
  if (!trafficSources.some(ts => ts.session_id === session_id)) {
    trafficSources.push({
      id: Date.now().toString(),
      site_id: site.id,
      session_id,
      source: utm.source,
      medium: utm.medium,
      campaign: utm.campaign || '',
      term: utm.term || '',
      content: utm.content || '',
      referrer_domain: ref.domain,
      landing_page: page_url,
      timestamp: new Date().toISOString()
    });
    writeData(TRAFFIC_SOURCES_FILE, trafficSources);
  }

  res.json({ success: true, id: pageview.id });
});

// 追踪事件
app.post('/api/track/event', (req, res) => {
  const {
    api_key,
    session_id,
    visitor_id,
    event_name,
    event_category,
    event_action,
    event_label,
    event_value,
    page_url,
    properties
  } = req.body;

  const sites = readData(SITES_FILE);
  const site = sites.find(s => s.api_key === api_key);
  if (!site) return res.status(401).json({ error: 'Invalid API key' });

  const event = {
    id: Date.now().toString(),
    site_id: site.id,
    session_id,
    visitor_id,
    event_name,
    event_category: event_category || '',
    event_action: event_action || '',
    event_label: event_label || '',
    event_value: event_value || 0,
    page_url: page_url || '',
    properties: properties || {},
    timestamp: new Date().toISOString()
  };

  const events = readData(EVENTS_FILE);
  events.push(event);
  writeData(EVENTS_FILE, events);

  res.json({ success: true, id: event.id });
});

// 记录转化
app.post('/api/track/conversion', (req, res) => {
  const {
    api_key,
    session_id,
    visitor_id,
    goal_name,
    goal_value,
    page_url
  } = req.body;

  const sites = readData(SITES_FILE);
  const site = sites.find(s => s.api_key === api_key);
  if (!site) return res.status(401).json({ error: 'Invalid API key' });

  // 获取流量来源
  const trafficSources = readData(TRAFFIC_SOURCES_FILE);
  const source = trafficSources.find(ts => ts.session_id === session_id);

  const conversion = {
    id: Date.now().toString(),
    site_id: site.id,
    session_id,
    visitor_id,
    goal_name,
    goal_value: goal_value || 0,
    source: source?.source || 'direct',
    medium: source?.medium || 'none',
    campaign: source?.campaign || '',
    page_url: page_url || '',
    timestamp: new Date().toISOString()
  };

  const conversions = readData(CONVERSIONS_FILE);
  conversions.push(conversion);
  writeData(CONVERSIONS_FILE, conversions);

  res.json({ success: true, id: conversion.id });
});

// ==================== 统计 API ====================

// 获取时间过滤
function getDateFilter(period) {
  const now = new Date();
  let startDate;
  
  switch(period) {
    case '24h':
      startDate = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
  }
  
  return startDate.toISOString();
}

// 获取网站概览统计
app.get('/api/stats/:siteId/overview', (req, res) => {
  const { siteId } = req.params;
  const { period = '7d' } = req.query;
  const startDate = getDateFilter(period);

  const pageviews = readData(PAGEVIEWS_FILE).filter(p => 
    p.site_id === siteId && p.timestamp >= startDate
  );
  const conversions = readData(CONVERSIONS_FILE).filter(c => 
    c.site_id === siteId && c.timestamp >= startDate
  );
  const trafficSources = readData(TRAFFIC_SOURCES_FILE).filter(t => 
    t.site_id === siteId && t.timestamp >= startDate
  );

  // 计算跳出率
  const sessions = {};
  pageviews.forEach(p => {
    if (!sessions[p.session_id]) {
      sessions[p.session_id] = [];
    }
    sessions[p.session_id].push(p);
  });

  const sessionCount = Object.keys(sessions).length;
  const bounceCount = Object.values(sessions).filter(s => s.length === 1).length;
  const bounceRate = sessionCount > 0 ? (bounceCount / sessionCount * 100) : 0;

  // 计算平均会话时长
  let totalDuration = 0;
  let durationCount = 0;
  Object.values(sessions).forEach(pvs => {
    if (pvs.length > 1) {
      const first = new Date(pvs[0].timestamp);
      const last = new Date(pvs[pvs.length - 1].timestamp);
      totalDuration += (last - first) / 1000;
      durationCount++;
    }
  });
  const avgDuration = durationCount > 0 ? totalDuration / durationCount : 0;

  res.json({
    pageviews: { count: pageviews.length },
    uniqueVisitors: { count: new Set(pageviews.map(p => p.visitor_id)).size },
    sessions: { count: sessionCount },
    conversions: { 
      count: conversions.length,
      value: conversions.reduce((sum, c) => sum + c.goal_value, 0)
    },
    avgDuration: { avg_duration: avgDuration },
    bounceRate: { bounce_rate: bounceRate }
  });
});

// 获取流量来源统计
app.get('/api/stats/:siteId/sources', (req, res) => {
  const { siteId } = req.params;
  const { period = '7d' } = req.query;
  const startDate = getDateFilter(period);

  const trafficSources = readData(TRAFFIC_SOURCES_FILE).filter(t => 
    t.site_id === siteId && t.timestamp >= startDate
  );

  const pageviews = readData(PAGEVIEWS_FILE).filter(p => 
    p.site_id === siteId && p.timestamp >= startDate
  );

  const visitorMap = {};
  pageviews.forEach(p => {
    if (!visitorMap[p.session_id]) {
      visitorMap[p.session_id] = new Set();
    }
    visitorMap[p.session_id].add(p.visitor_id);
  });

  // 按来源分组
  const sources = {};
  trafficSources.forEach(ts => {
    const key = `${ts.source}|${ts.medium}`;
    if (!sources[key]) {
      sources[key] = {
        source: ts.source,
        medium: ts.medium,
        sessions: 0,
        visitors: new Set()
      };
    }
    sources[key].sessions++;
    if (visitorMap[ts.session_id]) {
      visitorMap[ts.session_id].forEach(v => sources[key].visitors.add(v));
    }
  });

  const result = Object.values(sources).map(s => ({
    source: s.source,
    medium: s.medium,
    sessions: s.sessions,
    visitors: s.visitors.size
  })).sort((a, b) => b.sessions - a.sessions).slice(0, 20);

  res.json(result);
});

// 获取热门页面
app.get('/api/stats/:siteId/pages', (req, res) => {
  const { siteId } = req.params;
  const { period = '7d' } = req.query;
  const startDate = getDateFilter(period);

  const pageviews = readData(PAGEVIEWS_FILE).filter(p => 
    p.site_id === siteId && p.timestamp >= startDate
  );

  const pages = {};
  pageviews.forEach(p => {
    if (!pages[p.page_url]) {
      pages[p.page_url] = {
        page_url: p.page_url,
        page_title: p.page_title,
        views: 0,
        visitors: new Set()
      };
    }
    pages[p.page_url].views++;
    pages[p.page_url].visitors.add(p.visitor_id);
  });

  const result = Object.values(pages).map(p => ({
    page_url: p.page_url,
    page_title: p.page_title,
    views: p.views,
    unique_visitors: p.visitors.size
  })).sort((a, b) => b.views - a.views).slice(0, 20);

  res.json(result);
});

// 获取设备统计
app.get('/api/stats/:siteId/devices', (req, res) => {
  const { siteId } = req.params;
  const { period = '7d' } = req.query;
  const startDate = getDateFilter(period);

  const pageviews = readData(PAGEVIEWS_FILE).filter(p => 
    p.site_id === siteId && p.timestamp >= startDate
  );

  const devices = {};
  pageviews.forEach(p => {
    const key = `${p.device_type}|${p.browser}|${p.os}`;
    if (!devices[key]) {
      devices[key] = {
        device_type: p.device_type,
        browser: p.browser,
        os: p.os,
        count: 0
      };
    }
    devices[key].count++;
  });

  const result = Object.values(devices).sort((a, b) => b.count - a.count);
  res.json(result);
});

// 获取转化统计
app.get('/api/stats/:siteId/conversions', (req, res) => {
  const { siteId } = req.params;
  const { period = '7d' } = req.query;
  const startDate = getDateFilter(period);

  const conversions = readData(CONVERSIONS_FILE).filter(c => 
    c.site_id === siteId && c.timestamp >= startDate
  );

  const goals = {};
  conversions.forEach(c => {
    const key = `${c.goal_name}|${c.source}|${c.medium}`;
    if (!goals[key]) {
      goals[key] = {
        goal_name: c.goal_name,
        source: c.source,
        medium: c.medium,
        conversions: 0,
        total_value: 0
      };
    }
    goals[key].conversions++;
    goals[key].total_value += c.goal_value;
  });

  const result = Object.values(goals).sort((a, b) => b.conversions - a.conversions);
  res.json(result);
});

// 获取趋势数据
app.get('/api/stats/:siteId/trends', (req, res) => {
  const { siteId } = req.params;
  const { period = '7d' } = req.query;
  const startDate = getDateFilter(period);

  const pageviews = readData(PAGEVIEWS_FILE).filter(p => 
    p.site_id === siteId && p.timestamp >= startDate
  );

  // 按日期分组
  const trends = {};
  pageviews.forEach(p => {
    const date = p.timestamp.split('T')[0];
    if (!trends[date]) {
      trends[date] = {
        date,
        pageviews: 0,
        visitors: new Set(),
        sessions: new Set()
      };
    }
    trends[date].pageviews++;
    trends[date].visitors.add(p.visitor_id);
    trends[date].sessions.add(p.session_id);
  });

  const result = Object.values(trends).map(t => ({
    date: t.date,
    pageviews: t.pageviews,
    visitors: t.visitors.size,
    sessions: t.sessions.size
  })).sort((a, b) => a.date.localeCompare(b.date));

  res.json(result);
});

// 获取事件列表
app.get('/api/stats/:siteId/events', (req, res) => {
  const { siteId } = req.params;
  const { period = '7d' } = req.query;
  const startDate = getDateFilter(period);

  const events = readData(EVENTS_FILE).filter(e => 
    e.site_id === siteId && e.timestamp >= startDate
  );

  // 按事件名分组统计
  const eventStats = {};
  events.forEach(e => {
    if (!eventStats[e.event_name]) {
      eventStats[e.event_name] = {
        event_name: e.event_name,
        event_category: e.event_category,
        total: 0,
        unique_users: new Set()
      };
    }
    eventStats[e.event_name].total++;
    eventStats[e.event_name].unique_users.add(e.visitor_id);
  });

  const result = Object.values(eventStats).map(s => ({
    event_name: s.event_name,
    event_category: s.event_category,
    total: s.total,
    unique_users: s.unique_users.size
  })).sort((a, b) => b.total - a.total);

  res.json(result);
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Analytics server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`📁 Data directory: ${DATA_DIR}`);
});

module.exports = app;
