# SIM7070G hardware Integration Guide

This guide describes how to connect the **SIMCom SIM7070G** (NB-IoT/Cat-M/GPRS) module to your backend database. It contains the physical connection layout, the AT command sequence, and a complete Arduino/C++ code template.

---

## 1. System Architecture

The typical hardware configuration consists of:
```
┌─────────────────┐             ┌─────────────────┐             ┌────────────────┐
│   Sensors       │ ──(I2C/One)──>│ Microcontroller │ ──(UART/AT)──>│   SIM7070G     │
│ (DHT22/SHT31)   │               │ (ESP32/Arduino) │               │ Cellular Module│
└─────────────────┘               └─────────────────┘               └────────────────┘
                                                                            │
                                                                       (Cellular LTE)
                                                                            ▼
                                                               ┌────────────────┐
                                                               │  Your Server   │
                                                               │  (Render API)  │
                                                               └────────────────┘
```

---

## 2. API Endpoints for Hardware Ingestion

The backend expects devices to authenticate using a **long-lived static API Key** generated in the Admin Panel.

### Ingest Live Readings
* **Method**: `POST`
* **URL**: `https://<your-render-backend>.onrender.com/api/devices/:device_id/readings` (or `/api/ingest/readings` if using general ingestion)
* **Headers**:
  - `Content-Type`: `application/json`
  - `X-Device-Key`: `your_64_character_hex_device_api_key`
* **Payload**:
```json
{
  "readings": [
    {
      "temperature_c": -18.5,
      "humidity_pct": 62.3,
      "latitude": 6.9271,
      "longitude": 79.8612
    }
  ]
}
```

---

## 3. SIM7070G AT Command Sequence

To establish a connection and post data, the microcontroller issues these commands to the SIM7070G UART serial lines:

### A. Initialize Network Connection
1. **Check connection status**: `AT+CGATT?` (Returns `+CGATT: 1` when attached to cellular network)
2. **Define PDP context**: `AT+CGDCONT=1,"IP","your_sim_apn"` (Replace `your_sim_apn` with APN of your SIM provider, e.g. `dialogbb`)
3. **Activate PDP context**: `AT+CGACT=1,1`

### B. Acquire GPS Coordinates
1. **Turn on GPS engine**: `AT+CGNSPWR=1` (Enables GNSS engine)
2. **Get GPS Info**: `AT+CGNSINF`
   * Returns: `+CGNSINF: 1,1,20260711101530.000,6.927100,79.861200,12.5,...`
   * Extract fields:
     - Field index 3: Latitude (`6.927100`)
     - Field index 4: Longitude (`79.861200`)

### C. Perform HTTP POST Request
1. **Initialize HTTP**: `AT+HTTPINIT`
2. **Set session parameter (URL)**: `AT+HTTPPARA="URL","https://<your-backend>.onrender.com/api/devices/<device-id>/readings"`
3. **Set Content-Type header**: `AT+HTTPPARA="CONTENT","application/json"`
4. **Set Custom Headers (Device Key)**: `AT+HTTPPARA="USERHDR","X-Device-Key: <your_device_key>"`
5. **Set HTTP Data buffer**: `AT+HTTPDATA=<data_length>,5000`
   * Send JSON string payload (e.g. `{"readings":[{"temperature_c":-18.5,"humidity_pct":62,"latitude":6.9271,"longitude":79.8612}]}`) immediately after receiving the `DOWNLOAD` prompt.
6. **Execute POST**: `AT+HTTPACTION=1`
   * Returns: `+HTTPACTION: 1,201,15` (Format: `method,status_code,response_len`. `201` indicates successful database insertion).
7. **Clean up session**: `AT+HTTPTERM`

---

## 4. Complete Arduino / C++ Code Template

Copy this code into your Arduino IDE. It uses ESP32 (or Arduino) UART serial ports to query a DHT22 sensor and GPS, format the JSON payload, and upload it via the SIM7070G module.

