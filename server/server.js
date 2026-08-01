require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const ai = require('./ai-analysis');
const db = require('./database');
const mqttBridge = require('./mqtt-bridge');

// ============================================
// 配置
// ============================================
const CONFIG = Object.freeze({
  PORT: process.env.PORT || 3000,
  DEFAULT_LOCATION: { name: '中国石油大学（华东）唐岛湾校区·南教', lat: 35.93990, lng: 120.17856 },
  MAX_HISTORY: 200,
  MAX_ALERTS: 50,
  REAL_TIMEOUT_MS: 30000,
  BROADCAST_INTERVAL_MS: 2000,
  AI_ANALYSIS_INTERVAL: 15,
  RISK: {
    // Gas=40%, Cover=25%, Tilt=20%, Temp=15%
    WEIGHTS: [0.40, 0.25, 0.20, 0.15],
    THRESHOLDS: [30, 60, 80],
    LEVELS: ['正常', '低风险', '中风险', '高风险'],
  },
  MOCK: {
    TEMP:        { base: 26.5, range: 2, tilt_event: { every: 30, base: 12, range: 4 } },
    HUMIDITY:    { base: 62, range: 4 },
    TILT:        { base: 1.5, range: 1.5 },
    MQ2:         { base: 320, range: 40, spike: { every: 45, offset: 15, max_add: 300, max_val: 950 } },
    MQ4:         { base: 280, range: 35, spike: { every: 45, offset: 15, multiplier: 0.7, max_val: 850 } },
    LIGHT:       { base: 850, range: 50 },
  },
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'client', 'dist')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const SERVER_START_TIME = Date.now();
let locationName = CONFIG.DEFAULT_LOCATION.name;
let locationLat = CONFIG.DEFAULT_LOCATION.lat;
let locationLng = CONFIG.DEFAULT_LOCATION.lng;

// ============================================
// 位置 API
// ============================================
app.get('/api/location', (req, res) => {
  res.json({ name: locationName, lat: locationLat, lng: locationLng });
});

app.post('/api/location', (req, res) => {
  const { name, lat, lng } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: '位置名称不能为空' });
  }
  locationName = name.trim();
  if (typeof lat === 'number' && typeof lng === 'number') {
    locationLat = lat;
    locationLng = lng;
  }
  io.emit('location', { name: locationName, lat: locationLat, lng: locationLng });
  res.json({ success: true, name: locationName, lat: locationLat, lng: locationLng });
});

// ============================================
// 实时状态 & 数据
// ============================================
const state = {
  temperature: 26.5, humidity: 60, tilt_angle: 1.2,
  mq2: 320, mq4: 280, light: 850,
  risk_score: 18, risk_level: 0,
  alerts: [],
};

const history = [];
let useRealData = false;
let lastRealTime = 0;
let eventTimer = 0;
let dataCounter = 0;

app.post('/api/sensor-data', (req, res) => {
  const { temperature, humidity, tilt_angle, mq2, mq4, light } = req.body;
  if (typeof temperature !== 'number' || typeof humidity !== 'number' || typeof tilt_angle !== 'number') {
    return res.status(400).json({ success: false, message: '缺少必需的传感器数据' });
  }
  Object.assign(state, {
    temperature: Number(temperature.toFixed(1)),
    humidity: Math.round(humidity),
    tilt_angle: Number(tilt_angle.toFixed(1)),
    mq2: Math.round(mq2),
    mq4: Math.round(mq4),
    light: Math.round(light),
  });
  useRealData = true;
  lastRealTime = Date.now();
  broadcastData();
  res.json({ success: true });
});

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function drift(base, range, decimals = 1) {
  return Number((base + (Math.random() - 0.5) * range).toFixed(decimals));
}

function getStatus(value, thresholds) {
  if (value >= thresholds.critical) return 'critical';
  if (value >= thresholds.warning) return 'warning';
  return 'normal';
}

const sensorMeta = {
  temperature: { label: '温度', unit: '°C', decimals: 1, icon: '🌡️', thresholds: { warning: 35, critical: 45 } },
  humidity:    { label: '湿度', unit: '%', decimals: 0, icon: '💧', thresholds: { warning: 80, critical: 90 } },
  tilt_angle:  { label: '倾斜角', unit: '°', decimals: 1, icon: '📐', thresholds: { warning: 10, critical: 20 } },
  mq2:         { label: '可燃气体', unit: '', decimals: 0, icon: '🔥', thresholds: { warning: 600, critical: 800 } },
  mq4:         { label: '甲烷', unit: '', decimals: 0, icon: '⛽', thresholds: { warning: 550, critical: 700 } },
  light:       { label: '光照强度', unit: 'lux', decimals: 0, icon: '💡', thresholds: { warning: 2000, critical: 3000 } },
};

