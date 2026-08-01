/*****************************************************************
 *  HTTP POST ?? ? ESP32 ???????
 *  
 *  ???
 *    MPU6050 SDA=21 SCL=22 VCC=3.3V, ADDR=0x68
 *    BH1750  SDA=21 SCL=22 VCC=3.3V, ADDR=0x23
 *    DHT11   DATA=4, VCC=3.3V
 *    MQ-2    AO=34, VCC=3.3V
 *    MQ-4    AO=35, VCC=3.3V
 *  
 *  ????ESP32 -> HTTP POST -> ???? :3000 -> ???
 *****************************************************************/
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <BH1750.h>
#include <DHT.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#define WIFI_SSID     "your-wifi-ssid"
#define WIFI_PASSWORD "your-wifi-password"
#define SERVER_URL    "http://10.141.42.177:3000/api/sensor-data"

#define PIN_DHT11   4
#define PIN_MQ2     34
#define PIN_MQ4     35
#define I2C_SDA     21
#define I2C_SCL     22

Adafruit_MPU6050 mpu;
BH1750 bh1750;
DHT dht(PIN_DHT11, DHT11);

static int postFailures = 0;

static void readSensors(float& t, float& h, uint32_t& mq2, uint32_t& mq4, float& lux, float& tilt) {
  float tt = dht.readTemperature();
  float hh = dht.readHumidity();
  if (!isnan(tt) && !isnan(hh)) { t = tt; h = hh; }

  mq2 = analogRead(PIN_MQ2);
  mq4 = analogRead(PIN_MQ4);

  float l = bh1750.readLightLevel();
  if (l >= 0) lux = l;

  sensors_event_t a, g, temp;
  if (mpu.getEvent(&a, &g, &temp)) {
    float tx = atan2(a.acceleration.x, 9.8f) * 180.0f / 3.14159f;
    float ty = atan2(a.acceleration.y, 9.8f) * 180.0f / 3.14159f;
    tilt = sqrt(tx*tx + ty*ty);
  }
}

static bool postData(float t, float h, uint32_t mq2, uint32_t mq4, float lux, float tilt) {
  if (WiFi.status() != WL_CONNECTED) return false;

  StaticJsonDocument<256> doc;
  doc["temperature"] = (int)(t * 10) / 10.0f;
  doc["humidity"]    = (int)h;
  doc["tilt_angle"]  = (int)(tilt * 10) / 10.0f;
  doc["mq2"]         = mq2;
  doc["mq4"]         = mq4;
  doc["light"]       = (int)lux;

  char payload[256];
  serializeJson(doc, payload, sizeof(payload));

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  int code = http.POST((uint8_t*)payload, strlen(payload));
  bool ok = (code == 200);
  http.end();

  Serial.printf("[HTTP] POST %s -> %d\n", ok ? "OK" : "FAIL", code);
  return ok;
}

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("\n=== HTTP POST SCHEME ===");
  Serial.printf("Target: %s\n", SERVER_URL);

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(100000);
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_MQ2, ADC_11db);
  analogSetPinAttenuation(PIN_MQ4, ADC_11db);
  dht.begin();

  if (!mpu.begin(0x68, &Wire)) Serial.println("[MPU] FAIL");
  else { Serial.println("[MPU] OK"); mpu.setAccelerometerRange(MPU6050_RANGE_8_G); }

  if (!bh1750.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23, &Wire)) Serial.println("[BH1750] FAIL");
  else Serial.println("[BH1750] OK");

  Serial.print("[WiFi] Connecting...");
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500); Serial.print("."); tries++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] OK IP=%s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("[WiFi] FAIL!");
  }
}

void loop() {
  static unsigned long lastPost = 0;
  unsigned long now = millis();

  if (now - lastPost >= 5000) {
    lastPost = now;

    float t=0, h=0, lux=0, tilt=0;
    uint32_t mq2=0, mq4=0;
    readSensors(t, h, mq2, mq4, lux, tilt);

    Serial.printf("[DATA] T=%.1f H=%.0f MQ2=%u MQ4=%u LUX=%.0f TILT=%.1f\n",
      t, h, mq2, mq4, lux, tilt);

    bool ok = postData(t, h, mq2, mq4, lux, tilt);
    if (ok) postFailures = 0;
    else postFailures++;

    if (postFailures >= 6) {
      Serial.println("[WARN] 6 consecutive POST failures - reconnecting WiFi...");
      WiFi.disconnect();
      WiFi.reconnect();
      postFailures = 0;
    }
  }

  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastReconnect = 0;
    if (now - lastReconnect > 15000) {
      lastReconnect = now;
      Serial.println("[WiFi] Reconnecting...");
      WiFi.reconnect();
    }
  }

  delay(10);
}

