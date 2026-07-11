# STM32L412CBT6 & SIM7070G Hardware Integration Guide

This guide describes how to interface the **STM32L412CBT6** ARM Cortex-M4 microcontroller with the **SIM7070G** cellular module and sensors using the **STM32 HAL Library (C)**.

---

## 1. STM32CubeMX Peripheral Configuration

Open STM32CubeMX to configure your pinout:

### A. USART Configuration (for SIM7070G Communication)
1. Select **USART1** or **USART2**.
2. **Mode**: `Asynchronous`
3. **Baud Rate**: `115200 Bits/s`
4. **Word Length**: `8 Bits`
5. **Parity**: `None`
6. **Stop Bits**: `1`
7. Under **NVIC Settings**, enable `USART global interrupt`.
8. Under **DMA Settings**, click Add and select `USART_RX` (configure as `Circular` mode, data width `Byte`) — this prevents STM32 from missing fast incoming AT responses.

### B. I2C Configuration (for Temperature/Humidity sensors like SHT3x)
1. Select **I2C1**.
2. **I2C Speed Mode**: `Standard Mode` (100 KHz) or `Fast Mode` (400 KHz).

---

## 2. Hardware Wiring Layout

```
STM32L412CBT6                    SIM7070G Module
┌──────────────┐                 ┌──────────────┐
│       PA2/TX1│ ──────────────> │RXD           │ (Level shifted if SIM7070 is 1.8V)
│       PA3/RX1│ <────────────── │TXD           │
│           GND│ ─────────────── │GND           │
│              │                 │              │
│       I2C_SDA│ <───(SDA)─────> │Sensors (SHT) │
│       I2C_SCL│ <───(SCL)─────> │Sensors (SHT) │
└──────────────┘                 └──────────────┘
```
> ⚠️ **IMPORTANT**: Most SIM7070G breakout boards run their UART logic lines at `1.8V` or `3.3V`. Since STM32 pins are `3.3V`, verify your module's voltage tolerance. If it is `1.8V`, you **must** use a bi-directional logic level converter (e.g. TXB0104) to avoid burning the SIM7070G Rx pin.

---

## 3. Sensor Interfacing (I2C SHT3x Sensor Driver Example)

The **SHT30/SHT31** are standard high-precision, low-power I2C temperature/humidity sensors perfect for cold-chain monitoring.

Add this code in your STM32 workspace to read the sensor:

```c
#include "stm32l4xx_hal.h"

#define SHT31_I2C_ADDR (0x44 << 1) // Default I2C address shifted left 1 bit

extern I2C_HandleTypeDef hi2c1;

typedef struct {
    float temperature;
    float humidity;
} SHT31_Data;

HAL_StatusTypeDef SHT31_Read(SHT31_Data *data) {
    uint8_t cmd[2] = {0x2C, 0x06}; // High repeatability single measurement command
    uint8_t rx_data[6];

    // 1. Trigger measurement
    if (HAL_I2C_Master_Transmit(&hi2c1, SHT31_I2C_ADDR, cmd, 2, 100) != HAL_OK) {
        return HAL_ERROR;
    }

    // 2. Wait for measurement conversion (takes ~15ms)
    HAL_Delay(20);

    // 3. Read 6 bytes of data (Temp MSB/LSB/CRC, Hum MSB/LSB/CRC)
    if (HAL_I2C_Master_Receive(&hi2c1, SHT31_I2C_ADDR, rx_data, 6, 100) != HAL_OK) {
        return HAL_ERROR;
    }

    // 4. Convert raw bytes to physical values
    uint16_t raw_temp = (rx_data[0] << 8) | rx_data[1];
    uint16_t raw_hum = (rx_data[3] << 8) | rx_data[4];

    data->temperature = -45.0f + 175.0f * ((float)raw_temp / 65535.0f);
    data->humidity = 100.0f * ((float)raw_hum / 65535.0f);

    return HAL_OK;
}
```

---

## 4. Main Driver Firmware (C HAL implementation)

This main file handles:
1. Parsing GPS coordinates asynchronously from the SIM7070G.
2. Building the JSON payload.
3. Sending the API request over UART.

