/*
 * KINESTEM - Arduino Maestro (UNO R3)
 *
 * Protocolo serial @ 9600 baud, una trama por línea ('\n'):
 *   Node -> Arduino: PING | ACTION:DISPENSE | SET_PIN:<4 dígitos> | LCD:<l1>|<l2> | FACE:<cara>
 *                    MODE:PIN | MODE:RFID | MODE:GAME | MODE:IDLE | RGB:<r>,<g>,<b>
 *                    KEY:<d>  (dígito del teclado web, se procesa como una tecla IR en PIN/GAME)
 *   Arduino -> Node: READY | PONG | ACK:DISPENSE | IR:<d> | STATUS:PIN_OK | STATUS:PIN_ERROR
 *                    RFID:UID_<HEX> | STATUS:MODE_<PIN|RFID|GAME|IDLE>
 *                    IR_RAW:0x<cmd>,<protocolo>,0x<addr>  (cada tecla nueva, para calibrar decodeIrHex)
 *
 * Contrato espejo: apps/backend/src/modules/hardware-gateway/hardware.protocol.ts
 */
#include <SPI.h>
#include <MFRC522.h>
#include <IRremote.hpp>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>

#define SLAVE_ADDR 0x08

// Pines
const int PIN_RST_RFID = 3;
const int PIN_SS_RFID  = 10;
const int PIN_IR_RECV  = A1;
const int PIN_LED_R = 9;
const int PIN_LED_G = 6;
const int PIN_LED_B = 5;
const int PIN_BUZZER_HIGH = 7;
const int PIN_BUZZER_LOW  = A0;
const int PIN_SERVO       = 8;

MFRC522 rfid(PIN_SS_RFID, PIN_RST_RFID);
LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo dispenserServo;

// Estados del sistema
enum SystemState {
  STATE_BOOT,
  STATE_WAITING_PIN,
  STATE_WAITING_RFID,
  STATE_VERIFIED,
  STATE_GAME
};

SystemState currentState = STATE_BOOT;
String targetPin = "----";
String enteredPin = "";
bool rfidActive = false;

void sendMatrixCommand(char cmd) {
  Wire.beginTransmission(SLAVE_ADDR);
  Wire.write(cmd);
  Wire.endTransmission();
}

void setRGB(int r, int g, int b) {
  analogWrite(PIN_LED_R, r);
  analogWrite(PIN_LED_G, g);
  analogWrite(PIN_LED_B, b);
}

// En el UNO, tone() y el receptor IR comparten el Timer2: sin detener/reiniciar
// el timer del receptor, el primer beep deja al sensor IR sin decodificar más teclas.
void soundBeep(int pin, int freq, int durationMs) {
  IrReceiver.stopTimer();
  tone(pin, freq, durationMs);
  delay(durationMs);
  noTone(pin);
  IrReceiver.restartTimer();
}

void updateLcd(String line1, String line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(line2.substring(0, 16));
}

// El control de la estación solo es confiable como pulsador: cualquier tecla equivale a '5'
// (el PIN de vinculación es fijo, 5555).
const char IR_ANY_KEY_DIGIT = '5';
const unsigned long IR_DEBOUNCE_MS = 250;
unsigned long lastIrKeyAt = 0;

// Dígito recibido por serial (KEY:<d>) desde el teclado de la web.
char pendingKeyDigit = '\0';

// Descarta una trama IR capturada mientras el receptor no se estaba leyendo.
void discardPendingIr() {
  if (IrReceiver.decode()) IrReceiver.resume();
}

// Trama de calibración: IR_RAW:0x<command>,<protocolo>,0x<address>
void reportIrRaw() {
  Serial.print("IR_RAW:0x");
  Serial.print(IrReceiver.decodedIRData.command, HEX);
  Serial.print(",");
  Serial.print(getProtocolString(IrReceiver.decodedIRData.protocol));
  Serial.print(",0x");
  Serial.println(IrReceiver.decodedIRData.address, HEX);
}

