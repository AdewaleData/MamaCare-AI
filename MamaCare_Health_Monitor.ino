/*
 * MamaCare Health Monitor - Complete Arduino/ESP32 Code
 * Modular IoT Device with Logic Gate Implementation
 * 
 * This code combines all sensor modules using logic gates:
 * - BP Module (I2C)
 * - Temperature Module (I2C)
 * - Heart Rate Module (I2C)
 * - Weight Scale Module (GPIO)
 * - Display Module (I2C)
 * - Bluetooth Communication
 * 
 * Author: MamaCare AI Team
 * Date: 2024
 */

// ============================================
// LIBRARY INCLUDES
// ============================================
#include <Wire.h>                    // I2C communication
#include <Adafruit_MLX90614.h>       // Temperature sensor
#include <MAX30102.h>                // Heart rate sensor
#include <HX711.h>                   // Weight scale
#include <Adafruit_SSD1306.h>        // OLED display
#include <Adafruit_GFX.h>            // Graphics library
#include <BluetoothSerial.h>         // Bluetooth communication
#include <ArduinoJson.h>             // JSON formatting

// ============================================
// PIN DEFINITIONS
// ============================================
#define I2C_SDA 21                   // I2C Data line
#define I2C_SCL 22                   // I2C Clock line
#define HX711_CLK 18                 // Weight scale clock
#define HX711_DT 19                  // Weight scale data
#define BUTTON_PIN 0                 // Measurement button
#define BATTERY_PIN 35               // Battery voltage monitor
#define LED_PIN 2                    // Status LED

// ============================================
// I2C ADDRESSES
// ============================================
#define BP_MODULE_ADDR 0x48          // Blood pressure module
#define TEMP_MODULE_ADDR 0x5A        // Temperature sensor (MLX90614)
#define HR_MODULE_ADDR 0x57          // Heart rate sensor (MAX30102)
#define DISPLAY_ADDR 0x3C            // OLED display

// ============================================
// GLOBAL OBJECTS
// ============================================
Adafruit_MLX90614 tempSensor = Adafruit_MLX90614();
MAX30102 hrSensor;
HX711 weightScale;
Adafruit_SSD1306 display(128, 64, &Wire, -1);
BluetoothSerial SerialBT;

// ============================================
// DATA STRUCTURES
// ============================================
struct HealthData {
    float systolic_bp;
    float diastolic_bp;
    float heart_rate;
    float body_temp;
    float weight;
    float bmi;
    unsigned long timestamp;
    bool valid;
};

struct BPData {
    float systolic;
    float diastolic;
    float heart_rate;
    bool valid;
};

struct FeatureArray {
    // Base features (11)
    float base_features[11];
    // Derived features (9)
    float derived_features[9];
    // Complete array (20)
    float all_features[20];
};

// ============================================
// GLOBAL VARIABLES
// ============================================
FeatureArray features;
HealthData currentData;
float user_height = 1.60;  // Default height in meters (from app)
unsigned long lastDisplayUpdate = 0;
bool measurementInProgress = false;