// ============================================
// 风险评分与数据
// ============================================
function calcRisk() {
  // MQ-2: clean air ~1000, gas >2500; MQ-4: clean air ~700, gas >2000
  const s_gas = clamp(Math.max(
    (state.mq2 - 900) / 1600,
    (state.mq4 - 600) / 1400
  ), 0, 1);
  // Manhole: low light = covered (safe), high light = open (risk)
  const s_cover = state.light > 500 ? 0.8 : state.light < 50 ? 0 : 0.3;
  const s_tilt = clamp(Math.abs(state.tilt_angle) / 30, 0, 1);
  const s_env = state.temperature > 40 ? clamp((state.temperature - 40) / 20, 0, 1) : 0;
  const risk = CONFIG.RISK.WEIGHTS[0] * s_gas + CONFIG.RISK.WEIGHTS[1] * s_cover
             + CONFIG.RISK.WEIGHTS[2] * s_tilt + CONFIG.RISK.WEIGHTS[3] * s_env;
  state.risk_score = Number((risk * 100).toFixed(1));
  if (state.risk_score < CONFIG.RISK.THRESHOLDS[0]) state.risk_level = 0;
  else if (state.risk_score < CONFIG.RISK.THRESHOLDS[1]) state.risk_level = 1;
  else if (state.risk_score < CONFIG.RISK.THRESHOLDS[2]) state.risk_level = 2;
  else state.risk_level = 3;
}

function buildDataPoint() {
  calcRisk();
  const timestamp = new Date().toISOString();
  return {
    timestamp,
    ...Object.fromEntries(
      Object.entries(sensorMeta).map(([k, m]) => [k, Number(state[k].toFixed(m.decimals))])
    ),
    risk_score: state.risk_score,
    risk_level: state.risk_level,
  };
}

// 告警：仅中高风险触发，3 分钟冷却
let lastAlertTime = 0;
let lastDataTime = Date.now();
const ALERT_INTERVAL_MS = 3 * 60 * 1000; // 3 分钟

function addAlertIfNeeded() {
  // 仅中风险及以上触发
  if (state.risk_level < 2) return;

  // 3 分钟冷却，避免重复告警
  const now = Date.now();
  if (now - lastAlertTime < ALERT_INTERVAL_MS) return;
  lastAlertTime = now;

  const nowDate = new Date();
  const timeStr = nowDate.toLocaleDateString('zh-CN') + ' ' + nowDate.toLocaleTimeString('zh-CN', { hour12: false });
  const msg = {
    time: timeStr,
    text: '风险等级 ' + CONFIG.RISK.LEVELS[state.risk_level] + ' — 评分 ' + state.risk_score.toFixed(1),
    level: state.risk_level,
    score: state.risk_score,
  };
  state.alerts.unshift(msg);
  if (state.alerts.length > CONFIG.MAX_ALERTS) state.alerts.pop();

  // 推送告警到所有 Web 客户端
  io.emit('alerts', state.alerts.slice(0, CONFIG.MAX_ALERTS));
}

function broadcastData() {
  const dataPoint = buildDataPoint();
  history.push(dataPoint);
  if (history.length > CONFIG.MAX_HISTORY) history.shift();
  if (useRealData) db.save(dataPoint);
  addAlertIfNeeded();
  dataCounter++;
  io.emit('data', dataPoint);
  if (dataCounter % CONFIG.AI_ANALYSIS_INTERVAL === 0) {
    ai.analyze(history).then(result => {
      if (result) io.emit('ai_analysis', result);
    }).catch(err => {
      console.error('[AI分析] 分析失败:', err.message);
    });
  }
  return dataPoint;
}