// Devuelve el dígito de una tecla nueva (ignora repeticiones por mantener pulsado).
char readIrDigit() {
  if (!IrReceiver.decode()) return '\0';
  char digit = '\0';
  if (!(IrReceiver.decodedIRData.flags & IRDATA_FLAGS_IS_REPEAT) && millis() - lastIrKeyAt >= IR_DEBOUNCE_MS) {
    reportIrRaw();
    lastIrKeyAt = millis();
    digit = IR_ANY_KEY_DIGIT;
  }
  IrReceiver.resume();
  return digit;
}

// Siguiente dígito de entrada: primero el teclado de la web, luego el control IR.
char readInputDigit() {
  if (pendingKeyDigit != '\0') {
    char digit = pendingKeyDigit;
    pendingKeyDigit = '\0';
    return digit;
  }
  return readIrDigit();
}

void resetPinInput() {
  enteredPin = "";
  updateLcd("PIN: " + targetPin, "USA CONTROL IR");
  sendMatrixCommand('2');
  setRGB(0, 0, 0);
}

void enterMode(SystemState next, const char* name) {
  currentState = next;
  rfidActive = (next == STATE_WAITING_RFID);
  pendingKeyDigit = '\0';
  if (next == STATE_WAITING_PIN || next == STATE_GAME) discardPendingIr();
  Serial.print("STATUS:MODE_");
  Serial.println(name);
}

void handleSerialCommand(String cmd) {
  if (cmd == "PING") {
    Serial.println("PONG");
  } else if (cmd == "ACTION:DISPENSE") {
    dispenserServo.write(90);
    delay(800);
    dispenserServo.write(0);
    Serial.println("ACK:DISPENSE");
  } else if (cmd.startsWith("SET_PIN:")) {
    targetPin = cmd.substring(8);
    enterMode(STATE_WAITING_PIN, "PIN");
    resetPinInput();
  } else if (cmd.startsWith("MODE:")) {
    String mode = cmd.substring(5);
    if (mode == "PIN") {
      enterMode(STATE_WAITING_PIN, "PIN");
      resetPinInput();
    } else if (mode == "RFID") {
      enterMode(STATE_WAITING_RFID, "RFID");
    } else if (mode == "GAME") {
      enterMode(STATE_GAME, "GAME");
    } else if (mode == "IDLE") {
      enterMode(STATE_VERIFIED, "IDLE");
    }
  } else if (cmd.startsWith("KEY:")) {
    char digit = cmd.length() == 5 ? cmd.charAt(4) : '\0';
    bool accepting = currentState == STATE_WAITING_PIN || currentState == STATE_GAME;
    if (accepting && digit >= '0' && digit <= '9') pendingKeyDigit = digit;
  } else if (cmd.startsWith("RGB:")) {
    int c1 = cmd.indexOf(',');
    int c2 = cmd.indexOf(',', c1 + 1);
    if (c1 != -1 && c2 != -1) {
      setRGB(cmd.substring(4, c1).toInt(), cmd.substring(c1 + 1, c2).toInt(), cmd.substring(c2 + 1).toInt());
    }
  } else if (cmd.startsWith("LCD:")) {
    int sep = cmd.indexOf('|');
    if (sep != -1) updateLcd(cmd.substring(4, sep), cmd.substring(sep + 1));
  } else if (cmd.startsWith("FACE:")) {
    String face = cmd.substring(5);
    if (face == "happy") sendMatrixCommand('3');
    else if (face == "cheer") sendMatrixCommand('4');
    else if (face == "confused") sendMatrixCommand('5');
    else if (face == "error") sendMatrixCommand('6');
    else if (face == "check") sendMatrixCommand('7');
    else if (face == "waiting") sendMatrixCommand('2');
  }
}