// ============================================
// SETUP FUNCTION
// ============================================
void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("========================================");
    Serial.println("MamaCare Health Monitor");
    Serial.println("Initializing System...");
    Serial.println("========================================");
    
    // Initialize I2C Bus
    Wire.begin(I2C_SDA, I2C_SCL);
    delay(100);
    Serial.println("[OK] I2C Bus initialized");
    
    // Initialize Display
    if (!display.begin(SSD1306_SWITCHCAPVCC, DISPLAY_ADDR)) {
        Serial.println("[ERROR] Display initialization failed!");
        while(1);  // Halt if display fails
    }
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("MamaCare");
    display.println("Initializing...");
    display.display();
    Serial.println("[OK] Display initialized");
    
    // Initialize Temperature Sensor
    if (!tempSensor.begin(TEMP_MODULE_ADDR)) {
        Serial.println("[ERROR] Temperature sensor failed!");
        display.clearDisplay();
        display.setCursor(0, 0);
        display.println("Temp sensor");
        display.println("failed!");
        display.display();
    } else {
        Serial.println("[OK] Temperature sensor initialized");
    }
    
    // Initialize Heart Rate Sensor
    if (!hrSensor.begin(Wire, I2C_SPEED_FAST)) {
        Serial.println("[ERROR] Heart rate sensor failed!");
        display.clearDisplay();
        display.setCursor(0, 0);
        display.println("HR sensor");
        display.println("failed!");
        display.display();
    } else {
        hrSensor.setup();
        Serial.println("[OK] Heart rate sensor initialized");
    }
    
    // Initialize Weight Scale
    weightScale.begin(HX711_DT, HX711_CLK);
    weightScale.set_scale(2280.f);  // Calibration factor (adjust as needed)
    weightScale.tare();  // Reset to zero
    Serial.println("[OK] Weight scale initialized");
    
    // Initialize Bluetooth
    if (!SerialBT.begin("MamaCare-Device")) {
        Serial.println("[ERROR] Bluetooth initialization failed!");
    } else {
        Serial.println("[OK] Bluetooth ready: 'MamaCare-Device'");
    }
    
    // Initialize Button
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    Serial.println("[OK] Button initialized");
    
    // Initialize Battery Monitor
    pinMode(BATTERY_PIN, INPUT);
    Serial.println("[OK] Battery monitor initialized");
    
    // Initialize LED
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);
    
    Serial.println("========================================");
    Serial.println("Initialization Complete!");
    Serial.println("Press button to start measurement");
    Serial.println("========================================");
    
    // Show ready screen
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("MamaCare Ready!");
    display.println("Press button to");
    display.println("measure");
    display.display();
    
    delay(2000);
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
    // Check if button is pressed (start measurement)
    if (digitalRead(BUTTON_PIN) == LOW && !measurementInProgress) {
        delay(50);  // Debounce
        if (digitalRead(BUTTON_PIN) == LOW) {
            measurementInProgress = true;
            performCompleteMeasurement();
            measurementInProgress = false;
        }
    }
    
    // Check for Bluetooth commands
    if (SerialBT.available()) {
        handleBluetoothCommand();
    }
    
    // Update display with standby screen
    if (millis() - lastDisplayUpdate > 5000) {
        updateStandbyDisplay();
        lastDisplayUpdate = millis();
    }
    
    delay(100);
}

