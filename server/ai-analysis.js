// ============================================
// AI 分析模块 — DeepSeek API
// ============================================
const API_KEY = process.env.DEEPSEEK_API_KEY || '';
const BASE_URL = 'https://api.deepseek.com/v1';
const MODEL = 'deepseek-chat';
const TIMEOUT_MS = 20000;
const MAX_RETRIES = 1;
const DATA_POINTS = 5;
const MIN_DATA_POINTS = 3;
const MAX_TOKENS = 800;
const TEMPERATURE = 0.1;

function buildPrompt(dataPoints) {
  const header = '时间 | 温度(C) | 湿度(%) | 倾斜(deg) | 可燃气体 | 甲烷 | 光照(lux) | 风险评分';
  const rows = dataPoints.map((d) => {
    const t = new Date(d.timestamp);
    const time = [
      t.getHours().toString().padStart(2, '0'),
      t.getMinutes().toString().padStart(2, '0'),
      t.getSeconds().toString().padStart(2, '0'),
    ].join(':');
    return [time, d.temperature, d.humidity, d.tilt_angle, d.mq2, d.mq4, d.light, d.risk_score].join(' | ');
  }).join('\n');

  return [
    '你是一个智能井盖监测系统的 AI 分析专家。请根据以下传感器时序数据分析当前状态。',
    '',
    `数据（每2秒一条，最近${dataPoints.length}条）：`,
    header,
    rows,
    '',
    '请严格按照以下 JSON 格式返回，不要包含任何其他文字或 markdown 代码块标记：',
    '{',
    '  "risk_level": "low 或 mid 或 high 或 critical",',
    '  "summary": "一句话概括当前状态（15字以内）",',
    '  "trend_analysis": "趋势分析（50字以内）",',
    '  "anomalies": ["异常描述1", "异常描述2"],',
    '  "suggestions": ["建议1", "建议2", "建议3"]',
    '}',
  ].join('\n');
}

function parseResponse(content) {
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  const parsed = JSON.parse(cleaned);
  return {
    risk_level: parsed.risk_level || 'unknown',
    summary: parsed.summary || '',
    trend_analysis: parsed.trend_analysis || '',
    anomalies: Array.isArray(parsed.anomalies) ? parsed.anomalies : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    analyzed_at: new Date().toISOString(),
  };
}

async function callAPI(prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: '你是一个井盖监测分析助手。仅输出JSON，不要推理过程，不要多余文字。' },
          { role: 'user', content: prompt },
        ],
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.error(`[AI分析] API请求失败: ${res.status} ${res.statusText}`);
      return null;
    }

    const json = await res.json();
    const message = json.choices?.[0]?.message;
    const content = message?.content;

    if (!content) {
      console.error('[AI分析] 响应格式异常:', JSON.stringify(json));
      return null;
    }

    return parseResponse(content);
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function analyze(history) {
  const dataPoints = history.slice(-DATA_POINTS);
  if (dataPoints.length < MIN_DATA_POINTS) return null;

  const prompt = buildPrompt(dataPoints);
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await callAPI(prompt);
      if (result) return result;
    } catch (err) {
      lastError = err;
      if (err.name === 'AbortError') {
        console.error(`[AI分析] 请求超时 (尝试 ${attempt + 1}/${MAX_RETRIES + 1})`);
      } else {
        console.error(`[AI分析] 错误 (尝试 ${attempt + 1}/${MAX_RETRIES + 1}):`, err.message);
      }
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  if (lastError) {
    console.error('[AI分析] 所有重试均失败:', lastError.message);
  }
  return null;
}

module.exports = { analyze };

