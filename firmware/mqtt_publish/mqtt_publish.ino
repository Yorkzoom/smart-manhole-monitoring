/*****************************************************************
 *  MQTT 发布方案 — ESP32 通过 EMQX 公共 Broker 发布传感器数据
 *
 *  说明：
 *   ESP32 通过 MQTT publish 将数据发布到 broker.emqx.io
 *
 *  接线：
 *    MPU6050 SDA=21 SCL=22 VCC=3.3V
 *    BH1750  SDA=21 SCL=22 VCC=3.3V
 *    DHT11   DATA=4, VCC=3.3V
 *    MQ-2    AO=34, VCC=3.3V
 *    MQ-4    AO=35, VCC=3.3V
 *****************************************************************/
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <BH1750.h>
#include <DHT.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

#define WIFI_SSID     "your-wifi-ssid"
#define WIFI_PASSWORD "your-wifi-password"

#define MQTT_BROKER   "broker.emqx.io"
#define MQTT_PORT     1883
#define MQTT_TOPIC    "manhole/esp32_001/data"
#define MQTT_CLIENT_ID "manhole_esp32_001"

#define PIN_DHT11   4
#define PIN_MQ2     34
#define PIN_MQ4     35
#define I2C_SDA     21
#define I2C_SCL     22

Adafruit_MPU6050 mpu;
BH1750 bh1750;
DHT dht(PIN_DHT11, DHT11);
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

static unsigned long lastPub = 0;
static int pubCount = 0, failCount = 0;

static void readSensors(float& t, float& h, uint32_t& mq2, uint32_t& mq4, float& lux, float& tilt) {
  float tt=dht.readTemperature(), hh=dht.readHumidity();
  if(!isnan(tt)&&!isnan(hh)){t=tt;h=hh;}
  mq2=analogRead(PIN_MQ2); mq4=analogRead(PIN_MQ4);
  float l=bh1750.readLightLevel(); if(l>=0) lux=l;
  sensors_event_t a,g,temp;
  if(mpu.getEvent(&a,&g,&temp)){
    float tx=atan2(a.acceleration.x,9.8f)*180/3.14159f;
    float ty=atan2(a.acceleration.y,9.8f)*180/3.14159f;
    tilt=sqrt(tx*tx+ty*ty);
  }
}

static bool pubData(float t, float h, uint32_t mq2, uint32_t mq4, float lux, float tilt) {
  if(WiFi.status()!=WL_CONNECTED||!mqttClient.connected()) return false;

  StaticJsonDocument<256> doc;
  doc["temperature"]=(int)(t*10)/10.0f;
  doc["humidity"]=(int)h;
  doc["tilt_angle"]=(int)(tilt*10)/10.0f;
  doc["mq2"]=mq2; doc["mq4"]=mq4;
  doc["light"]=(int)lux;
  doc["timestamp"]=millis();

  char payload[256];
  size_t len=serializeJson(doc,payload,sizeof(payload));
  bool ok=mqttClient.publish(MQTT_TOPIC,payload,len);
  Serial.printf("[MQTT] pub %s -> %s\n",ok?"OK":"FAIL",payload);
  return ok;
}

void setup() {
  Serial.begin(115200); delay(2000);
  Serial.println("\n=== MQTT PUBLISH SCHEME ===");
  Serial.printf("Broker: %s:%d Topic: %s\n",MQTT_BROKER,MQTT_PORT,MQTT_TOPIC);

  Wire.begin(I2C_SDA,I2C_SCL); Wire.setClock(100000);
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_MQ2,ADC_11db);
  analogSetPinAttenuation(PIN_MQ4,ADC_11db);
  dht.begin();

  if(!mpu.begin(0x68,&Wire)) Serial.println("[MPU] FAIL");
  else { Serial.println("[MPU] OK"); mpu.setAccelerometerRange(MPU6050_RANGE_8_G); }
  if(!bh1750.begin(BH1750::CONTINUOUS_HIGH_RES_MODE,0x23,&Wire)) Serial.println("[BH1750] FAIL");
  else Serial.println("[BH1750] OK");

  // WiFi
  Serial.print("[WiFi] Connecting...");
  WiFi.persistent(false); WiFi.mode(WIFI_STA); WiFi.begin(WIFI_SSID,WIFI_PASSWORD);
  int tries=0; while(WiFi.status()!=WL_CONNECTED&&tries<30){delay(500);Serial.print(".");tries++;}
  Serial.println();
  if(WiFi.status()==WL_CONNECTED) Serial.printf("[WiFi] OK IP=%s\n",WiFi.localIP().toString().c_str());
  else Serial.println("[WiFi] FAIL!");

  // MQTT
  mqttClient.setServer(MQTT_BROKER,MQTT_PORT);
  mqttClient.connect(MQTT_CLIENT_ID);
  Serial.printf("[MQTT] connect -> %s\n",mqttClient.connected()?"OK":"FAIL");
}

void loop() {
  if(!mqttClient.connected()) {
    static unsigned long lastRe=0;
    if(millis()-lastRe>10000){lastRe=millis();mqttClient.connect(MQTT_CLIENT_ID);}
  }
  mqttClient.loop();

  if(millis()-lastPub>=5000){
    lastPub=millis();
    float t=0,h=0,lux=0,tilt=0; uint32_t mq2=0,mq4=0;
    readSensors(t,h,mq2,mq4,lux,tilt);
    Serial.printf("[DATA] T=%.1f H=%.0f MQ2=%u MQ4=%u LUX=%.0f TILT=%.1f\n",t,h,mq2,mq4,lux,tilt);
    bool ok=pubData(t,h,mq2,mq4,lux,tilt);
    if(ok){pubCount++;failCount=0;}else failCount++;
    if(failCount>=6){
      Serial.println("[WARN] Reconnecting WiFi/MQTT...");
      WiFi.disconnect();WiFi.reconnect();
      failCount=0;
    }
  }

  if(WiFi.status()!=WL_CONNECTED){
    static unsigned long lastW=0;
    if(millis()-lastW>15000){lastW=millis();WiFi.reconnect();}
  }
  delay(10);
}