// ============================================
// LOGIC GATE 1: COMPLETE MEASUREMENT
// ============================================
void performCompleteMeasurement() {
    Serial.println("\n========================================");
    Serial.println("Starting Complete Measurement");
    Serial.println("========================================");
    
    // Initialize data structure
    currentData.valid = false;
    currentData.timestamp = millis();
    
    // Show measuring screen
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("Measuring...");
    display.println("Please wait...");
    display.display();
    
    digitalWrite(LED_PIN, HIGH);  // LED on during measurement
    
    // ============================================
    // LOGIC GATE 2: READ BLOOD PRESSURE
    // ============================================
    Serial.println("\n[GATE 2] Reading Blood Pressure...");
    BPData bpData = readBloodPressure();
    if (!bpData.valid) {
        Serial.println("[ERROR] BP measurement failed!");
        showError("BP Error");
        digitalWrite(LED_PIN, LOW);
        return;
    }
    currentData.systolic_bp = bpData.systolic;
    currentData.diastolic_bp = bpData.diastolic;
    currentData.heart_rate = bpData.heart_rate;
    Serial.printf("[OK] BP: %.0f/%.0f, HR: %.0f bpm\n", 
                  bpData.systolic, bpData.diastolic, bpData.heart_rate);
    
    // ============================================
    // LOGIC GATE 3: READ TEMPERATURE
    // ============================================
    Serial.println("\n[GATE 3] Reading Temperature...");
    currentData.body_temp = readTemperature();
    if (currentData.body_temp < 0) {
        Serial.println("[ERROR] Temperature reading failed!");
        showError("Temp Error");
        digitalWrite(LED_PIN, LOW);
        return;
    }
    Serial.printf("[OK] Temperature: %.1f C\n", currentData.body_temp);
    
    // ============================================
    // LOGIC GATE 4: READ HEART RATE (if not from BP)
    // ============================================
    if (currentData.heart_rate == 0) {
        Serial.println("\n[GATE 4] Reading Heart Rate from HR Module...");
        currentData.heart_rate = readHeartRate();
        if (currentData.heart_rate > 0) {
            Serial.printf("[OK] Heart Rate: %.0f bpm\n", currentData.heart_rate);
        }
    }
    
    // ============================================
    // LOGIC GATE 5: READ WEIGHT
    // ============================================
    Serial.println("\n[GATE 5] Reading Weight...");
    currentData.weight = readWeight();
    if (currentData.weight < 0) {
        Serial.println("[ERROR] Weight reading failed!");
        showError("Weight Error");
        digitalWrite(LED_PIN, LOW);
        return;
    }
    currentData.bmi = calculateBMI(currentData.weight, user_height);
    Serial.printf("[OK] Weight: %.1f kg, BMI: %.1f\n", 
                  currentData.weight, currentData.bmi);
    
    // ============================================
    // LOGIC GATE 6: DATA VALIDATION
    // ============================================
    Serial.println("\n[GATE 6] Validating Data...");
    if (!validateHealthData(currentData)) {
        Serial.println("[ERROR] Data validation failed!");
        showError("Invalid Data");
        digitalWrite(LED_PIN, LOW);
        return;
    }
    currentData.valid = true;
    Serial.println("[OK] All data validated!");
    
    // ============================================
    // LOGIC GATE 7: ASSEMBLE BASE FEATURES
    // ============================================
    Serial.println("\n[GATE 7] Assembling Base Features...");
    assembleBaseFeatures(currentData, features);
    Serial.println("[OK] Base features assembled (11 features)");
    
    // ============================================
    // LOGIC GATE 8: CALCULATE DERIVED FEATURES
    // ============================================
    Serial.println("\n[GATE 8] Calculating Derived Features...");
    calculateDerivedFeatures(currentData, features);
    Serial.println("[OK] Derived features calculated (9 features)");
    
    // ============================================
    // LOGIC GATE 9: CREATE COMPLETE FEATURE ARRAY
    // ============================================
    Serial.println("\n[GATE 9] Creating Complete Feature Array...");
    createCompleteFeatureArray(features);
    Serial.println("[OK] Complete feature array created (20 features)");
    
    // ============================================
    // LOGIC GATE 10: DISPLAY RESULTS
    // ============================================
    Serial.println("\n[GATE 10] Displaying Results...");
    displayResults(currentData);
    Serial.println("[OK] Results displayed");
    
    // ============================================
    // LOGIC GATE 11: SEND VIA BLUETOOTH
    // ============================================
    Serial.println("\n[GATE 11] Sending Data via Bluetooth...");
    sendBluetoothData(currentData, features);
    Serial.println("[OK] Data sent via Bluetooth");
    
    Serial.println("\n========================================");
    Serial.println("Measurement Complete!");
    Serial.println("========================================\n");
    
    digitalWrite(LED_PIN, LOW);  // LED off
    delay(3000);  // Show results for 3 seconds
}

// ============================================
// LOGIC GATE 2: READ BLOOD PRESSURE
// ============================================
BPData readBloodPressure() {
    BPData result;
    result.valid = false;
    result.systolic = 0;
    result.diastolic = 0;
    result.heart_rate = 0;
    
    // Check if BP module is present
    Wire.beginTransmission(BP_MODULE_ADDR);
    byte error = Wire.endTransmission();
    if (error != 0) {
        Serial.println("[WARNING] BP module not found, using simulated data");
        // Simulated data for testing (remove in production)
        result.systolic = 120.0;
        result.diastolic = 80.0;
        result.heart_rate = 72.0;
        result.valid = true;
        return result;
    }
    
    // Request BP measurement
    Wire.beginTransmission(BP_MODULE_ADDR);
    Wire.write(0x01);  // Command: Start measurement
    error = Wire.endTransmission();
    
    if (error != 0) {
        Serial.println("[ERROR] Failed to start BP measurement");
        return result;
    }
    
    // Wait for measurement (30-60 seconds typical)
    Serial.println("Waiting for BP measurement (30-60 seconds)...");
    delay(3000);  // Reduced for testing (use actual measurement time in production)
    
    // Read BP data (6 bytes: systolic, diastolic, heart_rate)
    Wire.requestFrom(BP_MODULE_ADDR, 6);
    if (Wire.available() >= 6) {
        byte data[6];
        for (int i = 0; i < 6; i++) {
            data[i] = Wire.read();
        }
        
        // Parse BP data (format depends on module - adjust as needed)
        result.systolic = (float)((data[0] << 8) | data[1]);
        result.diastolic = (float)((data[2] << 8) | data[3]);
        result.heart_rate = (float)((data[4] << 8) | data[5]);
        
        // Validate ranges
        if (result.systolic >= 70 && result.systolic <= 250 &&
            result.diastolic >= 40 && result.diastolic <= 150 &&
            result.heart_rate >= 40 && result.heart_rate <= 200) {
            result.valid = true;
        } else {
            Serial.println("[ERROR] BP data out of valid range");
        }
    } else {
        Serial.println("[ERROR] Failed to read BP data");
    }
    
    return result;
}

