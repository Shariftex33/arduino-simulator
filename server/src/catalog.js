export const LEVELS = [
  { id: 'foundations', name: 'Level 1 — Arduino Foundations', blurb: 'From the IDE to a blinking LED.', sort: 1 },
  { id: 'programming', name: 'Level 2 — Arduino Programming', blurb: 'Variables, decisions, loops, the calls you will use, and the serial monitor.', sort: 2 },
  { id: 'electronics', name: 'Level 3 — Electronics & Inputs', blurb: 'Buttons, knobs, breadboards, wires, resistors, and sensors.', sort: 3 },
  { id: 'outputs', name: 'Level 4 — Outputs & Automation', blurb: 'Sound, motion, displays, relays, and a lamp in a room.', sort: 4 },
  { id: 'robotics', name: 'Level 5 — Robotics & IoT', blurb: 'Distance, motion, weather, robot parts, other boards, and the network.', sort: 5 }
];

export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    priceCents: 0,
    interval: 'forever',
    blurb: 'Lessons, quizzes, the simulator, and XP stay open.'
  },
  {
    id: 'plus',
    name: 'Plus',
    priceCents: 800,
    interval: 'month',
    blurb: 'Official certificates and a highlighted name on the leaderboard.'
  },
  {
    id: 'classroom',
    name: 'Classroom',
    priceCents: 2900,
    interval: 'month',
    blurb: 'Teacher tools for up to 40 students, plus official certificates.'
  }
];

