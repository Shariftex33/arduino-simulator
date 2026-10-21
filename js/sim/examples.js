/* Loaded in order by js/sim/boot.js. Do not load this file on its own. */
/* ===== v7: more interactive projects ===== */
const __rid = () => 'w' + Math.random().toString(36).slice(2, 8);
const __W = (ard, cid, pin, col) => wires.push({ id: __rid(), from: { type: 'ard', pinId: String(ard) }, to: { type: 'comp', pinId: `${cid}-${pin}` }, color: col || '#ef4444' });
const __WC = (a, ap, b, bp, col) => wires.push({ id: __rid(), from: { type: 'comp', pinId: `${a}-${ap}` }, to: { type: 'comp', pinId: `${b}-${bp}` }, color: col || '#f59e0b' });
const __pot = (x, y, a) => { const id = addComponent('pot', x, y); __W('5V', id, 'VCC'); __W('GND', id, 'GND', '#64748b'); __W(a, id, 'OUT', '#f59e0b'); return id; };
function __extend(key, fn) {
  const ex = EXAMPLES[key]; if (!ex) return; const s = ex.setup;
  ex.setup = function () { s(); fn(); renderComponents(); renderWires(); };
}
function __loadOnRelay(type) {           // relay now switches a visible load through its COM/NO contacts
  const r = components.find(c => c.type === 'relay'); if (!r) return;
  const L = addComponent(type, r.x, Math.min(r.y + 150, 400));
  __W('5V', r.id, 'COM'); __WC(r.id, 'NO', L, 'POS'); __W('GND', L, 'GND', '#64748b');
}
['relay', 'smart_home', 'auto_street_light'].forEach(k => __extend(k, () => __loadOnRelay('lamp')));
__extend('smart_garden', () => __loadOnRelay('fan'));

EXAMPLES.rgb = {
  code: `// Example 11: RGB color mixer — mix red, green, and blue with 3 potentiometers
int rPin = 11;
int gPin = 10;
int bPin = 9;

void setup() {
  Serial.begin(9600);
  pinMode(rPin, OUTPUT);
  pinMode(gPin, OUTPUT);
  pinMode(bPin, OUTPUT);
}

void loop() {
  int r = map(analogRead(A0), 0, 1023, 0, 255);
  int g = map(analogRead(A1), 0, 1023, 0, 255);
  int b = map(analogRead(A2), 0, 1023, 0, 255);
  analogWrite(rPin, r);
  analogWrite(gPin, g);
  analogWrite(bPin, b);
  Serial.print("R="); Serial.print(r);
  Serial.print(" G="); Serial.print(g);
  Serial.print(" B="); Serial.println(b);
  delay(100);
}`,
  setup() {
    clearWorkspace();
    const c = addComponent('rgb', 620, 140);
    __W(11, c, 'R', '#ef4444'); __W(10, c, 'G', '#22c55e'); __W(9, c, 'B', '#3b82f6'); __W('GND', c, 'GND', '#64748b');
    __pot(380, 20, 'A0'); __pot(380, 170, 'A1'); __pot(380, 320, 'A2');
    renderWires();
  }
};

EXAMPLES.servo = {
  code: `// Example 24: The servo horn sweeps. The potentiometer sets how far it turns.
#include <Servo.h>

Servo myServo;
int potPin = A0;

void setup() {
  myServo.attach(9);
  Serial.begin(9600);
}

void loop() {
  int span = map(analogRead(potPin), 0, 1023, 40, 180);
  for (int pos = 0; pos <= span; pos += 3) {
    myServo.write(pos);
    delay(15);
  }
  for (int pos = span; pos >= 0; pos -= 3) {
    myServo.write(pos);
    delay(15);
  }
}`,
  setup() {
    clearWorkspace();
    const s = addComponent('servo', 620, 60);
    __W(9, s, 'PWM', '#f59e0b'); __W('5V', s, 'VCC'); __W('GND', s, 'GND', '#64748b');
    __pot(380, 200, 'A0');
    renderWires();
  }
};

EXAMPLES.tone = {
  code: `// Example 10: Press the button to sound the buzzer, and change the pitch with the potentiometer
int buzzerPin = 8;
int buttonPin = 2;
int potPin = A0;

void setup() {
  pinMode(buttonPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
}

void loop() {
  if (digitalRead(buttonPin) == HIGH) {
    int freq = map(analogRead(potPin), 0, 1023, 200, 2000);
    tone(buzzerPin, freq);
  } else {
    noTone(buzzerPin);
  }
}`,
  setup() {
    clearWorkspace();
    const b = addComponent('buz', 620, 60);
    __W(8, b, 'POS', '#f59e0b'); __W('GND', b, 'GND', '#64748b');
    const bt = addComponent('btn', 380, 40);
    __W(2, bt, 'PIN1', '#3b82f6'); __W('5V', bt, 'PIN2');
    __pot(380, 190, 'A0');
    renderWires();
  }
};

EXAMPLES.lcd = {
  code: `// Example 21: Show the potentiometer value live on the LCD
#include <LiquidCrystal.h>

LiquidCrystal lcd(12, 11, 5, 4, 3, 2);
int potPin = A0;

void setup() {
  lcd.begin(16, 2);
  lcd.print("Pot Value:");
}

void loop() {
  int val = analogRead(potPin);
  lcd.setCursor(0, 1);
  lcd.print(val);
  lcd.print("    ");
  delay(200);
}`,
  setup() {
    clearWorkspace();
    const l = addComponent('lcd', 620, 60);
    __W('5V', l, 'VCC'); __W('GND', l, 'GND', '#64748b'); __W('A4', l, 'SDA', '#3b82f6'); __W('A5', l, 'SCL', '#f59e0b');
    __pot(380, 100, 'A0');
    renderWires();
  }
};