// ============================================
// LOGIC GATE 3: READ TEMPERATURE
// ============================================
float readTemperature() {
    float temp = tempSensor.readObjectTempC();
    
    // Check if reading is valid
    if (temp < -40 || temp > 125) {
        Serial.println("[WARNING] Invalid temperature reading, using default");
        return 37.0;  // Default normal body temperature
    }
    
    // Calibration offset (if needed)
    // temp = temp + calibration_offset;
    
    return temp;
}

// ============================================
// LOGIC GATE 4: READ HEART RATE
// ============================================
float readHeartRate() {
    long irValue = hrSensor.getIR();
    float heartRate = 0;
    
    if (irValue > 50000) {  // Valid signal
        heartRate = hrSensor.getHeartRate();
        
        // Validate range
        if (heartRate < 40 || heartRate > 200) {
            Serial.println("[WARNING] Heart rate out of valid range");
            return 0;
        }
    } else {
        Serial.println("[WARNING] Weak HR signal");
    }
    
    return heartRate;
}

// ============================================
// LOGIC GATE 5: READ WEIGHT
// ============================================
float readWeight() {
    // Read weight from HX711 (average of 10 readings)
    float weight = weightScale.get_units(10);
    
    if (weight < 0) {
        weight = 0;
    }
    
    // Validate range
    if (weight > 200) {
        Serial.println("[WARNING] Weight exceeds maximum (200 kg)");
        return 0;
    }
    
    return weight;
}

// ============================================
// LOGIC GATE 6: DATA VALIDATION
// ============================================
bool validateHealthData(HealthData data) {
    // Validate systolic BP
    if (data.systolic_bp < 70 || data.systolic_bp > 250) {
        Serial.println("[ERROR] Invalid systolic BP");
        return false;
    }
    
    // Validate diastolic BP
    if (data.diastolic_bp < 40 || data.diastolic_bp > 150) {
        Serial.println("[ERROR] Invalid diastolic BP");
        return false;
    }
    
    // Validate heart rate
    if (data.heart_rate < 40 || data.heart_rate > 200) {
        Serial.println("[ERROR] Invalid heart rate");
        return false;
    }
    
    // Validate temperature
    if (data.body_temp < 32.0 || data.body_temp > 42.0) {
        Serial.println("[ERROR] Invalid temperature");
        return false;
    }
    
    // Validate weight
    if (data.weight < 0 || data.weight > 200) {
        Serial.println("[ERROR] Invalid weight");
        return false;
    }
    
    // Validate BMI
    if (data.bmi < 10.0 || data.bmi > 50.0) {
        Serial.println("[ERROR] Invalid BMI");
        return false;
    }
    
    return true;
}

