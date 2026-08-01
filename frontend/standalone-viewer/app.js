const socket = io();

const SENSOR_META = {
  temperature: { label: '温度', unit: ' C', decimals: 1, icon: 'T', color: '#ff6b6b', barMax: 50 },
  humidity: { label: '湿度', unit: '%', decimals: 0, icon: 'H', color: '#4dabf7', barMax: 100 },
  tilt_angle: { label: '倾斜角度', unit: ' deg', decimals: 1, icon: 'A', color: '#69db7c', barMax: 30 },
  mq2: { label: '可燃气体', unit: '', decimals: 0, icon: 'G', color: '#ffd43b', barMax: 1000 },
  mq4: { label: '甲烷', unit: '', decimals: 0, icon: 'M', color: '#ff922b', barMax: 1000 },
  mq135: { label: '有害气体', unit: '', decimals: 0, icon: 'H', color: '#da77f2', barMax: 1000 },
};

const RISK_COLORS = {
  0: { fg: '#00e676', label: '低风险' },
  1: { fg: '#ffab00', label: '中风险' },
  2: { fg: '#ff6d00', label: '高风险' },
  3: { fg: '#ff1744', label: '紧急风险' },
};

const ARC_LENGTH = Math.PI * 100;
let chart = null;
let dataHistory = [];
const MAX_HISTORY = 300;
const startTime = Date.now();

/* ── Initialize ── */
createSensorCards();
if (typeof echarts !== 'undefined') {
  initChart();
} else {
  document.getElementById('trendChart').innerHTML = '<div style="padding:30px;color:#ff6b6b">ECharts 加载失败</div>';
}
updateClock();
setInterval(updateClock, 1000);
initLocation();

function getRiskColor(score) {
  if (score < 30) return RISK_COLORS[0];
  if (score < 60) return RISK_COLORS[1];
  if (score < 80) return RISK_COLORS[2];
  return RISK_COLORS[3];
}

function getCardStatus(value, thresholds) {
  if (value >= thresholds.critical) return 'critical';
  if (value >= thresholds.warning) return 'warning';
  return 'normal';
}

/* ── Sensor Cards ── */
function createSensorCards() {
  const grid = document.getElementById('sensorsGrid');
  grid.innerHTML = '';
  Object.entries(SENSOR_META).forEach(([key, meta]) => {
    const card = document.createElement('div');
    card.className = 'sensor-card normal';
    card.id = 'card-' + key;
    card.innerHTML = [
      '<div class="sensor-header">',
        '<span class="sensor-icon">' + meta.icon + '</span>',
        '<span class="sensor-status">--</span>',
      '</div>',
      '<div class="sensor-name">' + meta.label + '</div>',
      '<div class="sensor-value" id="val-' + key + '">',
        '--<span class="sensor-unit">' + meta.unit + '</span>',
      '</div>',
      '<div class="sensor-bar">',
        '<div class="sensor-bar-fill" id="bar-' + key + '" style="width:0%"></div>',
      '</div>',
    ].join('');
    grid.appendChild(card);
  });
}

function updateSensorCards(data) {
  Object.entries(SENSOR_META).forEach(function(_ref) {
    var key = _ref[0], meta = _ref[1];
    var value = data[key];
    var card = document.getElementById('card-' + key);
    var valEl = document.getElementById('val-' + key);
    var barEl = document.getElementById('bar-' + key);
    var statusEl = card.querySelector('.sensor-status');

    var thresholds;
    if (key === 'temperature') thresholds = { warning: 35, critical: 45 };
    else if (key === 'humidity') thresholds = { warning: 80, critical: 90 };
    else if (key === 'tilt_angle') thresholds = { warning: 10, critical: 20 };
    else thresholds = { warning: 600, critical: 800 };

    var status = getCardStatus(value, thresholds);
    card.className = 'sensor-card ' + status;
    statusEl.textContent = status === 'normal' ? '正常' : status === 'warning' ? '注意' : '危险';
    valEl.innerHTML = value.toFixed(meta.decimals) + '<span class="sensor-unit">' + meta.unit + '</span>';
    var pct = Math.min(100, (value / meta.barMax) * 100);
    barEl.style.width = pct + '%';
  });
}