EXAMPLES.switch_lamp = {
  code: `// Example 3: The lamp turns on with the switch and off when the switch is off
int swPin = 2;
int lampPin = 13;

void setup() {
  pinMode(swPin, INPUT);
  pinMode(lampPin, OUTPUT);
}

void loop() {
  if (digitalRead(swPin) == HIGH) {
    digitalWrite(lampPin, HIGH);
  } else {
    digitalWrite(lampPin, LOW);
  }
  delay(50);
}`,
  setup() {
    clearWorkspace();
    const sw = addComponent('switch', 400, 80);
    const lamp = addComponent('lamp', 580, 60);
    __W(2, sw, 'PIN1', '#3b82f6');
    __W('5V', sw, 'PIN2');
    __W(13, lamp, 'POS', '#f59e0b');
    __W('GND', lamp, 'GND', '#171717');
    renderWires();
  }
};

EXAMPLES.fan_speed = {
  code: `// Example 9: Turning the potentiometer changes the fan speed
int fanPin = 9;

void setup() {
  pinMode(fanPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int speed = map(analogRead(A0), 0, 1023, 0, 255);
  analogWrite(fanPin, speed);
  Serial.print("Fan speed: ");
  Serial.println(speed);
  delay(80);
}`,
  setup() {
    clearWorkspace();
    const fan = addComponent('fan', 580, 50);
    __W(9, fan, 'POS', '#f59e0b');
    __W('GND', fan, 'GND', '#171717');
    const potId = __pot(380, 180, 'A0');
    const pot = components.find(c => c.id === potId);
    if (pot) pot.state.value = 0;
    renderComponents();
    renderWires();
  }
};

EXAMPLES.led_chase = {
  code: `// Example 6: Four LEDs light one after another — a classic chase
int pins[] = {10, 11, 12, 13};

void setup() {
  pinMode(10, OUTPUT);
  pinMode(11, OUTPUT);
  pinMode(12, OUTPUT);
  pinMode(13, OUTPUT);
}

void loop() {
  for (int i = 0; i < 4; i++) {
    digitalWrite(pins[i], HIGH);
    delay(180);
    digitalWrite(pins[i], LOW);
  }
}`,
  setup() {
    clearWorkspace();
    [10, 11, 12, 13].forEach((pin, i) => {
      const res = addComponent('res', 400, 24 + i * 72);
      const led = addComponent(i % 2 ? 'led_g' : 'led_r', 530, 16 + i * 72);
      __W(pin, res, 'A', '#15803d');
      __WC(res, 'B', led, 'ANODE', '#f97316');
      __W('GND', led, 'CATHODE', '#171717');
    });
    renderWires();
  }
};