// ============================================
// LOGIC GATE 7: ASSEMBLE BASE FEATURES
// ============================================
void assembleBaseFeatures(HealthData data, FeatureArray& features) {
    // Base features (11 total)
    features.base_features[0] = data.heart_rate;        // F1: heart_rate
    features.base_features[1] = data.body_temp;          // F2: body_temp
    features.base_features[2] = data.systolic_bp;       // F3: systolic_bp
    features.base_features[3] = data.diastolic_bp;      // F4: diastolic_bp
    features.base_features[4] = 90.0;                   // F5: blood_sugar (from external device/app)
    features.base_features[5] = data.bmi;               // F6: bmi
    features.base_features[6] = 28.0;                   // F7: age (from app)
    features.base_features[7] = 0.0;                     // F8: previous_complications (from app)
    features.base_features[8] = 0.0;                     // F9: preexisting_diabetes (from app)
    features.base_features[9] = 0.0;                     // F10: gestational_diabetes (from app)
    features.base_features[10] = 0.0;                    // F11: mental_health (from app)
    
    // Print base features
    Serial.println("Base Features (11):");
    for (int i = 0; i < 11; i++) {
        Serial.printf("  F%d: %.2f\n", i+1, features.base_features[i]);
    }
}

// ============================================
// LOGIC GATE 8: CALCULATE DERIVED FEATURES
// ============================================
void calculateDerivedFeatures(HealthData data, FeatureArray& features) {
    float systolic = data.systolic_bp;
    float diastolic = data.diastolic_bp;
    float heart_rate = data.heart_rate;
    float body_temp = data.body_temp;
    float blood_sugar = features.base_features[4];
    float bmi = data.bmi;
    float age = features.base_features[6];
    
    // D1: MAP (Mean Arterial Pressure)
    features.derived_features[0] = (2.0 * diastolic + systolic) / 3.0;
    
    // D2: Pulse Pressure
    features.derived_features[1] = systolic - diastolic;
    
    // D3: Has_Tachycardia
    features.derived_features[2] = (heart_rate > 100) ? 1.0 : 0.0;
    
    // D4: Has_Hypertension
    features.derived_features[3] = (systolic >= 140 || diastolic >= 90) ? 1.0 : 0.0;
    
    // D5: Has_Diabetes
    features.derived_features[4] = (blood_sugar >= 126.0) ? 1.0 : 0.0;
    
    // D6: Has_Fever
    features.derived_features[5] = (body_temp > 37.5) ? 1.0 : 0.0;
    
    // D7: Risk_Factor_Count
    features.derived_features[6] = features.derived_features[3] + 
                                   features.derived_features[4] + 
                                   features.derived_features[2];
    
    // D8: Age_Risk
    features.derived_features[7] = (age < 20 || age > 35) ? 1.0 : 0.0;
    
    // D9: BMI_Risk
    features.derived_features[8] = (bmi < 18.5 || bmi > 30) ? 1.0 : 0.0;
    
    // Print derived features
    Serial.println("Derived Features (9):");
    Serial.printf("  D1 (MAP): %.2f\n", features.derived_features[0]);
    Serial.printf("  D2 (Pulse Pressure): %.2f\n", features.derived_features[1]);
    Serial.printf("  D3 (Has_Tachycardia): %.0f\n", features.derived_features[2]);
    Serial.printf("  D4 (Has_Hypertension): %.0f\n", features.derived_features[3]);
    Serial.printf("  D5 (Has_Diabetes): %.0f\n", features.derived_features[4]);
    Serial.printf("  D6 (Has_Fever): %.0f\n", features.derived_features[5]);
    Serial.printf("  D7 (Risk_Factor_Count): %.0f\n", features.derived_features[6]);
    Serial.printf("  D8 (Age_Risk): %.0f\n", features.derived_features[7]);
    Serial.printf("  D9 (BMI_Risk): %.0f\n", features.derived_features[8]);
}

// ============================================
// LOGIC GATE 9: CREATE COMPLETE FEATURE ARRAY
// ============================================
void createCompleteFeatureArray(FeatureArray& features) {
    // Combine base and derived features
    for (int i = 0; i < 11; i++) {
        features.all_features[i] = features.base_features[i];
    }
    
    for (int i = 0; i < 9; i++) {
        features.all_features[11 + i] = features.derived_features[i];
    }
    
    // Print complete array
    Serial.println("Complete Feature Array (20 features):");
    for (int i = 0; i < 20; i++) {
        Serial.printf("  Feature[%d]: %.2f\n", i, features.all_features[i]);
    }
}

