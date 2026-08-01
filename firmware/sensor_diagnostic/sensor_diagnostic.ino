/*****************************************************************
 *  ???? ? 5 ?????????
 *  
 *  ????????????????????????
 *  
 *  ?????
 *    MPU6050  SDA=GPIO21, SCL=GPIO22, VCC=3.3V, ADDR=0x68
 *    BH1750   SDA=GPIO21, SCL=GPIO22, VCC=3.3V, ADDR=0x23
 *    DHT11    DATA=GPIO15, VCC=3.3V  (???? GPIO15????? GPIO4)
 *    MQ-2     AO=GPIO34, VCC=5V
 *    MQ-4     AO=GPIO35, VCC=5V
 *****************************************************************/

#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <BH1750.h>
#include <DHT.h>

/* ===== ???? ===== */
#define PIN_DHT11_15   15
#define PIN_DHT11_4     4
#define PIN_MQ2        34
#define PIN_MQ4        35
#define I2C_SDA        21
#define I2C_SCL        22

/* ===== ???? ===== */
#define TEST_SAMPLES   50
#define MQ_WARMUP_MS  2000
#define DHT_INTERVAL  1200

Adafruit_MPU6050 mpu;
BH1750 bh1750;
DHT dht15(PIN_DHT11_15, DHT11);
DHT dht4(PIN_DHT11_4, DHT11);

static void printSep(const char* title) {
  Serial.println();
  Serial.println("============================================");
  Serial.print("== "); Serial.println(title);
  Serial.println("============================================");
}

static void printPass(const char* msg) { Serial.print("  [PASS] "); Serial.println(msg); }
static void printFail(const char* msg) { Serial.print("  [FAIL] "); Serial.println(msg); }
static void printWarn(const char* msg) { Serial.print("  [WARN] "); Serial.println(msg); }

/* ===== 1. I2C ???? ===== */
static bool testI2CScan() {
  printSep("1. I2C BUS SCAN");
  Serial.println("  Scanning addresses 1-127...");
  bool found_mpu = false, found_bh = false;
  byte count = 0;
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    byte err = Wire.endTransmission();
    if (err == 0) {
      Serial.printf("    [FOUND] 0x%02X", addr);
      if (addr == 0x68) { Serial.print(" <- MPU6050"); found_mpu = true; }
      if (addr == 0x23) { Serial.print(" <- BH1750");  found_bh  = true; }
      Serial.println();
      count++;
    }
  }
  Serial.printf("  Total I2C devices: %d\n", count);
  if (!found_mpu) { printFail("MPU6050 (0x68) NOT found"); }
  else            { printPass("MPU6050 (0x68) found"); }
  if (!found_bh)  { printFail("BH1750 (0x23) NOT found");  }
  else            { printPass("BH1750 (0x23) found"); }
  if (count > 2)  { printWarn("Extra I2C devices detected"); }
  return found_mpu && found_bh;
}

