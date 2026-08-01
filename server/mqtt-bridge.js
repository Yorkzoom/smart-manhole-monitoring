/**
 *  MQTT Bridge - receive ESP32 data from public MQTT broker
 */

const mqtt = require("mqtt");

const MQTT_CONFIG = {
  broker: process.env.MQTT_BROKER || "broker.emqx.io",
  port: Number(process.env.MQTT_PORT) || 1883,
  topic: "manhole/esp32_001/data",
  clientId: "manhole_website_" + Math.random().toString(36).slice(2, 8),
};

let client = null;

function startListening(dataCallback) {
  if (client) return;

  const url = "mqtt://" + MQTT_CONFIG.broker + ":" + MQTT_CONFIG.port;
  process.stdout.write("[MQTT] Connecting to " + url + "...\n");

  client = mqtt.connect(url, {
    clientId: MQTT_CONFIG.clientId,
    clean: true,
  });

  client.on("connect", () => {
    process.stdout.write("[MQTT] Connected, subscribing to " + MQTT_CONFIG.topic + "\n");
    client.subscribe(MQTT_CONFIG.topic, { qos: 0 });
  });

  client.on("message", (topic, payload) => {
    try {
      const str = Buffer.from(payload).toString("utf8").trim();
      const raw = JSON.parse(str);
      const data = {
        temperature: Number(Number(raw.temperature).toFixed(1)),
        humidity: Math.round(Number(raw.humidity)),
        tilt_angle: Number(Number(raw.tilt_angle).toFixed(1)),
        light: Math.round(Number(raw.light)),
        mq2: Math.round(Number(raw.mq2)),
        mq4: Math.round(Number(raw.mq4)),
      };
      if (typeof dataCallback === "function") {
        dataCallback(data);
      }
    } catch (err) {
      process.stderr.write("[MQTT] Parse error: " + err.message + "\n");
    }
  });

  client.on("error", (err) => {
    process.stderr.write("[MQTT] Error: " + err.message + "\n");
  });

  client.on("close", () => {
    process.stdout.write("[MQTT] Disconnected\n");
  });
}

function stopListening() {
  if (client) { client.end(true); client = null; }
}

module.exports = { startListening, stopListening };