```c
#include <stdio.h>
#include <string.h>
#include "stm32l4xx_hal.h"

extern UART_HandleTypeDef huart1; // USART connected to SIM7070G

#define TX_BUF_SIZE 512
#define RX_BUF_SIZE 256
char tx_buf[TX_BUF_SIZE];
char rx_buf[RX_BUF_SIZE];

// Telemetry variables
float current_temp = 0.0;
float current_hum = 0.0;
double current_lat = 0.0;
double current_lng = 0.0;

// Helper to send AT command and wait for response
HAL_StatusTypeDef Send_AT_Command(const char* cmd, const char* expected_resp, uint32_t timeout) {
    memset(rx_buf, 0, RX_BUF_SIZE);
    
    // Transmit AT Command
    HAL_UART_Transmit(&huart1, (uint8_t*)cmd, strlen(cmd), timeout);
    HAL_UART_Transmit(&huart1, (uint8_t*)"\r\n", 2, timeout);
    
    // Receive Response (Simple polling, recommend DMA circular queue in production)
    HAL_UART_Receive(&huart1, (uint8_t*)rx_buf, RX_BUF_SIZE - 1, timeout);
    
    if (strstr(rx_buf, expected_resp) != NULL) {
        return HAL_OK;
    }
    return HAL_ERROR;
}

// Power up GNSS and read coordinates
void Read_GPS(void) {
    Send_AT_Command("AT+CGNSPWR=1", "OK", 1000); // Enable GPS power
    HAL_Delay(1000);
    
    Send_AT_Command("AT+CGNSINF", "+CGNSINF:", 2000);
    
    // Parse latitude and longitude from: +CGNSINF: 1,1,20260711101530.000,6.927100,79.861200,...
    char *token;
    int index = 0;
    token = strtok(rx_buf, ",");
    while (token != NULL) {
        index++;
        if (index == 4) { // Latitude field
            current_lat = atof(token);
        } else if (index == 5) { // Longitude field
            current_lng = atof(token);
            break;
        }
        token = strtok(NULL, ",");
    }
}

// Setup GPRS/NB-IoT connection
void Setup_Cellular_Network(void) {
    Send_AT_Command("AT", "OK", 1000);
    Send_AT_Command("AT+CGATT?", "+CGATT: 1", 2000);
    Send_AT_Command("AT+CGDCONT=1,\"IP\",\"dialogbb\"", "OK", 2000); // Set your local APN
    Send_AT_Command("AT+CGACT=1,1", "OK", 3000); // Activate profile
}

// Construct JSON and HTTP POST
void Send_Telemetry_To_Server(void) {
    // 1. Initialize HTTP context
    Send_AT_Command("AT+HTTPINIT", "OK", 1000);
    
    // 2. Set API Target URL
    sprintf(tx_buf, "AT+HTTPPARA=\"URL\",\"https://your-backend.onrender.com/api/devices/YOUR_DEVICE_UUID/readings\"");
    Send_AT_Command(tx_buf, "OK", 1000);
    
    // 3. Set Content headers
    Send_AT_Command("AT+HTTPPARA=\"CONTENT\",\"application/json\"", 1000);
    
    // 4. Inject X-Device-Key Auth header
    sprintf(tx_buf, "AT+HTTPPARA=\"USERHDR\",\"X-Device-Key: YOUR_64_CHAR_DEVICE_API_KEY\"");
    Send_AT_Command(tx_buf, "OK", 1000);
    
    // 5. Construct JSON Body
    char json_body[256];
    sprintf(json_body, "{\"readings\":[{\"temperature_c\":%.2f,\"humidity_pct\":%.1f,\"latitude\":%.6f,\"longitude\":%.6f}]}",
            current_temp, current_hum, current_lat, current_lng);
    
    // 6. Set HTTP data parameters (buffer size, timeout)
    sprintf(tx_buf, "AT+HTTPDATA=%d,5000", (int)strlen(json_body));
    
    // Write JSON payload into data buffer
    if (Send_AT_Command(tx_buf, "DOWNLOAD", 3000) == HAL_OK) {
        HAL_UART_Transmit(&huart1, (uint8_t*)json_body, strlen(json_body), 2000);
        HAL_Delay(500);
    }
    
    // 7. Execute POST request
    Send_AT_Command("AT+HTTPACTION=1", "+HTTPACTION: 1,201,", 10000); // Expected status 201 Created
    
    // 8. Terminate HTTP
    Send_AT_Command("AT+HTTPTERM", "OK", 1000);
}
```

---

## 5. Low-Power Optimization for STM32L4

Since the STM32L412CBT6 is an **ultra-low-power microcontroller** designed for battery-powered cold-chain trackers, it shouldn't run at 100% processing speed constantly.

### The Low-Power Deep Sleep Flow:
Between data uploads, configure the system to sleep:

```
[STM32 Active] -> Read Sensors & GPS -> Send HTTP Data -> Put SIM7070G to sleep (AT+CSCLK=1)
       │
       ▼
Configure STM32 RTC Wakeup Timer (e.g., 15 minutes)
       │
       ▼
Enter STM32 STOP 2 Mode (HAL_PWREx_EnterSTOP2Mode)
       │
       ▼ (15 mins later)
[RTC Wakeup Interrupt] -> Resume Clock -> Wake up SIM7070G (pull DTR pin LOW) -> Loop Repeat
```

1. **SIM7070G Sleep**: Use the `AT+CSCLK=1` command to allow the module to automatically enter sleep mode when the DTR pin is high.
2. **STM32 STOP 2 Mode**: In STOP 2 mode, the CPU and all peripherals are stopped, but SRAM retention is preserved. Power consumption drops to **~1.1 µA**. Use the built-in RTC (Real-Time Clock) alarm to generate the wakeup event.