/* ===== 2. MPU6050 ?? ===== */
static bool testMPU6050() {
  printSep("2. MPU6050 DIAGNOSTIC");
  if (!mpu.begin(0x68, &Wire)) { printFail("mpu.begin() failed"); return false; }
  printPass("mpu.begin() OK");
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  float ax_m=99,ax_M=-99,axS=0, ay_m=99,ay_M=-99,ayS=0, az_m=99,az_M=-99,azS=0;
  float gx_m=99,gx_M=-99,gxS=0, gy_m=99,gy_M=-99,gyS=0, gz_m=99,gz_M=-99,gzS=0;
  int fail = 0;
  for (int i = 0; i < TEST_SAMPLES; i++) {
    sensors_event_t a, g, t;
    if (mpu.getEvent(&a, &g, &t)) {
      axS+=a.acceleration.x; ax_m=min(ax_m,a.acceleration.x); ax_M=max(ax_M,a.acceleration.x);
      ayS+=a.acceleration.y; ay_m=min(ay_m,a.acceleration.y); ay_M=max(ay_M,a.acceleration.y);
      azS+=a.acceleration.z; az_m=min(az_m,a.acceleration.z); az_M=max(az_M,a.acceleration.z);
      gxS+=g.gyro.x; gx_m=min(gx_m,g.gyro.x); gx_M=max(gx_M,g.gyro.x);
      gyS+=g.gyro.y; gy_m=min(gy_m,g.gyro.y); gy_M=max(gy_M,g.gyro.y);
      gzS+=g.gyro.z; gz_m=min(gz_m,g.gyro.z); gz_M=max(gz_M,g.gyro.z);
    } else fail++;
    delay(10);
  }
  int n = TEST_SAMPLES - fail;
  Serial.printf("  Samples: %d/%d valid, %d failed\n", n, TEST_SAMPLES, fail);
  if (n < 10) { printFail("Too many failures"); return false; }
  Serial.println("  Accel (m/s2) - min/avg/max:");
  Serial.printf("    AX: %.2f / %.2f / %.2f\n", ax_m, axS/n, ax_M);
  Serial.printf("    AY: %.2f / %.2f / %.2f\n", ay_m, ayS/n, ay_M);
  Serial.printf("    AZ: %.2f / %.2f / %.2f\n", az_m, azS/n, az_M);
  if (azS/n > 7.0 && azS/n < 12.0) printPass("AZ gravity vector OK (~9.8)");
  else printWarn("AZ not near 9.8 - board may be tilted/moving");
  if (fabs(axS/n)<2.0 && fabs(ayS/n)<2.0) printPass("AX/AY near zero");
  else printWarn("AX/AY not near zero");
  Serial.println("  Gyro (deg/s) - min/avg/max:");
  Serial.printf("    GX: %.2f / %.2f / %.2f\n", gx_m, gxS/n, gx_M);
  Serial.printf("    GY: %.2f / %.2f / %.2f\n", gy_m, gyS/n, gy_M);
  Serial.printf("    GZ: %.2f / %.2f / %.2f\n", gz_m, gzS/n, gz_M);
  if (fabs(gxS/n)<5.0 && fabs(gyS/n)<5.0 && fabs(gzS/n)<5.0) printPass("Gyro near zero");
  else printWarn("Gyro not near zero");
  return true;
}

/* ===== 3. BH1750 ?? ===== */
static bool testBH1750() {
  printSep("3. BH1750 DIAGNOSTIC");
  if (!bh1750.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23, &Wire)) {
    printFail("bh1750.begin() failed"); return false;
  }
  printPass("bh1750.begin() OK");
  float lmin=999999, lmax=-1, lsum=0;
  int fail=0;
  for (int i=0; i<TEST_SAMPLES; i++) {
    float v = bh1750.readLightLevel();
    if (v>=0) { lmin=min(lmin,v); lmax=max(lmax,v); lsum+=v; }
    else fail++;
    delay(30);
  }
  int n = TEST_SAMPLES - fail;
  Serial.printf("  Samples: %d/%d valid, %d failed\n", n, TEST_SAMPLES, fail);
  if (n<10) { printFail("Too many failures"); return false; }
  Serial.printf("  Light (lux) - min/avg/max: %.1f / %.1f / %.1f\n", lmin, lsum/n, lmax);
  float avg=lsum/n;
  if (avg>0 && avg<65536) printPass("Valid range");
  else { printFail("Out of range"); return false; }
  if (avg<1) Serial.println("  Environment: DARK (<1 lux)");
  else if (avg<50) Serial.println("  Environment: DIM (1-50 lux)");
  else if (avg<500) Serial.println("  Environment: INDOOR (50-500 lux)");
  else Serial.println("  Environment: BRIGHT (>500 lux)");
  return true;
}