export const PROJECTS = [
  { n: 1, key: 'blink', name: 'LED Blink', group: 'Lights', text: 'Pin 13 turns a red LED on and off through a 220Ω resistor.' },
  { n: 2, key: 'fade', name: 'LED Fade', group: 'Lights', text: 'PWM on pin 9 brightens the LED, then lets it fade.' },
  { n: 6, key: 'led_chase', name: 'LED Chase', group: 'Lights', text: 'Four LEDs light one after another on pins 10 to 13.' },
  { n: 7, key: 'traffic', name: 'Traffic Light', group: 'Lights', text: 'An RGB LED cycles red, yellow, and green.' },
  { n: 11, key: 'rgb', name: 'RGB Color Mix', group: 'Lights', text: 'The sketch drives the red, green, and blue legs.' },
  { n: 43, key: 'mood_lamp', name: 'RGB Mood Lamp', group: 'Lights', text: 'The RGB LED cycles colors on its own.' },
  { n: 40, key: 'binary_count', name: 'Binary Counter', group: 'Lights', text: 'Four LEDs count in binary.' },
  { n: 39, key: 'sos', name: 'Morse SOS', group: 'Lights', text: 'An LED and a buzzer send SOS.' },
  { n: 45, key: 'pedestrian', name: 'Pedestrian Crossing', group: 'Lights', text: 'A button changes the traffic lights and the walk lamp.' },
  { n: 4, key: 'button', name: 'Button and LED', group: 'Controls', text: 'Hold the button and the green LED follows it.' },
  { n: 3, key: 'switch_lamp', name: 'Switch and Lamp', group: 'Controls', text: 'A slide switch turns the bulb on and off.' },
  { n: 8, key: 'pot', name: 'Potentiometer LED', group: 'Controls', text: 'Turn the knob to fade the LED on pin 11.' },
  { n: 5, key: 'doorbell', name: 'Doorbell', group: 'Controls', text: 'Press the button once and the buzzer rings.' },
  { n: 10, key: 'tone', name: 'Buzzer Tune', group: 'Controls', text: 'Plays a short scale with tone() on pin 8.' },
  { n: 29, key: 'music_box', name: 'Music Box', group: 'Controls', text: 'A potentiometer, a buzzer, and an LED.' },
  { n: 44, key: 'metronome', name: 'Metronome', group: 'Controls', text: 'The knob sets the tempo of the buzzer and LED.' },
  { n: 19, key: 'serial', name: 'Serial Command', group: 'Controls', text: 'Send 1 or 0 from the serial monitor to switch the LED.' },
  { n: 26, key: 'dice', name: 'Dice', group: 'Controls', text: 'Press the button to roll a number on the 7-segment display.' },
  { n: 31, key: 'counter_system', name: 'Visitor Counter', group: 'Controls', text: 'Each button press advances the 7-segment count.' },
  { n: 12, key: 'ultrasonic', name: 'HC-SR04 Distance', group: 'Sensors', text: 'Move the slider. The serial monitor prints centimeters.' },
  { n: 13, key: 'us_led', name: 'Distance LED', group: 'Sensors', text: 'The LED lights when the ultrasonic reading is close.' },
  { n: 14, key: 'parking', name: 'Parking Sensor', group: 'Sensors', text: 'Ultrasonic distance drives a buzzer and an LED.' },
  { n: 56, key: 'water_level', name: 'Water Level Alarm', group: 'Sensors', text: 'An HC-SR04 looks down into the tank.' },
  { n: 15, key: 'ldr', name: 'LDR Night Light', group: 'Sensors', text: 'The light slider decides when the LED turns on.' },
  { n: 51, key: 'dark_alarm', name: 'Dark Alarm', group: 'Sensors', text: 'When the LDR sees a dark room, the LED turns on and the buzzer beeps.' },
  { n: 16, key: 'light_dimmer', name: 'LDR Dimmer', group: 'Sensors', text: 'The LDR reading sets the bulb brightness.' },
  { n: 17, key: 'pir', name: 'PIR Alarm', group: 'Sensors', text: 'Click the dome to toggle motion and sound the alarm.' },
  { n: 18, key: 'motion_light', name: 'Motion Light', group: 'Sensors', text: 'PIR motion turns the lamp on.' },
  { n: 20, key: 'dht', name: 'DHT11 Reading', group: 'Sensors', text: 'Temperature and humidity sliders print to serial.' },
  { n: 21, key: 'lcd', name: 'LCD Message', group: 'Displays', text: 'Prints a message on the 16×2 display.' },
  { n: 22, key: 'distance_lcd', name: 'Distance on LCD', group: 'Displays', text: 'The ultrasonic reading is written on the LCD.' },
  { n: 25, key: 'seg7', name: '7-Segment Counter', group: 'Displays', text: 'A single digit counts as the segment pins go high.' },
  { n: 30, key: 'analog_gauge', name: 'Potentiometer Dial', group: 'Displays', text: 'The knob position is shown on the 7-segment display.' },
  { n: 48, key: 'message_board', name: 'Message Board', group: 'Displays', text: 'A button changes the LCD text and beeps the buzzer.' },
  { n: 52, key: 'oled_hello', name: 'OLED Message', group: 'Displays', text: 'Prints a message on the 0.96 inch SSD1306 OLED.' },
  { n: 53, key: 'oled_light', name: 'OLED Light Meter', group: 'Displays', text: 'The LDR reading is written on the OLED as DARK or BRIGHT.' },
  { n: 54, key: 'oled_distance', name: 'OLED Distance', group: 'Displays', text: 'The ultrasonic distance in centimeters is shown on the OLED.' },
  { n: 55, key: 'oled_near', name: 'OLED Proximity Light', group: 'Displays', text: 'Under 150 cm the LED on pin 13 turns on.' },
  { n: 24, key: 'servo', name: 'Servo Sweep', group: 'Motion', text: 'The SG90 on pin 9 sweeps from 0° to 180°.' },
  { n: 9, key: 'fan_speed', name: 'Fan Speed', group: 'Motion', text: 'A potentiometer on A0 sets the fan PWM on pin 9.' },
  { n: 23, key: 'relay', name: 'Relay Load', group: 'Motion', text: 'A button drives the relay coil.' },
  { n: 28, key: 'thermostat', name: 'Temperature Fan', group: 'Motion', text: 'The DHT11 temperature turns the fan on.' },
  { n: 46, key: 'temp_fan_pwm', name: 'Fan PWM by Temperature', group: 'Motion', text: 'Fan speed follows the DHT11 reading.' },
  { n: 35, key: 'radar', name: 'Ultrasonic Radar', group: 'Motion', text: 'A servo scans while the ultrasonic sensor measures distance.' },
  { n: 41, key: 'parking_gate', name: 'Parking Barrier', group: 'Motion', text: 'A close ultrasonic reading lifts the servo barrier.' },
  { n: 49, key: 'distance_gauge', name: 'Distance Gauge', group: 'Motion', text: 'The servo horn points to the measured distance.' },
  { n: 33, key: 'distance_alarm', name: 'Distance Alarm', group: 'Motion', text: 'Ultrasonic distance moves a servo and sounds the buzzer.' },
  { n: 27, key: 'auto_street_light', name: 'Automatic Street Light', group: 'Home', text: 'The LDR switches a relay and an LED.' },
  { n: 34, key: 'smart_door', name: 'Smart Door Lock', group: 'Home', text: 'A button moves the servo lock and updates the LCD.' },
  { n: 36, key: 'smart_home', name: 'Smart Home Security', group: 'Home', text: 'The security sketch that ties the home sensors together.' },
  { n: 38, key: 'smart_garden', name: 'Smart Garden', group: 'Home', text: 'DHT11, LDR, LCD, and a relay for watering.' },
  { n: 37, key: 'weather_station', name: 'Weather Station', group: 'Home', text: 'DHT11 and LDR drive a servo gauge.' },
  { n: 50, key: 'night_guard', name: 'Night Guard', group: 'Home', text: 'LDR, PIR, lamp, and LCD watch the room after dark.' },
  { n: 32, key: 'temp_alarm', name: 'Temperature Alarm', group: 'Home', text: 'DHT11 changes the RGB LED and sounds the buzzer.' },
  { n: 42, key: 'humidity_watch', name: 'Humidity Monitor', group: 'Home', text: 'DHT11 humidity is shown on the LCD and an LED.' },
  { n: 47, key: 'soil_meter', name: 'Soil Moisture', group: 'Home', text: 'A potentiometer stands in for a soil probe, with an LCD and a lamp.' },
  { n: 57, key: 'plant_water', name: 'Plant Watering', group: 'Home', text: 'A dry soil reading closes the relay and runs the water pump.' },
  { n: 58, key: 'esp32_blink', name: 'ESP32 Onboard LED', group: 'Boards', text: 'Blinks GPIO2, the blue onboard LED, plus a wired blue LED.' }
];

export const PROJECT_SETS = {
  'build-robot': ['servo', 'fan_speed', 'ultrasonic', 'radar', 'distance_alarm', 'distance_gauge', 'parking_gate', 'parking'],
  'smart-home': ['smart_home', 'smart_door', 'smart_garden', 'water_level', 'plant_water', 'motion_light', 'auto_street_light', 'night_guard', 'dark_alarm', 'light_dimmer', 'switch_lamp', 'thermostat', 'pir', 'relay'],
  'line-follower': ['ldr', 'light_dimmer', 'servo', 'fan_speed'],
  iot: ['esp32_blink', 'dht', 'weather_station', 'humidity_watch', 'serial', 'lcd', 'oled_hello', 'oled_light', 'smart_garden']
};

export function levelById(id) {
  return LEVELS.find(function (level) { return level.id === id; }) || null;
}

export function planById(id) {
  return PLANS.find(function (plan) { return plan.id === id; }) || null;
}