void setup() {
  Serial.begin(9600);
  Wire.begin();

  pinMode(PIN_LED_R, OUTPUT);
  pinMode(PIN_LED_G, OUTPUT);
  pinMode(PIN_LED_B, OUTPUT);
  pinMode(PIN_BUZZER_HIGH, OUTPUT);
  pinMode(PIN_BUZZER_LOW, OUTPUT);

  dispenserServo.attach(PIN_SERVO);
  dispenserServo.write(0);

  lcd.init();
  lcd.backlight();
  SPI.begin();
  rfid.PCD_Init();
  IrReceiver.begin(PIN_IR_RECV, DISABLE_LED_FEEDBACK);

  // Boot Sequence
  updateLcd("KINESTEM LISTO", "INICIANDO...");
  sendMatrixCommand('1');
  soundBeep(PIN_BUZZER_HIGH, 1000, 100); delay(20);
  soundBeep(PIN_BUZZER_HIGH, 1200, 100); delay(20);
  soundBeep(PIN_BUZZER_HIGH, 1500, 150);

  setRGB(0, 0, 255); delay(200); setRGB(0, 0, 0); delay(200);
  setRGB(0, 0, 255); delay(200); setRGB(0, 0, 0);

  currentState = STATE_WAITING_PIN;
  updateLcd("EN ESPERA", "CONECTA LA WEB");
  sendMatrixCommand('2');
  discardPendingIr();
  Serial.println("READY");
}

void loop() {
  // 1. Lectura Serial desde Node.js
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.length() > 0) handleSerialCommand(cmd);
  }

  // 2. Control Infrarrojo (Fase 1: PIN)
  if (currentState == STATE_WAITING_PIN) {
    char digit = readInputDigit();
    if (digit != '\0') {
      setRGB(0, 0, 255);
      soundBeep(PIN_BUZZER_HIGH, 1800, 40);
      delay(20);
      setRGB(0, 0, 0);

      enteredPin += digit;
      Serial.print("IR:");
      Serial.println(digit);

      String stars = "";
      for (unsigned int i = 0; i < enteredPin.length(); i++) stars += "*";
      lcd.setCursor(0, 1);
      lcd.print(stars + "                ");

      if (enteredPin.length() >= 4) {
        if (enteredPin == targetPin) {
          updateLcd("CODIGO CORRECTO", "ESPERA RFID...");
          sendMatrixCommand('3');
          soundBeep(PIN_BUZZER_HIGH, 1500, 100); delay(20);
          soundBeep(PIN_BUZZER_HIGH, 2000, 200);
          Serial.println("STATUS:PIN_OK");
          currentState = STATE_WAITING_RFID;
          rfidActive = true;
        } else {
          updateLcd("CODIGO ERRONEO", "REINTENTA PIN");
          sendMatrixCommand('5');
          setRGB(255, 0, 0);
          soundBeep(PIN_BUZZER_LOW, 300, 400);
          setRGB(0, 0, 0);
          Serial.println("STATUS:PIN_ERROR");
          delay(1200);
          resetPinInput();
          discardPendingIr();
        }
      }
    }
  }

  // 3. Control Infrarrojo durante la actividad (Arena)
  if (currentState == STATE_GAME) {
    char digit = readInputDigit();
    if (digit != '\0') {
      setRGB(0, 0, 255);
      soundBeep(PIN_BUZZER_HIGH, 1800, 40);
      setRGB(0, 0, 0);
      Serial.print("IR:");
      Serial.println(digit);
    }
  }

  // Fuera de PIN/GAME las teclas no cuentan, pero se siguen reportando como IR_RAW
  if (currentState != STATE_WAITING_PIN && currentState != STATE_GAME) {
    readIrDigit();
  }

  // 4. Lectura RFID (Fase 2 o confirmación de premio)
  if (currentState == STATE_WAITING_RFID && rfidActive) {
    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
      String uidStr = "UID_";
      for (byte i = 0; i < rfid.uid.size; i++) {
        if (rfid.uid.uidByte[i] < 0x10) uidStr += "0";
        uidStr += String(rfid.uid.uidByte[i], HEX);
      }
      uidStr.toUpperCase();

      updateLcd("INGRESO CORRECTO", uidStr);
      setRGB(0, 255, 0);
      soundBeep(PIN_BUZZER_HIGH, 1200, 400);
      sendMatrixCommand('7');

      Serial.print("RFID:");
      Serial.println(uidStr);

      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
      currentState = STATE_VERIFIED;
      rfidActive = false;
    }
  }
}
