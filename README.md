# 🕳️ 智能井盖监测系统

> 基于 **ESP32 + 多传感器融合 + MQTT** 的物联网智能井盖监测系统，实现井盖状态的实时采集、无线传输、可视化展示与 AI 智能分析。全套硬件成本仅 **¥84**，可用于市政井盖、窨井等地下基础设施的远程监测。

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"/>
  <img src="https://img.shields.io/badge/ESP32-Artix%207-brightgreen.svg" alt="ESP32"/>
  <img src="https://img.shields.io/badge/Arduino-IoT-orange.svg" alt="Arduino"/>
  <img src="https://img.shields.io/badge/Node.js-Express-green.svg" alt="Node.js"/>
  <img src="https://img.shields.io/badge/React-TS%20%2B%20Vite-61dafb.svg" alt="React"/>
  <img src="https://img.shields.io/badge/AI-DeepSeek-4f46e5.svg" alt="DeepSeek"/>
</p>

---

## ✨ 功能特性

- 🧭 **5 类传感器融合监测**：倾角（MPU6050）、光照（BH1750）、温湿度（DHT11）、可燃气体（MQ-2）、甲烷（MQ-4）
- 📡 **WiFi + MQTT 实时上报**：每 5 秒发布一次数据，断线自动重连，连续 6 次失败自动重启网络
- ⚠️ **多传感器加权风险评分**：4 维权重模型（气体 40% / 井盖开盖 25% / 倾斜 20% / 温度 15%），0-100 分四级分级告警
- 🤖 **DeepSeek AI 智能分析**：每 15 个数据点自动调用大模型，输出安全等级、趋势分析、异常检测与维护建议
- 📊 **Web 实时仪表盘**：React + ECharts + Leaflet，10 个功能模块，支持实时曲线、电子地图、告警推送
- 💾 **数据持久化**：JSON 文件按日存储 + 历史查询 + CSV 一键导出
- 💰 **低成本可部署**：全套硬件约 ¥84，全部软件基于开源技术栈

---

## 🏗️ 系统架构

```text
┌────────────── 感知层 ──────────────┐
│                                    │
│  MPU6050    BH1750    DHT11       │
│  (倾角)     (光照)    (温湿度)     │
│  MQ-2       MQ-4                  │
│ (可燃气体)  (甲烷)                 │
└──────┬────────┬──────┬────────────┘
       └────────┴──┬───┘
                   ▼
        ┌───────────────────┐
        │    ESP32 主控      │
        └─────────┬─────────┘
                  │  MQTT 每 5 秒发布
                  ▼
        ┌───────────────────┐
        │ broker.emqx.io    │
        │ (公共 MQTT 代理)  │
        └─────────┬─────────┘
                  ▼
        ┌───────────────────┐
        │   Node.js 后端     │
        │ Express+Socket.IO │
        └───┬───────────┬───┘
            ▼           ▼
   ┌──────────────┐ ┌──────────────┐
   │ JSON 持久化   │ │ DeepSeek AI  │
   └──────────────┘ └──────────────┘
            │
            ▼  WebSocket 实时推送
        ┌───────────────────┐
        │   React 仪表盘     │
        │ ECharts + Leaflet │
        └───────────────────┘
```

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 硬件 | ESP32 Dev Module、MPU6050、BH1750、DHT11、MQ-2、MQ-4 |
| 固件 | Arduino 框架、PubSubClient、ArduinoJson、Adafruit 传感器库 |
| 通信 | WiFi、MQTT（broker.emqx.io，公共代理） |
| 后端 | Node.js、Express、Socket.IO、mqtt.js |
| 前端 | React 18、TypeScript、Vite、Tailwind CSS 4、ECharts 5、Leaflet、Framer Motion、GSAP |
| AI | DeepSeek API（deepseek-chat） |

---

## 📦 快速开始

### 1️⃣ 硬件准备

物料清单（参考单价，合计约 **¥84**）：

| 组件 | 型号 | 接口 | 参考单价 |
|------|------|------|---------|
| 主控 | ESP32 Dev Module | — | ¥25 |
| 倾角传感器 | MPU6050 | I2C (0x68) | ¥8 |
| 光照传感器 | BH1750 | I2C (0x23) | ¥5 |
| 温湿度传感器 | DHT11 | 单总线 | ¥5 |
| 可燃气体传感器 | MQ-2 | ADC (GPIO34) | ¥8 |
| 甲烷传感器 | MQ-4 | ADC (GPIO35) | ¥8 |
| 面包板 | MB-102 830 孔 | — | ¥10 |
| 杜邦线 | 公对母 / 公对公 | — | ¥10 |

### 2️⃣ 接线图

```
MPU6050  SDA=GPIO21  SCL=GPIO22  VCC=3.3V
BH1750   SDA=GPIO21  SCL=GPIO22  VCC=3.3V
DHT11    DATA=GPIO4              VCC=3.3V
MQ-2     AO=GPIO34               VCC=3.3V
MQ-4     AO=GPIO35               VCC=3.3V
```