```cpp
#include <HardwareSerial.h>

// ─── CONFIGURATION ───
const char* APN = "dialogbb"; // Replace with your SIM provider APN
const char* SERVER_URL = "https://your-backend.onrender.com/api/devices/YOUR_DEVICE_UUID/readings";
const char* DEVICE_KEY = "YOUR_64_CHAR_HEX_DEVICE_API_KEY"; // From Admin Dashboard

// ESP32 Serial pins connected to SIM7070G Rx/Tx
#define RX_PIN 16
#define TX_PIN 17
HardwareSerial simSerial(2);

// Simulated Sensor Variables (Replace with real sensor reads, e.g. DHT.read())
float temperature = -18.2;
float humidity = 61.4;
float gps_lat = 0.0;
float gps_lng = 0.0;

void setup() {
  Serial.begin(115200);
  simSerial.begin(115200, SERIAL_8N1, RX_PIN, TX_PIN);
  
  delay(3000);
  Serial.println("Initializing cellular module connection...");
  
  setupNetwork();
}

void loop() {
  // 1. Read sensors
  readSensors();
  
  // 2. Read GPS coordinates
  readGPS();
  
  // 3. Post telemetry data to database
  sendTelemetry();
  
  // Wait 15 minutes before the next upload
  delay(15 * 60 * 1000); 
}

void readSensors() {
  // Replace with SHT31 / DHT22 actual read code
  temperature = -18.2 + ((random(-100, 100)) / 100.0);
  humidity = 60.5 + ((random(-200, 200)) / 100.0);
}

void readGPS() {
  sendATCommand("AT+CGNSPWR=1", 1000); // Enable GPS
  String response = sendATCommand("AT+CGNSINF", 2000);
  
  // Parse response: +CGNSINF: 1,1,20260711101530.000,6.927100,79.861200,...
  int firstComma = response.indexOf(',');
  int secondComma = response.indexOf(',', firstComma + 1);
  int thirdComma = response.indexOf(',', secondComma + 1);
  int fourthComma = response.indexOf(',', thirdComma + 1);
  int fifthComma = response.indexOf(',', fourthComma + 1);
  
  if (secondComma != -1 && thirdComma != -1 && fourthComma != -1) {
    String latStr = response.substring(thirdComma + 1, fourthComma);
    String lngStr = response.substring(fourthComma + 1, fifthComma);
    
    gps_lat = latStr.toFloat();
    gps_lng = lngStr.toFloat();
    
    Serial.printf("GPS Position acquired: (%f, %f)\n", gps_lat, gps_lng);
  } else {
    Serial.println("Waiting for GPS satellite fix...");
  }
}

void setupNetwork() {
  sendATCommand("AT", 1000);
  sendATCommand("ATE0", 1000); // Disable command echo for cleaner response parsing
  sendATCommand("AT+CGATT?", 2000); // Verify attached to network
  
  String apnCmd = "AT+CGDCONT=1,\"IP\",\"" + String(APN) + "\"";
  sendATCommand(apnCmd, 2000);
  sendATCommand("AT+CGACT=1,1", 3000); // Activate GPRS/NB-IoT connection
}

void sendTelemetry() {
  // 1. Format JSON payload
  String jsonBody = "{\"readings\":[{\"temperature_c\":" + String(temperature, 2) + 
                    ",\"humidity_pct\":" + String(humidity, 1) + 
                    ",\"latitude\":" + String(gps_lat, 6) + 
                    ",\"longitude\":" + String(gps_lng, 6) + "}]}";

  Serial.println("Posting JSON: " + jsonBody);

  // 2. Open HTTP connection
  sendATCommand("AT+HTTPINIT", 1000);
  
  // Set parameters
  sendATCommand("AT+HTTPPARA=\"URL\",\"" + String(SERVER_URL) + "\"", 1000);
  sendATCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", 1000);
  
  // Inject the API key into custom request header
  sendATCommand("AT+HTTPPARA=\"USERHDR\",\"X-Device-Key: " + String(DEVICE_KEY) + "\"", 1000);
  
  // Load data buffer size
  String dataCmd = "AT+HTTPDATA=" + String(jsonBody.length()) + ",5000";
  simSerial.println(dataCmd);
  delay(500); // Wait for module prompt "DOWNLOAD"
  
  // Write payload to buffer
  simSerial.print(jsonBody);
  delay(1000);
  
  // Execute POST (action method 1 = POST)
  String postResult = sendATCommand("AT+HTTPACTION=1", 10000);
  
  // Verify response
  if (postResult.indexOf(",201,") != -1) {
    Serial.println("🚀 Telemetry updated successfully in database!");
  } else {
    Serial.println("❌ Database ingestion failed! Check credentials, URL, or data payload.");
  }
  
  // Terminate HTTP session
  sendATCommand("AT+HTTPTERM", 1000);
}

String sendATCommand(String command, const int timeout) {
  String response = "";
  simSerial.println(command);
  
  long int time = millis();
  while ((time + timeout) > millis()) {
    while (simSerial.available()) {
      char c = simSerial.read();
      response += c;
    }
  }
  
  Serial.print("[AT COMMAND RESPONSE]: ");
  Serial.println(response);
  return response;
}
```

---

## 5. Verification Checklist

1. **SIM Status**: Ensure you are using an **active SIM** with GPRS or NB-IoT data plan, and PIN lock is disabled (`AT+CPIN?` returns `READY`).
2. **Antenna**: Verify the cellular antenna is securely attached to the **LTE** terminal, and the GPS antenna is attached to the **GNSS** terminal (these are two separate connectors!).
3. **Flashing Key**: Verify the `DEVICE_KEY` in the code matches the API Key flashed from your dashboard.
4. **HTTPS**: If your server URL starts with `https`, ensure the SIM7070G has SSL enabled using `AT+CSSLCFG="sslversion",1,3`.