function generateMockState() {
  const M = CONFIG.MOCK;
  state.temperature = drift(M.TEMP.base, M.TEMP.range, 1);
  state.humidity = drift(M.HUMIDITY.base, M.HUMIDITY.range, 0);
  state.tilt_angle = drift(M.TILT.base, M.TILT.range, 1);
  state.mq2 = drift(M.MQ2.base, M.MQ2.range, 0);
  state.mq4 = drift(M.MQ4.base, M.MQ4.range, 0);
  state.light = drift(M.LIGHT.base, M.LIGHT.range, 0);
  eventTimer++;
  if (eventTimer % M.TEMP.tilt_event.every === 0) {
    state.tilt_angle = drift(M.TEMP.tilt_event.base, M.TEMP.tilt_event.range, 1);
  }
  if (eventTimer % M.MQ2.spike.every === M.MQ2.spike.offset) {
    const spike = 200 + Math.floor(Math.random() * M.MQ2.spike.max_add);
    state.mq2 = Math.min(M.MQ2.spike.max_val, state.mq2 + spike);
    state.mq4 = Math.min(M.MQ4.spike.max_val, state.mq4 + spike * M.MQ4.spike.multiplier);
  }
}

// ============================================
// Socket.IO
// ============================================
io.on('connection', (socket) => {
  if (history.length === 0) {
    generateMockState();
    broadcastData();
  }
  socket.emit('init', {
    current: history[history.length - 1],
    history,
    alerts: state.alerts,
    meta: sensorMeta,
    location: locationName,
    lat: locationLat,
    lng: locationLng,
    server_start: SERVER_START_TIME,
  });
});

const dataInterval = setInterval(async () => {

  if (useRealData && Date.now() - lastRealTime < CONFIG.REAL_TIMEOUT_MS) {
    broadcastData();
  } else {
    useRealData = false;
    generateMockState();
    broadcastData();
  }
}, CONFIG.BROADCAST_INTERVAL_MS);

// ============================================
// Data Query API
// ============================================

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));

// Get historical data
app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 200;
  const hours = req.query.hours ? parseFloat(req.query.hours) : null;
  res.json(db.getHistory(limit, hours));
});

// Get statistics
app.get('/api/stats', (req, res) => {
  const hours = parseFloat(req.query.hours) || 1;
  const stats = db.getStats(hours);
  if (stats) res.json(stats);
  else res.json({ count: 0, period: hours + 'h', stats: {} });
});

// Export CSV
app.get('/api/export/csv', (req, res) => {
  const limit = parseInt(req.query.limit) || 500;
  const csv = db.getCSV(limit);
  if (!csv) return res.status(404).send('No data');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=manhole_data.csv');
  res.send(csv);
});

// Device status
app.get('/api/status', (req, res) => {
  const now = Date.now();
  const elapsed = Math.floor((now - lastDataTime) / 1000);
  res.json({
    online: elapsed < 15,
    last_seen: lastDataTime,
    elapsed_seconds: elapsed,
    data_source: useRealData ? 'realtime' : 'mock',
  });
});

// ============================================
// Static file hosting & SPA fallback
// ============================================
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return;
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

// ============================================
// 配置
// ============================================
function gracefulShutdown(signal) {
  console.log(`\n[INFO] 收到 ${signal} 信号，正在关闭...`);
  clearInterval(dataInterval);
  io.close(() => {
    server.close(() => {
      console.log('[INFO] 服务器已关闭');
      process.exit(0);
    });
  });
  setTimeout(() => { console.error('[ERR] 强制关闭超时'); process.exit(1); }, 5000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ============================================
// 启动
// ============================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`智能井盖监测系统 — 仪表盘运行在 http://localhost:${PORT}`);

  // ============================================
  db.init();
  console.log('[DB] Data persistence initialized');

  // Calibrated baselines (updated by auto-calibration)
  let BASELINE_MQ2 = 900;
  let BASELINE_MQ4 = 600;
  lastDataTime = Date.now();
  const DATA_TIMEOUT_MS = 15000;

  // MQTT 桥接 — 从公共 Broker 接收 ESP32 数据
  // ============================================
  try {
    mqttBridge.startListening((data) => {
      if (!data) return;
      Object.assign(state, {
        temperature: data.temperature,
        humidity: data.humidity,
        tilt_angle: data.tilt_angle,
        mq2: data.mq2,
        mq4: data.mq4,
        light: data.light,
      });
      useRealData = true;
      lastRealTime = Date.now();
      lastDataTime = Date.now();
      broadcastData();
    });
    console.log('[MQTT] Bridge started - listening for ESP32 data');
  } catch (err) {
    console.error('[MQTT] Bridge failed:', err.message);
  }
});