> 详见 [`hardware/面包板精确接线图.txt`](hardware/面包板精确接线图.txt)

### 3️⃣ 固件烧录

```bash
# 1. 修改 WiFi 配置：firmware/mqtt_publish/mqtt_publish.ino
#    #define WIFI_SSID     "your-wifi-ssid"
#    #define WIFI_PASSWORD "your-wifi-password"

# 2. 安装依赖库（Arduino IDE 库管理器）
#    Adafruit_MPU6050 / Adafruit_Sensor / BH1750 / DHT / PubSubClient / ArduinoJson

# 3. 编译上传（arduino-cli）
arduino-cli compile --fqbn espressif:esp32:esp32 firmware/mqtt_publish
arduino-cli upload -p COM3 --fqbn espressif:esp32:esp32 firmware/mqtt_publish
```

### 4️⃣ 启动后端

```bash
cd server
npm install
node server.js
# 仪表盘运行在 http://localhost:3000
```

> 可选：在 `.env` 中配置 `DEEPSEEK_API_KEY` 开启 AI 分析（[申请地址](https://platform.deepseek.com)）

### 5️⃣ 构建前端（可选，后端已内置打包产物）

```bash
cd frontend
npm install
npm run build     # 产物输出到 frontend/dist
```

### 6️⃣ 独立查看器（无需服务器）

直接浏览器打开 [`frontend/standalone-viewer/mqtt-viewer.html`](frontend/standalone-viewer/mqtt-viewer.html)，通过浏览器端 MQTT.js 直接订阅主题查看实时数据。

---

## 📁 目录结构

```
.
├── firmware/
│   ├── mqtt_publish/           # [当前使用] MQTT 发布方案
│   ├── http_post/              # 备选：HTTP POST 方案
│   └── sensor_diagnostic/      # 备选：传感器自检固件
├── server/
│   ├── server.js               # 主服务器入口（Express + Socket.IO）
│   ├── mqtt-bridge.js          # MQTT 桥接模块
│   ├── ai-analysis.js          # DeepSeek AI 分析模块
│   ├── database.js             # JSON 数据持久化
│   ├── .env.example            # 环境变量模板
│   └── client/dist/            # 前端构建产物
├── frontend/
│   ├── src/                    # React + TypeScript 源码（10 个组件）
│   └── 独立查看器/             # 免服务器 MQTT 查看器
├── secrets/
│   └── secrets_template.h      # 固件密钥模板
├── hardware/                   # 面包板接线图
├── scripts/                   # 启动/构建脚本
└── docs/                   # 开题/中期/结课报告
```

---

## 🧪 测试结果

| 指标 | 目标值 | 实测值 | 结论 |
|------|--------|--------|------|
| 数据采集频率 | ≥ 每 5 秒一次 | 每 5 秒一次 | ✅ 达标 |
| 数据上传延迟 | < 3 秒 | 约 1-2 秒 | ✅ 达标 |
| 倾斜角度精度 | ±1° | ±1° | ✅ 达标 |
| 温度精度 | ±2℃ | ±2℃ | ✅ 达标 |
| 湿度精度 | ±5% RH | ±5% RH | ✅ 达标 |
| 连续运行稳定性 | > 30 分钟无故障 | 236 次零错误 | ✅ 达标 |
| 网页首屏加载 | < 3 秒 | < 1 秒（Vite 构建） | ✅ 达标 |

## 🧮 风险评分算法

多传感器加权融合模型，评分 0-100：

| 维度 | 权重 | 说明 |
|------|------|------|
| 可燃气体浓度 | 40% | MQ-2 / MQ-4 读数归一化后取最大值 |
| 井盖开启状态 | 25% | 通过光照强度判断井盖是否打开/缺失 |
| 倾斜角度 | 20% | 倾角绝对值归一化反映倾斜程度 |
| 环境温度 | 15% | 温度超过 40℃ 产生风险贡献 |

**分级标准**：正常（0-29）→ 低风险（30-59）→ 中风险（60-79）→ 高风险（80-100）
告警采用 **3 分钟冷却机制** 防止重复通知，支持浏览器桌面推送。

## 🤖 AI 智能分析

系统每 15 个数据点自动调用 DeepSeek API，返回 5 个维度的结构化分析：

- 🔒 **risk_level**：安全等级评估
- 📝 **summary**：状态摘要
- 📈 **trend_analysis**：趋势分析
- 🚨 **anomalies**：异常检测列表
- 🛠️ **suggestions**：维护建议

内置 20 秒超时与自动重试，API 不可用时自动降级为本地规则分析。

---

## ⚠️ 注意事项

- 传感器统一使用 **3.3V 供电**（总电流约 400mA），避免 USB 5V 供电不稳定
- 如需户外部署，可启用 ESP32 深度睡眠模式（已预留唤醒引脚），建议配合太阳能供电
- 生产环境建议增加 TLS 加密通信与设备认证

## 📄 License

[MIT](LICENSE) © 2026 Yorkzoom

---

**如果这个项目对你有帮助，欢迎 ⭐ Star / Fork / Issue / PR！**