EXAMPLES.parking = {
  code: `// Example 14: When something is close, the LED lights and the buzzer beeps faster
int trigPin = 9;
int echoPin = 8;
int buzPin = 6;
int ledPin = 13;

void setup() {
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(buzPin, OUTPUT);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delay(2);
  digitalWrite(trigPin, HIGH);
  delay(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  int cm = duration * 0.034 / 2;
  Serial.print("Distance: ");
  Serial.print(cm);
  Serial.println(" cm");

  if (cm < 30) {
    digitalWrite(ledPin, HIGH);
    int gap = map(constrain(cm, 2, 30), 2, 30, 40, 350);
    tone(buzPin, 1400, 40);
    delay(gap);
  } else {
    digitalWrite(ledPin, LOW);
    noTone(buzPin);
    delay(200);
  }
}`,
  setup() {
    clearWorkspace();
    const us = addComponent('ultrasonic', 390, 16);
    const sensor = components.find(c => c.id === us);
    if (sensor) sensor.state.distance = 80;
    const buz = addComponent('buz', 580, 20);
    const res = addComponent('res', 390, 190);
    const led = addComponent('led_r', 530, 180);
    __W('5V', us, 'VCC');
    __W('GND', us, 'GND', '#171717');
    __W(9, us, 'TRIG', '#f59e0b');
    __W(8, us, 'ECHO', '#2563eb');
    __W(6, buz, 'POS', '#f59e0b');
    __W('GND', buz, 'GND', '#171717');
    __W(13, res, 'A', '#15803d');
    __WC(res, 'B', led, 'ANODE', '#f97316');
    __W('GND', led, 'CATHODE', '#171717');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.thermostat = {
  code: `// Example 28: The fan spins at 30°C or higher
#include <DHT.h>

DHT dht(2, DHT11);
int fanPin = 9;

void setup() {
  Serial.begin(9600);
  dht.begin();
  pinMode(fanPin, OUTPUT);
}

void loop() {
  float temp = dht.readTemperature();
  Serial.print("Temp: ");
  Serial.print(temp);
  Serial.println(" C");
  if (temp >= 30) {
    analogWrite(fanPin, 255);
  } else {
    analogWrite(fanPin, 0);
  }
  delay(300);
}`,
  setup() {
    clearWorkspace();
    const dhtId = addComponent('dht', 400, 40);
    const dht = components.find(c => c.id === dhtId);
    if (dht) dht.state.temp = 24;
    const fan = addComponent('fan', 580, 70);
    __W('5V', dhtId, 'VCC');
    __W(2, dhtId, 'DATA', '#f59e0b');
    __W('GND', dhtId, 'GND', '#171717');
    __W(9, fan, 'POS', '#f59e0b');
    __W('GND', fan, 'GND', '#171717');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.fade = {
  code: `// Example 2: The LED fades in, then fades out
int ledPin = 9;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  for (int b = 0; b <= 255; b = b + 5) {
    analogWrite(ledPin, b);
    delay(15);
  }
  for (int b = 255; b >= 0; b = b - 5) {
    analogWrite(ledPin, b);
    delay(15);
  }
}`,
  setup() {
    clearWorkspace();
    const res = addComponent('res', 400, 90);
    const led = addComponent('led_r', 530, 80);
    __W(9, res, 'A', '#15803d');
    __WC(res, 'B', led, 'ANODE', '#f97316');
    __W('GND', led, 'CATHODE', '#171717');
    renderWires();
  }
};

EXAMPLES.doorbell = {
  code: `// Example 5: Press the button and the doorbell sounds once
int btnPin = 2;
int buzPin = 8;
int pressed = 0;

void setup() {
  pinMode(btnPin, INPUT);
  pinMode(buzPin, OUTPUT);
}

void loop() {
  int now = digitalRead(btnPin);
  if (now == HIGH && pressed == LOW) {
    tone(buzPin, 659, 120);
    delay(140);
    tone(buzPin, 880, 220);
  }
  pressed = now;
  delay(20);
}`,
  setup() {
    clearWorkspace();
    const btn = addComponent('btn', 400, 70);
    const buz = addComponent('buz', 580, 60);
    __W(2, btn, 'PIN1', '#3b82f6');
    __W('5V', btn, 'PIN2');
    __W(8, buz, 'POS', '#f59e0b');
    __W('GND', buz, 'GND', '#171717');
    renderWires();
  }
};

EXAMPLES.light_dimmer = {
  code: `// Example 16: Raising the LDR slider makes the lamp brighter
int lampPin = 9;

void setup() {
  pinMode(lampPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int light = analogRead(A0);
  int bright = map(light, 0, 1023, 0, 255);
  analogWrite(lampPin, bright);
  Serial.print("Brightness: ");
  Serial.println(bright);
  delay(80);
}`,
  setup() {
    clearWorkspace();
    const ldrId = addComponent('ldr', 400, 80);
    const ldr = components.find(c => c.id === ldrId);
    if (ldr) ldr.state.value = 0;
    const lamp = addComponent('lamp', 580, 70);
    __W('5V', ldrId, 'VCC');
    __W('A0', ldrId, 'OUT', '#f59e0b');
    __W('GND', ldrId, 'GND', '#171717');
    __W(9, lamp, 'POS', '#f59e0b');
    __W('GND', lamp, 'GND', '#171717');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.motion_light = {
  code: `// Example 18: The lamp turns on when the PIR detects motion
int pirPin = 2;
int lampPin = 13;

void setup() {
  pinMode(pirPin, INPUT);
  pinMode(lampPin, OUTPUT);
}

void loop() {
  if (digitalRead(pirPin) == HIGH) {
    digitalWrite(lampPin, HIGH);
  } else {
    digitalWrite(lampPin, LOW);
  }
  delay(50);
}`,
  setup() {
    clearWorkspace();
    const pir = addComponent('pir', 400, 70);
    const lamp = addComponent('lamp', 580, 60);
    __W('5V', pir, 'VCC');
    __W(2, pir, 'OUT', '#3b82f6');
    __W('GND', pir, 'GND', '#171717');
    __W(13, lamp, 'POS', '#f59e0b');
    __W('GND', lamp, 'GND', '#171717');
    renderWires();
  }
};

EXAMPLES.distance_lcd = {
  code: `// Example 22: Ultrasonic distance shown on the LCD
#include <LiquidCrystal.h>

LiquidCrystal lcd(12, 11, 5, 4, 3, 2);
int trigPin = 9;
int echoPin = 8;

void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  lcd.begin(16, 2);
  lcd.print("Distance");
}

void loop() {
  digitalWrite(trigPin, LOW);
  delay(2);
  digitalWrite(trigPin, HIGH);
  delay(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  int cm = duration * 0.034 / 2;

  lcd.setCursor(0, 1);
  lcd.print(cm);
  lcd.print(" cm   ");
  delay(200);
}`,
  setup() {
    clearWorkspace();
    const us = addComponent('ultrasonic', 390, 20);
    const sensor = components.find(c => c.id === us);
    if (sensor) sensor.state.distance = 42;
    const lcd = addComponent('lcd', 390, 190);
    __W('5V', us, 'VCC');
    __W('GND', us, 'GND', '#171717');
    __W(9, us, 'TRIG', '#f59e0b');
    __W(8, us, 'ECHO', '#2563eb');
    __W('5V', lcd, 'VCC');
    __W('GND', lcd, 'GND', '#171717');
    __W('A4', lcd, 'SDA', '#3b82f6');
    __W('A5', lcd, 'SCL', '#f59e0b');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.dice = {
  code: `// Example 26: Press the button to show 1 through 6 on the 7-segment
int btnPin = 12;
int pins[] = {2, 3, 4, 5, 6, 7, 8};
int pressed = 0;

byte face[6][7] = {
  {0, 1, 1, 0, 0, 0, 0},
  {1, 1, 0, 1, 1, 0, 1},
  {1, 1, 1, 1, 0, 0, 1},
  {0, 1, 1, 0, 0, 1, 1},
  {1, 0, 1, 1, 0, 1, 1},
  {1, 0, 1, 1, 1, 1, 1}
};

void setup() {
  pinMode(btnPin, INPUT);
  for (int i = 0; i < 7; i++) pinMode(pins[i], OUTPUT);
}

void loop() {
  int now = digitalRead(btnPin);
  if (now == HIGH && pressed == LOW) {
    int n = random(1, 7);
    for (int i = 0; i < 7; i++) {
      digitalWrite(pins[i], face[n - 1][i]);
    }
  }
  pressed = now;
  delay(30);
}`,
  setup() {
    clearWorkspace();
    const seg = addComponent('seg7', 560, 60);
    const btn = addComponent('btn', 380, 80);
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((s, idx) => {
      __W(idx + 2, seg, s, '#22c55e');
    });
    __W('GND', seg, 'COM', '#171717');
    __W(12, btn, 'PIN1', '#3b82f6');
    __W('5V', btn, 'PIN2');
    renderWires();
  }
};

EXAMPLES.sos = {
  code: `// Example 39: Morse SOS — LED and buzzer play ... --- ...
int ledPin = 13;
int buzPin = 8;

void mark(int ms) {
  digitalWrite(ledPin, HIGH);
  tone(buzPin, 700);
  delay(ms);
  noTone(buzPin);
  digitalWrite(ledPin, LOW);
  delay(140);
}

void setup() {
  pinMode(ledPin, OUTPUT);
  pinMode(buzPin, OUTPUT);
}

void loop() {
  mark(140); mark(140); mark(140);
  delay(280);
  mark(420); mark(420); mark(420);
  delay(280);
  mark(140); mark(140); mark(140);
  delay(800);
}`,
  setup() {
    clearWorkspace();
    const res = addComponent('res', 400, 40);
    const led = addComponent('led_r', 540, 28);
    const buz = addComponent('buz', 540, 180);
    __W(13, res, 'A', '#15803d');
    __WC(res, 'B', led, 'ANODE', '#f97316');
    __W('GND', led, 'CATHODE', '#171717');
    __W(8, buz, 'POS', '#f59e0b');
    __W('GND', buz, 'GND', '#171717');
    renderWires();
  }
};

EXAMPLES.binary_count = {
  code: `// Example 40: Four LEDs count from 0 to 15 in binary (pin 10 = LSB)
int bit0 = 10;
int bit1 = 11;
int bit2 = 12;
int bit3 = 13;
int n = 0;

void setup() {
  Serial.begin(9600);
  pinMode(bit0, OUTPUT);
  pinMode(bit1, OUTPUT);
  pinMode(bit2, OUTPUT);
  pinMode(bit3, OUTPUT);
}

void loop() {
  digitalWrite(bit0, (n & 1) ? HIGH : LOW);
  digitalWrite(bit1, (n & 2) ? HIGH : LOW);
  digitalWrite(bit2, (n & 4) ? HIGH : LOW);
  digitalWrite(bit3, (n & 8) ? HIGH : LOW);
  Serial.print("Count: ");
  Serial.println(n);
  delay(450);
  n = n + 1;
  if (n > 15) n = 0;
}`,
  setup() {
    clearWorkspace();
    [10, 11, 12, 13].forEach((pin, i) => {
      const res = addComponent('res', 400, 20 + i * 78);
      const led = addComponent(i % 2 ? 'led_g' : 'led_r', 540, 8 + i * 78);
      __W(pin, res, 'A', '#15803d');
      __WC(res, 'B', led, 'ANODE', '#f97316');
      __W('GND', led, 'CATHODE', '#171717');
    });
    renderWires();
  }
};

EXAMPLES.parking_gate = {
  code: `// Example 41: The barrier opens when a car is close and closes when it is far
#include <Servo.h>

Servo gate;
int trigPin = 7;
int echoPin = 6;

void setup() {
  Serial.begin(9600);
  gate.attach(9);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(12, OUTPUT);
  pinMode(13, OUTPUT);
  gate.write(0);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delay(2);
  digitalWrite(trigPin, HIGH);
  delay(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  int cm = duration * 0.034 / 2;
  Serial.print("Distance: ");
  Serial.print(cm);
  Serial.println(" cm");

  if (cm < 18) {
    gate.write(90);
    digitalWrite(12, HIGH);
    digitalWrite(13, LOW);
  } else {
    gate.write(0);
    digitalWrite(12, LOW);
    digitalWrite(13, HIGH);
  }
  delay(120);
}`,
  setup() {
    clearWorkspace();
    const us = addComponent('ultrasonic', 370, 16);
    const sensor = components.find(c => c.id === us);
    if (sensor) sensor.state.distance = 80;
    const srv = addComponent('servo', 600, 20);
    const resR = addComponent('res', 370, 200);
    const red = addComponent('led_r', 510, 188);
    const resG = addComponent('res', 370, 290);
    const grn = addComponent('led_g', 510, 278);
    __W('5V', us, 'VCC');
    __W('GND', us, 'GND', '#171717');
    __W(7, us, 'TRIG', '#f59e0b');
    __W(6, us, 'ECHO', '#3b82f6');
    __W(9, srv, 'PWM', '#f59e0b');
    __W('5V', srv, 'VCC');
    __W('GND', srv, 'GND', '#171717');
    __W(12, resG, 'A', '#15803d');
    __WC(resG, 'B', grn, 'ANODE', '#22c55e');
    __W('GND', grn, 'CATHODE', '#171717');
    __W(13, resR, 'A', '#15803d');
    __WC(resR, 'B', red, 'ANODE', '#f97316');
    __W('GND', red, 'CATHODE', '#171717');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.humidity_watch = {
  code: `// Example 42: DHT11 humidity on the LCD; the LED lights above 75%
#include <DHT.h>
#include <LiquidCrystal.h>

DHT dht(2, DHT11);
LiquidCrystal lcd;

void setup() {
  dht.begin();
  lcd.begin(16, 2);
  pinMode(13, OUTPUT);
  lcd.setCursor(0, 0);
  lcd.print("Humidity watch");
}

void loop() {
  int h = dht.readHumidity();
  lcd.setCursor(0, 1);
  lcd.print("Hum ");
  lcd.print(h);
  lcd.print("%     ");
  if (h > 75) digitalWrite(13, HIGH);
  else digitalWrite(13, LOW);
  delay(400);
}`,
  setup() {
    clearWorkspace();
    const d = addComponent('dht', 370, 30);
    const lcd = addComponent('lcd', 600, 30);
    const res = addComponent('res', 370, 220);
    const led = addComponent('led_r', 510, 208);
    __W('5V', d, 'VCC');
    __W(2, d, 'DATA', '#f59e0b');
    __W('GND', d, 'GND', '#64748b');
    __W('5V', lcd, 'VCC');
    __W('GND', lcd, 'GND', '#64748b');
    __W('A4', lcd, 'SDA', '#3b82f6');
    __W('A5', lcd, 'SCL', '#f59e0b');
    __W(13, res, 'A', '#15803d');
    __WC(res, 'B', led, 'ANODE', '#f97316');
    __W('GND', led, 'CATHODE', '#171717');
    renderWires();
  }
};

EXAMPLES.mood_lamp = {
  code: `// Example 43: The RGB lamp fades through red, green, and blue on its own
int level = 0;
int dir = 5;
int step = 0;

void setup() {
  pinMode(11, OUTPUT);
  pinMode(10, OUTPUT);
  pinMode(9, OUTPUT);
}

void loop() {
  level = level + dir;
  if (level >= 255) { level = 255; dir = -5; }
  if (level <= 0) {
    level = 0;
    dir = 5;
    step = step + 1;
    if (step > 2) step = 0;
  }
  int r = 0;
  int g = 0;
  int b = 0;
  if (step == 0) r = level;
  if (step == 1) g = level;
  if (step == 2) b = level;
  analogWrite(11, r);
  analogWrite(10, g);
  analogWrite(9, b);
  delay(20);
}`,
  setup() {
    clearWorkspace();
    const c = addComponent('rgb', 520, 80);
    __W(11, c, 'R', '#ef4444');
    __W(10, c, 'G', '#22c55e');
    __W(9, c, 'B', '#3b82f6');
    __W('GND', c, 'GND', '#64748b');
    renderWires();
  }
};

EXAMPLES.metronome = {
  code: `// Example 44: Potentiometer sets the beat speed (40–200 BPM)
int buzPin = 8;
int ledPin = 13;

void setup() {
  pinMode(buzPin, OUTPUT);
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int bpm = map(analogRead(A0), 0, 1023, 40, 200);
  int gap = 60000 / bpm;
  Serial.print("BPM: ");
  Serial.println(bpm);
  digitalWrite(ledPin, HIGH);
  tone(buzPin, 1200, 40);
  delay(80);
  digitalWrite(ledPin, LOW);
  delay(gap);
}`,
  setup() {
    clearWorkspace();
    const res = addComponent('res', 400, 30);
    const led = addComponent('led_g', 540, 18);
    const buz = addComponent('buz', 540, 160);
    __W(13, res, 'A', '#15803d');
    __WC(res, 'B', led, 'ANODE', '#22c55e');
    __W('GND', led, 'CATHODE', '#171717');
    __W(8, buz, 'POS', '#f59e0b');
    __W('GND', buz, 'GND', '#171717');
    const potId = __pot(370, 280, 'A0');
    const pot = components.find(c => c.id === potId);
    if (pot) pot.state.value = 400;
    renderComponents();
    renderWires();
  }
};

EXAMPLES.pedestrian = {
  code: `// Example 45: Press the button to stop the cars and light the walk LED
int btnPin = 2;
int redPin = 11;
int grnPin = 10;
int walkPin = 13;
int buzPin = 8;
int phase = 0;
int tick = 0;

void cars(int red, int grn) {
  digitalWrite(redPin, red);
  digitalWrite(grnPin, grn);
}

void setup() {
  pinMode(btnPin, INPUT);
  pinMode(redPin, OUTPUT);
  pinMode(grnPin, OUTPUT);
  pinMode(walkPin, OUTPUT);
  pinMode(buzPin, OUTPUT);
}

void loop() {
  if (digitalRead(btnPin) == HIGH) {
    cars(HIGH, LOW);
    digitalWrite(walkPin, HIGH);
    tone(buzPin, 880, 90);
    delay(280);
    digitalWrite(walkPin, LOW);
    delay(180);
  } else {
    digitalWrite(walkPin, LOW);
    noTone(buzPin);
    if (phase == 0) cars(LOW, HIGH);
    else if (phase == 1) cars(HIGH, HIGH);
    else cars(HIGH, LOW);
    tick = tick + 1;
    if (tick > 6) {
      tick = 0;
      phase = phase + 1;
      if (phase > 2) phase = 0;
    }
    delay(220);
  }
}`,
  setup() {
    clearWorkspace();
    const rgb = addComponent('rgb', 560, 20);
    const btn = addComponent('btn', 370, 30);
    const res = addComponent('res', 370, 180);
    const walk = addComponent('led_g', 510, 168);
    const buz = addComponent('buz', 560, 200);
    __W(11, rgb, 'R', '#ef4444');
    __W(10, rgb, 'G', '#22c55e');
    __W(9, rgb, 'B', '#3b82f6');
    __W('GND', rgb, 'GND', '#64748b');
    __W(2, btn, 'PIN1', '#3b82f6');
    __W('5V', btn, 'PIN2');
    __W(13, res, 'A', '#15803d');
    __WC(res, 'B', walk, 'ANODE', '#22c55e');
    __W('GND', walk, 'CATHODE', '#171717');
    __W(8, buz, 'POS', '#f59e0b');
    __W('GND', buz, 'GND', '#171717');
    renderWires();
  }
};

EXAMPLES.temp_fan_pwm = {
  code: `// Example 46: The fan spins faster as the temperature rises (PWM)
#include <DHT.h>

DHT dht(2, DHT11);
int fanPin = 9;

void setup() {
  Serial.begin(9600);
  dht.begin();
  pinMode(fanPin, OUTPUT);
}

void loop() {
  int temp = dht.readTemperature();
  int speed = map(temp, 24, 40, 0, 255);
  speed = constrain(speed, 0, 255);
  analogWrite(fanPin, speed);
  Serial.print("Temp: ");
  Serial.print(temp);
  Serial.print(" C  PWM: ");
  Serial.println(speed);
  delay(300);
}`,
  setup() {
    clearWorkspace();
    const d = addComponent('dht', 380, 40);
    const fan = addComponent('fan', 600, 50);
    __W('5V', d, 'VCC');
    __W(2, d, 'DATA', '#f59e0b');
    __W('GND', d, 'GND', '#64748b');
    __W(9, fan, 'POS', '#f59e0b');
    __W('GND', fan, 'GND', '#171717');
    renderWires();
  }
};

EXAMPLES.soil_meter = {
  code: `// Example 47: Potentiometer stands in for a soil sensor. A low value means dry, and the lamp turns on
#include <LiquidCrystal.h>

LiquidCrystal lcd;
int lampPin = 9;

void setup() {
  lcd.begin(16, 2);
  pinMode(lampPin, OUTPUT);
  lcd.setCursor(0, 0);
  lcd.print("Soil moisture");
}

void loop() {
  int v = analogRead(A0);
  lcd.setCursor(0, 1);
  if (v < 400) {
    lcd.print("DRY   water now");
    digitalWrite(lampPin, HIGH);
  } else {
    lcd.print("WET   soil ok  ");
    digitalWrite(lampPin, LOW);
  }
  delay(200);
}`,
  setup() {
    clearWorkspace();
    const lcd = addComponent('lcd', 600, 30);
    const lamp = addComponent('lamp', 600, 200);
    __W('5V', lcd, 'VCC');
    __W('GND', lcd, 'GND', '#64748b');
    __W('A4', lcd, 'SDA', '#3b82f6');
    __W('A5', lcd, 'SCL', '#f59e0b');
    __W(9, lamp, 'POS', '#f59e0b');
    __W('GND', lamp, 'GND', '#171717');
    const potId = __pot(370, 80, 'A0');
    const pot = components.find(c => c.id === potId);
    if (pot) pot.state.value = 700;
    renderComponents();
    renderWires();
  }
};

EXAMPLES.message_board = {
  code: `// Example 48: Press the button to change the LCD message and beep the buzzer once
#include <LiquidCrystal.h>

LiquidCrystal lcd;
int btnPin = 2;
int buzPin = 8;
int page = 0;
int held = 0;

void showPage() {
  lcd.setCursor(0, 0);
  lcd.print("Message board  ");
  lcd.setCursor(0, 1);
  if (page == 0) lcd.print("Hello, Arduino! ");
  if (page == 1) lcd.print("Press the button");
  if (page == 2) lcd.print("Keep learning!  ");
}

void setup() {
  lcd.begin(16, 2);
  pinMode(btnPin, INPUT);
  pinMode(buzPin, OUTPUT);
  showPage();
}

void loop() {
  int now = digitalRead(btnPin);
  if (now == HIGH && held == LOW) {
    page = page + 1;
    if (page > 2) page = 0;
    showPage();
    tone(buzPin, 660, 80);
  }
  held = now;
  delay(40);
}`,
  setup() {
    clearWorkspace();
    const btn = addComponent('btn', 370, 40);
    const lcd = addComponent('lcd', 560, 30);
    const buz = addComponent('buz', 370, 200);
    __W(2, btn, 'PIN1', '#3b82f6');
    __W('5V', btn, 'PIN2');
    __W('5V', lcd, 'VCC');
    __W('GND', lcd, 'GND', '#64748b');
    __W('A4', lcd, 'SDA', '#3b82f6');
    __W('A5', lcd, 'SCL', '#f59e0b');
    __W(8, buz, 'POS', '#f59e0b');
    __W('GND', buz, 'GND', '#171717');
    renderWires();
  }
};

EXAMPLES.distance_gauge = {
  code: `// Example 49: Ultrasonic distance shown with a servo needle
#include <Servo.h>

Servo needle;
int trigPin = 7;
int echoPin = 6;

void setup() {
  Serial.begin(9600);
  needle.attach(9);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delay(2);
  digitalWrite(trigPin, HIGH);
  delay(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  int cm = duration * 0.034 / 2;
  cm = constrain(cm, 2, 150);
  int angle = map(cm, 2, 150, 0, 180);
  needle.write(angle);
  Serial.print(cm);
  Serial.print(" cm  -> ");
  Serial.print(angle);
  Serial.println(" deg");
  delay(80);
}`,
  setup() {
    clearWorkspace();
    const us = addComponent('ultrasonic', 380, 40);
    const sensor = components.find(c => c.id === us);
    if (sensor) sensor.state.distance = 60;
    const srv = addComponent('servo', 620, 50);
    __W('5V', us, 'VCC');
    __W('GND', us, 'GND', '#171717');
    __W(7, us, 'TRIG', '#f59e0b');
    __W(6, us, 'ECHO', '#3b82f6');
    __W(9, srv, 'PWM', '#f59e0b');
    __W('5V', srv, 'VCC');
    __W('GND', srv, 'GND', '#171717');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.night_guard = {
  code: `// Example 50: In the dark, PIR motion triggers the lamp, buzzer, and LCD alarm
#include <LiquidCrystal.h>

LiquidCrystal lcd;
int pirPin = 2;
int lampPin = 9;
int buzPin = 8;

void setup() {
  lcd.begin(16, 2);
  pinMode(pirPin, INPUT);
  pinMode(lampPin, OUTPUT);
  pinMode(buzPin, OUTPUT);
  lcd.setCursor(0, 0);
  lcd.print("Night guard");
}

void loop() {
  int dark = analogRead(A0) < 400;
  int motion = digitalRead(pirPin);
  lcd.setCursor(0, 1);
  if (dark && motion) {
    lcd.print("INTRUDER!      ");
    digitalWrite(lampPin, HIGH);
    tone(buzPin, 1400, 120);
  } else {
    lcd.print(dark ? "Dark, watching  " : "Day, standing by");
    digitalWrite(lampPin, LOW);
    noTone(buzPin);
  }
  delay(180);
}`,
  setup() {
    clearWorkspace();
    const ldrId = addComponent('ldr', 360, 16);
    const ldr = components.find(c => c.id === ldrId);
    if (ldr) ldr.state.value = 900;
    const pir = addComponent('pir', 360, 190);
    const lamp = addComponent('lamp', 560, 16);
    const buz = addComponent('buz', 560, 190);
    const lcd = addComponent('lcd', 740, 40);
    __W('5V', ldrId, 'VCC');
    __W('GND', ldrId, 'GND', '#64748b');
    __W('A0', ldrId, 'OUT', '#f59e0b');
    __W('5V', pir, 'VCC');
    __W(2, pir, 'OUT', '#3b82f6');
    __W('GND', pir, 'GND', '#64748b');
    __W(9, lamp, 'POS', '#f59e0b');
    __W('GND', lamp, 'GND', '#171717');
    __W(8, buz, 'POS', '#eab308');
    __W('GND', buz, 'GND', '#171717');
    __W('5V', lcd, 'VCC');
    __W('GND', lcd, 'GND', '#64748b');
    __W('A4', lcd, 'SDA', '#3b82f6');
    __W('A5', lcd, 'SCL', '#f59e0b');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.dark_alarm = {
  code: `// Example 51: Dark alarm (LDR + LED + Buzzer)
int ldrPin = A0;
int ledPin = 13;
int buzPin = 8;

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
  pinMode(buzPin, OUTPUT);
  Serial.println("Dark alarm ready. Lower the LDR light to trigger it.");
}

void loop() {
  int light = analogRead(ldrPin);
  Serial.print("Light: ");
  Serial.println(light);

  if (light < 400) {
    digitalWrite(ledPin, HIGH);
    tone(buzPin, 880, 160);
    delay(180);
    noTone(buzPin);
    delay(240);
  } else {
    digitalWrite(ledPin, LOW);
    noTone(buzPin);
    delay(200);
  }
}`,
  setup() {
    clearWorkspace();
    const ldrId = addComponent('ldr', 360, 30);
    const ldr = components.find(c => c.id === ldrId);
    if (ldr) ldr.state.value = 220;
    const led = addComponent('led_r', 560, 24);
    const buz = addComponent('buz', 560, 210);
    __W('5V', ldrId, 'VCC');
    __W('A0', ldrId, 'OUT', '#f59e0b');
    __W('GND', ldrId, 'GND', '#171717');
    __W(13, led, 'ANODE', '#22c55e');
    __W('GND', led, 'CATHODE', '#171717');
    __W(8, buz, 'POS', '#eab308');
    __W('GND', buz, 'GND', '#171717');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.oled_hello = {
    code: `// Example 52: OLED 0.96" message
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 oled(128, 64);

void setup() {
  oled.begin();
  oled.clearDisplay();
  oled.setTextSize(1);
  oled.setCursor(0, 0);
  oled.println("Arduino OLED");
  oled.setCursor(0, 16);
  oled.println("128 x 64");
  oled.setCursor(0, 32);
  oled.println("I2C SSD1306");
  oled.display();
}

void loop() {
}`,
    setup() {
      clearWorkspace();
      const id = addComponent('oled', 400, 70);
      __W('5V', id, 'VCC');
      __W('GND', id, 'GND', '#171717');
      __W('A4', id, 'SDA', '#3b82f6');
      __W('A5', id, 'SCL', '#f59e0b');
      renderComponents();
      renderWires();
    }
};

EXAMPLES.oled_light = {
    code: `// Example 53: LDR + OLED light meter
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 oled(128, 64);

void setup() {
  oled.begin();
}

void loop() {
  int light = analogRead(A0);
  oled.clearDisplay();
  oled.setCursor(0, 0);
  oled.println("Light meter");
  oled.setCursor(0, 16);
  oled.print(light);
  oled.setCursor(0, 32);
  oled.println(light < 400 ? "DARK" : "BRIGHT");
  oled.display();
  delay(200);
}`,
    setup() {
      clearWorkspace();
      const ldrId = addComponent('ldr', 340, 20);
      const ldr = components.find(c => c.id === ldrId);
      if (ldr) ldr.state.value = 220;
      const id = addComponent('oled', 500, 70);
      __W('5V', ldrId, 'VCC');
      __W('A0', ldrId, 'OUT', '#f59e0b');
      __W('GND', ldrId, 'GND', '#171717');
      __W('5V', id, 'VCC');
      __W('GND', id, 'GND', '#171717');
      __W('A4', id, 'SDA', '#3b82f6');
      __W('A5', id, 'SCL', '#eab308');
      renderComponents();
      renderWires();
    }
};

EXAMPLES.oled_distance = {
    code: `// Example 54: Ultrasonic distance on the OLED
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 oled(128, 64);
int trigPin = 9;
int echoPin = 8;

void setup() {
  oled.begin();
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delay(2);
  digitalWrite(trigPin, HIGH);
  delay(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH);
  int cm = duration * 0.034 / 2;
  oled.clearDisplay();
  oled.setCursor(0, 0);
  oled.println("Distance");
  oled.setCursor(0, 16);
  oled.print(cm);
  oled.println(" cm");
  oled.display();
  delay(200);
}`,
    setup() {
      clearWorkspace();
      const usId = addComponent('ultrasonic', 300, 16);
      const id = addComponent('oled', 520, 80);
      __W('5V', usId, 'VCC');
      __W('9', usId, 'TRIG', '#f59e0b');
      __W('8', usId, 'ECHO', '#3b82f6');
      __W('GND', usId, 'GND', '#171717');
      __W('5V', id, 'VCC');
      __W('GND', id, 'GND', '#171717');
      __W('A4', id, 'SDA', '#60a5fa');
      __W('A5', id, 'SCL', '#eab308');
      renderComponents();
      renderWires();
    }
};

EXAMPLES.oled_near = {
    code: `// Example 55: The LED lights when the distance is under 150 cm
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 oled(128, 64);
int trigPin = 9;
int echoPin = 8;
int ledPin = 13;

void setup() {
  oled.begin();
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delay(2);
  digitalWrite(trigPin, HIGH);
  delay(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH);
  int cm = duration * 0.034 / 2;

  if (cm < 150) digitalWrite(ledPin, HIGH);
  else digitalWrite(ledPin, LOW);

  oled.clearDisplay();
  oled.setCursor(0, 0);
  oled.println("Distance");
  oled.setCursor(0, 16);
  oled.print(cm);
  oled.println(" cm");
  oled.setCursor(0, 32);
  oled.println(cm < 150 ? "Light On" : "Light Off");
  oled.display();
  delay(200);
}`,
    setup() {
      clearWorkspace();
      const usId = addComponent('ultrasonic', 280, 16);
      const id = addComponent('oled', 470, 80);
      const led = addComponent('led_r', 700, 24);
      __W('5V', usId, 'VCC');
      __W('9', usId, 'TRIG', '#f59e0b');
      __W('8', usId, 'ECHO', '#3b82f6');
      __W('GND', usId, 'GND', '#171717');
      __W('5V', id, 'VCC');
      __W('GND', id, 'GND', '#171717');
      __W('A4', id, 'SDA', '#60a5fa');
      __W('A5', id, 'SCL', '#eab308');
      __W(13, led, 'ANODE', '#ef4444');
      __W('GND', led, 'CATHODE', '#171717');
      renderComponents();
      renderWires();
    }
};

EXAMPLES.water_level = {
  code: `// Example 56: Water level alarm
// The HC-SR04 looks down at the water. A smaller distance means the tank is fuller.
// Red = low, yellow = medium, green = full. Each LED has a 220 ohm resistor.
// The buzzer alarms when the tank is low, and chirps when it is overflowing.
int trigPin = 9;
int echoPin = 8;
int redPin = 13;
int yellowPin = 12;
int greenPin = 11;
int buzPin = 6;

void setup() {
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(redPin, OUTPUT);
  pinMode(yellowPin, OUTPUT);
  pinMode(greenPin, OUTPUT);
  pinMode(buzPin, OUTPUT);
  Serial.println("Water level ready. Move the distance slider.");
}

void loop() {
  digitalWrite(trigPin, LOW);
  delay(2);
  digitalWrite(trigPin, HIGH);
  delay(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  int cm = duration * 0.034 / 2;

  digitalWrite(redPin, LOW);
  digitalWrite(yellowPin, LOW);
  digitalWrite(greenPin, LOW);

  if (cm < 10) {
    digitalWrite(greenPin, HIGH);
    Serial.print("FULL ");
    Serial.print(cm);
    Serial.println(" cm");
    tone(buzPin, 1800, 70);
    delay(420);
  } else if (cm < 25) {
    digitalWrite(yellowPin, HIGH);
    noTone(buzPin);
    Serial.print("MEDIUM ");
    Serial.print(cm);
    Serial.println(" cm");
    delay(200);
  } else {
    digitalWrite(redPin, HIGH);
    Serial.print("LOW ");
    Serial.print(cm);
    Serial.println(" cm");
    tone(buzPin, 880, 160);
    delay(200);
  }
}`,
  setup() {
    clearWorkspace();
    const us = addComponent('ultrasonic', 300, 16);
    const sensor = components.find(c => c.id === us);
    if (sensor) sensor.state.distance = 40;
    const resR = addComponent('res', 460, 20);
    const red = addComponent('led_r', 560, 12);
    const resY = addComponent('res', 460, 110);
    const yellow = addComponent('led_y', 560, 102);
    const resG = addComponent('res', 460, 200);
    const green = addComponent('led_g', 560, 192);
    const buz = addComponent('buz', 680, 80);
    __W('5V', us, 'VCC');
    __W('GND', us, 'GND', '#171717');
    __W(9, us, 'TRIG', '#f59e0b');
    __W(8, us, 'ECHO', '#2563eb');
    __W(13, resR, 'A', '#dc2626');
    __WC(resR, 'B', red, 'ANODE', '#f97316');
    __W('GND', red, 'CATHODE', '#171717');
    __W(12, resY, 'A', '#eab308');
    __WC(resY, 'B', yellow, 'ANODE', '#f59e0b');
    __W('GND', yellow, 'CATHODE', '#171717');
    __W(11, resG, 'A', '#16a34a');
    __WC(resG, 'B', green, 'ANODE', '#22c55e');
    __W('GND', green, 'CATHODE', '#171717');
    __W(6, buz, 'POS', '#f59e0b');
    __W('GND', buz, 'GND', '#171717');
    renderComponents();
    renderWires();
  }
};

EXAMPLES.plant_water = {
  code: `// Example 57: Soil moisture watering
// The soil probe is on A0. A low reading is dry. At 400 or above the soil is wet enough.
// Pin 7 drives a relay, and the relay switches the water pump.
int soilPin = A0;
int relayPin = 7;

void setup() {
  Serial.begin(9600);
  pinMode(relayPin, OUTPUT);
  Serial.println("Plant watering ready. Lower the moisture slider to start the pump.");
}

void loop() {
  int moisture = analogRead(soilPin);
  if (moisture < 400) {
    digitalWrite(relayPin, HIGH);
    Serial.print("DRY ");
    Serial.print(moisture);
    Serial.println("  pump ON");
  } else {
    digitalWrite(relayPin, LOW);
    Serial.print("WET ");
    Serial.print(moisture);
    Serial.println("  pump OFF");
  }
  delay(300);
}`,
  setup() {
    clearWorkspace();
    const soil = addComponent('soil', 360, 40);
    const probe = components.find(c => c.id === soil);
    if (probe) probe.state.value = 180;
    const relay = addComponent('relay', 560, 30);
    __W('5V', soil, 'VCC');
    __W('A0', soil, 'OUT', '#f59e0b');
    __W('GND', soil, 'GND', '#171717');
    __W(7, relay, 'IN', '#f59e0b');
    __W('5V', relay, 'VCC');
    __W('GND', relay, 'GND', '#171717');
    __loadOnRelay('pump');
    renderComponents();
    renderWires();
  }
};