/* ── Risk Gauge ── */
function updateRiskGauge(data) {
  var score = data.risk_score;
  var level = data.risk_level;
  var riskColor = getRiskColor(score);

  var ringFg = document.getElementById('ringFg');
  var progress = Math.min(100, Math.max(0, score));
  var dashLen = (progress / 100) * ARC_LENGTH;
  ringFg.style.strokeDasharray = dashLen + ' ' + ARC_LENGTH;
  ringFg.style.stroke = riskColor.fg;

  var scoreEl = document.getElementById('riskScore');
  scoreEl.textContent = score.toFixed(1);
  scoreEl.style.color = riskColor.fg;

  document.getElementById('riskLabel').textContent = riskColor.label;
}

/* ── ECharts ── */
function initChart() {
  var el = document.getElementById('trendChart');
  if (!el) return;
  el.style.height = '360px';
  chart = echarts.init(el);
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: '#aaa' }, top: 0, right: 0 },
    grid: { left: 40, right: 10, top: 30, bottom: 20 },
    xAxis: { type: 'time', axisLine: { lineStyle: { color: '#444' } }, axisLabel: { color: '#888', fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#2a2a2a', type: 'dashed' } }, axisLabel: { color: '#888', fontSize: 10 } },
    series: [
      { name: '温度', type: 'line', data: [], smooth: true, lineStyle: { width: 2, color: '#ff6b6b' } },
      { name: '湿度', type: 'line', data: [], smooth: true, lineStyle: { width: 2, color: '#4dabf7' } },
      { name: '倾斜角度', type: 'line', data: [], smooth: true, lineStyle: { width: 2, color: '#69db7c' } },
      { name: '可燃气体', type: 'line', data: [], smooth: true, lineStyle: { width: 2, color: '#ffd43b' } },
      { name: '甲烷', type: 'line', data: [], smooth: true, lineStyle: { width: 2, color: '#ff922b' } },
      { name: '有害气体', type: 'line', data: [], smooth: true, lineStyle: { width: 2, color: '#da77f2' } },
    ],
  });
  window.addEventListener('resize', function() { chart.resize(); });
}

function updateChart() {
  if (!chart) return;
  var keys = ['temperature','humidity','tilt_angle','mq2','mq4','mq135'];
  var series = keys.map(function(key) {
    return { data: dataHistory.map(function(d) { return [d._time, d[key]]; }) };
  });
  chart.setOption({ series: series });
}

/* ── Alerts ── */
function updateAlerts(alerts) {
  var list = document.getElementById('alertsList');
  var count = document.getElementById('alertCount');

  if (!alerts || alerts.length === 0) {
    list.innerHTML = '<div class="alerts-empty">暂无告警记录</div>';
    count.textContent = '0';
    return;
  }

  count.textContent = alerts.length;
  list.innerHTML = alerts.slice(0, 20).map(function(a) {
    return '<div class="alert-item">' +
      '<span class="alert-level level-' + a.level + '"></span>' +
      '<span class="alert-time">' + a.time + '</span>' +
      '<span class="alert-text">' + a.text + '</span>' +
    '</div>';
  }).join('');
}

/* ── Location ── */
function initLocation() {
  var display = document.getElementById('locationDisplay');
  var input = document.getElementById('locationInput');
  var editBtn = document.getElementById('locationEditBtn');

  display.addEventListener('click', function() { enterLocationEdit(); });
  editBtn.addEventListener('click', function() { enterLocationEdit(); });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') saveLocation();
    if (e.key === 'Escape') cancelLocationEdit();
  });

  input.addEventListener('blur', function() { saveLocation(); });
}

function enterLocationEdit() {
  var display = document.getElementById('locationDisplay');
  var input = document.getElementById('locationInput');
  input.value = display.textContent === '未设置' ? '' : display.textContent;
  display.classList.add('hidden');
  input.classList.remove('hidden');
  input.focus();
  input.select();
}

function cancelLocationEdit() {
  var display = document.getElementById('locationDisplay');
  var input = document.getElementById('locationInput');
  display.classList.remove('hidden');
  input.classList.add('hidden');
}

