const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const MAX_POINTS = 10000;

let cache = [];

function init() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0,10);
  const file = path.join(DATA_DIR, today + '.json');
  if (fs.existsSync(file)) {
    try { cache = JSON.parse(fs.readFileSync(file, 'utf-8')); console.log('[DB] Loaded ' + cache.length + ' points'); }
    catch(e) { console.error('[DB] Load error:', e.message); cache = []; }
  }
}

function save(point) {
  cache.push(point);
  if (cache.length > MAX_POINTS) cache = cache.slice(-MAX_POINTS);
  // Write to disk (throttled)
  clearTimeout(save._t);
  save._t = setTimeout(() => {
    const file = path.join(DATA_DIR, new Date().toISOString().slice(0,10) + '.json');
    try { fs.writeFileSync(file, JSON.stringify(cache)); } catch(e) {}
  }, 3000);
}

function getHistory(limit, hours) {
  let d = cache;
  if (hours) { const c = Date.now() - hours*3600000; d = d.filter(p => new Date(p.timestamp).getTime() >= c); }
  return d.slice(-(limit||200));
}

function getStats(hours) {
  const c = Date.now() - (hours||1)*3600000;
  const r = cache.filter(p => new Date(p.timestamp).getTime() >= c);
  if (r.length < 2) return null;
  const f = ['temperature','humidity','tilt_angle','mq2','mq4','light','risk_score'];
  const s = {};
  for (const k of f) {
    const v = r.map(p => Number(p[k])).filter(n => !isNaN(n));
    if (!v.length) continue;
    s[k] = {
      avg: Number((v.reduce((a,b)=>a+b,0)/v.length).toFixed(1)),
      min: Number(Math.min(...v).toFixed(1)),
      max: Number(Math.max(...v).toFixed(1)),
    };
  }
  return { count: r.length, period: (hours||1)+'h', stats: s };
}

function getCSV(limit) {
  const d = cache.slice(-(limit||500));
  if (!d.length) return '';
  const h = Object.keys(d[0]);
  return [h.join(','), ...d.map(p => h.map(k => p[k]??'').join(','))].join('\n');
}

module.exports = { init, save, getHistory, getStats, getCSV };