/* ===== 4. DHT11 ?????? ===== */
static bool testDHT11() {
  printSep("4. DHT11 PIN COMPARISON");
  Serial.println("  4a. Testing GPIO4 (firmware default)...");
  dht4.begin(); delay(DHT_INTERVAL);
  float t4=dht4.readTemperature(), h4=dht4.readHumidity();
  bool ok4=!isnan(t4)&&!isnan(h4);
  if (ok4) Serial.printf("    GPIO4: T=%.1fC H=%.1f%% => VALID\n",t4,h4);
  else Serial.printf("    GPIO4: T=%.1fC H=%.1f%% => FAIL (NaN)\n",t4,h4);
  Serial.println("  4b. Testing GPIO15 (wiring diagram)...");
  dht15.begin(); delay(DHT_INTERVAL);
  float t15=dht15.readTemperature(), h15=dht15.readHumidity();
  bool ok15=!isnan(t15)&&!isnan(h15);
  if (ok15) Serial.printf("    GPIO15: T=%.1fC H=%.1f%% => VALID\n",t15,h15);
  else Serial.printf("    GPIO15: T=%.1fC H=%.1f%% => FAIL (NaN)\n",t15,h15);
  if (ok4&&!ok15) { printPass("DHT11 works on GPIO4 - wiring doc wrong"); }
  else if (ok15&&!ok4) { printPass("DHT11 works on GPIO15 - firmware pin wrong!"); }
  else if (ok4&&ok15) { printWarn("DHT11 works on BOTH - check short"); }
  else { printFail("DHT11 not working on either pin!"); return false; }
  int sp = ok15 ? PIN_DHT11_15 : PIN_DHT11_4;
  DHT& dw = (sp==PIN_DHT11_15) ? dht15 : dht4;
  dw.begin();
  Serial.println("  4c. DHT11 stability (20 samples)...");
  float tmin=99,tmax=-99,tsum=0, hmin=99,hmax=-99,hsum=0;
  int valid=0;
  for (int i=0;i<20;i++) {
    delay(DHT_INTERVAL);
    float t=dw.readTemperature(), h=dw.readHumidity();
    if (!isnan(t)&&!isnan(h)) { tsum+=t;tmin=min(tmin,t);tmax=max(tmax,t); hsum+=h;hmin=min(hmin,h);hmax=max(hmax,h); valid++; }
  }
  Serial.printf("    Valid: %d/20\n", valid);
  if (valid>=10) {
    Serial.printf("    Temp (C): min=%.1f avg=%.1f max=%.1f\n",tmin,tsum/valid,tmax);
    Serial.printf("    Hum (%%): min=%.1f avg=%.1f max=%.1f\n",hmin,hsum/valid,hmax);
    if (tsum/valid>0&&tsum/valid<60) printPass("Temp reasonable");
    else printWarn("Temp unusual");
    if (hsum/valid>10&&hsum/valid<100) printPass("Humidity reasonable");
    else printWarn("Humidity unusual");
  } else { printFail("Too many DHT11 failures"); return false; }
  return true;
}

/* ===== 5. MQ-2 ?? ===== */
static bool testMQ2() {
  printSep("5. MQ-2 DIAGNOSTIC");
  Serial.println("  Warming MQ-2 (2s)..."); delay(MQ_WARMUP_MS);
  uint32_t rmin=9999,rmax=0,rsum=0; int fail=0;
  for (int i=0;i<TEST_SAMPLES;i++) {
    uint32_t r=analogRead(PIN_MQ2);
    if (r<4096) { rmin=min(rmin,r); rmax=max(rmax,r); rsum+=r; }
    else fail++;
    delay(20);
  }
  int n=TEST_SAMPLES-fail;
  Serial.printf("  Samples: %d/%d valid\n",n,TEST_SAMPLES);
  if (n<10) { printFail("Too many bad reads"); return false; }
  uint32_t avg=rsum/n;
  Serial.printf("  Raw ADC: min=%u avg=%u max=%u (0-4095)\n",rmin,avg,rmax);
  Serial.printf("  Voltage: min=%.3fV avg=%.3fV max=%.3fV\n",rmin*3.3/4095.0,avg*3.3/4095.0,rmax*3.3/4095.0);
  if (avg<500) { printFail("Very LOW - check power/connection"); return false; }
  else if (avg<1500) Serial.printf("  Baseline: LOW (%u) - clean air\n",avg);
  else if (avg<2800) Serial.printf("  Baseline: NORMAL (%u)\n",avg);
  else Serial.printf("  Baseline: HIGH (%u) - gas/aging\n",avg);
  uint16_t noise=rmax-rmin;
  Serial.printf("  Noise: %u counts\n",noise);
  if (noise<50) printPass("Low noise");
  else if (noise<200) printWarn("Moderate noise");
  else printWarn("High noise");
  return true;
}