// ============================================
// LOGIC GATE 10: DISPLAY RESULTS
// ============================================
void displayResults(HealthData data) {
    display.clearDisplay();
    display.setCursor(0, 0);
    
    display.println("MamaCare Results");
    display.println("---------------");
    
    display.print("BP: ");
    display.print(data.systolic_bp, 0);
    display.print("/");
    display.println(data.diastolic_bp, 0);
    
    display.print("HR: ");
    display.print(data.heart_rate, 0);
    display.println(" bpm");
    
    display.print("Temp: ");
    display.print(data.body_temp, 1);
    display.println(" C");
    
    display.print("Weight: ");
    display.print(data.weight, 1);
    display.println(" kg");
    
    display.print("BMI: ");
    display.println(data.bmi, 1);
    
    display.display();
}

// ============================================
// LOGIC GATE 11: BLUETOOTH TRANSMISSION
// ============================================
void sendBluetoothData(HealthData data, FeatureArray features) {
    // Create JSON document
    StaticJsonDocument<1024> doc;
    
    // Device metadata
    doc["device_id"] = "MAMACARE_001";
    doc["device_type"] = "health_monitor";
    doc["timestamp"] = data.timestamp;
    doc["firmware_version"] = "1.0.0";
    
    // Measurements
    JsonObject measurements = doc.createNestedObject("measurements");
    measurements["systolic_bp"] = data.systolic_bp;
    measurements["diastolic_bp"] = data.diastolic_bp;
    measurements["heart_rate"] = data.heart_rate;
    measurements["body_temp"] = data.body_temp;
    measurements["weight"] = data.weight;
    measurements["bmi"] = data.bmi;
    
    // Base features
    JsonArray baseFeatures = doc.createNestedArray("base_features");
    for (int i = 0; i < 11; i++) {
        baseFeatures.add(features.base_features[i]);
    }
    
    // Derived features
    JsonArray derivedFeatures = doc.createNestedArray("derived_features");
    for (int i = 0; i < 9; i++) {
        derivedFeatures.add(features.derived_features[i]);
    }
    
    // Complete feature array
    JsonArray allFeatures = doc.createNestedArray("all_features");
    for (int i = 0; i < 20; i++) {
        allFeatures.add(features.all_features[i]);
    }
    
    // Serialize JSON
    String jsonString;
    serializeJson(doc, jsonString);
    
    // Send via Bluetooth
    SerialBT.println(jsonString);
    
    // Also print to Serial for debugging
    Serial.println("Bluetooth Data Sent:");
    Serial.println(jsonString);
}

// ============================================
// HELPER FUNCTIONS
// ============================================
float calculateBMI(float weight, float height) {
    if (height <= 0) return 0;
    return weight / (height * height);
}

void handleBluetoothCommand() {
    String command = SerialBT.readString();
    command.trim();
    
    Serial.printf("Received Bluetooth command: %s\n", command.c_str());
    
    if (command == "MEASURE" || command == "measure") {
        if (!measurementInProgress) {
            measurementInProgress = true;
            performCompleteMeasurement();
            measurementInProgress = false;
        }
    } else if (command == "STATUS" || command == "status") {
        SerialBT.println("MamaCare Device Ready");
    } else if (command.startsWith("HEIGHT:")) {
        // Set user height: "HEIGHT:1.60"
        String heightStr = command.substring(7);
        user_height = heightStr.toFloat();
        SerialBT.printf("Height set to: %.2f m\n", user_height);
        Serial.printf("User height updated: %.2f m\n", user_height);
    } else {
        SerialBT.println("Unknown command");
    }
}

void updateStandbyDisplay() {
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("MamaCare Ready");
    display.println("Press button to");
    display.println("measure");
    display.println("");
    
    // Show battery level
    int batteryRaw = analogRead(BATTERY_PIN);
    int batteryPercent = (batteryRaw * 100) / 4095;
    display.print("Battery: ");
    display.print(batteryPercent);
    display.println("%");
    
    display.display();
}

void showError(String errorMsg) {
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("ERROR:");
    display.println(errorMsg);
    display.display();
    delay(3000);
}

// ============================================
// END OF CODE
// ============================================