function saveLocation() {
  var input = document.getElementById('locationInput');
  var name = input.value.trim();
  if (!name) { cancelLocationEdit(); return; }
  fetch('/api/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name }),
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (data.success) updateLocationDisplay(data.name);
  }).catch(function() {});
  cancelLocationEdit();
}

function updateLocationDisplay(name) {
  document.getElementById('locationDisplay').textContent = name;
}

/* ── Clock ── */
function updateClock() {
  var now = new Date();
  document.getElementById('clock').textContent = now.toLocaleTimeString('zh-CN', { hour12: false });
  var elapsed = Math.floor((Date.now() - startTime) / 1000);
  var h = Math.floor(elapsed / 3600);
  var m = Math.floor((elapsed % 3600) / 60);
  var s = elapsed % 60;
  document.getElementById('uptime').textContent =
    (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
}

/* ── Socket.IO ── */
socket.on('init', function(data) {
  if (data.current) {
    updateRiskGauge(data.current);
    updateSensorCards(data.current);
  }
  if (data.history && data.history.length > 0) {
    dataHistory = data.history.map(function(d) {
      d._time = new Date(d.timestamp).getTime();
      return d;
    });
    updateChart();
  }
  if (data.alerts) updateAlerts(data.alerts);
  if (data.location) updateLocationDisplay(data.location);
});

socket.on('data', function(data) {
  updateRiskGauge(data);
  updateSensorCards(data);
  data._time = new Date(data.timestamp).getTime();
  dataHistory.push(data);
  if (dataHistory.length > MAX_HISTORY) dataHistory.shift();
  updateChart();
  updateClock();
});

socket.on('alerts', function(alerts) {
  updateAlerts(alerts);
});

socket.on('disconnect', function() {
  document.getElementById('statusIndicator').className = 'status-indicator offline';
  document.querySelector('.status-label').textContent = 'Offline';
});

socket.on('reconnect', function() {
  document.getElementById('statusIndicator').className = 'status-indicator online';
  document.querySelector('.status-label').textContent = 'Online';
});

socket.on('location', function(data) {
  updateLocationDisplay(data.name);
});

/* ── AI Analysis ── */
function renderAiAnalysis(result) {
  var statusEl = document.getElementById('aiStatus');
  var contentEl = document.getElementById('aiContent');

  var riskLabels = { low: '低风险', mid: '中风险', high: '高风险', critical: '紧急' };
  var riskColors = { low: '#00e676', mid: '#ffab00', high: '#ff6d00', critical: '#ff1744' };
  var level = result.risk_level || 'low';
  var color = riskColors[level] || '#888';

  statusEl.textContent = '已更新';
  statusEl.style.color = color;

  var anomaliesHtml = '';
  if (result.anomalies && result.anomalies.length > 0) {
    anomaliesHtml = '<div class="ai-block"><div class="ai-block-title">异常检测</div>' +
      result.anomalies.map(function(a) {
        return '<div class="ai-tag ai-tag-warning">' + a + '</div>';
      }).join('') + '</div>';
  }

  var suggestionsHtml = '';
  if (result.suggestions && result.suggestions.length > 0) {
    suggestionsHtml = '<div class="ai-block"><div class="ai-block-title">建议措施</div>' +
      result.suggestions.map(function(s) {
        return '<div class="ai-suggestion">' + s + '</div>';
      }).join('') + '</div>';
  }

  contentEl.innerHTML =
    '<div class="ai-summary-row">' +
      '<span class="ai-risk-badge" style="background:' + color + '20;color:' + color + ';border-color:' + color + '40">' +
        (riskLabels[level] || level) +
      '</span>' +
      '<span class="ai-summary-text">' + (result.summary || '') + '</span>' +
    '</div>' +
    '<div class="ai-trend">' + (result.trend_analysis || '') + '</div>' +
    anomaliesHtml +
    suggestionsHtml +
    '<div class="ai-time">分析时间: ' + new Date(result.analyzed_at).toLocaleTimeString('zh-CN', { hour12: false }) + '</div>';
}

socket.on('ai_analysis', function(result) {
  renderAiAnalysis(result);
});