/* ===== 6. MQ-4 ?? ===== */
static bool testMQ4() {
  printSep("6. MQ-4 DIAGNOSTIC");
  Serial.println("  Warming MQ-4 (2s)..."); delay(MQ_WARMUP_MS);
  uint32_t rmin=9999,rmax=0,rsum=0; int fail=0;
  for (int i=0;i<TEST_SAMPLES;i++) {
    uint32_t r=analogRead(PIN_MQ4);
    if (r<4096) { rmin=min(rmin,r); rmax=max(rmax,r); rsum+=r; }
    else fail++;
    delay(20);
  }
  int n=TEST_SAMPLES-fail;
  Serial.printf("  Samples: %d/%d valid\n",n,TEST_SAMPLES);
  if (n<10) { printFail("Too many bad reads"); return false; }
  uint32_t avg=rsum/n;
  Serial.printf("  Raw ADC: min=%u avg=%u max=%u (0-4095)\n",rmin,avg,rmax);
  Serial.printf("  Voltage: min=%.3fV avg=%.3fV max=%.3fV\n",rmin*3.3/4095.0,avg*3.3/4095.0,rmax*3.3/4095.0);
  if (avg<500) { printFail("Very LOW - check power/connection"); return false; }
  else if (avg<1000) Serial.printf("  Baseline: LOW (%u) - clean air\n",avg);
  else if (avg<2500) Serial.printf("  Baseline: NORMAL (%u)\n",avg);
  else Serial.printf("  Baseline: HIGH (%u) - gas/aging\n",avg);
  uint16_t noise=rmax-rmin;
  Serial.printf("  Noise: %u counts\n",noise);
  if (noise<50) printPass("Low noise");
  else if (noise<200) printWarn("Moderate noise");
  else printWarn("High noise");
  return true;
}

struct DiagResult { bool i2c,mpu,bh,dht,mq2,mq4; };
static void printSummary(const DiagResult& r);

static void printSummary(const DiagResult& r) {
  printSep("7. DIAGNOSTIC SUMMARY");
  int pass=0;
  if(r.i2c){printPass("I2C Bus");pass++;}else{printFail("I2C Bus");}
  if(r.mpu){printPass("MPU6050");pass++;}else{printFail("MPU6050");}
  if(r.bh){printPass("BH1750");pass++;}else{printFail("BH1750");}
  if(r.dht){printPass("DHT11");pass++;}else{printFail("DHT11");}
  if(r.mq2){printPass("MQ-2");pass++;}else{printFail("MQ-2");}
  if(r.mq4){printPass("MQ-4");pass++;}else{printFail("MQ-4");}
  Serial.printf("\n  === RESULT: %d/6 PASSED ===\n",pass);
  if(pass==6) {
    Serial.println("  ALL SENSORS PASS - hardware healthy");
    Serial.println("  Fix DHT11 pin in firmware if GPIO15 works");
  } else {
    Serial.printf("  %d test(s) FAILED\n",6-pass);
  }
  Serial.println("\n  Power: MQ heaters ~300mA + WiFi ~300mA = ~800mA > USB 500mA");
  Serial.println("  => Use external 5V supply for WiFi mode");
}

void setup() {
  Serial.begin(115200); delay(2000);
  Serial.println("\n========================================");
  Serial.println("   SENSOR HARDWARE DIAGNOSTIC v1.0");
  Serial.println("   MPU6050/BH1750/DHT11/MQ-2/MQ-4");
  Serial.println("========================================\n");
  Wire.begin(I2C_SDA,I2C_SCL); Wire.setClock(100000);
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_MQ2,ADC_11db);
  analogSetPinAttenuation(PIN_MQ4,ADC_11db);
  DiagResult r={false,false,false,false,false,false};
  r.i2c=testI2CScan(); Serial.println(); delay(200);
  r.mpu=testMPU6050(); delay(200);
  r.bh=testBH1750(); delay(200);
  r.dht=testDHT11(); delay(200);
  r.mq2=testMQ2(); delay(200);
  r.mq4=testMQ4(); delay(200);
  printSummary(r);
  Serial.println("\n=== DIAGNOSTIC COMPLETE ===");
  Serial.println("Heartbeat every 30s. Press RESET to re-run.");
}

void loop() {
  static unsigned long last=0;
  if (millis()-last>30000) {
    last=millis();
    Serial.print("[HEARTBEAT] ");
    Wire.beginTransmission(0x68); bool mpu_alive=(Wire.endTransmission()==0);
    Wire.beginTransmission(0x23); bool bh_alive=(Wire.endTransmission()==0);
    dht15.begin(); delay(100); float t=dht15.readTemperature(); bool dht_alive=!isnan(t);
    uint32_t mq2=analogRead(PIN_MQ2), mq4=analogRead(PIN_MQ4);
    Serial.printf("MPU=%s BH=%s DHT=%s MQ2=%u MQ4=%u\n",
      mpu_alive?"OK":"DEAD",bh_alive?"OK":"DEAD",dht_alive?"OK":"DEAD",mq2,mq4);
  }
}
