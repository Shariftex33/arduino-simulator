(function () {
  const app = document.getElementById('learn-app');
  if (!app) return;

  const LEARN_KEY = 'edu-platform-learn';
  const PROGRESS_KEY = 'edu-platform-progress';
  const mode = app.dataset.mode || 'hub';
  const root = app.dataset.root || '';

  const tracks = {
    lessons: {
      module: 'learning/lessons',
      title: 'Lessons',
      categories: [
        {
          id: 'board', name: 'Board basics', image: 'assets/svg/arduino-uno.svg', blurb: 'The lamp, the two functions, and ground.',
          items: [
            { id: 'L1', xp: 10, kind: 'mcq', title: 'The tiny lamp on the board', story: 'The Arduino Uno has a built-in LED. You do not need to wire anything to try your first blink. That lamp is pin 13.', code: 'int ledPin = 13;', q: 'Which pin is the Uno’s built-in LED?', choices: ['Pin 2', 'Pin 13', 'Pin A0'], answer: 1, hint: 'On the Uno, the onboard LED is pin 13. Pin 2 is the ESP32 lamp.' },
            { id: 'L2', xp: 10, kind: 'mcq', title: 'setup runs once', story: 'A sketch has two rooms. setup() runs a single time when the board starts. loop() keeps going, like a song on repeat.', code: 'void setup() {\n  pinMode(13, OUTPUT);\n}', q: 'Which function keeps repeating?', choices: ['setup()', 'loop()', 'pinMode()'], answer: 1, hint: 'setup() is the opening act. loop() is the repeat.' },
            { id: 'L3', xp: 10, kind: 'mcq', title: 'HIGH means on', story: 'digitalWrite tells a pin to be on or off. HIGH switches it on. LOW switches it off. delay waits, and the number is milliseconds.', code: 'digitalWrite(13, HIGH);\ndelay(500);', q: 'What does delay(500) do?', choices: ['Waits half a second', 'Turns the LED off', 'Reads a button'], answer: 0, hint: '1000 milliseconds is one second, so 500 is half a second.' },
            { id: 'L6', xp: 10, kind: 'mcq', title: 'Ground is the return path', story: 'Every circuit needs a way back. GND is 0 volts. The LED, the button, and the sensor all share that return path.', code: 'LED cathode  →  GND', q: 'What is GND?', choices: ['5 volts', '0 volts, the return path', 'A digital pin'], answer: 1, hint: 'GND is ground. 5V is the power pin.' }
          ]
        },
        {
          id: 'pins', name: 'Pins and power', image: 'assets/svg/arduino-uno.svg', blurb: 'Digital, analog, fade, and the voltage of each board.',
          items: [
            { id: 'L7', xp: 10, kind: 'mcq', title: 'On, off, or a range', story: 'Digital pins are only HIGH or LOW. Analog pins A0 to A5 can measure a range, like a knob turned part way.', code: 'analogRead(A0);', q: 'Which pins measure a range?', choices: ['A0 to A5', 'Only pin 13', 'GND and 5V'], answer: 0, hint: 'A0, A1, A2… are the analog inputs.' },
            { id: 'L8', xp: 10, kind: 'mcq', title: 'Pins that can fade', story: 'Some digital pins have a ~ mark. Those can be partly on. analogWrite uses 0 for off and 255 for fully on.', code: 'analogWrite(9, 128);', q: 'What does analogWrite(9, 128) do?', choices: ['Sets a medium brightness', 'Reads a button', 'Resets the board'], answer: 0, hint: '128 is about halfway between 0 and 255.' },
            { id: 'L9', xp: 10, kind: 'mcq', title: '5 volts and 3.3 volts', story: 'The Uno power pin is 5V. The ESP32 likes 3.3V. Do not feed a 5V signal into an ESP32 pin.', code: 'Uno 5V    ESP32 3V3', q: 'Which board uses 3.3V pins?', choices: ['Arduino Uno', 'ESP32', 'Both use 12V'], answer: 1, hint: 'The ESP32 DevKit is a 3.3V board. Its power pin is labeled 3V3.' }
          ]
        },
        {
          id: 'leds', name: 'LEDs', image: 'assets/svg/led-red.svg', blurb: 'Resistors, legs, and mixing colors.',
          items: [
            { id: 'L4', xp: 10, kind: 'mcq', title: 'A resistor is a seatbelt', story: 'An LED likes a small sip of current. A 220Ω resistor sits in line with the LED so it shines without burning out.', code: 'pin 13  →  220Ω  →  LED  →  GND', q: 'Why put a resistor with an LED?', choices: ['To make the pin faster', 'To keep the current gentle', 'To store the sketch'], answer: 1, hint: 'The resistor limits current. The LED stays bright and safe.' },
            { id: 'L10', xp: 10, kind: 'mcq', title: 'Long leg, short leg', story: 'The long leg is the anode. It faces the pin, through the resistor. The short leg is the cathode, and it faces GND.', q: 'Which LED leg goes toward GND?', choices: ['The long leg', 'The short leg', 'Either leg'], answer: 1, hint: 'Short leg, cathode, toward ground.' },
            { id: 'L11', xp: 15, kind: 'drag', title: 'Close the LED circuit', story: 'Drop the missing word. The current has to get home.', before: 'pin 13 → 220Ω → LED → ', after: '', answer: 'GND', chips: ['GND', '5V', 'A0'] }
          ]
        },
        {
          id: 'inputs', name: 'Inputs', image: 'assets/svg/button.svg', blurb: 'Buttons, knobs, and switches.',
          items: [
            { id: 'L5', xp: 10, kind: 'mcq', title: 'A button is an input', story: 'Pins can listen as well as talk. A button is an input. The sketch asks digitalRead if it is pressed.', code: 'int pressed = digitalRead(2);', q: 'Which call hears a button?', choices: ['digitalRead', 'digitalWrite', 'delay'], answer: 0, hint: 'Read listens. Write talks. delay only waits.' },
            { id: 'L12', xp: 10, kind: 'mcq', title: 'The knob has three legs', story: 'A potentiometer is a knob. One side goes to 5V, the middle goes to A0, and the other side goes to GND. analogRead returns 0 to 1023.', code: 'int val = analogRead(A0);', q: 'What does analogRead return?', choices: ['0 to 1023', 'Only HIGH or LOW', 'A color'], answer: 0, hint: '0 is one end of the knob. 1023 is the other end.' },
            { id: 'L13', xp: 10, kind: 'mcq', title: 'A switch stays put', story: 'A push button springs back. A slide switch stays where you leave it. On connects the path. Off breaks it.', q: 'How is a slide switch different from a push button?', choices: ['It stays on or off', 'It measures temperature', 'It needs no wire'], answer: 0, hint: 'You flip it, and it stays. A push button only lasts while you hold it.' }
          ]
        },
        {
          id: 'sensors', name: 'Sensors', image: 'assets/svg/ldr.svg', blurb: 'Light, distance, and the weather in a small chip.',
          items: [
            { id: 'L14', xp: 10, kind: 'mcq', title: 'Light changes the LDR', story: 'An LDR is a light sensor. In the lab, the slider is the light level. The sketch reads that level and can turn a lamp on when the room is dark.', q: 'What does the LDR slider stand for?', choices: ['How bright the light is', 'The servo angle', 'The serial speed'], answer: 0, hint: 'Slide it and you are changing the light around the sensor.' },
            { id: 'L15', xp: 10, kind: 'mcq', title: 'A ping and an echo', story: 'The HC-SR04 sends a tiny sound ping from TRIG and listens on ECHO. The sketch turns that time into centimeters.', code: 'TRIG sends    ECHO listens', q: 'Which pin listens for the echo?', choices: ['TRIG', 'ECHO', 'SDA'], answer: 1, hint: 'TRIG shouts. ECHO listens.' },
            { id: 'L16', xp: 10, kind: 'mcq', title: 'Two numbers from one chip', story: 'A DHT11 reports temperature and humidity. In the lab each one has its own slider, and the sketch can print both.', q: 'What does a DHT11 measure?', choices: ['Temperature and humidity', 'Distance only', 'Motor speed'], answer: 0, hint: 'One chip, two readings: how warm, and how damp.' }
          ]
        },
        {
          id: 'motion', name: 'Motion and sound', image: 'assets/svg/servo.svg', blurb: 'Servos, fans, and a beep.',
          items: [
            { id: 'L17', xp: 10, kind: 'mcq', title: 'Point the horn', story: 'A servo horn moves to an angle. 0 and 180 are the ends. 90 is the middle.', code: 'myServo.write(90);', q: 'Where does write(90) point?', choices: ['The middle', 'Fully left at 0 only', 'A random angle'], answer: 0, hint: '90 sits halfway from 0 to 180.' },
            { id: 'L18', xp: 10, kind: 'mcq', title: 'Spin faster', story: 'The fan is a small motor. A higher PWM number makes the rotor spin faster. 0 stops it.', code: 'analogWrite(9, speed);', q: 'What makes the fan spin faster?', choices: ['A higher PWM value', 'Connecting it to GND only', 'A shorter delay name'], answer: 0, hint: 'PWM is the speed knob. 255 is full speed.' },
            { id: 'L19', xp: 10, kind: 'mcq', title: 'Play a note', story: 'tone() plays a pitch on a buzzer. The first number is the pin, the second is the frequency. noTone() stops the sound.', code: 'tone(8, 440);', q: 'What does tone(8, 440) do?', choices: ['Plays a note on pin 8', 'Reads pin 8', 'Waits 440 seconds'], answer: 0, hint: '440 is a pitch, not a wait. delay is the one that waits.' }
          ]
        },
        {
          id: 'talk', name: 'Displays and serial', image: 'assets/svg/lcd.svg', blurb: 'Print a number, a sentence, or one digit.',
          items: [
            { id: 'L20', xp: 10, kind: 'mcq', title: 'Talk to the monitor', story: 'Serial.begin(9600) opens the text window. Serial.println sends one line. You can watch sensor numbers there.', code: 'Serial.begin(9600);\nSerial.println(val);', q: 'Which call opens the serial monitor?', choices: ['Serial.begin(9600)', 'pinMode(9600)', 'delay(9600)'], answer: 0, hint: 'begin opens it. println sends a line after that.' },
            { id: 'L21', xp: 10, kind: 'mcq', title: 'A screen of letters', story: 'A 16×2 LCD shows two rows of text. After it is wired, lcd.print writes a message you can read across the room.', code: 'lcd.print("Hello");', q: 'What does lcd.print do?', choices: ['Writes text on the display', 'Spins the servo', 'Sets the baud rate'], answer: 0, hint: 'print puts letters on the LCD.' },
            { id: 'L22', xp: 10, kind: 'mcq', title: 'One bright digit', story: 'A 7-segment display makes numbers from seven little bars named A to G. Light the right bars and you see 0 to 9.', q: 'A 7-segment is built from…', choices: ['Seven bars, A to G', 'Seven servos', 'Seven serial ports'], answer: 0, hint: 'Each bar is one segment. Together they form a digit.' }
          ]
        },
        {
          id: 'words', name: 'Words in a sketch', image: 'assets/svg/sketch-card.svg', blurb: 'Numbers, gates, notes, and counted repeats.',
          items: [
            { id: 'L23', xp: 10, kind: 'mcq', title: 'A name for a number', story: 'int stores a whole number. The name is ledPin. The value is 13. Later the sketch can say ledPin instead of typing 13 again.', code: 'int ledPin = 13;', q: 'What does int store?', choices: ['A whole number', 'A sentence', 'A wire color'], answer: 0, hint: 'int is short for integer, a whole number.' },
            { id: 'L24', xp: 10, kind: 'mcq', title: 'if is a gate', story: 'The lines inside if run only when the test is true. If the button is not pressed, the sketch walks past them.', code: 'if (pressed) {\n  digitalWrite(13, HIGH);\n}', q: 'When do the lines inside if run?', choices: ['Only when the test is true', 'On every loop, always', 'Only inside setup'], answer: 0, hint: 'if is a gate. True opens it. False skips the block.' },
            { id: 'L25', xp: 10, kind: 'mcq', title: 'Notes the board skips', story: 'A line that starts with // is a comment. It is a note for you. The board does not run it.', code: '// lamp on for half a second', q: 'What happens to a // line?', choices: ['The board ignores it', 'It turns a pin on', 'It waits one second'], answer: 0, hint: 'Comments are notes. The sketch skips them.' },
            { id: 'L26', xp: 15, kind: 'drag', title: 'Repeat three times', story: 'Drop the number of repeats. The block runs while i is less than that number.', before: 'for (int i = 0; i < ', after: '; i++)', answer: '3', chips: ['3', 'setup', 'GND'] }
          ]
        },
        {
          id: 'bread', name: 'Breadboard', image: 'assets/svg/breadboard-row.svg', blurb: 'Rows that are already wired, and rails for power.',
          items: [
            { id: 'L27', xp: 10, kind: 'mcq', title: 'One row, one wire', story: 'Five holes in a breadboard row are already joined. A part leg in that row touches every hole beside it.', q: 'Holes in the same row are…', choices: ['Already connected', 'Always ground', 'Separate pins'], answer: 0, hint: 'One row acts like one wire.' },
            { id: 'L28', xp: 10, kind: 'mcq', title: 'The side rails', story: 'The long strips along the edge are the power rails. One carries 5V or 3V3. The other is GND. They run the length of the board.', q: 'What are the long side strips for?', choices: ['Power and ground', 'Only pin 13', 'Serial text'], answer: 0, hint: 'Those rails carry power along the board.' },
            { id: 'L29', xp: 10, kind: 'mcq', title: 'The board does not save the LED', story: 'A breadboard only connects holes. It does not limit current. The LED still needs its resistor.', q: 'Does the breadboard replace the resistor?', choices: ['No, the LED still needs one', 'Yes, it is built in', 'Only on the ESP32'], answer: 0, hint: 'The resistor is still the seatbelt.' }
          ]
        },
        {
          id: 'home', name: 'Around the house', image: 'assets/svg/relay.svg', blurb: 'Lamps, motion, and mixed colors.',
          items: [
            { id: 'L30', xp: 10, kind: 'mcq', image: 'assets/svg/relay.svg', title: 'A small pin, a bigger lamp', story: 'A relay is a switch flipped by a pin. The pin drives the coil. The contacts can turn a lamp on.', code: 'digitalWrite(7, HIGH);', q: 'What does a relay do?', choices: ['Lets a pin switch a bigger load', 'Measures distance', 'Stores the sketch'], answer: 0, hint: 'The relay is a switch in the middle.' },
            { id: 'L31', xp: 10, kind: 'mcq', image: 'assets/svg/pir.svg', title: 'Someone walked by', story: 'A PIR sensor watches for motion. When a person moves, its output pin goes HIGH.', q: 'A PIR output goes HIGH when…', choices: ['Something moves nearby', 'The room is dark', 'The servo is at 0'], answer: 0, hint: 'PIR means motion. Dark and light belong to the LDR.' },
            { id: 'L32', xp: 10, kind: 'mcq', image: 'assets/svg/bulb.svg', title: 'Same idea, bigger glow', story: 'A lamp is a bigger light. HIGH turns it on. LOW turns it off. A relay often sits between the pin and the lamp.', q: 'HIGH sent toward the lamp means…', choices: ['The lamp is on', 'The lamp is a sensor', 'The board resets'], answer: 0, hint: 'HIGH is on, for a lamp just as for an LED.' },
            { id: 'L33', xp: 10, kind: 'mcq', image: 'assets/svg/led-blue.svg', title: 'Three colors, many mixes', story: 'Red, green, and blue LEDs can shine together. Each color has its own pin, so the mix can change.', q: 'Why give each color its own pin?', choices: ['So the mix can change', 'Because GND is optional', 'To read a button'], answer: 0, hint: 'Three pins, three brightnesses, many colors.' }
          ]
        },
        {
          id: 'robot', name: 'Robots and the network', image: 'assets/svg/hcsr04.svg', blurb: 'Stop before a bump, aim a sensor, blink on an ESP32.',
          items: [
            { id: 'L34', xp: 10, kind: 'mcq', image: 'assets/svg/hcsr04.svg', title: 'Close means stop', story: 'A distance sensor reports centimeters. A small number means something is near. A robot can stop before it bumps.', q: 'A small distance reading means…', choices: ['Something is close', 'The battery is full', 'The pin is an input'], answer: 0, hint: 'Fewer centimeters, closer object.' },
            { id: 'L35', xp: 10, kind: 'mcq', image: 'assets/svg/fan.svg', title: 'Wheels like a fan', story: 'A motor spins faster when the PWM number is higher. 0 is stopped. That is how a robot rolls.', q: 'What raises the motor speed?', choices: ['A higher PWM value', 'A comment', 'Serial.begin'], answer: 0, hint: 'PWM is the speed knob. 255 is full speed.' },
            { id: 'L36', xp: 10, kind: 'mcq', image: 'assets/svg/servo.svg', title: 'Sweep, then measure', story: 'Point a servo, read the distance, then point a little further. That pair is a radar scan.', q: 'In a radar scan, what turns the sensor?', choices: ['A servo', 'A resistor', 'A comment'], answer: 0, hint: 'The servo aims. The distance sensor measures.' },
            { id: 'L37', xp: 10, kind: 'mcq', image: 'assets/svg/esp32-devkit.svg', title: 'A board that can join Wi-Fi', story: 'The ESP32 can blink, and it can also use a network. In this lab the first ESP32 sketch blinks the lamp on GPIO2.', q: 'The ESP32 onboard lamp is on…', choices: ['GPIO2', 'Pin A0', 'The VIN pin'], answer: 0, hint: 'GPIO2 is the ESP32 lamp. The Uno lamp is pin 13.' },
            { id: 'L38', xp: 15, kind: 'drag', image: 'assets/svg/buzzer.svg', title: 'Silence the buzzer', story: 'tone starts a note. Drop the call that stops it.', before: '', after: '(8);', answer: 'noTone', chips: ['noTone', 'tone', 'delay'] }
          ]
        },
        {
          id: 'uno-parts', name: 'Inside the Uno', image: 'assets/svg/arduino-uno.svg', blurb: 'The chip, the USB plug, reset, and the pins with a ~ mark.',
          items: [
            { id: 'L39', xp: 10, kind: 'mcq', title: 'The chip that runs the sketch', story: 'A classic Uno is built around an ATmega328P. That chip reads your sketch and wiggles the pins.', q: 'Which chip is on a classic Uno?', choices: ['ATmega328P', 'A Wi-Fi radio', 'A motor driver'], answer: 0, hint: '328P is the Uno brain. Wi-Fi is the ESP32 specialty.' },
            { id: 'L40', xp: 10, kind: 'mcq', title: 'The USB plug has two jobs', story: 'The USB cable sends the sketch from the computer. It can also power a small circuit, such as one LED.', q: 'What does the USB plug do?', choices: ['Uploads the sketch and can power the board', 'Only measures light', 'Replaces the GND pin'], answer: 0, hint: 'USB carries the program, and a little power.' },
            { id: 'L41', xp: 10, kind: 'mcq', title: 'Reset starts again', story: 'The reset button restarts the board. setup() runs once more, then loop() continues.', code: 'void setup() {\n  // runs again after reset\n}', q: 'What does the reset button do?', choices: ['Starts the sketch again', 'Deletes the sketch', 'Changes pin 13 to A0'], answer: 0, hint: 'Reset is a fresh start, not a delete.' },
            { id: 'L42', xp: 10, kind: 'mcq', title: 'The tilde mark', story: 'Some Uno pins are printed with a ~ mark: 3, 5, 6, 9, 10, and 11. Those pins can fade with analogWrite.', code: 'analogWrite(9, 128);', q: 'What does the ~ beside a pin mean?', choices: ['That pin can do PWM', 'That pin is only ground', 'That pin is Wi-Fi'], answer: 0, hint: 'The tilde marks a PWM pin. Pin 9 is one of them.' },
            { id: 'L43', xp: 10, kind: 'mcq', title: 'Two rows of headers', story: 'One long header is the digital pins, 0 to 13. The other side holds power and A0 to A5. A wire lands in a hole on those headers.', q: 'Where do jumper wires plug into the Uno?', choices: ['The pin headers', 'The reset button only', 'The chip legs directly'], answer: 0, hint: 'The black headers along the edges are the sockets.' }
          ]
        },
        {
          id: 'esp-plus', name: 'What the ESP32 adds', image: 'assets/svg/esp32-devkit.svg', blurb: 'Wi-Fi, Bluetooth, 3.3 volts, and pins that only listen.',
          items: [
            { id: 'L44', xp: 10, kind: 'mcq', title: 'Wi-Fi is already inside', story: 'An Uno needs an extra radio to join a network. The ESP32 has Wi-Fi on the same chip. A real sketch joins with WiFi.begin.', code: 'WiFi.begin("name", "password");', q: 'Which board has Wi-Fi built in?', choices: ['ESP32', 'Classic Uno', 'A resistor'], answer: 0, hint: 'WiFi.begin is an ESP32 idea. The Uno blink sketch does not join a network.' },
            { id: 'L45', xp: 10, kind: 'mcq', title: 'Bluetooth too', story: 'The same ESP32 chip can speak Bluetooth. A phone can talk to the board without a USB cable.', q: 'Besides Wi-Fi, the ESP32 also has…', choices: ['Bluetooth', 'A built-in servo', 'A 12 volt lamp'], answer: 0, hint: 'Radio twice: Wi-Fi and Bluetooth.' },
            { id: 'L46', xp: 10, kind: 'mcq', title: 'Stay at 3.3 volts', story: 'ESP32 pins are 3.3V logic. A 5V Uno signal can damage them. Power the sensors from 3V3 when they sit on an ESP32.', code: 'Uno 5V signal  →  do not feed an ESP32 pin', q: 'A safe voltage for an ESP32 pin is…', choices: ['3.3 volts', '12 volts', 'Always 5 volts from the Uno'], answer: 0, hint: '3V3 on the ESP32 board is the friendly supply.' },
            { id: 'L47', xp: 10, kind: 'mcq', title: 'EN is the restart pin', story: 'EN means enable. Tie it to ground and the ESP32 stops. Let it go and the board starts again, like reset on the Uno.', q: 'Pulling EN to GND…', choices: ['Restarts or holds the ESP32 off', 'Turns on Wi-Fi only', 'Writes a servo angle'], answer: 0, hint: 'EN low disables the chip. Release it and the sketch starts over.' },
            { id: 'L48', xp: 10, kind: 'mcq', title: 'Some pins only listen', story: 'GPIO 34, 35, 36, and 39 have no output driver. digitalWrite cannot turn them on. They are inputs, often used for analogRead.', code: 'int n = analogRead(34);', q: 'GPIO34 is special because it…', choices: ['Can only be an input', 'Is the 5V pin', 'Is always PWM'], answer: 0, hint: '34, 35, 36, and 39 listen. They do not drive an LED.' },
            { id: 'L49', xp: 15, kind: 'drag', title: 'The onboard lamp number', story: 'On this ESP32 the built-in LED is GPIO2. Drop that number.', before: 'int ledPin = ', after: ';', answer: '2', chips: ['2', '13', 'A0'] }
          ]
        },
        {
          id: 'family', name: 'Other Arduino boards', image: 'assets/svg/board-family.svg', blurb: 'Nano, Mega, and Leonardo, and why you would pick each one.',
          items: [
            { id: 'L50', xp: 10, kind: 'mcq', title: 'Uno, the classroom board', story: 'The Uno is the wide board with headers on both sides. It has 14 digital pins, 0 to 13, and 6 analog pins, A0 to A5. This lab starts there.', q: 'How many digital pins does an Uno have?', choices: ['14', '54', '2'], answer: 0, hint: '0 through 13 is fourteen digital pins.' },
            { id: 'L51', xp: 10, kind: 'mcq', title: 'Nano sits on a breadboard', story: 'A Nano uses the same kind of chip as the Uno, the ATmega328P, but the board is narrow. It can plug straight into a breadboard.', q: 'Why do people pick a Nano?', choices: ['It is small enough for a breadboard', 'It has Wi-Fi built in', 'It has 54 digital pins'], answer: 0, hint: 'Nano means small. Wi-Fi is the ESP32. Lots of pins is the Mega.' },
            { id: 'L52', xp: 10, kind: 'mcq', title: 'Mega when you run out of pins', story: 'A Mega 2560 keeps the Uno idea and adds room. It has 54 digital pins and 16 analog inputs, plus extra serial ports.', q: 'Which board do you choose for many sensors at once?', choices: ['Mega', 'A single resistor', 'Nano, because it is smaller'], answer: 0, hint: 'Mega has the long row of pins.' },
            { id: 'L53', xp: 10, kind: 'mcq', title: 'Leonardo can be a keyboard', story: 'A Leonardo uses an ATmega32U4. That chip speaks USB itself, so the board can pretend to be a keyboard or a mouse.', q: 'What is special about a Leonardo?', choices: ['It can act as a USB keyboard', 'It is a 3.3V Wi-Fi board', 'It has no pins'], answer: 0, hint: 'Native USB is the Leonardo trick. Wi-Fi still belongs to the ESP32.' },
            { id: 'L54', xp: 15, kind: 'drag', title: 'Name the big pin count', story: 'Drop the digital pin count of a Mega.', before: 'Mega digital pins: ', after: '', answer: '54', chips: ['54', '14', '6'] }
          ]
        },
        {
          id: 'robot-bits', name: 'Robot building blocks', image: 'assets/svg/robot-parts.svg', blurb: 'Brain, driver, motors, sensors, and a battery.',
          items: [
            { id: 'L55', xp: 10, kind: 'mcq', title: 'The brain', story: 'Every robot needs a controller. In this lab that is the Uno or the ESP32. It reads sensors and decides what the motors should do.', q: 'What is the robot brain here?', choices: ['The microcontroller board', 'The jumper wire color', 'The resistor bands'], answer: 0, hint: 'The board runs the sketch. That is the brain.' },
            { id: 'L56', xp: 10, kind: 'mcq', title: 'A pin cannot feed a motor', story: 'A DC motor wants much more current than a pin can give. A motor driver sits in between. The pin tells the driver the direction and the speed. The driver feeds the motor.', code: 'pin → driver → motor', q: 'Why add a motor driver?', choices: ['The motor needs more current than a pin can give', 'To measure temperature', 'To replace setup()'], answer: 0, hint: 'The pin sends a small signal. The driver sends the big current.' },
            { id: 'L57', xp: 10, kind: 'mcq', title: 'Eyes and ears', story: 'Ultrasonic sensors see distance. An LDR sees light. A PIR sees motion. Those are the robot senses. The sketch decides after it reads them.', q: 'Sensors on a robot are the…', choices: ['Senses', 'Power plug', 'Comments in the sketch'], answer: 0, hint: 'They report the world. The board decides.' },
            { id: 'L58', xp: 10, kind: 'mcq', title: 'Motors want their own power', story: 'USB can light an LED. A robot that rolls often needs a battery pack. The board and the motors can share ground, while the battery feeds the driver.', q: 'Why is a battery common on a robot?', choices: ['Motors draw more power than USB likes to give', 'Because GND is optional', 'To store the sketch'], answer: 0, hint: 'USB is fine for a lamp. Wheels want a battery.' },
            { id: 'L59', xp: 15, kind: 'drag', title: 'The part between pin and motor', story: 'Drop the missing block.', before: 'pin → ', after: ' → motor', answer: 'driver', chips: ['driver', 'comment', 'USB'] }
          ]
        },
        {
          id: 'motors', name: 'Motor types', image: 'assets/svg/motor-types.svg', blurb: 'DC, servo, and stepper, and the function each one likes.',
          items: [
            { id: 'L60', xp: 10, kind: 'mcq', title: 'DC motor spins and spins', story: 'A plain DC motor turns as long as it has power. Reverse the two wires and it spins the other way. Speed is a PWM number. It does not know its own angle.', code: 'analogWrite(9, speed);', q: 'A DC motor is best when you want…', choices: ['Continuous spinning', 'A held angle of 90 degrees', 'One exact step'], answer: 0, hint: 'Wheels are usually DC motors. A held angle is a servo.' },
            { id: 'L61', xp: 10, kind: 'mcq', title: 'Servo holds an angle', story: 'A hobby servo includes its own small controller. You send an angle. It moves there and holds. 0 and 180 are the ends. 90 is the middle.', code: 'myServo.write(90);', q: 'Which function points a servo?', choices: ['write', 'analogRead', 'WiFi.begin'], answer: 0, hint: 'write(angle) is the servo call.' },
            { id: 'L62', xp: 10, kind: 'mcq', title: 'Stepper counts its steps', story: 'A stepper moves in tiny equal jumps. A common one turns 1.8 degrees per step, so 200 steps make a full circle. Printers and CNC machines use that so position stays exact.', code: 'stepper.step(200);', q: 'Why pick a stepper?', choices: ['You need a counted position', 'You only need a beep', 'You need Wi-Fi'], answer: 0, hint: 'Steps are countable. A plain DC motor does not count them.' },
            { id: 'L63', xp: 10, kind: 'mcq', title: 'Gears trade speed for force', story: 'A gear motor is a DC motor with a gearbox. It spins slower and pushes harder. Robot wheels often use one so the robot can climb a small bump.', q: 'A gearbox on a DC motor gives…', choices: ['More turning force, less speed', 'Wi-Fi', 'An analog reading of 1023'], answer: 0, hint: 'Gears slow the shaft and raise the torque.' },
            { id: 'L64', xp: 15, kind: 'drag', title: 'Match the call', story: 'This line sets a DC motor speed. Drop the function.', before: '', after: '(9, speed);', answer: 'analogWrite', chips: ['analogWrite', 'step', 'digitalRead'] }
          ]
        },
        {
          id: 'functions', name: 'Functions you will call', image: 'assets/svg/sketch-card.svg', blurb: 'Read the line, then answer what it does.',
          items: [
            { id: 'L65', xp: 10, kind: 'mcq', title: 'pinMode', story: 'Direction comes first. OUTPUT can drive an LED. INPUT listens to a button. Put it in setup so it runs once.', code: 'pinMode(13, OUTPUT);', q: 'pinMode(13, OUTPUT) means pin 13 will…', choices: ['Send a signal', 'Read a knob only', 'Join Wi-Fi'], answer: 0, hint: 'OUTPUT talks. INPUT listens.' },
            { id: 'L66', xp: 10, kind: 'mcq', title: 'digitalWrite', story: 'After the pin is an output, digitalWrite sets it fully on or fully off. There is no middle.', code: 'digitalWrite(13, HIGH);', q: 'digitalWrite talks in…', choices: ['HIGH or LOW', 'Degrees', 'Ohms'], answer: 0, hint: 'HIGH on, LOW off. Angles belong to the servo.' },
            { id: 'L67', xp: 10, kind: 'mcq', title: 'digitalRead', story: 'digitalRead asks a digital pin if it is HIGH or LOW. A pressed button is a common answer.', code: 'int pressed = digitalRead(2);', q: 'digitalRead returns…', choices: ['HIGH or LOW', '0 to 1023', 'A Wi-Fi name'], answer: 0, hint: 'Digital is only the two levels. The 0 to 1023 range is analogRead.' },
            { id: 'L68', xp: 10, kind: 'mcq', title: 'analogRead', story: 'analogRead measures a range. On the Uno the answer is 0 at one end of a knob and 1023 at the other.', code: 'int knob = analogRead(A0);', q: 'On the Uno, analogRead goes from…', choices: ['0 to 1023', 'Only HIGH or LOW', '0 to 180 degrees'], answer: 0, hint: '1023 is the top of a 10-bit reading.' },
            { id: 'L69', xp: 10, kind: 'mcq', title: 'analogWrite', story: 'analogWrite is PWM. 0 is off, 255 is fully on, and 128 is about half. Use a pin marked ~ on the Uno.', code: 'analogWrite(9, 128);', q: 'analogWrite(9, 255) means…', choices: ['Fully on', 'Read pin 9', 'Wait 255 minutes'], answer: 0, hint: '255 is the top of PWM. delay is the one that waits.' },
            { id: 'L70', xp: 10, kind: 'mcq', title: 'delay stops the whole sketch', story: 'delay(500) waits half a second. While it waits, loop() does nothing else. No new button check, no new sensor read.', code: 'delay(500);', q: 'During delay, the sketch…', choices: ['Pauses everything', 'Keeps reading sensors', 'Uploads itself'], answer: 0, hint: 'delay is a full stop until the time is up.' },
            { id: 'L71', xp: 10, kind: 'mcq', title: 'millis keeps counting', story: 'millis() is how many milliseconds since reset. The sketch can look at it and keep working. That is how you blink without freezing the button.', code: 'unsigned long t = millis();', q: 'millis() is different from delay because…', choices: ['The loop can keep going', 'It deletes the pin', 'It sets a servo to 0'], answer: 0, hint: 'millis reads the clock. delay holds the sketch.' },
            { id: 'L72', xp: 15, kind: 'drag', title: 'Squeeze a range', story: 'map takes the knob reading and squeezes it into a PWM number. Drop the function.', code: 'int bright = map(knob, 0, 1023, 0, 255);', before: 'int bright = ', after: '(knob, 0, 1023, 0, 255);', answer: 'map', chips: ['map', 'delay', 'WiFi'] }
          ]
        },
        {
          id: 'wires', name: 'Jumper wires', image: 'assets/svg/jumper-wires.svg?v=2', blurb: 'Male is a pin. Female is a socket.',
          items: [
            { id: 'L73', xp: 10, kind: 'mcq', title: 'Pin or socket', story: 'A male end is a metal pin. It pushes into a hole. A female end is a socket. It fits over a pin.', q: 'A male jumper end is…', choices: ['A pin', 'A socket', 'A resistor'], answer: 0, hint: 'Male sticks out. Female fits over it.' },
            { id: 'L74', xp: 10, kind: 'mcq', title: 'Male to male', story: 'Both ends are pins. One end goes into an Arduino header. The other goes into a breadboard hole. That is the wire you use most in this lab.', q: 'Which wire joins the Uno header to a breadboard?', choices: ['Male–male', 'Female–female only', 'A servo horn'], answer: 0, hint: 'Header socket and breadboard hole both want a pin, so both ends are male.' },
            { id: 'L75', xp: 10, kind: 'mcq', title: 'Male to female', story: 'Many sensor modules have pins sticking up. The female end covers that pin. The male end still goes into the breadboard or the Arduino.', q: 'A module with pins sticking out likes a…', choices: ['Female end over those pins', 'Second USB cable', 'Reset button'], answer: 0, hint: 'Socket over the module pin: that is the female end.' },
            { id: 'L76', xp: 15, kind: 'drag', title: 'Two sockets', story: 'Female–female joins two things that already have pins. Drop the name.', before: '', after: ' joins two male headers', answer: 'female-female', chips: ['female-female', 'male-male', 'PWM'] }
          ]
        },
        {
          id: 'ohms', name: 'Resistor math', image: 'assets/svg/ohm-law.svg?v=2', blurb: 'Ohm’s law, then the LED sum, then the 220 ohm habit.',
          items: [
            { id: 'L77', xp: 10, kind: 'mcq', title: 'Ohm’s law', story: 'Voltage, current, and resistance are tied together. If you know the voltage across the resistor and the current you want, resistance is voltage divided by current.', code: 'R = V / I', q: 'If V is 3 volts and I is 0.02 amps, R is…', choices: ['150 ohms', '0.06 ohms', '220 pins'], answer: 0, hint: '3 divided by 0.02 is 150.' },
            { id: 'L78', xp: 10, kind: 'mcq', title: 'Subtract what the LED uses', story: 'A red LED uses about 2 volts. The Uno supplies 5 volts. The resistor only sees what is left: 5 − 2 = 3 volts. That 3 volts goes into Ohm’s law.', code: 'R = (5 - 2) / 0.02', q: 'Why subtract 2 from 5?', choices: ['The LED already uses about 2 volts', 'Pin 2 is ground', '220 is a pin number'], answer: 0, hint: 'Only the leftover voltage is across the resistor.' },
            { id: 'L79', xp: 10, kind: 'mcq', title: 'About 20 milliamps', story: '0.02 amps is 20 milliamps, a common target for a small LED. With 3 volts left, R = 3 / 0.02 = 150 ohms.', code: '3 / 0.02 = 150', q: 'The calculated resistor for that LED is about…', choices: ['150 ohms', '150 pins', '5 ohms'], answer: 0, hint: '150 ohms is the result of the division.' },
            { id: 'L80', xp: 10, kind: 'mcq', title: '220 is the gentler choice', story: 'Kits often include 220 ohms. That is a bit more than 150, so a bit less current flows. The LED is still bright, and it runs cooler. Higher ohms means less current.', code: 'I = 3 / 220 ≈ 0.014 A', q: 'A 220 ohm resistor instead of 150…', choices: ['Lets less current through', 'Removes the need for GND', 'Raises the current'], answer: 0, hint: 'Bigger resistance, smaller current.' },
            { id: 'L81', xp: 10, kind: 'mcq', title: 'In series, same path', story: 'The resistor must sit in line with the LED, so the same current flows through both. Beside the LED, in parallel, it would not limit that current.', code: '5V → resistor → LED → GND', q: 'Where does the resistor go?', choices: ['In series with the LED', 'Instead of GND', 'Only on the reset button'], answer: 0, hint: 'One path: source, resistor, LED, ground.' },
            { id: 'L82', xp: 15, kind: 'drag', title: 'Finish the sum', story: 'Drop the calculated ohms. Not the kit value.', before: '(5 - 2) / 0.02 = ', after: '', answer: '150', chips: ['150', '220', '1023'] }
          ]
        },
        {
          id: 'relay-mod', name: 'Relay', image: 'assets/svg/relay-contacts.svg', blurb: 'A small pin flips a separate switch.',
          items: [
            { id: 'L83', xp: 10, kind: 'mcq', image: 'assets/svg/relay.svg', title: 'The coil is a magnet', story: 'A relay has a coil and a switch. Current in the coil makes a magnet. The magnet pulls the switch. Your pin only has to feed that coil, not the lamp.', q: 'What pulls the relay switch?', choices: ['The coil, acting as a magnet', 'The USB cable', 'A comment in the sketch'], answer: 0, hint: 'Coil current makes the magnet. The magnet moves the contact.' },
            { id: 'L84', xp: 10, kind: 'mcq', title: 'COM, NO, and NC', story: 'COM is the moving contact. NO means normally open: the path is open until the coil turns on. NC means normally closed: that path is closed until the coil turns on.', code: 'COM ---- NO   when the coil is on', q: 'NO means the contact is…', choices: ['Open until the relay turns on', 'Always ground', 'A Wi-Fi name'], answer: 0, hint: 'Normally open. It closes only while the relay is on.' },
            { id: 'L85', xp: 10, kind: 'mcq', title: 'Two sides', story: 'IN, VCC, and GND are the coil side. They talk to the Arduino. COM and NO are the load side. The lamp wires land there, not on the pin.', code: 'pin 7 -> IN\nlamp -> COM and NO', q: 'Where does the lamp connect?', choices: ['COM and NO', 'Only to pin 13', 'Across the reset button'], answer: 0, hint: 'The load uses the contact screws. The pin uses IN.' },
            { id: 'L86', xp: 10, kind: 'mcq', title: 'HIGH turns this lab relay on', story: 'In this lab the relay sketch writes HIGH to pin 7 when the button is pressed. That turns the coil on. Some real modules are the opposite and turn on with LOW. Read the label, then match the sketch.', code: 'digitalWrite(relayPin, HIGH);', q: 'In this lab, the relay coil turns on when the pin is…', choices: ['HIGH', 'Left as an input', 'Tied to A0 only'], answer: 0, hint: 'The relay example writes HIGH to pin 7.' },
            { id: 'L87', xp: 10, kind: 'mcq', title: 'The pin stays small', story: 'The lamp current flows from the supply, through COM and NO, and back. It does not flow out of the Arduino pin. That is why a relay can switch a bigger load than a pin can drive.', q: 'Why use a relay for a bigger lamp?', choices: ['The pin does not have to carry the lamp current', 'The relay stores the sketch', 'NC means Wi-Fi'], answer: 0, hint: 'The pin drives the coil. The contacts carry the load.' },
            { id: 'L88', xp: 15, kind: 'drag', title: 'The contact that closes', story: 'Drop the contact that is open until the relay turns on.', before: 'COM to ', after: '', answer: 'NO', chips: ['NO', 'USB', 'map'] }
          ]
        },
        {
          id: 'mcu', name: 'Microcontroller', image: 'assets/svg/microcontroller.svg', blurb: 'The chip is the computer. The board is the chip plus helpers.',
          items: [
            { id: 'L89', xp: 10, kind: 'mcq', title: 'Chip, not the whole board', story: 'A microcontroller is a tiny computer on one chip: processor, memory, and pins. On a classic Uno that chip is the ATmega328P. The green board around it is the Arduino.', q: 'The microcontroller on a classic Uno is…', choices: ['The ATmega328P chip', 'The USB cable', 'The relay contact'], answer: 0, hint: 'The chip runs the sketch. The board carries the chip.' },
            { id: 'L90', xp: 10, kind: 'mcq', title: 'Flash remembers, RAM does not', story: 'Flash memory keeps the sketch even when power is gone. RAM is the scratch space while the sketch runs. Reset clears RAM. The sketch in flash stays.', q: 'After you unplug the board, the sketch is still in…', choices: ['Flash', 'RAM', 'The serial monitor'], answer: 0, hint: 'Flash is the long-term memory. RAM forgets at reset.' },
            { id: 'L91', xp: 10, kind: 'mcq', title: 'The clock heartbeat', story: 'The Uno clock runs at 16 MHz. That is the beat the chip uses to step through your code. delay(1000) is one second because the chip counts those beats.', code: '16 MHz on the Uno', q: 'The Uno clock is…', choices: ['16 MHz', '9600 ohms', 'A COM port'], answer: 0, hint: '16 million beats a second. 9600 is a serial speed, not the clock.' },
            { id: 'L92', xp: 10, kind: 'mcq', title: 'GPIO are the pin legs', story: 'GPIO means general purpose input or output. Each digital pin is one GPIO. pinMode chooses input or output. digitalWrite sets the level.', code: 'pinMode(13, OUTPUT);', q: 'A GPIO pin can be…', choices: ['An input or an output', 'Only a USB port', 'Only flash memory'], answer: 0, hint: 'General purpose: you choose input or output.' },
            { id: 'L93', xp: 10, kind: 'mcq', title: 'ESP32 is a microcontroller too', story: 'The ESP32 is also a microcontroller. It adds Wi-Fi and Bluetooth on the same chip. The Uno chip does not. Both still run setup and loop.', q: 'What does the ESP32 add on the chip itself?', choices: ['Wi-Fi and Bluetooth', 'A relay contact', 'The Arduino IDE'], answer: 0, hint: 'Same job as a microcontroller, plus the two radios.' },
            { id: 'L94', xp: 15, kind: 'drag', title: 'Name the long memory', story: 'This memory still holds the sketch after power is removed.', before: 'sketch is stored in ', after: '', answer: 'Flash', chips: ['Flash', 'RAM', 'COM4'] }
          ]
        },
        {
          id: 'ide', name: 'Arduino IDE', image: 'assets/svg/arduino-ide.svg', blurb: 'Write the sketch, check it, then send it.',
          items: [
            { id: 'L95', xp: 10, kind: 'mcq', title: 'A sketch is the program', story: 'In the Arduino IDE the program is called a sketch. The file ends in .ino. setup and loop live in that file.', code: 'blink.ino', q: 'An Arduino program file ends with…', choices: ['.ino', '.jpg', '.ohm'], answer: 0, hint: '.ino is the sketch. The IDE opens that file.' },
            { id: 'L96', xp: 10, kind: 'mcq', title: 'Verify, then upload', story: 'Verify compiles the sketch. It checks for mistakes and does not need the board. Upload compiles and then sends the result to the board on the selected port.', q: 'Verify does what?', choices: ['Checks and compiles the sketch', 'Picks the COM port', 'Closes the relay'], answer: 0, hint: 'Verify is the check. Upload is the send.' },
            { id: 'L97', xp: 10, kind: 'mcq', title: 'Tell it which board', story: 'Tools, Board must match the board on your desk. An Uno sketch uploaded as an ESP32, or the other way around, will not land correctly.', q: 'Tools, Board should be set to…', choices: ['The board you are using', 'Always Mega', 'The resistor value'], answer: 0, hint: 'Uno, Nano, Mega, ESP32: pick the one that is plugged in.' },
            { id: 'L98', xp: 10, kind: 'mcq', title: 'The serial monitor', story: 'The magnifying glass opens the serial monitor. The speed at the bottom must match Serial.begin. 9600 in the sketch needs 9600 in the monitor.', code: 'Serial.begin(9600);', q: 'If the sketch uses 9600, the monitor must use…', choices: ['9600', '16 MHz', 'COM only'], answer: 0, hint: 'The two speeds have to match or the text looks like noise.' },
            { id: 'L99', xp: 15, kind: 'drag', title: 'The button that sends', story: 'Drop the IDE action that copies the sketch onto the board.', before: '', after: ' sends the sketch', answer: 'Upload', chips: ['Upload', 'Verify', 'NO'] }
          ]
        },
        {
          id: 'port', name: 'Port', image: 'assets/svg/com-port.svg', blurb: 'The door between the computer and the board.',
          items: [
            { id: 'L100', xp: 10, kind: 'mcq', title: 'What a port is', story: 'The port is the connection the computer uses to talk to one board. On Windows it looks like COM3 or COM4. Upload and the serial monitor both use that door.', q: 'A port is…', choices: ['The computer connection to the board', 'A relay contact', 'Flash memory'], answer: 0, hint: 'COM4 is a port name. It is not a pin on the header.' },
            { id: 'L101', xp: 10, kind: 'mcq', title: 'It shows up when you plug in', story: 'Open Tools, Port. Unplug the board and the name disappears. Plug it in and a new COM name appears. That new name is the one to select.', q: 'How do you find the right port?', choices: ['Plug the board in and see which name appears', 'Always pick COM1', 'Use the NC contact'], answer: 0, hint: 'The port that comes and goes with the cable is yours.' },
            { id: 'L102', xp: 10, kind: 'mcq', title: 'Wrong port, failed upload', story: 'If Upload cannot find the board, the usual cause is the wrong port or the wrong board type. The sketch can be fine and still not leave the computer.', q: 'A common reason Upload fails is…', choices: ['The wrong port is selected', 'delay is spelled correctly', 'The LED is red'], answer: 0, hint: 'Check Tools, Port, then Tools, Board.' },
            { id: 'L103', xp: 10, kind: 'mcq', title: 'One port for the monitor too', story: 'The serial monitor talks through the same port as Upload. If you pick a different COM number, the board never hears Serial.print.', q: 'Serial.begin text arrives on…', choices: ['The same port you uploaded with', 'Every COM port at once', 'Pin A0'], answer: 0, hint: 'One selected port. The monitor uses that one.' },
            { id: 'L104', xp: 10, kind: 'mcq', title: 'A helper chip makes the port', story: 'On a classic Uno the ATmega328P does not speak USB by itself. A small USB chip, a 16U2 or a CH340 on many boards, creates the COM port and passes the bytes to the main chip.', q: 'What creates the COM port on a classic Uno?', choices: ['The USB helper chip', 'The relay coil', 'analogWrite'], answer: 0, hint: '16U2 or CH340 handles USB. The 328P runs your sketch.' },
            { id: 'L105', xp: 15, kind: 'drag', title: 'Name the Windows port', story: 'Drop the kind of name Windows shows.', before: '', after: '4', answer: 'COM', chips: ['COM', 'GPIO', 'Flash'] }
          ]
        }
      ]
    },
    quizzes: {
      module: 'learning/quizzes',
      title: 'Quizzes',
      categories: [
        {
          id: 'q-power', name: 'Power pins', image: 'assets/svg/arduino-uno.svg', blurb: 'Ground, 5 volts, and the power input.',
          items: [
            { id: 'Q1', xp: 10, kind: 'mcq', title: 'Power pins', story: 'Quick check. No long reading.', q: 'On the Uno, which pin is ground?', choices: ['5V', 'GND', 'A0'], answer: 1, hint: 'GND is 0 volts. 5V is the power pin.' },
            { id: 'Q6', xp: 10, kind: 'mcq', title: 'Five volts', story: 'One pin feeds the LED and the sensor.', q: 'Which Uno pin supplies 5 volts?', choices: ['5V', 'A0', 'GPIO2'], answer: 0, hint: 'The pin is labeled 5V.' },
            { id: 'Q7', xp: 10, kind: 'mcq', title: 'VIN', story: 'VIN is where outside power can come in.', q: 'VIN is…', choices: ['A power input', 'The onboard LED', 'A serial speed'], answer: 0, hint: 'VIN brings power in. It is not a lamp pin.' }
          ]
        },
        {
          id: 'q-boards', name: 'Two boards', image: 'assets/svg/esp32-devkit.svg', blurb: 'Uno and ESP32 do not share every pin.',
          items: [
            { id: 'Q2', xp: 10, kind: 'mcq', title: 'ESP32 lamp', story: 'Boards do not share the same lamp pin.', q: 'The ESP32 onboard LED is on…', choices: ['GPIO2', 'GPIO13', 'A4'], answer: 0, hint: 'ESP32 uses GPIO2. The Uno uses pin 13.' },
            { id: 'Q8', xp: 10, kind: 'mcq', image: 'assets/svg/arduino-uno.svg', title: 'Uno lamp', story: 'Same idea, different number.', q: 'The Uno built-in LED is pin…', choices: ['13', '2', 'A5'], answer: 0, hint: 'Pin 13 on the Uno. GPIO2 on the ESP32.' },
            { id: 'Q9', xp: 10, kind: 'mcq', title: 'Gentle voltage', story: 'Do not feed a 5V signal into an ESP32 pin.', q: 'ESP32 pins expect…', choices: ['3.3 volts', '12 volts', 'The same 5V as the Uno'], answer: 0, hint: 'The ESP32 DevKit is a 3.3V board.' }
          ]
        },
        {
          id: 'q-code', name: 'Sketch calls', image: 'assets/svg/sketch-card.svg', blurb: 'Fade, serial, and a one-second wait.',
          items: [
            { id: 'Q3', xp: 10, kind: 'mcq', title: 'PWM fade', story: 'Some pins can be partly on.', q: 'Which call fades an LED?', choices: ['analogWrite', 'Serial.begin', 'pinMode'], answer: 0, hint: 'analogWrite sets a brightness from 0 to 255.' },
            { id: 'Q4', xp: 10, kind: 'mcq', title: 'Serial hello', story: 'The serial monitor is a text window.', q: 'What starts the serial window at 9600?', choices: ['Serial.begin(9600)', 'loop(9600)', 'delay(9600)'], answer: 0, hint: 'Serial.begin opens the monitor. 9600 is the speed.' },
            { id: 'Q10', xp: 10, kind: 'mcq', title: 'One second', story: 'delay counts milliseconds.', q: 'delay(1000) waits…', choices: ['One second', 'One minute', '1000 pins'], answer: 0, hint: '1000 milliseconds is one second.' },
            { id: 'Q11', xp: 10, kind: 'mcq', image: 'assets/svg/led-green.svg', title: 'On', story: 'Two words, on and off.', q: 'Which word turns a pin on?', choices: ['HIGH', 'LOW', 'GND'], answer: 0, hint: 'HIGH is on. LOW is off.' }
          ]
        },
        {
          id: 'q-parts', name: 'Parts', image: 'assets/svg/servo.svg', blurb: 'A horn, an echo, a weather chip, a short leg.',
          items: [
            { id: 'Q5', xp: 10, kind: 'mcq', title: 'Servo angle', story: 'A hobby servo points to an angle.', q: 'A servo angle usually runs from…', choices: ['0 to 180 degrees', '0 to 5 volts only', 'A0 to A5'], answer: 0, hint: 'write(0) and write(180) are the two ends of the sweep.' },
            { id: 'Q12', xp: 10, kind: 'mcq', image: 'assets/svg/hcsr04.svg', title: 'Who listens', story: 'One pin shouts. One pin hears.', q: 'Which ultrasonic pin listens?', choices: ['ECHO', 'TRIG', 'SDA'], answer: 0, hint: 'TRIG sends the ping. ECHO listens.' },
            { id: 'Q13', xp: 10, kind: 'mcq', image: 'assets/svg/dht11.svg', title: 'Two readings', story: 'One small chip, two numbers.', q: 'A DHT11 reports…', choices: ['Temperature and humidity', 'Only distance', 'Only motor speed'], answer: 0, hint: 'Warmth and dampness.' },
            { id: 'Q14', xp: 10, kind: 'mcq', image: 'assets/svg/led-red.svg', title: 'Short leg', story: 'Polarity still matters.', q: 'The short LED leg goes toward…', choices: ['GND', '5V', 'VIN'], answer: 0, hint: 'Short leg, cathode, toward ground.' }
          ]
        },
        {
          id: 'q-uno-parts', name: 'Uno parts check', image: 'assets/svg/arduino-uno.svg', blurb: 'From the chip lesson and the tilde pins.',
          items: [
            { id: 'Q15', xp: 10, kind: 'mcq', title: 'Name the chip', story: 'You saw this on the Uno lesson.', q: 'A classic Uno runs an…', choices: ['ATmega328P', 'ESP32 radio', 'L298 driver'], answer: 0, hint: '328P is the Uno chip.' },
            { id: 'Q16', xp: 10, kind: 'mcq', title: 'Tilde pins', story: 'The ~ mark was on 3, 5, 6, 9, 10, and 11.', q: 'Pin 9 can fade because it…', choices: ['Supports PWM', 'Is a ground pin', 'Is input only'], answer: 0, hint: 'analogWrite wants a PWM pin. Pin 9 has the tilde.' },
            { id: 'Q17', xp: 10, kind: 'mcq', title: 'USB', story: 'Two jobs, one plug.', q: 'The USB cable can…', choices: ['Upload the sketch', 'Replace a motor driver', 'Count stepper steps'], answer: 0, hint: 'The computer sends the sketch over USB.' }
          ]
        },
        {
          id: 'q-esp-plus', name: 'ESP32 check', image: 'assets/svg/esp32-devkit.svg', blurb: 'From the Wi-Fi, voltage, and input-only lessons.',
          items: [
            { id: 'Q18', xp: 10, kind: 'mcq', title: 'Join a network', story: 'The call was WiFi.begin.', q: 'WiFi.begin is for…', choices: ['The ESP32', 'A 220 ohm resistor', 'A stepper step'], answer: 0, hint: 'Wi-Fi is built into the ESP32, not the Uno.' },
            { id: 'Q19', xp: 10, kind: 'mcq', title: 'Input only', story: 'Four GPIO numbers cannot drive an LED.', q: 'Which pin cannot digitalWrite?', choices: ['GPIO34', 'GPIO2', 'GPIO13 on the Uno'], answer: 0, hint: '34, 35, 36, and 39 only listen.' },
            { id: 'Q20', xp: 10, kind: 'mcq', title: 'Enable pin', story: 'Same idea as reset.', q: 'EN pulled to GND will…', choices: ['Stop or restart the ESP32', 'Set a servo to 180', 'Raise the LED current'], answer: 0, hint: 'EN low holds the chip off.' },
            { id: 'Q21', xp: 10, kind: 'mcq', title: 'Second radio', story: 'Not only Wi-Fi.', q: 'The ESP32 also includes…', choices: ['Bluetooth', 'A gearbox', '54 digital pins'], answer: 0, hint: 'Bluetooth is on the ESP32 chip. 54 pins is the Mega.' }
          ]
        },
        {
          id: 'q-family', name: 'Board family check', image: 'assets/svg/board-family.svg', blurb: 'Uno, Nano, Mega, Leonardo.',
          items: [
            { id: 'Q22', xp: 10, kind: 'mcq', title: 'Small board', story: 'Same chip family as the Uno, less width.', q: 'Which board plugs into a breadboard easily?', choices: ['Nano', 'Mega', 'A motor driver'], answer: 0, hint: 'Nano is the narrow one.' },
            { id: 'Q23', xp: 10, kind: 'mcq', title: 'Many pins', story: '54 digital, 16 analog.', q: 'Those counts belong to the…', choices: ['Mega', 'Uno', 'Leonardo keyboard'], answer: 0, hint: 'Mega 2560 has the long headers.' },
            { id: 'Q24', xp: 10, kind: 'mcq', title: 'USB keyboard', story: 'ATmega32U4 speaks USB itself.', q: 'A Leonardo can pretend to be…', choices: ['A keyboard', 'A 12V battery', 'A female jumper'], answer: 0, hint: 'Native USB is the Leonardo specialty.' }
          ]
        },
        {
          id: 'q-robot', name: 'Robot parts check', image: 'assets/svg/robot-parts.svg', blurb: 'Brain, driver, senses, battery.',
          items: [
            { id: 'Q25', xp: 10, kind: 'mcq', title: 'Between pin and motor', story: 'The pin only whispers.', q: 'What feeds current to a DC motor?', choices: ['A motor driver', 'A comment', 'digitalRead'], answer: 0, hint: 'Driver in the middle. Pin on one side, motor on the other.' },
            { id: 'Q26', xp: 10, kind: 'mcq', title: 'Power for wheels', story: 'USB is enough for an LED.', q: 'A rolling robot usually adds…', choices: ['A battery', 'A second reset button', 'map()'], answer: 0, hint: 'Motors want more power than USB likes to give.' }
          ]
        },
        {
          id: 'q-motors', name: 'Motor check', image: 'assets/svg/motor-types.svg', blurb: 'Spin, hold, or count steps.',
          items: [
            { id: 'Q27', xp: 10, kind: 'mcq', title: 'Wheels', story: 'Continuous turn.', q: 'Robot wheels are usually…', choices: ['DC motors', 'Steppers that must hold 90', 'Resistors'], answer: 0, hint: 'DC spins the whole time. A servo holds an angle.' },
            { id: 'Q28', xp: 10, kind: 'mcq', title: 'Exact position', story: '200 steps can be one full circle.', q: 'Counted steps belong to a…', choices: ['Stepper', 'Plain DC motor', 'Jumper wire'], answer: 0, hint: 'The stepper moves one step at a time.' },
            { id: 'Q29', xp: 10, kind: 'mcq', title: 'Hold still', story: 'write(90).', q: 'A servo is the motor that…', choices: ['Holds an angle', 'Only spins freely', 'Measures ohms'], answer: 0, hint: 'You send an angle. It stays there.' }
          ]
        },
        {
          id: 'q-fn', name: 'Function check', image: 'assets/svg/sketch-card.svg', blurb: 'The lines from the function lessons.',
          items: [
            { id: 'Q30', xp: 10, kind: 'mcq', title: 'Frozen loop', story: 'Nothing else runs until the wait ends.', q: 'Which call freezes the sketch?', choices: ['delay', 'millis', 'pinMode'], answer: 0, hint: 'delay pauses everything. millis only reads the clock.' },
            { id: 'Q31', xp: 10, kind: 'mcq', title: 'Clock that keeps going', story: 'You can blink and still read a button.', q: 'Which call lets loop keep working?', choices: ['millis', 'delay', 'female-female'], answer: 0, hint: 'millis returns the time. It does not stop the sketch.' },
            { id: 'Q32', xp: 10, kind: 'mcq', title: 'Range change', story: '0–1023 becomes 0–255.', q: 'Which function squeezes a range?', choices: ['map', 'WiFi.begin', 'step'], answer: 0, hint: 'map(knob, 0, 1023, 0, 255) is the squeeze.' },
            { id: 'Q33', xp: 10, kind: 'mcq', title: 'Two levels only', story: 'Not the knob range.', q: 'digitalRead gives…', choices: ['HIGH or LOW', '0 to 1023', 'An ohm value'], answer: 0, hint: 'Digital is on or off. analogRead has the wide range.' }
          ]
        },
        {
          id: 'q-wires', name: 'Jumper check', image: 'assets/svg/jumper-wires.svg?v=2', blurb: 'Which end is a pin, which end is a socket.',
          items: [
            { id: 'Q34', xp: 10, kind: 'mcq', title: 'Uno to breadboard', story: 'Both holes want a pin.', q: 'The usual lab wire is…', choices: ['Male–male', 'Female–female', 'A servo horn'], answer: 0, hint: 'Male–male: header to breadboard.' },
            { id: 'Q35', xp: 10, kind: 'mcq', title: 'Over a module pin', story: 'The module pin sticks up.', q: 'That pin wants a…', choices: ['Female socket', 'Second male pin pressed beside it', 'PWM number'], answer: 0, hint: 'Female end covers a male pin.' }
          ]
        },
        {
          id: 'q-ohm', name: 'Resistor check', image: 'assets/svg/ohm-law.svg?v=2', blurb: 'The same sum as the lesson, asked again.',
          items: [
            { id: 'Q36', xp: 10, kind: 'mcq', title: 'The formula', story: 'Resistance equals voltage divided by current.', q: 'Ohm’s law for R is…', choices: ['V / I', 'I × pins', 'delay / 2'], answer: 0, hint: 'R = V / I.' },
            { id: 'Q37', xp: 10, kind: 'mcq', title: 'Leftover volts', story: '5V supply, LED uses about 2V, target 0.02A.', q: '(5 − 2) / 0.02 equals…', choices: ['150', '220', '1023'], answer: 0, hint: '3 / 0.02 = 150. 220 is the gentler kit part, not this exact result.' },
            { id: 'Q38', xp: 10, kind: 'mcq', title: 'Why 220', story: 'Kits ship this value often.', q: '220 ohms instead of 150…', choices: ['Reduces the current a little', 'Removes the LED', 'Is smaller than 150'], answer: 0, hint: 'More ohms, less current. The LED stays safe.' },
            { id: 'Q39', xp: 10, kind: 'mcq', title: 'Same path', story: 'Current through the resistor must be the LED current.', q: 'The resistor is wired…', choices: ['In series with the LED', 'In place of the chip', 'Only across EN'], answer: 0, hint: 'Series means one path through both parts.' }
          ]
        },
        {
          id: 'q-relay', name: 'Relay check', image: 'assets/svg/relay-contacts.svg', blurb: 'Coil, contacts, and which side gets the lamp.',
          items: [
            { id: 'Q40', xp: 10, kind: 'mcq', title: 'Normally open', story: 'From the relay lesson.', q: 'NO is closed when…', choices: ['The relay is on', 'The board is unplugged', 'You press Verify'], answer: 0, hint: 'Normally open until the coil is on.' },
            { id: 'Q41', xp: 10, kind: 'mcq', title: 'Lamp side', story: 'IN is not the lamp.', q: 'The lamp uses…', choices: ['COM and NO', 'Only the USB helper chip', 'Flash memory'], answer: 0, hint: 'Contacts carry the load. IN listens to the pin.' },
            { id: 'Q42', xp: 10, kind: 'mcq', image: 'assets/svg/relay.svg', title: 'This lab', story: 'The example writes the pin high.', q: 'digitalWrite(relayPin, HIGH) in this lab…', choices: ['Turns the coil on', 'Opens the COM port', 'Erases flash'], answer: 0, hint: 'HIGH is on for the lab relay.' }
          ]
        },
        {
          id: 'q-mcu', name: 'Microcontroller check', image: 'assets/svg/microcontroller.svg', blurb: 'Chip, flash, clock, GPIO.',
          items: [
            { id: 'Q43', xp: 10, kind: 'mcq', title: 'Who runs the sketch', story: 'The green board is the carrier.', q: 'The Uno microcontroller is the…', choices: ['ATmega328P', 'COM port', 'NO contact'], answer: 0, hint: '328P is the chip. The board surrounds it.' },
            { id: 'Q44', xp: 10, kind: 'mcq', title: 'What survives unplug', story: 'RAM does not.', q: 'The sketch stays in…', choices: ['Flash', 'RAM', 'The serial monitor'], answer: 0, hint: 'Flash keeps it. RAM clears on reset.' },
            { id: 'Q45', xp: 10, kind: 'mcq', title: 'Heartbeat', story: 'Not the baud rate.', q: 'The Uno clock is…', choices: ['16 MHz', '9600', '220 ohms'], answer: 0, hint: '16 MHz is the clock. 9600 is serial speed.' }
          ]
        },
        {
          id: 'q-ide', name: 'IDE check', image: 'assets/svg/arduino-ide.svg', blurb: 'Verify, upload, board, and the monitor speed.',
          items: [
            { id: 'Q46', xp: 10, kind: 'mcq', title: 'File type', story: 'The program name in the IDE.', q: 'A sketch file ends in…', choices: ['.ino', '.svg', '.com'], answer: 0, hint: '.ino is the Arduino sketch.' },
            { id: 'Q47', xp: 10, kind: 'mcq', title: 'Check without sending', story: 'No board required.', q: 'Which button only compiles?', choices: ['Verify', 'Upload', 'Port'], answer: 0, hint: 'Verify checks. Upload sends.' },
            { id: 'Q48', xp: 10, kind: 'mcq', title: 'Matching speed', story: 'Serial.begin(9600).', q: 'The serial monitor should be set to…', choices: ['9600', '16 MHz', 'NO'], answer: 0, hint: 'Same number as Serial.begin.' }
          ]
        },
        {
          id: 'q-port', name: 'Port check', image: 'assets/svg/com-port.svg', blurb: 'COM names, upload, and the USB helper.',
          items: [
            { id: 'Q49', xp: 10, kind: 'mcq', title: 'Windows name', story: 'A number after three letters.', q: 'A Windows port looks like…', choices: ['COM4', 'GPIO4', 'NC4'], answer: 0, hint: 'COM plus a number.' },
            { id: 'Q50', xp: 10, kind: 'mcq', title: 'Failed send', story: 'The sketch can still be correct.', q: 'Upload often fails because…', choices: ['The selected port is wrong', 'Flash is called RAM', 'NO means normally open'], answer: 0, hint: 'Pick the port that appears when the cable is plugged in.' },
            { id: 'Q51', xp: 10, kind: 'mcq', title: 'Who speaks USB', story: 'Not the 328P on a classic Uno.', q: 'The COM port is created by…', choices: ['The USB helper chip', 'The relay NC contact', 'map()'], answer: 0, hint: '16U2 or CH340. The main chip runs the sketch.' }
          ]
        }
      ]
    },
    exercises: {
      module: 'learning/exercises',
      title: 'Exercises',
      categories: [
        {
          id: 'e-blink', name: 'Blink lines', image: 'assets/svg/led-red.svg', blurb: 'Direction, on, and a short wait.',
          items: [
            { id: 'E1', xp: 15, kind: 'drag', title: 'Prepare the pin', story: 'Drag a word into the blank. You can also click a chip.', before: 'pinMode(13, ', after: ');', answer: 'OUTPUT', chips: ['OUTPUT', 'INPUT', 'HIGH'] },
            { id: 'E2', xp: 15, kind: 'drag', title: 'Turn the lamp on', story: 'The pin is ready. Now switch it on.', before: 'digitalWrite(13, ', after: ');', answer: 'HIGH', chips: ['LOW', 'HIGH', 'GND'] },
            { id: 'E3', xp: 15, kind: 'drag', title: 'Wait half a second', story: 'Give the eye time to see the light.', before: 'delay(', after: ');', answer: '500', chips: ['500', 'setup', 'A0'] }
          ]
        },
        {
          id: 'e-listen', name: 'Listen', image: 'assets/svg/button.svg', blurb: 'A button and a knob.',
          items: [
            { id: 'E4', xp: 15, kind: 'drag', title: 'A pin that listens', story: 'A button is not an output.', before: 'pinMode(2, ', after: ');', answer: 'INPUT', chips: ['INPUT', 'OUTPUT', 'HIGH'] },
            { id: 'E5', xp: 15, kind: 'drag', image: 'assets/svg/button.svg', title: 'Ask the button', story: 'Drop the call that hears pin 2.', before: 'int pressed = ', after: '(2);', answer: 'digitalRead', chips: ['digitalRead', 'digitalWrite', 'delay'] },
            { id: 'E6', xp: 15, kind: 'drag', image: 'assets/svg/pot.svg', title: 'Read the knob', story: 'The middle leg of the knob is on A0.', before: 'int val = ', after: '(A0);', answer: 'analogRead', chips: ['analogRead', 'digitalWrite', 'tone'] }
          ]
        },
        {
          id: 'e-speak', name: 'Fade, beep, point', image: 'assets/svg/buzzer.svg', blurb: 'Brightness, a note, a horn, and the monitor.',
          items: [
            { id: 'E7', xp: 15, kind: 'drag', image: 'assets/svg/led-blue.svg', title: 'Half brightness', story: '128 sits between off and full on.', before: '', after: '(9, 128);', answer: 'analogWrite', chips: ['analogWrite', 'digitalRead', 'delay'] },
            { id: 'E8', xp: 15, kind: 'drag', image: 'assets/svg/buzzer.svg', title: 'Play a pitch', story: 'Pin 8, note 440.', before: '', after: '(8, 440);', answer: 'tone', chips: ['tone', 'noTone', 'analogRead'] },
            { id: 'E9', xp: 15, kind: 'drag', image: 'assets/svg/servo.svg', title: 'Aim the middle', story: '90 is halfway.', before: 'myServo.', after: '(90);', answer: 'write', chips: ['write', 'read', 'begin'] },
            { id: 'E10', xp: 15, kind: 'drag', image: 'assets/svg/lcd.svg', title: 'Open the monitor', story: 'Drop the speed.', before: 'Serial.begin(', after: ');', answer: '9600', chips: ['9600', 'HIGH', 'loop'] }
          ]
        },
        {
          id: 'e-fn', name: 'Function blanks', image: 'assets/svg/sketch-card.svg', blurb: 'Drop the call that matches the comment.',
          items: [
            { id: 'E11', xp: 15, kind: 'drag', title: 'Direction', story: 'Once, in setup.', before: '', after: '(13, OUTPUT);', answer: 'pinMode', chips: ['pinMode', 'digitalRead', 'map'] },
            { id: 'E12', xp: 15, kind: 'drag', title: 'Clock without stopping', story: 'Read the time. Do not freeze loop.', before: 'unsigned long t = ', after: '();', answer: 'millis', chips: ['millis', 'delay', 'step'] },
            { id: 'E13', xp: 15, kind: 'drag', title: 'Knob to brightness', story: 'Squeeze 0–1023 into 0–255.', before: 'int bright = ', after: '(knob, 0, 1023, 0, 255);', answer: 'map', chips: ['map', 'tone', 'WiFi'] }
          ]
        },
        {
          id: 'e-ohm', name: 'Resistor blanks', image: 'assets/svg/ohm-law.svg?v=2', blurb: 'The calculated value, then the kit value.',
          items: [
            { id: 'E14', xp: 15, kind: 'drag', title: 'The exact sum', story: '5 volts, about 2 volts on the LED, 0.02 amps.', before: '(5 - 2) / 0.02 = ', after: '', answer: '150', chips: ['150', '220', '54'] },
            { id: 'E15', xp: 15, kind: 'drag', title: 'The kit value', story: 'A little more resistance, a little less current.', before: 'kit resistor: ', after: ' ohm', answer: '220', chips: ['220', '150', '1023'] }
          ]
        },
        {
          id: 'e-wire', name: 'Wire blanks', image: 'assets/svg/jumper-wires.svg?v=2', blurb: 'Name the wire from the job.',
          items: [
            { id: 'E16', xp: 15, kind: 'drag', title: 'Header to breadboard', story: 'Both ends are pins.', before: '', after: ' wire', answer: 'male-male', chips: ['male-male', 'female-female', 'PWM'] },
            { id: 'E17', xp: 15, kind: 'drag', image: 'assets/svg/motor-types.svg', title: 'Counted move', story: 'Drop the motor that takes step().', before: '', after: '.step(200);', answer: 'stepper', chips: ['stepper', 'servo', 'LED'] }
          ]
        },
        {
          id: 'e-ide', name: 'IDE and port blanks', image: 'assets/svg/arduino-ide.svg', blurb: 'Drop the button, the memory, or the port name.',
          items: [
            { id: 'E18', xp: 15, kind: 'drag', title: 'Send the sketch', story: 'This IDE action uses the selected port.', before: '', after: ' to the board', answer: 'Upload', chips: ['Upload', 'Verify', 'NO'] },
            { id: 'E19', xp: 15, kind: 'drag', image: 'assets/svg/microcontroller.svg', title: 'Keeps the sketch', story: 'Still there after you unplug.', before: 'stored in ', after: '', answer: 'Flash', chips: ['Flash', 'RAM', 'COM'] },
            { id: 'E20', xp: 15, kind: 'drag', image: 'assets/svg/com-port.svg', title: 'Windows door', story: 'The name before the number.', before: '', after: '4', answer: 'COM', chips: ['COM', 'GPIO', 'MHz'] },
            { id: 'E21', xp: 15, kind: 'drag', image: 'assets/svg/relay-contacts.svg', title: 'Closes when on', story: 'The contact that waits until the coil is on.', before: 'COM-', after: '', answer: 'NO', chips: ['NO', 'NC', 'USB'] }
          ]
        }
      ]
    },
    challenges: {
      module: 'learning/challenges',
      title: 'Challenges',
      categories: [
        {
          id: 'c-blink', name: 'Blink boss', image: 'assets/svg/led-red.svg', blurb: 'The first song: on, wait, off, wait.',
          items: [
            { id: 'C1', xp: 10, kind: 'mcq', title: 'Where does pinMode live?', story: 'Boss level. Still short.', q: 'pinMode belongs in…', choices: ['setup()', 'loop() only', 'the serial monitor'], answer: 0, hint: 'Set the pin direction once, in setup().' },
            { id: 'C2', xp: 10, kind: 'drag', title: 'Name the first function', story: 'Drop the function name.', before: 'void ', after: '() {\n  pinMode(13, OUTPUT);\n}', answer: 'setup', chips: ['setup', 'loop', 'delay'] },
            { id: 'C3', xp: 10, kind: 'drag', title: 'Pause the blink', story: 'The lamp is on. Wait, then it can turn off.', before: 'digitalWrite(13, HIGH);\n', after: '(500);', answer: 'delay', chips: ['delay', 'analogRead', 'GND'] },
            { id: 'C4', xp: 10, kind: 'mcq', title: 'You built a blink', story: 'Last tap of this set.', q: 'A blink sketch turns the LED on, waits, then…', choices: ['turns it off and waits again', 'deletes the pin', 'reads humidity'], answer: 0, hint: 'On, wait, off, wait. That is the whole song.' }
          ]
        },
        {
          id: 'c-button', name: 'Button lamp', image: 'assets/svg/button.svg', blurb: 'Press, and the lamp answers.',
          items: [
            { id: 'C5', xp: 10, kind: 'mcq', title: 'The button pin', story: 'The lamp pin talks. The button pin listens.', q: 'pinMode for a button is…', choices: ['INPUT', 'OUTPUT', 'HIGH'], answer: 0, hint: 'INPUT listens. OUTPUT talks.' },
            { id: 'C6', xp: 10, kind: 'drag', title: 'Hear the press', story: 'Drop the call.', before: 'int pressed = ', after: '(2);', answer: 'digitalRead', chips: ['digitalRead', 'digitalWrite', 'delay'] },
            { id: 'C7', xp: 10, kind: 'mcq', title: 'Pressed means on', story: 'The if gate is open.', q: 'Inside if (pressed), the lamp should be…', choices: ['HIGH', 'a comment', 'VIN'], answer: 0, hint: 'HIGH turns the lamp on while the button is down.' },
            { id: 'C8', xp: 10, kind: 'drag', title: 'Let go, lamp off', story: 'The other branch.', before: 'digitalWrite(13, ', after: ');', answer: 'LOW', chips: ['LOW', 'HIGH', 'A0'] }
          ]
        },
        {
          id: 'c-night', name: 'Night light', image: 'assets/svg/ldr.svg', blurb: 'Dark room, lamp on.',
          items: [
            { id: 'C9', xp: 10, kind: 'mcq', title: 'When it gets dark', story: 'The LDR watches the room.', q: 'A night light turns the lamp on when…', choices: ['The room is dark', 'The servo is at 90', 'Serial is closed'], answer: 0, hint: 'Dark is the cue. The LDR is the eye.' },
            { id: 'C10', xp: 10, kind: 'drag', title: 'Read the light', story: 'The sensor sits on A0.', before: 'int light = ', after: '(A0);', answer: 'analogRead', chips: ['analogRead', 'digitalWrite', 'tone'] },
            { id: 'C11', xp: 10, kind: 'mcq', image: 'assets/svg/relay.svg', title: 'The lamp is bigger', story: 'A pin can ask a relay to switch the lamp.', q: 'A relay lets the pin…', choices: ['Switch a bigger load', 'Measure humidity', 'Skip setup'], answer: 0, hint: 'The relay is the switch between the pin and the lamp.' },
            { id: 'C12', xp: 10, kind: 'drag', image: 'assets/svg/bulb.svg', title: 'The return path', story: 'The lamp still needs a way home.', before: 'lamp return → ', after: '', answer: 'GND', chips: ['GND', '5V', 'SDA'] }
          ]
        },
        {
          id: 'c-robot', name: 'Robot scan', image: 'assets/svg/hcsr04.svg', blurb: 'Look, measure, and do not bump.',
          items: [
            { id: 'C13', xp: 10, kind: 'mcq', title: 'Too close', story: 'Centimeters get small.', q: 'When the distance is small, the robot should…', choices: ['Stop', 'Ignore the number', 'Open serial only'], answer: 0, hint: 'Close means stop, before the bump.' },
            { id: 'C14', xp: 10, kind: 'drag', title: 'The ear', story: 'TRIG sends. Drop the pin that listens.', before: 'TRIG sends, ', after: ' listens', answer: 'ECHO', chips: ['ECHO', 'SDA', 'VIN'] },
            { id: 'C15', xp: 10, kind: 'mcq', image: 'assets/svg/servo.svg', title: 'Who aims', story: 'The sensor needs to look left and right.', q: 'What turns the sensor in a scan?', choices: ['A servo', 'A resistor', 'A comment'], answer: 0, hint: 'The servo points. The sensor measures.' },
            { id: 'C16', xp: 10, kind: 'drag', image: 'assets/svg/led-green.svg', title: 'A short pause', story: 'Give the reading a moment.', before: '', after: '(200);', answer: 'delay', chips: ['delay', 'tone', 'GND'] }
          ]
        },
        {
          id: 'c-ohm', name: 'Resistor boss', image: 'assets/svg/ohm-law.svg?v=2', blurb: 'Use the lesson sum. No new formula.',
          items: [
            { id: 'C17', xp: 10, kind: 'mcq', title: 'Volts left for the resistor', story: 'Supply 5. LED uses about 2.', q: 'The resistor sees…', choices: ['3 volts', '5 plus 2 volts', '1023 volts'], answer: 0, hint: '5 − 2 = 3.' },
            { id: 'C18', xp: 10, kind: 'drag', title: 'Divide', story: '3 volts, 0.02 amps.', before: '3 / 0.02 = ', after: '', answer: '150', chips: ['150', '220', '14'] },
            { id: 'C19', xp: 10, kind: 'mcq', title: 'Series', story: 'Same current in both parts.', q: 'The safe LED path is…', choices: ['5V, resistor, LED, GND', 'LED with no resistor', 'Resistor across the USB plug only'], answer: 0, hint: 'One line: source, resistor, LED, ground.' },
            { id: 'C20', xp: 10, kind: 'mcq', title: 'Gentler', story: 'The kit part is a bit above the calculated value.', q: '220 instead of 150 makes the LED…', choices: ['A little less bright and safer', 'Need no ground', 'Draw more current'], answer: 0, hint: 'Higher ohms, lower current.' }
          ]
        },
        {
          id: 'c-esp', name: 'ESP32 boss', image: 'assets/svg/esp32-devkit.svg', blurb: 'Radios, voltage, and the pins that only listen.',
          items: [
            { id: 'C21', xp: 10, kind: 'mcq', title: 'Two radios', story: 'One chip.', q: 'ESP32 includes…', choices: ['Wi-Fi and Bluetooth', 'Only a servo horn', '54 analog pins'], answer: 0, hint: 'Both radios are on the ESP32.' },
            { id: 'C22', xp: 10, kind: 'drag', title: 'Lamp pin', story: 'The built-in LED in this lab.', before: 'GPIO', after: '', answer: '2', chips: ['2', '13', '34'] },
            { id: 'C23', xp: 10, kind: 'mcq', title: 'Do not drive this pin', story: 'analogRead is fine. digitalWrite is not.', q: 'GPIO34 is…', choices: ['Input only', 'The 5V pin', 'A PWM tilde pin on the Uno'], answer: 0, hint: '34, 35, 36, and 39 cannot be outputs.' },
            { id: 'C24', xp: 10, kind: 'mcq', title: 'Logic level', story: 'A Uno HIGH is too tall.', q: 'ESP32 pins want…', choices: ['3.3 volts', '12 volts', 'The Mega pin count'], answer: 0, hint: '3.3V logic. Do not feed them 5V.' }
          ]
        },
        {
          id: 'c-motor', name: 'Motor boss', image: 'assets/svg/motor-types.svg', blurb: 'Pick the motor, then the part that feeds it.',
          items: [
            { id: 'C25', xp: 10, kind: 'mcq', title: 'Hold 90', story: 'Not a free spin.', q: 'Which motor holds an angle?', choices: ['Servo', 'Plain DC motor', 'Jumper wire'], answer: 0, hint: 'write(90) is the servo.' },
            { id: 'C26', xp: 10, kind: 'drag', title: 'Speed call', story: 'PWM on a DC motor.', before: '', after: '(9, speed);', answer: 'analogWrite', chips: ['analogWrite', 'millis', 'map'] },
            { id: 'C27', xp: 10, kind: 'mcq', title: 'The middle block', story: 'A pin cannot feed the motor current.', q: 'pin → ? → motor', choices: ['driver', 'comment', 'female-female wire only'], answer: 0, hint: 'The driver takes the small signal and sends the big current.' },
            { id: 'C28', xp: 10, kind: 'mcq', title: 'Full circle of steps', story: '1.8 degrees each step.', q: '200 steps is one turn of a common…', choices: ['Stepper', 'Uno reset button', '220 ohm resistor'], answer: 0, hint: '200 × 1.8 degrees = 360 degrees.' }
          ]
        },
        {
          id: 'c-ide', name: 'IDE and relay boss', image: 'assets/svg/arduino-ide.svg', blurb: 'Board, port, memory, and the relay contact.',
          items: [
            { id: 'C29', xp: 10, kind: 'mcq', title: 'Before upload', story: 'Two menu checks.', q: 'Before Upload you set…', choices: ['Board and Port', 'Only the LED color', 'NC and flash speed'], answer: 0, hint: 'Tools, Board and Tools, Port.' },
            { id: 'C30', xp: 10, kind: 'drag', image: 'assets/svg/com-port.svg', title: 'The port letters', story: 'Windows shows this before the number.', before: '', after: '3', answer: 'COM', chips: ['COM', 'RAM', 'NO'] },
            { id: 'C31', xp: 10, kind: 'mcq', image: 'assets/svg/microcontroller.svg', title: 'After power off', story: 'One memory keeps the program.', q: 'Unplugging the board clears…', choices: ['RAM, not flash', 'Flash, not the chip', 'The COM name forever'], answer: 0, hint: 'RAM is scratch space. Flash still holds the sketch.' },
            { id: 'C32', xp: 10, kind: 'mcq', image: 'assets/svg/relay-contacts.svg', title: 'Which contact', story: 'The lamp should be off until the coil is on.', q: 'Wire the lamp through…', choices: ['COM and NO', 'IN and GND only', 'The serial monitor'], answer: 0, hint: 'NO closes when the relay turns on.' }
          ]
        }
      ]
    }
  };

  (function regroupLessons() {
    const byId = {};
    tracks.lessons.categories.forEach(function (cat) {
      cat.items.forEach(function (item) { byId[item.id] = item; });
    });
    function pick(ids) {
      return ids.map(function (id) {
        const item = byId[id];
        if (!item) throw new Error('Missing lesson ' + id);
        delete byId[id];
        return item;
      });
    }
    function concept(id, story) {
      return { id: 'Cpt-' + id, xp: 5, kind: 'concept', title: 'Concept', story: story };
    }
    function predict(id, spec) {
      return {
        id: 'Pred-' + id, xp: 15, kind: 'predict', title: 'Code prediction',
        lab: spec.lab, code: spec.code, q: spec.q, choices: spec.choices, answer: spec.answer, hint: spec.hint
      };
    }
    function sim(id, spec) {
      return {
        id: 'Sim-' + id, xp: 25, kind: 'sim', title: 'Simulator challenge',
        lab: spec.lab, story: spec.story, task: spec.task, code: spec.code || '',
        q: spec.q, choices: spec.choices, answer: spec.answer, hint: spec.hint
      };
    }
    const blinkLab = 'arduino_simulator_v7.html?example=blink';
    const topics = [
      { level: 'foundations', id: 'meet', name: 'Meet Arduino', image: 'assets/svg/arduino-uno.svg', blurb: 'The board, the onboard lamp, and your first successful run.', project: { href: blinkLab, label: 'LED Blink' }, items: [concept('meet', 'An Arduino is a small board that runs one program, called a sketch. The Uno’s onboard LED is pin 13, so you can light it before you wire anything else.'), pick(['L1']), predict('meet', { lab: blinkLab, code: 'digitalWrite(13, HIGH);', q: 'Before any extra LED is wired, what lights?', choices: ['The Uno onboard LED', 'The ESP32 lamp on GPIO2', 'A servo horn', 'The serial monitor'], answer: 0, hint: 'Pin 13 is the Uno onboard LED.' }), sim('meet', { lab: blinkLab, story: 'The blink example uses that same onboard lamp.', task: 'Run the blink example and watch pin 13.', q: 'The Uno onboard LED is on pin…', choices: ['13', 'A0', 'GPIO2'], answer: 0, hint: 'Pin 13 on the Uno. GPIO2 on the ESP32.' })] },
      { level: 'foundations', id: 'ide', name: 'Arduino IDE', image: 'assets/svg/arduino-ide.svg', blurb: 'Write the sketch, verify it, then upload it to the board you selected.', items: [concept('ide', 'The Arduino IDE is where the sketch lives. Verify compiles it. Upload sends it. Tools, Board must match the board on the desk.'), pick(['L95', 'L96', 'L97', 'L98', 'L99']), predict('ide', { lab: blinkLab, code: 'void setup() {\n  pinMode(13, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n}', q: 'After this sketch runs, the LED will…', choices: ['Stay on', 'Blink', 'Stay an input', 'Print COM3'], answer: 0, hint: 'setup prepares the pin. loop writes HIGH and never turns it off.' }), sim('ide', { lab: blinkLab, story: 'In this lab, Run stands in for Upload. The sketch is already written.', task: 'Run the blink example. That is this lab’s upload.', q: 'Verify, then Upload. In this lab the second step is…', choices: ['Run', 'A resistor value', 'The reset button only'], answer: 0, hint: 'Run sends the example sketch, the way Upload sends yours.' })] },
      { level: 'foundations', id: 'port', name: 'Port', image: 'assets/svg/com-port.svg', blurb: 'The door the computer uses to reach one board.', items: [concept('port', 'The port is the connection to one board. On Windows it looks like COM3. Upload and the serial monitor both use that same door.'), pick(['L100', 'L101', 'L102', 'L103', 'L104', 'L105']), predict('port', { lab: 'arduino_simulator_v7.html?example=serial', code: 'Serial.begin(9600);\nSerial.println("hi");', q: 'The monitor is also set to 9600. You will see…', choices: ['The word hi', 'Nothing, because the port is closed', 'A servo angle', 'Pin 13 fade'], answer: 0, hint: 'Matching speeds let the line through.' }), sim('port', { lab: 'arduino_simulator_v7.html?example=serial', story: 'Upload and the serial monitor share one door.', task: 'Run the serial example and open the monitor.', q: 'On Windows that door often looks like…', choices: ['COM3', 'GPIO2', '220 ohm'], answer: 0, hint: 'COM and a number. The number can change.' })] },
      { level: 'foundations', id: 'board', name: 'Board Basics', image: 'assets/svg/arduino-uno.svg', blurb: 'setup runs once, loop repeats, and every circuit needs ground.', items: [concept('board', 'A sketch has two rooms. setup() runs once at the start. loop() repeats. GND is 0 volts, the return path every part shares.'), pick(['L2', 'L6']), predict('board', { lab: blinkLab, code: 'void setup() {\n  pinMode(13, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(1000);\n  digitalWrite(13, LOW);\n  delay(1000);\n}', q: 'setup() runs, then loop() runs. The LED will…', choices: ['Blink, over and over', 'Light once and stop', 'Stay an input', 'Ask for a port'], answer: 0, hint: 'setup runs once. loop repeats the on and off.' }), sim('board', { lab: blinkLab, story: 'Every circuit in the blink example shares ground.', task: 'Run the blink example.', q: 'Which function repeats for as long as the board has power?', choices: ['loop()', 'setup()', 'The USB name'], answer: 0, hint: 'setup is once. loop is forever.' })] },
      { level: 'foundations', id: 'pins', name: 'Pins & Power', image: 'assets/svg/arduino-uno.svg', blurb: 'Fade pins, and why the Uno and the ESP32 do not share a voltage.', items: [concept('pins', 'Some pins only go HIGH or LOW. Pins marked ~ can fade. The Uno’s power pin is 5V. The ESP32’s pins are 3.3V.'), pick(['L8', 'L9']), predict('pins', { lab: 'arduino_simulator_v7.html?example=fade', code: 'analogWrite(9, 10);\ndelay(300);\nanalogWrite(9, 250);', q: 'The LED on pin 9 will…', choices: ['Start dim, then become bright', 'Stay fully off', 'Read a button', 'Join Wi-Fi'], answer: 0, hint: '10 is a dim PWM value. 250 is nearly full.' }), sim('pins', { lab: 'arduino_simulator_v7.html?example=fade', story: 'Pin 9 is marked ~, so it can fade.', task: 'Run the fade example and watch the brightness change.', q: 'The Uno power pin the LED circuit uses is…', choices: ['5V, with GND as the return', '3.3V on every pin', 'Only VIN'], answer: 0, hint: 'Uno pins are 5V logic. ESP32 pins are 3.3V.' })] },
      { level: 'foundations', id: 'digital', name: 'Digital Output', image: 'assets/svg/led-red.svg', blurb: 'HIGH is on. LOW is off. delay waits in milliseconds.', project: { href: blinkLab, label: 'LED Blink' }, items: [concept('digital', 'digitalWrite sets a pin fully on or fully off. HIGH is on. LOW is off. delay(1000) waits one second.'), pick(['L3']), predict('digital', { lab: blinkLab, code: 'digitalWrite(13, HIGH);\ndelay(500);\ndigitalWrite(13, LOW);', q: 'What happens to the LED?', choices: ['It stays on', 'It turns on, waits half a second, then turns off', 'It fades', 'It reads a button'], answer: 1, hint: 'HIGH turns it on. delay(500) waits half a second. LOW turns it off.' }), sim('digital', { lab: blinkLab, story: 'In the simulator, pin 13 can drive the onboard LED.', task: 'Run the blink example and watch the lamp.', q: 'delay(500) waits…', choices: ['Half a second', '500 seconds', 'Until you press reset'], answer: 0, hint: '1000 milliseconds is one second.' })] },
      { level: 'foundations', id: 'leds', name: 'Your First LED', image: 'assets/svg/led-red.svg', blurb: 'Polarity, a resistor, then a blink you change yourself.', project: { href: 'arduino_simulator_v7.html?example=traffic', label: 'Traffic Light' }, items: [concept('leds', 'An LED has a long leg (anode) and a short leg (cathode). The anode faces the Arduino pin through a resistor. The cathode faces GND. A 220Ω resistor keeps the current gentle.'), pick(['L4', 'L10', 'L11']), predict('leds', { lab: blinkLab, code: 'digitalWrite(13, HIGH);\ndelay(1000);\ndigitalWrite(13, LOW);\ndelay(1000);', q: 'What will the LED do?', choices: ['Stay ON', 'Stay OFF', 'Blink once per second', 'Become brighter'], answer: 2, hint: 'On for one second, off for one second, then loop repeats.' }), sim('leds', { lab: blinkLab, story: 'Build the circuit and turn the LED ON.', code: 'int led = 13;\n\nvoid setup() {\n  pinMode(led, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(led, HIGH);\n}', task: 'Change the code so the LED blinks every second.', q: 'A one-second blink needs HIGH, a wait, LOW, and…', choices: ['another one-second wait', 'a Wi-Fi password', 'no loop()'], answer: 0, hint: 'On, wait, off, wait. delay(1000) is that wait.' })] },
      { level: 'programming', id: 'code', name: 'Arduino Code Basics', image: 'assets/svg/sketch-card.svg', blurb: 'Variables, numbers, comments, and operators.', items: [concept('code', 'int stores a whole number. A name like ledPin can stand in for 13. A line that starts with // is a note. The board skips it.'), pick(['L23', 'L25']), predict('code', { lab: blinkLab, code: 'int ledPin = 13;\n// this note is skipped\ndigitalWrite(ledPin, HIGH);', q: 'Which pin turns on?', choices: ['Pin 13', 'No pin, because of the comment', 'Pin A0', 'GPIO34'], answer: 0, hint: 'ledPin stores 13. The // line is only a note.' }), sim('code', { lab: blinkLab, story: 'The blink sketch already stores 13 in ledPin.', task: 'Run the blink example and find ledPin in the code.', q: 'A line that starts with // is…', choices: ['A note the board skips', 'A pin number', 'A wait of one second'], answer: 0, hint: 'Comments are for people. The board skips them.' })] },
      { level: 'programming', id: 'conditions', name: 'Conditions', image: 'assets/svg/sketch-card.svg', blurb: 'if, else, and comparisons.', items: [concept('conditions', 'if runs its block only when the test is true. else is the path when the test is false. Comparisons such as == and < decide which path runs.'), pick(['L24']), predict('conditions', { lab: 'arduino_simulator_v7.html?example=button', code: 'if (light > 500) digitalWrite(13, HIGH);\nelse digitalWrite(13, LOW);', q: 'light is 200. The LED will…', choices: ['Stay off', 'Turn on', 'Fade', 'Print 500'], answer: 0, hint: '200 is not greater than 500, so else runs.' }), sim('conditions', { lab: 'arduino_simulator_v7.html?example=button', story: 'The button example is an if: pressed takes one path, released takes the other.', task: 'Run the button example and hold the button, then let go.', q: 'else runs when…', choices: ['The if test is false', 'The if test is true', 'setup() is running'], answer: 0, hint: 'if is the true path. else is the other one.' })] },
      { level: 'programming', id: 'loops', name: 'Loops', image: 'assets/svg/sketch-card.svg', blurb: 'for and while repeat a block.', items: [concept('loops', 'loop() already repeats forever. for and while repeat a smaller block a counted number of times, or while a test stays true.'), pick(['L26']), predict('loops', { lab: 'arduino_simulator_v7.html?example=fade', code: 'for (int n = 0; n < 3; n++) {\n  digitalWrite(13, HIGH);\n  delay(200);\n  digitalWrite(13, LOW);\n  delay(200);\n}', q: 'How many blinks does this for loop make?', choices: ['3', '1', '255', 'Forever, with no end'], answer: 0, hint: 'n goes 0, 1, 2. That is three passes.' }), sim('loops', { lab: 'arduino_simulator_v7.html?example=fade', story: 'The fade example uses for to walk brightness from 0 to 255.', task: 'Run the fade example and watch one brightening pass.', q: 'loop() and for are different because…', choices: ['loop repeats forever; for can count', 'for replaces setup()', 'loop runs only once'], answer: 0, hint: 'loop is the forever room. for is a counted repeat inside it.' })] },
      { level: 'programming', id: 'functions', name: 'Arduino Functions', image: 'assets/svg/sketch-card.svg', blurb: 'pinMode, digitalWrite, digitalRead, analogRead, analogWrite, and delay.', items: [concept('functions', 'These are the calls you will use constantly: pinMode sets direction, digitalWrite and digitalRead are on or off, analogRead and analogWrite are a range, and delay waits.'), pick(['L65', 'L66', 'L67', 'L68', 'L69', 'L70', 'L71', 'L72']), predict('functions', { lab: blinkLab, code: 'pinMode(13, OUTPUT);\ndigitalWrite(13, HIGH);\ndelay(1000);', q: 'These three calls, in order, will…', choices: ['Make pin 13 an output, turn it on, then wait one second', 'Read a knob', 'Open Wi-Fi', 'Erase flash'], answer: 0, hint: 'pinMode sets direction. digitalWrite turns it on. delay waits.' }), sim('functions', { lab: blinkLab, story: 'Blink is pinMode, digitalWrite, and delay.', task: 'Run the blink example and find those three calls.', q: 'analogWrite is the call that…', choices: ['Sets a brightness, not only on or off', 'Opens the serial port', 'Names a COM port'], answer: 0, hint: 'digitalWrite is on or off. analogWrite is a range.' })] },
      { level: 'programming', id: 'serial', name: 'Serial Monitor', image: 'assets/svg/lcd.svg', blurb: 'Print numbers and read commands while the sketch runs.', project: { href: 'arduino_simulator_v7.html?example=serial', label: 'Serial Command' }, items: [concept('serial', 'Serial.begin(9600) opens the text window. Serial.println sends one line. The speed in the monitor must match the sketch.'), pick(['L20']), predict('serial', { lab: 'arduino_simulator_v7.html?example=serial', code: 'if (cmd == \'1\') digitalWrite(13, HIGH);\nelse if (cmd == \'0\') digitalWrite(13, LOW);', q: 'You send 1. The LED will…', choices: ['Turn on', 'Turn off', 'Print 9600', 'Fade'], answer: 0, hint: '1 takes the HIGH path. 0 takes the LOW path.' }), sim('serial', { lab: 'arduino_simulator_v7.html?example=serial', story: 'The serial example turns an LED on when you send 1.', task: 'Run it and send 1, then 0, from the serial monitor.', q: 'Which call opens the monitor?', choices: ['Serial.begin(9600)', 'delay(9600)', 'pinMode(9600)'], answer: 0, hint: 'begin opens it. println writes after that.' })] },
      { level: 'electronics', id: 'buttons', name: 'Buttons & Switches', image: 'assets/svg/button.svg', blurb: 'A push button springs back. A slide switch stays.', project: { href: 'arduino_simulator_v7.html?example=button', label: 'Button-controlled lamp' }, items: [concept('buttons', 'A button is an input. digitalRead asks if it is pressed. A push button lasts only while you hold it. A slide switch stays where you leave it.'), pick(['L5', 'L13']), predict('buttons', { lab: 'arduino_simulator_v7.html?example=button', code: 'if (digitalRead(2) == HIGH) digitalWrite(13, HIGH);\nelse digitalWrite(13, LOW);', q: 'You hold the button, so pin 2 reads HIGH. The LED will…', choices: ['Stay off', 'Turn on', 'Blink by itself', 'Read the knob'], answer: 1, hint: 'HIGH on the button opens the if path, and the LED is written HIGH.' }), sim('buttons', { lab: 'arduino_simulator_v7.html?example=button', story: 'Wire a button as an input and an LED as an output.', task: 'Run the button example and hold the button.', q: 'Which call hears the button?', choices: ['digitalRead', 'digitalWrite', 'delay'], answer: 0, hint: 'Read listens. Write talks.' })] },
      { level: 'electronics', id: 'pots', name: 'Potentiometers', image: 'assets/svg/pot.svg', blurb: 'A knob with three legs and a reading from 0 to 1023.', project: { href: 'arduino_simulator_v7.html?example=pot', label: 'Potentiometer LED' }, items: [concept('pots', 'One side of the knob goes to 5V, the middle to an analog pin, and the other side to GND. analogRead returns 0 to 1023.'), pick(['L12']), predict('pots', { lab: 'arduino_simulator_v7.html?example=pot', code: 'int val = analogRead(A0);\nanalogWrite(9, val / 4);', q: 'The knob is at the high end, near 1023. The LED will…', choices: ['Be fully bright', 'Stay off', 'Show a digit', 'Play a note'], answer: 0, hint: '1023 / 4 is about 255, and 255 is full PWM brightness.' }), sim('pots', { lab: 'arduino_simulator_v7.html?example=pot', story: 'The knob fades an LED.', task: 'Run the potentiometer example and turn the knob.', q: 'analogRead on the Uno returns…', choices: ['0 to 1023', 'Only HIGH or LOW', '0 to 180 degrees'], answer: 0, hint: '0 is one end of the knob. 1023 is the other.' })] },
      { level: 'electronics', id: 'bread', name: 'Breadboards', image: 'assets/svg/breadboard-row.svg', blurb: 'Rows that are already joined, and rails for power.', items: [concept('bread', 'Five holes in a breadboard row are already connected. The long side strips are the power rails: one for 5V or 3V3, one for GND. The board does not replace the resistor.'), pick(['L27', 'L28', 'L29']), predict('bread', { lab: 'arduino_simulator_v7.html?example=led_chase&breadboard=1', code: 'digitalWrite(13, HIGH);', q: 'The LED and the wire share one breadboard row. The LED will…', choices: ['Turn on, because holes in that row are already joined', 'Stay off, until you solder', 'Measure humidity', 'Become GND'], answer: 0, hint: 'Five holes in a row are already connected.' }), sim('bread', { lab: 'arduino_simulator_v7.html?example=led_chase&breadboard=1', story: 'The chase example can open with a breadboard on the bench.', task: 'Run it and look at the breadboard rows and the side rails.', q: 'The long side strips are…', choices: ['Power rails, for 5V or 3V3 and GND', 'A replacement for the resistor', 'Serial pins only'], answer: 0, hint: 'Rails carry power. Rows join signals. The resistor is still required.' })] },
      { level: 'electronics', id: 'wires', name: 'Jumper Wires', image: 'assets/svg/jumper-wires.svg?v=2', blurb: 'Male is a pin. Female is a socket.', items: [concept('wires', 'A male end is a metal pin. A female end is a socket. Male-to-male joins an Arduino header to a breadboard hole.'), pick(['L73', 'L74', 'L75', 'L76']), predict('wires', { lab: blinkLab, code: 'digitalWrite(13, HIGH);', q: 'A male-to-male jumper runs from pin 13 to the resistor. That end at the Arduino is…', choices: ['A pin', 'A socket', 'A power rail', 'An antenna'], answer: 0, hint: 'Male is the metal pin. Female is the socket.' }), sim('wires', { lab: blinkLab, story: 'The blink wires are male-to-male: header to part.', task: 'Run the blink example and trace pin 13 to the resistor, then the LED to GND.', q: 'Which jumper joins an Arduino header to a breadboard hole?', choices: ['Male-to-male', 'A comment', 'Serial.begin'], answer: 0, hint: 'Both ends are pins.' })] },
      { level: 'electronics', id: 'ohms', name: 'Resistors & Ohm’s Law', image: 'assets/svg/ohm-law.svg?v=2', blurb: 'Voltage, current, and the 220 ohm habit.', items: [concept('ohms', 'Ohm’s law: resistance equals voltage divided by current. A red LED uses about 2 volts of a 5 volt supply, so the resistor sees what is left. 220Ω lets a little less current through than the exact 150Ω result.'), pick(['L77', 'L78', 'L79', 'L80', 'L81', 'L82']), predict('ohms', { lab: blinkLab, code: 'digitalWrite(13, HIGH);', q: 'The blink circuit puts 220 ohms in series with the LED. The resistor…', choices: ['Limits the current', 'Replaces GND', 'Sets the baud rate', 'Stores the sketch'], answer: 0, hint: 'The LED still lights. The resistor keeps the current gentle.' }), sim('ohms', { lab: blinkLab, story: 'Pin 13, resistor, LED, GND.', task: 'Run the blink example and find the resistor in the path.', q: 'Ohm\'s law says resistance equals…', choices: ['Voltage divided by current', 'Current times a pin number', 'delay(1000)'], answer: 0, hint: 'V / I. A red LED uses about 2 V of a 5 V supply.' })] },
      { level: 'electronics', id: 'analog', name: 'Analog Inputs', image: 'assets/svg/pot.svg', blurb: 'Pins that measure a range, not only on and off.', items: [concept('analog', 'Digital pins are only HIGH or LOW. Analog pins A0 to A5 measure a range. analogRead is how the sketch asks for that range.'), pick(['L7']), predict('analog', { lab: 'arduino_simulator_v7.html?example=pot', code: 'int val = analogRead(A0);', q: 'The knob is halfway. val is about…', choices: ['512', 'Only 0 or 1', '180 degrees', 'COM3'], answer: 0, hint: 'analogRead spans 0 to 1023. Halfway is near 512.' }), sim('analog', { lab: 'arduino_simulator_v7.html?example=pot', story: 'A0 measures the knob. A digital pin would only be on or off.', task: 'Run the potentiometer example and turn the knob.', q: 'Analog pins on the Uno are named…', choices: ['A0 to A5', 'Only HIGH and LOW', 'GPIO34 to GPIO39'], answer: 0, hint: 'A0 through A5 measure a range.' })] },
      { level: 'electronics', id: 'sensors', name: 'Sensors', image: 'assets/svg/ldr.svg', blurb: 'A sensor reports the world. The sketch decides after it reads.', project: { href: 'arduino_simulator_v7.html?example=ldr', label: 'LDR Night Light' }, items: [concept('sensors', 'A sensor turns something physical into a voltage the board can read. In this lab, sliders stand in for light, distance, and weather.'), pick(['L14']), predict('sensors', { lab: 'arduino_simulator_v7.html?example=ldr', code: 'int light = analogRead(A0);\nif (light < 400) digitalWrite(13, HIGH);\nelse digitalWrite(13, LOW);', q: 'The room is dark, so the reading is 100. The LED will…', choices: ['Turn on', 'Stay off', 'Spin a fan', 'Join Wi-Fi'], answer: 0, hint: '100 is less than 400, so the night-light path turns the LED on.' }), sim('sensors', { lab: 'arduino_simulator_v7.html?example=ldr', story: 'The LDR slider is the light level.', task: 'Run the night-light example and move the light slider.', q: 'The LDR slider stands for…', choices: ['How bright the light is', 'The servo angle', 'The serial speed'], answer: 0, hint: 'Slide it and you change the light around the sensor.' })] },
      { level: 'outputs', id: 'buzzer', name: 'Buzzer & Sound', image: 'assets/svg/buzzer.svg', blurb: 'tone plays a pitch. noTone stops it.', project: { href: 'arduino_simulator_v7.html?example=tone', label: 'Buzzer Tune' }, items: [concept('buzzer', 'tone(pin, frequency) plays a note. noTone(pin) stops it. The frequency is a pitch, not a wait.'), pick(['L19', 'L38']), predict('buzzer', { lab: 'arduino_simulator_v7.html?example=tone', code: 'tone(8, 440);\ndelay(200);\nnoTone(8);', q: 'What does the buzzer do?', choices: ['Plays a short note, then stops', 'Stays silent, because 440 is a wait', 'Reads pin 8', 'Keeps sounding forever'], answer: 0, hint: 'tone starts the note. delay(200) holds it. noTone stops it.' }), sim('buzzer', { lab: 'arduino_simulator_v7.html?example=tone', story: 'The buzzer example plays a short tune.', task: 'Run it and listen, then stop the note in your mind with noTone.', q: 'tone(8, 440) does what?', choices: ['Plays a note on pin 8', 'Reads pin 8', 'Waits 440 seconds'], answer: 0, hint: '440 is a pitch. delay is the call that waits.' })] },
      { level: 'outputs', id: 'servo', name: 'Servo Motors', image: 'assets/svg/servo.svg', blurb: 'Send an angle. The horn moves there and holds.', project: { href: 'arduino_simulator_v7.html?example=servo', label: 'Servo Sweep' }, items: [concept('servo', 'A hobby servo points to an angle. 0 and 180 are the ends. 90 is the middle. write(angle) is the call.'), pick(['L17']), predict('servo', { lab: 'arduino_simulator_v7.html?example=servo', code: 'myServo.write(0);\ndelay(500);\nmyServo.write(180);', q: 'The horn will…', choices: ['Stay at 90', 'Move to one end, then to the other', 'Spin continuously', 'Print the angle'], answer: 1, hint: 'write(0) is one end. write(180) is the other end.' }), sim('servo', { lab: 'arduino_simulator_v7.html?example=servo', story: 'Signal, 5V, and GND are the three servo wires.', task: 'Run the servo example and watch the horn sweep.', q: 'write(90) points the horn…', choices: ['At the middle', 'Only at 0', 'At a random angle'], answer: 0, hint: '90 sits halfway from 0 to 180.' })] },
      { level: 'outputs', id: 'dc', name: 'DC Motors & Fans', image: 'assets/svg/fan.svg', blurb: 'PWM is the speed knob. 0 stops the motor.', project: { href: 'arduino_simulator_v7.html?example=fan_speed', label: 'Fan Speed' }, items: [concept('dc', 'A DC motor spins while it has power. A higher PWM value spins it faster. 0 stops it. A pin usually drives a fan or a driver, not a big motor by itself.'), pick(['L18', 'L35']), predict('dc', { lab: 'arduino_simulator_v7.html?example=fan_speed', code: 'analogWrite(9, 255);', q: 'The fan will…', choices: ['Stop', 'Spin at full speed', 'Hold 90 degrees', 'Print 255'], answer: 1, hint: '255 is the top of PWM. 0 would stop the fan.' }), sim('dc', { lab: 'arduino_simulator_v7.html?example=fan_speed', story: 'The fan speed follows a knob.', task: 'Run the fan example and turn the potentiometer.', q: 'What makes the fan spin faster?', choices: ['A higher PWM value', 'A comment', 'Serial.begin'], answer: 0, hint: '255 is full speed. 0 is stopped.' })] },
      { level: 'outputs', id: 'displays', name: 'Displays', image: 'assets/svg/lcd.svg', blurb: '7-segment, LCD, and the text they show.', project: { href: 'arduino_simulator_v7.html?example=lcd', label: 'LCD Message' }, items: [concept('displays', 'A 16×2 LCD shows two rows of text. A 7-segment display makes one digit from seven bars, A to G. An OLED is a small screen with the same idea: the sketch prints, the display shows it.'), pick(['L21', 'L22']), predict('displays', { lab: 'arduino_simulator_v7.html?example=lcd', code: 'lcd.print("Hello");', q: 'The LCD will…', choices: ['Show the word Hello', 'Spin to 90 degrees', 'Set the baud rate', 'Turn the relay on'], answer: 0, hint: 'print writes those letters on the display.' }), sim('displays', { lab: 'arduino_simulator_v7.html?example=lcd', story: 'After the display is wired, the sketch writes a message.', task: 'Run the LCD example and read the screen.', q: 'lcd.print does what?', choices: ['Writes text on the display', 'Spins a servo', 'Sets the baud rate'], answer: 0, hint: 'print puts letters on the LCD.' })] },
      { level: 'outputs', id: 'rgb', name: 'RGB LEDs', image: 'assets/svg/led-blue.svg', blurb: 'Three pins, three colors, many mixes.', project: { href: 'arduino_simulator_v7.html?example=rgb', label: 'RGB Color Mix' }, items: [concept('rgb', 'Red, green, and blue each have a pin. Change the three brightnesses and the mix changes.'), pick(['L33']), predict('rgb', { lab: 'arduino_simulator_v7.html?example=rgb', code: 'digitalWrite(redPin, HIGH);\ndigitalWrite(greenPin, LOW);\ndigitalWrite(bluePin, LOW);', q: 'The lamp will look…', choices: ['Red', 'White', 'Off', 'Green'], answer: 0, hint: 'Only the red pin is HIGH. Green and blue are LOW.' }), sim('rgb', { lab: 'arduino_simulator_v7.html?example=rgb', story: 'Each color leg is its own output.', task: 'Run the RGB example and watch the color change.', q: 'Why give each color its own pin?', choices: ['So the mix can change', 'Because GND is optional', 'To read a button'], answer: 0, hint: 'Three pins, three brightnesses.' })] },
      { level: 'outputs', id: 'relay', name: 'Relays', image: 'assets/svg/relay.svg', blurb: 'A small pin flips a separate switch for a bigger load.', project: { href: 'arduino_simulator_v7.html?example=relay', label: 'Relay Load' }, items: [concept('relay', 'The pin drives the coil. COM and NO carry the lamp current. The pin never has to carry that current itself.'), pick(['L30', 'L83', 'L84', 'L85', 'L86', 'L87', 'L88']), predict('relay', { lab: 'arduino_simulator_v7.html?example=relay', code: 'digitalWrite(7, HIGH);', q: 'In this lab the relay will…', choices: ['Turn the coil on', 'Erase the sketch', 'Read humidity', 'Stay an input'], answer: 0, hint: 'HIGH on pin 7 turns this lab relay on.' }), sim('relay', { lab: 'arduino_simulator_v7.html?example=relay', story: 'In this lab, HIGH on the relay pin turns the coil on.', task: 'Run the relay example and press the button.', q: 'The lamp wires land on…', choices: ['COM and NO', 'Only pin 13', 'The reset button'], answer: 0, hint: 'The contacts carry the load. The pin uses IN.' })] },
      { level: 'outputs', id: 'home', name: 'Home Automation', image: 'assets/svg/bulb.svg', blurb: 'The same on and off idea, applied to a lamp in a room.', project: { href: 'arduino_simulator_v7.html?example=smart_home', label: 'Smart Home Security' }, items: [concept('home', 'A lamp is a bigger light with the same rule as an LED: HIGH on, LOW off. A relay often sits between the pin and the lamp.'), pick(['L32']), predict('home', { lab: 'arduino_simulator_v7.html?example=smart_home', code: 'if (dark && motion) digitalWrite(relayPin, HIGH);\nelse digitalWrite(relayPin, LOW);', q: 'It is dark and the PIR sees motion. The lamp will…', choices: ['Turn on', 'Stay off', 'Print the temperature', 'Open a COM port'], answer: 0, hint: 'Both tests are true, so the relay pin is written HIGH.' }), sim('home', { lab: 'arduino_simulator_v7.html?example=smart_home', story: 'The lamp follows darkness and motion.', task: 'Run the smart-home example and trigger the alarm.', q: 'HIGH sent toward the lamp means…', choices: ['The lamp is on', 'The lamp is a sensor', 'The board resets'], answer: 0, hint: 'HIGH is on, for a lamp just as for an LED.' })] },
      { level: 'robotics', id: 'ultra', name: 'Ultrasonic Distance', image: 'assets/svg/hcsr04.svg', blurb: 'TRIG sends a ping. ECHO listens. Time becomes centimeters.', project: { href: 'arduino_simulator_v7.html?example=ultrasonic', label: 'HC-SR04 Distance' }, items: [concept('ultra', 'The HC-SR04 shouts on TRIG and listens on ECHO. A smaller centimeter reading means something is closer.'), pick(['L15', 'L36']), predict('ultra', { lab: 'arduino_simulator_v7.html?example=us_led', code: 'if (cm < 20) digitalWrite(13, HIGH);\nelse digitalWrite(13, LOW);', q: 'If the distance is 10 cm, the LED will…', choices: ['Stay off', 'Turn on', 'Spin a servo to 180', 'Join Wi-Fi'], answer: 1, hint: '10 is less than 20, so the if path runs.' }), sim('ultra', { lab: 'arduino_simulator_v7.html?example=ultrasonic', story: 'Move the distance slider and read centimeters.', task: 'Run the ultrasonic example and watch the serial monitor.', q: 'Which pin listens for the echo?', choices: ['ECHO', 'TRIG', 'SDA'], answer: 0, hint: 'TRIG shouts. ECHO listens.' })] },
      { level: 'robotics', id: 'pir', name: 'PIR Motion Sensor', image: 'assets/svg/pir.svg', blurb: 'When something moves, the output goes HIGH.', project: { href: 'arduino_simulator_v7.html?example=pir', label: 'PIR Alarm' }, items: [concept('pir', 'A PIR watches for motion. Its output goes HIGH when something moves nearby. Dark and light belong to the LDR, not the PIR.'), pick(['L31']), predict('pir', { lab: 'arduino_simulator_v7.html?example=pir', code: 'if (digitalRead(3) == HIGH) digitalWrite(13, HIGH);\nelse digitalWrite(13, LOW);', q: 'Something moves, so the PIR output is HIGH. The LED will…', choices: ['Turn on', 'Stay off', 'Measure light', 'Sweep a servo'], answer: 0, hint: 'A HIGH PIR reading takes the path that turns the LED on.' }), sim('pir', { lab: 'arduino_simulator_v7.html?example=pir', story: 'Click the sensor dome to toggle motion.', task: 'Run the PIR example and trigger the alarm.', q: 'A PIR output goes HIGH when…', choices: ['Something moves nearby', 'The room is dark', 'The servo is at 0'], answer: 0, hint: 'PIR means motion.' })] },
      { level: 'robotics', id: 'dht', name: 'Temperature & Humidity', image: 'assets/svg/dht11.svg', blurb: 'One chip, two readings.', project: { href: 'arduino_simulator_v7.html?example=dht', label: 'DHT11 Reading' }, items: [concept('dht', 'A DHT11 reports temperature and humidity. In the lab each one has a slider, and the sketch can print both.'), pick(['L16']), predict('dht', { lab: 'arduino_simulator_v7.html?example=dht', code: 'Serial.print(temp);\nSerial.print(" C  ");\nSerial.println(hum);', q: 'The serial monitor will show…', choices: ['Temperature and humidity', 'Only a distance in cm', 'A servo angle', 'The COM port name'], answer: 0, hint: 'The sketch prints both numbers from the DHT11.' }), sim('dht', { lab: 'arduino_simulator_v7.html?example=dht', story: 'Both sliders are live while the sketch runs.', task: 'Run the DHT11 example and move each slider.', q: 'A DHT11 measures…', choices: ['Temperature and humidity', 'Distance only', 'Motor speed'], answer: 0, hint: 'How warm, and how damp.' })] },
      { level: 'robotics', id: 'robot-bits', name: 'Robot Building Blocks', image: 'assets/svg/robot-parts.svg', blurb: 'Brain, driver, motors, sensors, and a battery.', project: { href: 'projects/build-robot/index.html', label: 'Build Robot' }, items: [concept('robot-bits', 'The board is the brain. Sensors are the senses. A motor driver sits between a pin and a DC motor because the motor wants more current than a pin can give.'), pick(['L55', 'L56', 'L57', 'L58', 'L59']), predict('robot-bits', { lab: 'arduino_simulator_v7.html?example=ultrasonic', code: 'int cm = readDistance();\nif (cm < 15) stopMotors();', q: 'The reading is 8 cm. The robot will…', choices: ['Stop', 'Speed up', 'Join Wi-Fi', 'Erase flash'], answer: 0, hint: '8 is closer than 15, so the stop path runs.' }), sim('robot-bits', { lab: 'arduino_simulator_v7.html?example=ultrasonic', story: 'The board is the brain. The ultrasonic sensor is one sense.', task: 'Run the ultrasonic example and move the distance slider.', q: 'Why does a DC motor usually need a driver?', choices: ['The motor wants more current than a pin can give', 'Because GND is optional', 'To open a COM port'], answer: 0, hint: 'The pin decides. The driver supplies the current.' })] },
      { level: 'robotics', id: 'avoid', name: 'Obstacle Avoidance', image: 'assets/svg/hcsr04.svg', blurb: 'A small distance means stop before the bump.', project: { href: 'projects/build-robot/index.html', label: 'Obstacle Avoiding Robot' }, items: [concept('avoid', 'If the distance reading is small, something is close. The robot can stop, or turn, before it hits it.'), pick(['L34']), predict('avoid', { lab: 'arduino_simulator_v7.html?example=us_led', code: 'if (cm < 20) digitalWrite(13, HIGH);\nelse digitalWrite(13, LOW);', q: 'Something is 10 cm ahead. The warning LED will…', choices: ['Turn on', 'Stay off', 'Spin a fan at full speed', 'Print the port name'], answer: 0, hint: '10 is less than 20, so the close path runs.' }), sim('avoid', { lab: 'arduino_simulator_v7.html?example=us_led', story: 'A small centimeter reading means stop or turn before the bump.', task: 'Run the distance-LED example and bring the reading under 20 cm.', q: 'A smaller centimeter reading means…', choices: ['Something is closer', 'The battery is full', 'Wi-Fi is connected'], answer: 0, hint: 'Close objects come back sooner.' })] },
      { level: 'robotics', id: 'motors', name: 'Motor Types', image: 'assets/svg/motor-types.svg', blurb: 'DC spins, a servo holds an angle, a stepper counts steps.', items: [concept('motors', 'A DC motor spins the whole time. A servo holds an angle. A stepper moves in counted steps so position stays exact.'), pick(['L60', 'L61', 'L62', 'L63', 'L64']), predict('motors', { lab: 'arduino_simulator_v7.html?example=servo', code: 'myServo.write(90);', q: 'The servo will…', choices: ['Hold the middle', 'Spin until power is removed', 'Count 200 steps', 'Print 90 cm'], answer: 0, hint: 'A servo holds an angle. 90 is the middle.' }), sim('motors', { lab: 'arduino_simulator_v7.html?example=fan_speed', story: 'A DC motor is different: it spins the whole time it has power.', task: 'Run the fan example and turn the speed up, then to 0.', q: 'While the fan PWM value is above 0, a DC motor…', choices: ['Keeps spinning', 'Holds 90 degrees', 'Moves one step and stops'], answer: 0, hint: 'DC spins while it has power. A servo holds an angle. A stepper counts steps.' })] },
      { level: 'robotics', id: 'family', name: 'Arduino Nano / Mega / Leonardo', image: 'assets/svg/board-family.svg', blurb: 'Same idea as the Uno, different size, pins, or USB.', items: [concept('family', 'Nano is small enough for a breadboard. Mega has many more pins. Leonardo can act as a USB keyboard. The Uno remains the board this lab starts on.'), pick(['L50', 'L51', 'L52', 'L53', 'L54']), predict('family', { lab: blinkLab, code: 'digitalWrite(13, HIGH);\ndelay(500);\ndigitalWrite(13, LOW);', q: 'The same blink idea on a Nano will…', choices: ['Still turn a digital pin on, then off', 'Need Wi-Fi before it can blink', 'Only work on an ESP32', 'Erase the port'], answer: 0, hint: 'Nano, Mega, and Leonardo share the Uno idea. The pin number can differ.' }), sim('family', { lab: blinkLab, story: 'This lab starts on the Uno. Nano, Mega, and Leonardo are the same kind of board.', task: 'Run the Uno blink example.', q: 'Which board is the small one that fits a breadboard?', choices: ['Nano', 'The serial monitor', 'A 220 ohm resistor'], answer: 0, hint: 'Nano is small. Mega has many pins. Leonardo can act as a keyboard.' })] },
      { level: 'robotics', id: 'esp32', name: 'ESP32', image: 'assets/svg/esp32-devkit.svg', blurb: 'A 3.3V board whose onboard lamp is GPIO2.', project: { href: 'arduino_simulator_v7.html?board=esp32&example=esp32_blink', label: 'ESP32 Onboard LED' }, items: [concept('esp32', 'The ESP32 can blink, and its onboard LED in this lab is GPIO2. Its pins are 3.3V. Do not feed them a 5V Uno signal.'), pick(['L37', 'L49']), predict('esp32', { lab: 'arduino_simulator_v7.html?board=esp32&example=esp32_blink', code: 'digitalWrite(2, HIGH);\ndelay(500);\ndigitalWrite(2, LOW);\ndelay(500);', q: 'The ESP32 onboard LED will…', choices: ['Blink', 'Stay off, because the Uno lamp is pin 13', 'Join Wi-Fi', 'Become an input'], answer: 0, hint: 'GPIO2 is the ESP32 lamp. HIGH, wait, LOW, wait is a blink.' }), sim('esp32', { lab: 'arduino_simulator_v7.html?board=esp32&example=esp32_blink', story: 'Switch the simulator to the ESP32 and blink GPIO2.', task: 'Run the ESP32 blink example.', q: 'The ESP32 onboard lamp is on…', choices: ['GPIO2', 'Pin A0', 'VIN'], answer: 0, hint: 'GPIO2 on the ESP32. Pin 13 on the Uno.' })] },
      { level: 'robotics', id: 'esp-plus', name: 'What the ESP32 Adds', image: 'assets/svg/esp32-devkit.svg', blurb: '3.3 volts, the EN pin, and pins that only listen.', items: [concept('esp-plus', 'Beyond the lamp, the ESP32 uses 3.3V logic, restarts from the EN pin, and keeps GPIO 34, 35, 36, and 39 as inputs only.'), pick(['L46', 'L47', 'L48']), predict('esp-plus', { lab: 'arduino_simulator_v7.html?board=esp32&example=esp32_blink', code: 'digitalWrite(2, HIGH);', q: 'This is an ESP32. The lamp on GPIO2 will…', choices: ['Turn on, at 3.3V logic', 'Need a 5V Uno signal on that pin', 'Become an input-only pin', 'Open a COM port'], answer: 0, hint: 'GPIO2 is the lab lamp. ESP32 pins are 3.3V.' }), sim('esp-plus', { lab: 'arduino_simulator_v7.html?board=esp32&example=esp32_blink', story: 'EN restarts the ESP32. GPIO 34, 35, 36, and 39 only listen.', task: 'Run the ESP32 blink example.', q: 'GPIO34 can…', choices: ['Only be an input', 'Fade a 5V motor', 'Replace EN'], answer: 0, hint: '34, 35, 36, and 39 are input only.' })] },
      { level: 'robotics', id: 'wifi', name: 'Wi-Fi & Bluetooth', image: 'assets/svg/esp32-devkit.svg', blurb: 'Both radios are on the ESP32 chip. The Uno does not have them.', items: [concept('wifi', 'An Uno needs an extra radio to join a network. The ESP32 has Wi-Fi and Bluetooth on the same chip. WiFi.begin is the call that joins a network.'), pick(['L44', 'L45']), predict('wifi', { lab: 'arduino_simulator_v7.html?board=esp32&example=esp32_blink', code: 'WiFi.begin("lab", "secret");', q: 'On an ESP32, this call…', choices: ['Joins a Wi-Fi network', 'Blinks pin 13 on an Uno', 'Sets a resistor', 'Names a COM port'], answer: 0, hint: 'WiFi.begin is the join. The Uno has no radio of its own.' }), sim('wifi', { lab: 'arduino_simulator_v7.html?board=esp32&example=esp32_blink', story: 'This lab can blink the ESP32. It does not join a network yet.', task: 'Run the ESP32 blink example and notice the board is an ESP32, not an Uno.', q: 'Which board already has Wi-Fi and Bluetooth on the chip?', choices: ['ESP32', 'Uno', 'A breadboard'], answer: 0, hint: 'The Uno needs an extra radio. The ESP32 does not.' })] },
      { level: 'robotics', id: 'iot', name: 'IoT', image: 'assets/svg/esp32-devkit.svg', blurb: 'A board on the network can report sensors and take commands.', project: { href: 'projects/iot/index.html', label: 'IoT projects' }, items: [concept('iot', 'IoT means the board is part of a network: it can publish a temperature, or take a command, without a USB cable on the desk. The 55 IoT builds stay in Projects, separate from this lesson.'), predict('iot', { lab: 'arduino_simulator_v7.html?example=weather_station', code: 'Serial.print("T: ");\nSerial.println(temp);', q: 'The serial monitor will show…', choices: ['A temperature reading', 'Only the COM port name', 'A Wi-Fi password', 'Pin 13 as an input'], answer: 0, hint: 'The weather station prints the temperature it measured.' }), sim('iot', { lab: 'arduino_simulator_v7.html?example=weather_station', story: 'This lab reports on the serial monitor. On a network, that same reading is what an IoT board would publish.', task: 'Run the weather station and read the serial line.', q: 'IoT means the board can share that reading…', choices: ['Over a network, not only over USB', 'Only while the reset button is held', 'By replacing GND'], answer: 0, hint: 'The lesson stays here. The 55 IoT builds stay in Projects.' })] },
      { level: 'robotics', id: 'uno-parts', name: 'Inside the Uno', image: 'assets/svg/arduino-uno.svg', blurb: 'The chip, the USB plug, reset, and the pins with a ~ mark.', items: [concept('uno-parts', 'A classic Uno is built around an ATmega328P. USB uploads the sketch. Reset starts setup() again. Pins marked ~ can do PWM.'), pick(['L39', 'L40', 'L41', 'L42', 'L43']), predict('uno-parts', { lab: 'arduino_simulator_v7.html?example=fade', code: 'analogWrite(9, 128);', q: 'Pin 9 has a ~ mark. The LED will…', choices: ['Glow at about half brightness', 'Stay a digital input', 'Reset the board', 'Open COM3'], answer: 0, hint: 'Pins marked ~ can do PWM. 128 is about halfway to 255.' }), sim('uno-parts', { lab: blinkLab, story: 'Reset starts setup() again. USB is how the sketch got here.', task: 'Run the blink example. Resetting the board would start that sketch over.', q: 'The classic Uno chip is…', choices: ['ATmega328P', 'A DHT11', 'A COM port'], answer: 0, hint: 'The chip runs the sketch. USB uploads it. ~ pins can fade.' })] },
      { level: 'robotics', id: 'mcu', name: 'Inside the Microcontroller', image: 'assets/svg/microcontroller.svg', blurb: 'The chip is the computer. The board is the chip plus helpers.', items: [concept('mcu', 'A microcontroller is processor, memory, and pins on one chip. Flash keeps the sketch when power is gone. RAM is scratch space and clears on reset.'), pick(['L89', 'L90', 'L91', 'L92', 'L93', 'L94']), predict('mcu', { lab: blinkLab, code: 'digitalWrite(13, HIGH);\ndelay(500);\ndigitalWrite(13, LOW);\ndelay(500);', q: 'You unplug the board, then plug it back in. The blink will…', choices: ['Start again, because flash kept the sketch', 'Be gone, because RAM was the only copy', 'Wait for a new Upload every time', 'Become an analog input'], answer: 0, hint: 'Flash keeps the program. RAM clears when power drops.' }), sim('mcu', { lab: blinkLab, story: 'The chip is the computer. The Uno board is that chip plus the USB plug, the regulator, and the pins.', task: 'Run the blink example. The sketch is running on the microcontroller.', q: 'Which memory clears when you press reset?', choices: ['RAM', 'Flash', 'The resistor'], answer: 0, hint: 'RAM is scratch space. Flash still holds the sketch.' })] }
    ];
    topics.forEach(function (topic) {
      topic.items = topic.items.reduce(function (all, entry) {
        return all.concat(entry);
      }, []);
    });
    const l10 = topics.reduce(function (found, topic) {
      return found || topic.items.find(function (item) { return item.id === 'L10'; });
    }, null);
    if (l10) {
      l10.q = 'Which LED leg normally connects toward the Arduino output?';
      l10.choices = ['The long leg (anode)', 'The short leg (cathode)', 'Either leg'];
      l10.answer = 0;
      l10.hint = 'The long leg is the anode. It faces the pin, through the resistor.';
    }
    const left = Object.keys(byId);
    if (left.length) throw new Error('Lessons not placed in a level: ' + left.join(', '));
    tracks.lessons.categories = topics;
    tracks.lessons.levels = [
      { id: 'foundations', name: 'Level 1 — Arduino Foundations', blurb: 'From the IDE to a blinking LED.' },
      { id: 'programming', name: 'Level 2 — Arduino Programming', blurb: 'Variables, decisions, loops, the calls you will use, and the serial monitor.' },
      { id: 'electronics', name: 'Level 3 — Electronics & Inputs', blurb: 'Buttons, knobs, breadboards, wires, resistors, and sensors.' },
      { id: 'outputs', name: 'Level 4 — Outputs & Automation', blurb: 'Sound, motion, displays, relays, and a lamp in a room.' },
      { id: 'robotics', name: 'Level 5 — Robotics & IoT', blurb: 'Distance, motion, weather, robot parts, other boards, and the network.' }
    ];
  })();

  Object.keys(tracks).forEach(function (key) {
    const t = tracks[key];
    if (t.categories) {
      t.items = t.categories.reduce(function (all, cat) {
        return all.concat(cat.items);
      }, []);
    }
  });

  tracks.quizzes.title = 'Quiz';
  tracks.quizzes.categories = tracks.quizzes.categories.concat(tracks.exercises.categories, tracks.challenges.categories);
  tracks.quizzes.items = tracks.quizzes.categories.reduce(function (all, cat) {
    return all.concat(cat.items);
  }, []);

  const finalProjects = [
    {
      id: 'P1', xp: 50, kind: 'blanks', image: 'assets/svg/arduino-uno.svg',
      title: 'Blink with a variable',
      task: 'Drag the words into the blanks',
      brief: 'Give pin 13 a name. ledPin holds 13, and every later line uses ledPin, not the number. Drop the pin number, then OUTPUT, HIGH, and LOW.',
      code: 'int ledPin = ___;\nvoid setup() {\n  pinMode(ledPin, ___);\n}\nvoid loop() {\n  digitalWrite(ledPin, ___);\n  delay(500);\n  digitalWrite(ledPin, ___);\n  delay(500);\n}',
      answers: ['13', 'OUTPUT', 'HIGH', 'LOW'],
      hints: ['The variable ledPin should store 13.', 'pinMode needs OUTPUT, because this pin talks.', 'First digitalWrite turns the LED on: HIGH.', 'Second digitalWrite turns the LED off: LOW.'],
      chips: ['13', 'OUTPUT', 'HIGH', 'LOW', 'INPUT', 'A0']
    },
    {
      id: 'P2', xp: 50, kind: 'wire', image: 'assets/svg/led-red.svg',
      title: 'Wire a safe LED',
      task: 'Connect the parts',
      brief: 'Build the path. Pin 13 goes to the resistor. The other side of the resistor goes to the long LED leg. The short LED leg goes to GND. Nothing else.',
      nodes: ['Pin 13', 'Resistor', 'LED long leg', 'LED short leg', 'GND'],
      links: [['Pin 13', 'Resistor'], ['Resistor', 'LED long leg'], ['LED short leg', 'GND']]
    },
    {
      id: 'P3', xp: 50, kind: 'order', image: 'assets/svg/button.svg',
      title: 'Button lamp, already wired',
      task: 'Drag the lines into order',
      brief: 'The button is already on pin 2 and the LED is already on pin 13. The names are buttonPin and ledPin. Drag the lines so setup prepares both pins, then loop reads the button and turns the LED on or off.',
      wired: ['buttonPin is 2, already wired', 'ledPin is 13, already wired through the resistor'],
      lines: [
        'pinMode(buttonPin, INPUT);',
        'pinMode(ledPin, OUTPUT);',
        'int pressed = digitalRead(buttonPin);',
        'if (pressed == HIGH) digitalWrite(ledPin, HIGH);',
        'else digitalWrite(ledPin, LOW);'
      ],
      hint: 'Directions first: INPUT for the button, OUTPUT for the LED. Then read, then HIGH, then LOW.'
    },
    {
      id: 'P4', xp: 50, kind: 'wire', image: 'assets/svg/servo.svg',
      title: 'Wire a servo',
      task: 'Connect the parts',
      brief: 'A hobby servo has three wires. Signal goes to pin 9. Red goes to 5V. Brown goes to GND.',
      nodes: ['Pin 9', 'Signal', '5V', 'Red', 'GND', 'Brown'],
      links: [['Pin 9', 'Signal'], ['5V', 'Red'], ['GND', 'Brown']]
    },
    {
      id: 'P5', xp: 50, kind: 'blanks', image: 'assets/svg/ldr.svg',
      title: 'Night light, already wired',
      task: 'Drag the words into the blanks',
      brief: 'The LDR is already on A0 and the LED is already on pin 9. ledPin is 9. Drop the pin you read, the dark threshold, full brightness, and off.',
      wired: ['A0 reads the LDR', 'ledPin is 9 and already drives the LED'],
      code: 'int ledPin = 9;\nint light = analogRead(___);\nif (light < ___) analogWrite(ledPin, ___);\nelse analogWrite(ledPin, ___);',
      answers: ['A0', '400', '255', '0'],
      hints: ['Read the LDR on A0.', 'Dark means the reading is under 400.', '255 is full brightness on ledPin.', '0 turns that same pin off.'],
      chips: ['A0', '400', '255', '0', '13', 'HIGH']
    }
  ];
  tracks.projects = {
    module: 'learning/projects',
    title: 'Final Projects',
    items: finalProjects.map(function (p) { return { id: p.id, xp: p.xp }; })
  };

  (function attachLevelProjects() {
    const homeBuild = {
      id: 'P-home', xp: 50, kind: 'order', image: 'assets/svg/bulb.svg',
      title: 'Lamp on only when it should be',
      task: 'Drag the lines into order',
      brief: 'The relay pin is relayPin. Dark and motion are already known. Direction first, then turn the lamp on only when both are true.',
      lines: [
        'pinMode(relayPin, OUTPUT);',
        'if (dark && motion) digitalWrite(relayPin, HIGH);',
        'else digitalWrite(relayPin, LOW);'
      ],
      hint: 'Direction first. HIGH when both tests are true. LOW is the other path.'
    };
    const avoidBuild = {
      id: 'P-avoid', xp: 50, kind: 'order', image: 'assets/svg/hcsr04.svg',
      title: 'Stop before the bump',
      task: 'Drag the lines into order',
      brief: 'cm is the distance in centimeters. Read it, stop when something is closer than 20 cm, and keep going otherwise.',
      lines: [
        'int cm = readCm();',
        'if (cm < 20) stopMotors();',
        'else driveForward();'
      ],
      hint: 'Read first. Stop when the number is small. Else keeps driving.'
    };
    const caps = { leds: finalProjects[1], serial: finalProjects[0], sensors: finalProjects[4], home: homeBuild, avoid: avoidBuild };
    tracks.lessons.categories.forEach(function (topic) {
      if (caps[topic.id]) topic.items.push(caps[topic.id]);
    });
    tracks.lessons.items = tracks.lessons.categories.reduce(function (all, cat) {
      return all.concat(cat.items);
    }, []);
  })();

  const stepArt = {
    L4: 'assets/svg/resistor.svg',
    L9: 'assets/svg/esp32-devkit.svg',
    L10: 'assets/svg/led-red.svg',
    L11: 'assets/svg/led-green.svg',
    L12: 'assets/svg/pot.svg',
    L13: 'assets/svg/switch.svg',
    L15: 'assets/svg/hcsr04.svg',
    L16: 'assets/svg/dht11.svg',
    L18: 'assets/svg/fan.svg',
    L19: 'assets/svg/buzzer.svg',
    L22: 'assets/svg/seg7.svg'
  };

  const stepLab = {
    L1: 'arduino_simulator_v7.html?example=blink',
    L4: 'arduino_simulator_v7.html?example=led_chase',
    L5: 'arduino_simulator_v7.html?example=button',
    L9: 'arduino_simulator_v7.html?board=esp32&example=esp32_blink',
    L12: 'arduino_simulator_v7.html?example=pot',
    L13: 'arduino_simulator_v7.html?example=switch_lamp',
    L14: 'arduino_simulator_v7.html?example=ldr',
    L15: 'arduino_simulator_v7.html?example=ultrasonic',
    L16: 'arduino_simulator_v7.html?example=dht',
    L17: 'arduino_simulator_v7.html?example=servo',
    L18: 'arduino_simulator_v7.html?example=fan_speed',
    L19: 'arduino_simulator_v7.html?example=tone',
    L20: 'arduino_simulator_v7.html?example=serial',
    L21: 'arduino_simulator_v7.html?example=lcd',
    L22: 'arduino_simulator_v7.html?example=seg7',
    L29: 'arduino_simulator_v7.html?example=led_chase&breadboard=1',
    L30: 'arduino_simulator_v7.html?example=relay',
    L31: 'arduino_simulator_v7.html?example=pir',
    L32: 'arduino_simulator_v7.html?example=switch_lamp',
    L33: 'arduino_simulator_v7.html?example=rgb',
    L34: 'arduino_simulator_v7.html?example=ultrasonic',
    L35: 'arduino_simulator_v7.html?example=fan_speed',
    L36: 'arduino_simulator_v7.html?example=servo',
    L37: 'arduino_simulator_v7.html?board=esp32&example=esp32_blink',
    L38: 'arduino_simulator_v7.html?example=tone',
    L49: 'arduino_simulator_v7.html?board=esp32&example=esp32_blink',
    L60: 'arduino_simulator_v7.html?example=fan_speed',
    L61: 'arduino_simulator_v7.html?example=servo',
    L81: 'arduino_simulator_v7.html?example=led_chase',
    L86: 'arduino_simulator_v7.html?example=relay'
  };

  function read() {
    try { return JSON.parse(localStorage.getItem(LEARN_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function write(data) { localStorage.setItem(LEARN_KEY, JSON.stringify(data)); }
  function solvedSet(data) { return new Set(data.solved || []); }

  function dayKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function streakCount(days) {
    const set = new Set(days || []);
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (set.has(dayKey(d))) {
      n += 1;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }

  function writeMeta() {
    const data = read();
    const solved = solvedSet(data);
    const cats = (tracks.lessons && tracks.lessons.categories) || [];
    const levels = (tracks.lessons && tracks.lessons.levels) || [];
    const items = (tracks.lessons && tracks.lessons.items) || [];
    let level = levels[0] || { id: 'foundations', name: 'Level 1 — Arduino Foundations' };
    let continueHref = 'learning/lessons/index.html';
    function firstOpen(kind) {
      let href = 'learning/lessons/index.html';
      cats.some(function (cat) {
        const open = cat.items.some(function (it) { return it.kind === kind && !solved.has(it.id); });
        if (!open) return false;
        href = 'learning/lessons/index.html#cat-' + cat.id;
        return true;
      });
      return href;
    }
    cats.some(function (cat) {
      const open = cat.items.some(function (it) { return !solved.has(it.id); });
      if (!open) return false;
      continueHref = 'learning/lessons/index.html#cat-' + cat.id;
      level = levels.find(function (row) { return row.id === cat.level; }) || level;
      return true;
    });
    const done = items.filter(function (it) { return solved.has(it.id); }).length;
    const names = {
      foundations: 'Level 1 · Arduino Foundations',
      programming: 'Level 2 · Programming',
      electronics: 'Level 3 · Electronics',
      outputs: 'Level 4 · Outputs & Automation',
      robotics: 'Level 5 · Robotics & IoT'
    };
    localStorage.setItem('edu-platform-learn-meta', JSON.stringify({
      total: items.length,
      done: done,
      levelName: names[level.id] || level.name,
      xp: data.xp || 0,
      streak: streakCount(data.days),
      continueHref: continueHref,
      predictHref: firstOpen('predict'),
      simHref: firstOpen('sim')
    }));
    try {
      const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
      levels.forEach(function (row) {
        const group = cats.filter(function (cat) { return cat.level === row.id; });
        const levelDone = group.length && group.every(function (cat) {
          return cat.items.every(function (it) { return solved.has(it.id); });
        });
        const key = 'learning/level/' + row.id;
        const levelStarted = group.some(function (cat) {
          return cat.items.some(function (it) { return solved.has(it.id); });
        });
        if (levelDone) progress[key] = { status: 'complete', at: (progress[key] && progress[key].at) || Date.now(), title: names[row.id] || row.name };
        else if (levelStarted) progress[key] = { status: 'started', at: (progress[key] && progress[key].at) || Date.now(), title: names[row.id] || row.name };
      });
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {}
  }

  function touchDay() {
    const data = read();
    const key = dayKey(new Date());
    const days = data.days || [];
    if (days.indexOf(key) === -1) {
      days.push(key);
      data.days = days;
      write(data);
    }
    writeMeta();
  }

  function award(id, xp) {
    touchDay();
    const data = read();
    const solved = solvedSet(data);
    let gained = 0;
    if (!solved.has(id)) {
      solved.add(id);
      data.solved = Array.from(solved);
      data.xp = (data.xp || 0) + xp;
      gained = xp;
      write(data);
      writeMeta();
      if (window.EduSync) window.EduSync.award(id, xp);
    }
    return gained;
  }

  function findTrack(moduleId) {
    return Object.keys(tracks).map(function (key) { return tracks[key]; }).find(function (t) { return t.module === moduleId; });
  }

  function syncModule(moduleId) {
    const track = findTrack(moduleId);
    if (!track || !track.items) return;
    const solved = solvedSet(read());
    const done = track.items.every(function (item) { return solved.has(item.id); });
    try {
      const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
      if (done) progress[moduleId] = { status: 'complete', at: Date.now() };
      else if (progress[moduleId] && progress[moduleId].status === 'complete') {
        progress[moduleId] = { status: 'started', at: progress[moduleId].at || Date.now() };
      }
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {}
  }

  function syncAll() {
    Object.keys(tracks).forEach(function (key) { syncModule(tracks[key].module); });
    writeMeta();
  }

  function markModule(moduleId) { syncModule(moduleId); }

  function xpNow() { return read().xp || 0; }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const DRAFT_KEY = 'edu-platform-drafts';
  function readDrafts() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveDraft(id, value) {
    const all = readDrafts();
    all[id] = value;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(all));
  }
  function pairKey(a, b) { return [a, b].sort().join('|'); }
  function burst() {
    const layer = document.createElement('div');
    layer.className = 'confetti-layer';
    const colors = ['#10b981', '#fbbf24', '#38bdf8', '#f472b6', '#a78bfa', '#fb7185', '#fde68a'];
    for (let i = 0; i < 72; i++) {
      const bit = document.createElement('i');
      bit.style.left = Math.random() * 100 + '%';
      bit.style.background = colors[i % colors.length];
      bit.style.animationDuration = (1.5 + Math.random() * 1.6) + 's';
      bit.style.animationDelay = (Math.random() * 0.35) + 's';
      bit.style.transform = 'rotate(' + Math.floor(Math.random() * 80) + 'deg)';
      layer.appendChild(bit);
    }
    document.body.appendChild(layer);
    setTimeout(function () { layer.remove(); }, 3400);
  }

  function showProjectHome() {
    const solved = solvedSet(read());
    app.innerHTML =
      '<div class="xp-row"><span class="step-dots">5 final projects</span><span class="xp-pill">' + xpNow() + ' XP</span></div>' +
      '<div class="grid">' + finalProjects.map(function (project, i) {
        const done = solved.has(project.id);
        return '<article class="module"><img class="cat-fig" src="' + root + project.image + '" alt="' + escapeHtml(project.title) + '"><span class="task-pill">' + escapeHtml(project.task) + '</span><h3>' + escapeHtml(project.title) + '</h3><p>' + escapeHtml(project.brief) + '</p><p class="step-dots">' + (done ? 'Finished' : 'Not submitted') + ' · ' + project.xp + ' XP</p><button class="btn" type="button" data-proj="' + i + '">' + (done ? 'Review' : 'Start') + '</button></article>';
      }).join('') + '</div>';
    app.querySelectorAll('[data-proj]').forEach(function (btn) {
      btn.onclick = function () { openProject(Number(btn.dataset.proj)); };
    });
  }

  function workHtml(project) {
    const wired = project.wired ? '<ul class="wired-list">' + project.wired.map(function (line) { return '<li>' + escapeHtml(line) + '</li>'; }).join('') + '</ul>' : '';
    if (project.kind === 'wire') {
      return '<div class="wire-add"><select id="wire-a">' + project.nodes.map(function (n) { return '<option>' + escapeHtml(n) + '</option>'; }).join('') + '</select><span>to</span><select id="wire-b">' + project.nodes.map(function (n) { return '<option>' + escapeHtml(n) + '</option>'; }).join('') + '</select><button class="btn" type="button" id="add-wire">Add link</button></div><div class="made-wires" id="made-wires"></div>';
    }
    if (project.kind === 'blanks') {
      const bits = project.code.split('___');
      return wired + '<pre class="blank-code">' + bits.map(function (bit, i) {
        const slot = i < project.answers.length ? '<button class="slot" type="button" data-blank="' + i + '">drop</button>' : '';
        return escapeHtml(bit) + slot;
      }).join('') + '</pre><div class="chips" id="blank-chips">' + project.chips.map(function (chip) {
        return '<button class="chip" type="button" draggable="true" data-chip="' + escapeHtml(chip) + '">' + escapeHtml(chip) + '</button>';
      }).join('') + '</div>';
    }
    if (project.kind === 'order') {
      const note = project.id === 'P3'
        ? '<p class="step-dots">int buttonPin = 2;<br>int ledPin = 13;</p><p class="step-dots">Drag lines into this list. Setup lines first, then loop.</p>'
        : '<p class="step-dots">Drag the lines into order.</p>';
      return wired + note + '<div class="order-list" id="order-list"></div><div class="chips" id="order-bank"></div>';
    }
    return '';
  }

  function openProject(index) {
    const project = finalProjects[index];
    const solved = solvedSet(read()).has(project.id);
    const draft = readDrafts()[project.id];
    const fig = '<img class="learn-fig" src="' + root + project.image + '" alt="' + escapeHtml(project.title) + '">';
    const work = workHtml(project);
    app.innerHTML =
      '<div class="xp-row"><span class="step-dots">Project ' + (index + 1) + ' / 5</span><span class="xp-pill" id="xp-pill">' + xpNow() + ' XP</span></div>' +
      '<article class="panel learn-card"><span class="task-pill">' + escapeHtml(project.task) + '</span><h2>' + escapeHtml(project.title) + '</h2>' +
      fig + '<p class="story">' + escapeHtml(project.brief) + '</p>' + work +
      '<p class="feedback" id="feedback">' + (solved ? 'Finished. Submit again any time.' : '') + '</p>' +
      '<div class="learn-nav"><button class="btn ghost" type="button" id="back-projects">All projects</button><button class="btn ghost" type="button" id="prev-project">Previous</button><button class="btn ghost" type="button" id="next-project">Next</button><button class="btn" type="button" id="submit-project">Submit</button></div></article>';
    document.getElementById('back-projects').onclick = showProjectHome;
    const prevProject = document.getElementById('prev-project');
    const nextProject = document.getElementById('next-project');
    prevProject.disabled = index === 0;
    nextProject.disabled = index === finalProjects.length - 1;
    prevProject.onclick = function () { if (index > 0) openProject(index - 1); };
    nextProject.onclick = function () { if (index < finalProjects.length - 1) openProject(index + 1); };
    if (project.kind === 'wire') bindWire(project, Array.isArray(draft) ? draft : []);
    else if (project.kind === 'blanks') bindBlanks(project, Array.isArray(draft) ? draft : []);
    else if (project.kind === 'order') bindOrder(project, Array.isArray(draft) ? draft : null);
  }

  function sayProject(ok, text) {
    const el = document.getElementById('feedback');
    const pill = document.getElementById('xp-pill');
    if (pill) pill.textContent = xpNow() + ' XP';
    if (!el) return;
    el.className = 'feedback ' + (ok ? 'good' : 'bad');
    el.innerHTML = text;
  }

  function celebrate(project, gained) {
    if (mode !== 'projects') {
      const extra = maybeBonuses();
      markModule(track.module);
      burst();
      say(true, (gained || extra) ? 'That build works.' : 'Already collected.', (gained || 0) + extra);
      if (categoryDone() || track.items.every(function (it) { return solvedSet(read()).has(it.id); })) render();
      return;
    }
    markModule('learning/projects');
    const allDone = finalProjects.every(function (p) { return solvedSet(read()).has(p.id); });
    burst();
    sayProject(true, '<strong class="congrats">Congratulations</strong><br>' + (gained ? '+' + gained + ' XP. ' : 'Already collected. ') + (allDone ? 'All five projects are complete. <a href="' + root + 'account/index.html">See your certificate</a>' : 'That build works.'));
  }

  function shuffleLines(lines) {
    const copy = lines.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    const same = copy.every(function (line, i) { return line === lines[i]; });
    if (same && copy.length > 1) {
      const tmp = copy[0];
      copy[0] = copy[1];
      copy[1] = tmp;
    }
    return copy;
  }

  function bindBlanks(project, saved) {
    const slots = [];
    for (let i = 0; i < project.answers.length; i++) slots.push(saved[i] || '');
    let held = '';
    function paint() {
      saveDraft(project.id, slots.slice());
      app.querySelectorAll('[data-blank]').forEach(function (slot) {
        const value = slots[Number(slot.dataset.blank)];
        slot.textContent = value || 'drop';
        slot.classList.toggle('good', false);
      });
    }
    function fill(index, value) {
      slots[index] = value;
      paint();
    }
    paint();
    app.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('dragstart', function () { held = chip.dataset.chip; });
      chip.onclick = function () {
        const empty = slots.findIndex(function (value) { return !value; });
        if (empty !== -1) fill(empty, chip.dataset.chip);
      };
    });
    app.querySelectorAll('[data-blank]').forEach(function (slot) {
      slot.addEventListener('dragover', function (e) { e.preventDefault(); slot.classList.add('over'); });
      slot.addEventListener('dragleave', function () { slot.classList.remove('over'); });
      slot.addEventListener('drop', function (e) {
        e.preventDefault();
        slot.classList.remove('over');
        if (held) fill(Number(slot.dataset.blank), held);
      });
      slot.onclick = function () { fill(Number(slot.dataset.blank), ''); };
    });
    document.getElementById('submit-project').onclick = function () {
      const wrong = project.answers.findIndex(function (answer, i) { return slots[i] !== answer; });
      if (wrong !== -1) {
        sayProject(false, slots[wrong] ? project.hints[wrong] : 'A blank is still empty. ' + project.hints[wrong]);
        return;
      }
      const gained = award(project.id, project.xp);
      celebrate(project, gained);
    };
  }

  function bindOrder(project, saved) {
    const bank = document.getElementById('order-bank');
    const list = document.getElementById('order-list');
    let placed = saved && saved.length ? saved.filter(function (line) { return project.lines.indexOf(line) !== -1; }) : [];
    let bankOrder = shuffleLines(project.lines.filter(function (line) { return placed.indexOf(line) === -1; }));
    let dragFrom = '';
    function paint() {
      saveDraft(project.id, placed.slice());
      project.lines.forEach(function (line) {
        if (placed.indexOf(line) === -1 && bankOrder.indexOf(line) === -1) bankOrder.push(line);
      });
      bankOrder = bankOrder.filter(function (line) { return placed.indexOf(line) === -1; });
      list.innerHTML = placed.map(function (line, i) {
        return '<div class="order-line" draggable="true" data-at="' + i + '"><span>' + escapeHtml(line) + '</span><span class="nudge"><button type="button" data-up="' + i + '">Up</button><button type="button" data-down="' + i + '">Down</button><button type="button" data-out="' + i + '">Remove</button></span></div>';
      }).join('') || '<p class="step-dots">Drop the lines here, or click one.</p>';
      bank.innerHTML = bankOrder.map(function (line) {
        return '<button class="chip order-chip" type="button" draggable="true" data-line="' + escapeHtml(line) + '">' + escapeHtml(line) + '</button>';
      }).join('');
      bank.querySelectorAll('[data-line]').forEach(function (chip) {
        chip.addEventListener('dragstart', function () { dragFrom = 'bank:' + chip.dataset.line; });
        chip.onclick = function () { placed.push(chip.dataset.line); paint(); };
      });
      list.querySelectorAll('[data-up]').forEach(function (btn) {
        btn.onclick = function () {
          const i = Number(btn.dataset.up);
          if (i < 1) return;
          const tmp = placed[i - 1];
          placed[i - 1] = placed[i];
          placed[i] = tmp;
          paint();
        };
      });
      list.querySelectorAll('[data-down]').forEach(function (btn) {
        btn.onclick = function () {
          const i = Number(btn.dataset.down);
          if (i >= placed.length - 1) return;
          const tmp = placed[i + 1];
          placed[i + 1] = placed[i];
          placed[i] = tmp;
          paint();
        };
      });
      list.querySelectorAll('[data-out]').forEach(function (btn) {
        btn.onclick = function () { placed.splice(Number(btn.dataset.out), 1); paint(); };
      });
      list.querySelectorAll('.order-line').forEach(function (row) {
        row.addEventListener('dragstart', function () { dragFrom = 'row:' + row.dataset.at; });
        row.addEventListener('dragover', function (e) { e.preventDefault(); });
        row.addEventListener('drop', function (e) {
          e.preventDefault();
          e.stopPropagation();
          const at = Number(row.dataset.at);
          if (dragFrom.indexOf('bank:') === 0) {
            placed.splice(at, 0, dragFrom.slice(5));
          } else if (dragFrom.indexOf('row:') === 0) {
            const from = Number(dragFrom.slice(4));
            const line = placed.splice(from, 1)[0];
            placed.splice(at, 0, line);
          }
          paint();
        });
      });
      list.ondragover = function (e) { e.preventDefault(); };
      list.ondrop = function (e) {
        e.preventDefault();
        if (dragFrom.indexOf('bank:') === 0) {
          placed.push(dragFrom.slice(5));
          paint();
        }
      };
    }
    paint();
    document.getElementById('submit-project').onclick = function () {
      const same = placed.length === project.lines.length && placed.every(function (line, i) { return line === project.lines[i]; });
      if (!same) {
        sayProject(false, project.hint);
        return;
      }
      const gained = award(project.id, project.xp);
      celebrate(project, gained);
    };
  }

  function bindWire(project, links) {
    const made = document.getElementById('made-wires');
    function paint() {
      saveDraft(project.id, links);
      made.innerHTML = links.map(function (link, i) {
        return '<span class="link-pill">' + escapeHtml(link[0]) + ' → ' + escapeHtml(link[1]) + '<button type="button" data-cut="' + i + '">remove</button></span>';
      }).join('') || '<span class="step-dots">No links yet.</span>';
      made.querySelectorAll('[data-cut]').forEach(function (btn) {
        btn.onclick = function () {
          links.splice(Number(btn.dataset.cut), 1);
          paint();
        };
      });
    }
    paint();
    document.getElementById('add-wire').onclick = function () {
      const a = document.getElementById('wire-a').value;
      const b = document.getElementById('wire-b').value;
      if (a === b) {
        sayProject(false, 'Pick two different parts.');
        return;
      }
      const key = pairKey(a, b);
      if (links.some(function (link) { return pairKey(link[0], link[1]) === key; })) {
        sayProject(false, 'That link is already there.');
        return;
      }
      links.push([a, b]);
      paint();
    };
    document.getElementById('submit-project').onclick = function () {
      const got = {};
      links.forEach(function (link) { got[pairKey(link[0], link[1])] = true; });
      const need = project.links.map(function (link) { return pairKey(link[0], link[1]); });
      const missing = project.links.filter(function (link) { return !got[pairKey(link[0], link[1])]; });
      const extra = links.filter(function (link) { return need.indexOf(pairKey(link[0], link[1])) === -1; });
      if (missing.length) {
        sayProject(false, 'Still missing: ' + missing[0][0] + ' to ' + missing[0][1] + '.');
        return;
      }
      if (extra.length) {
        sayProject(false, 'Take off the extra link: ' + extra[0][0] + ' to ' + extra[0][1] + '.');
        return;
      }
      const gained = award(project.id, project.xp);
      celebrate(project, gained);
    };
  }

  if (mode === 'projects') {
    syncAll();
    showProjectHome();
    return;
  }

  if (mode === 'hub') {
    syncAll();
    const solved = solvedSet(read());
    const cards = [
      ['lessons', 'Learn', 'Five levels. Each topic runs concept, lesson, quiz, then a simulator challenge.', 'lessons/index.html'],
      ['quizzes', 'Practice', 'Quiz and code checks. They follow the lesson. They are not the whole course.', 'quizzes/index.html'],
      ['projects', 'Final projects', 'Five short builds. The 55 lab projects stay in Projects.', 'projects/index.html']
    ];
    app.innerHTML =
      '<div class="xp-row"><p class="lede" style="margin:0">Learn, then quiz, then simulate. Points come from thinking and doing.</p><span class="xp-pill" id="xp-pill">' + xpNow() + ' XP</span></div>' +
      '<div class="grid">' + cards.map(function (card) {
        const track = tracks[card[0]];
        const got = track.items.filter(function (item) { return solved.has(item.id); }).length;
        return '<article class="module"><h3>' + card[1] + '</h3><p>' + card[2] + '</p><p class="step-dots">' + got + ' / ' + track.items.length + ' done</p><a class="btn" href="' + root + card[3] + '">Play</a></article>';
      }).join('') + '</div>';
    return;
  }

  const track = tracks[mode];
  if (!track) return;
  let index = 0;
  let catIndex = -1;

  function activeItems() {
    if (catIndex >= 0 && track.categories) return track.categories[catIndex].items;
    return track.items;
  }

  function categoryDone() {
    if (catIndex < 0) return false;
    const solved = solvedSet(read());
    return activeItems().every(function (it) { return solved.has(it.id); });
  }

  function figHtml(item) {
    let file = item.image || stepArt[item.id] || '';
    if (!file && catIndex >= 0 && track.categories) file = track.categories[catIndex].image || '';
    if (!file) return '';
    return '<img class="learn-fig" src="' + root + file + '" alt="' + escapeHtml(item.title) + '">';
  }

  function labHtml(item) {
    const href = item.lab || stepLab[item.id];
    if (!href) return '';
    const label = item.kind === 'predict' || item.kind === 'sim' ? 'Run in Simulator' : 'Try it in the lab';
    return '<p><a class="btn ghost" data-return="1" href="' + root + href + '">' + label + '</a></p>';
  }

  function rememberPlace() {
    const cat = catIndex >= 0 && track.categories ? track.categories[catIndex] : null;
    const href = location.pathname + location.search + (cat ? '#cat-' + cat.id : (location.hash || ''));
    try {
      sessionStorage.setItem('edu-platform-return', JSON.stringify({
        href: href,
        cat: cat ? cat.id : '',
        index: index,
        label: cat ? cat.name : (track.title || 'lesson'),
        pending: true
      }));
    } catch (e) {}
  }

  function savedPlace(cat) {
    try {
      const saved = JSON.parse(sessionStorage.getItem('edu-platform-return') || 'null');
      if (!saved || !saved.pending || !cat || saved.cat !== cat.id) return -1;
      if (saved.index < 0) return -1;
      saved.pending = false;
      sessionStorage.setItem('edu-platform-return', JSON.stringify(saved));
      return saved.index;
    } catch (e) { return -1; }
  }

  function maybeBonuses() {
    if (!track.categories || catIndex < 0 || !categoryDone()) return 0;
    const cat = track.categories[catIndex];
    let extra = award('cat:' + cat.id, 100);
    if (!cat.level) return extra;
    const solved = solvedSet(read());
    const group = track.categories.filter(function (c) { return c.level === cat.level; });
    const levelDone = group.every(function (c) {
      return c.items.every(function (it) { return solved.has(it.id); });
    });
    if (levelDone) extra += award('lvl:' + cat.level, 250);
    return extra;
  }

  function showCategories() {
    catIndex = -1;
    const solved = solvedSet(read());
    const cats = track.categories || [];
    const levels = track.levels && track.levels.length ? track.levels : [{ id: '', name: '', blurb: '' }];
    function card(cat, i) {
      const got = cat.items.filter(function (it) { return solved.has(it.id); }).length;
      const done = got === cat.items.length;
      const pic = cat.image ? '<img class="cat-fig" src="' + root + cat.image + '" alt="' + escapeHtml(cat.name) + '">' : '';
      const steps = ['Concept'];
      if (cat.items.some(function (it) { return it.kind === 'mcq' || it.kind === 'drag'; })) steps.push('quiz');
      if (cat.items.some(function (it) { return it.kind === 'predict'; })) steps.push('code prediction');
      if (cat.items.some(function (it) { return it.kind === 'sim'; })) steps.push('simulator');
      if (cat.items.some(function (it) { return it.kind === 'blanks' || it.kind === 'wire' || it.kind === 'order'; })) steps.push('mini project');
      return '<article class="module">' + pic + '<h3>' + escapeHtml(cat.name) + '</h3><p>' + escapeHtml(cat.blurb) + '</p><p class="step-dots">' + steps.join(' · ') + '<br>' + got + ' / ' + cat.items.length + (done ? ' · complete' : '') + '</p><button class="btn" type="button" data-cat="' + i + '">Open</button></article>';
    }
    const blocks = levels.map(function (level) {
      const rows = cats.map(function (cat, i) { return { cat: cat, i: i }; }).filter(function (row) {
        return !level.id || row.cat.level === level.id;
      });
      if (!rows.length) return '';
      const head = level.name ? '<h2 class="level-title" id="level-' + escapeHtml(level.id) + '">' + escapeHtml(level.name) + '</h2>' + (level.blurb ? '<p class="lede">' + escapeHtml(level.blurb) + '</p>' : '') : '';
      return head + '<div class="grid">' + rows.map(function (row) { return card(row.cat, row.i); }).join('') + '</div>';
    }).join('');
    app.innerHTML =
      '<div class="xp-row"><span class="step-dots">' + (track.levels ? track.levels.length + ' levels · ' : '') + cats.length + ' topics</span><span class="xp-pill">' + xpNow() + ' XP</span></div>' +
      blocks;
    function openCat(i) {
      catIndex = i;
      const items = activeItems();
      const cat = track.categories[i];
      const savedIndex = savedPlace(cat);
      if (savedIndex >= 0 && savedIndex < items.length) index = savedIndex;
      else {
        const solvedNow = solvedSet(read());
        const first = items.findIndex(function (it) { return !solvedNow.has(it.id); });
        index = first === -1 ? 0 : first;
      }
      render();
    }
    app.querySelectorAll('[data-cat]').forEach(function (btn) {
      btn.onclick = function () { openCat(Number(btn.dataset.cat)); };
    });
    const hash = (location.hash || '').replace('#', '');
    if (hash.indexOf('cat-') === 0) {
      const found = cats.findIndex(function (cat) { return cat.id === hash.slice(4); });
      if (found >= 0) openCat(found);
      return;
    }
    if (hash.indexOf('level-') === 0) {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ block: 'start' });
    }
  }

  function render() {
    const items = activeItems();
    const item = items[index];
    const solved = solvedSet(read());
    const allDone = track.items.every(function (it) { return solved.has(it.id); });
    const catDone = categoryDone();
    const cat = catIndex >= 0 && track.categories ? track.categories[catIndex] : null;
    const catName = cat ? cat.name : '';
    const kickers = { concept: 'Concept · +5 XP', mcq: 'Quiz · +10 XP', drag: 'Quiz · +15 XP', predict: 'Code prediction · +15 XP', sim: 'Simulator challenge · +25 XP', blanks: 'Mini project · +50 XP', wire: 'Mini project · +50 XP', order: 'Mini project · +50 XP' };
    const build = item.kind === 'blanks' || item.kind === 'wire' || item.kind === 'order';
    let banner = '';
    const projectLine = cat && cat.project ? '<p class="story">Next build, kept in Projects: <a data-return="1" href="' + root + cat.project.href + '">' + escapeHtml(cat.project.label) + '</a></p>' : '';
    if (allDone) banner = '<p class="feedback good">Every topic is complete. The ' + escapeHtml(track.title) + ' certificate is on your account. <a href="' + root + 'account/index.html">See it</a></p>';
    else if (catDone) banner = '<p class="feedback good">' + escapeHtml(catName) + ' is complete. Category bonus is +100 XP. A finished level adds +250 XP.</p>';
    const body = item.kind === 'concept' ? conceptHtml() : item.kind === 'drag' ? dragHtml(item) : build ? workHtml(item) + '<p><button class="btn" type="button" id="submit-project">Submit</button></p>' : mcqHtml(item);
    const told = item.story || (build ? item.brief : '');
    const taskLine = item.task ? (build ? '<p class="story"><b>' + escapeHtml(item.task) + '.</b></p>' : '<p class="story"><b>Challenge.</b> ' + escapeHtml(item.task) + '</p>') : '';
    app.innerHTML =
      '<div class="xp-row"><span class="step-dots">' + (catName ? escapeHtml(catName) + ' · ' : '') + (index + 1) + ' / ' + items.length + (solved.has(item.id) ? ' · done' : '') + '</span><span class="xp-pill" id="xp-pill">' + xpNow() + ' XP</span></div>' +
      '<article class="panel learn-card"><p class="unit-kicker">' + escapeHtml(kickers[item.kind] || 'Step') + '</p><h2>' + escapeHtml(item.title) + '</h2>' +
      '<div class="learn-top">' + figHtml(item) + '<div>' +
      (told ? '<p class="story">' + escapeHtml(told) + '</p>' : '') +
      taskLine +
      (build ? '' : labHtml(item)) +
      '</div></div>' +
      (!build && item.code ? '<pre class="code-line">' + escapeHtml(item.code) + '</pre>' : '') +
      body +
      projectLine +
      '<p class="feedback" id="feedback"></p>' +
      '<div class="learn-nav">' +
      (catIndex >= 0 ? '<button class="btn ghost" type="button" id="all-cats">All topics</button>' : '') +
      '<button class="btn ghost" type="button" id="prev">Back</button><button class="btn" type="button" id="next">Next</button></div>' +
      banner +
      '</article>';

    const prev = document.getElementById('prev');
    const next = document.getElementById('next');
    const hasCats = catIndex >= 0 && track.categories;
    const prevTopic = hasCats && index === 0 && catIndex > 0;
    const nextTopic = hasCats && index === items.length - 1 && catIndex < track.categories.length - 1;
    prev.disabled = index === 0 && !prevTopic;
    next.disabled = index === items.length - 1 && !nextTopic;
    if (prevTopic) prev.textContent = 'Previous lesson';
    if (nextTopic) next.textContent = 'Next lesson';
    function goTopic(to, atEnd) {
      catIndex = to;
      const nextItems = activeItems();
      if (atEnd) index = nextItems.length - 1;
      else {
        const solvedNow = solvedSet(read());
        const first = nextItems.findIndex(function (it) { return !solvedNow.has(it.id); });
        index = first === -1 ? 0 : first;
      }
      const id = track.categories[catIndex] && track.categories[catIndex].id;
      if (id) history.replaceState(null, '', location.pathname + location.search + '#cat-' + id);
      render();
    }
    prev.onclick = function () {
      if (index > 0) { index -= 1; render(); return; }
      if (prevTopic) goTopic(catIndex - 1, true);
    };
    next.onclick = function () {
      if (index < items.length - 1) { index += 1; render(); return; }
      if (nextTopic) goTopic(catIndex + 1, false);
    };
    const cats = document.getElementById('all-cats');
    if (cats) cats.onclick = showCategories;
    app.querySelectorAll('[data-return]').forEach(function (link) {
      link.addEventListener('click', rememberPlace);
    });

    if (item.kind === 'concept') bindConcept(item);
    else if (item.kind === 'drag') bindDrag(item);
    else if (item.kind === 'blanks' || item.kind === 'wire' || item.kind === 'order') {
      const draft = readDrafts()[item.id];
      if (item.kind === 'wire') bindWire(item, Array.isArray(draft) ? draft : []);
      else if (item.kind === 'blanks') bindBlanks(item, Array.isArray(draft) ? draft : []);
      else bindOrder(item, Array.isArray(draft) ? draft : null);
    } else bindMcq(item);
  }

  function conceptHtml() {
    return '<button class="btn" type="button" id="mark-read">I read this</button>';
  }

  function mcqHtml(item) {
    return '<p><b>' + escapeHtml(item.q) + '</b></p><div class="choices">' +
      item.choices.map(function (choice, i) {
        return '<button class="choice" type="button" data-i="' + i + '">' + escapeHtml(choice) + '</button>';
      }).join('') + '</div>';
  }

  function dragHtml(item) {
    return '<pre class="code-line">' + escapeHtml(item.before) + '<button class="slot" type="button" id="slot">drop</button>' + escapeHtml(item.after) + '</pre>' +
      '<div class="chips">' + item.chips.map(function (chip) {
        return '<button class="chip" type="button" draggable="true" data-chip="' + escapeHtml(chip) + '">' + escapeHtml(chip) + '</button>';
      }).join('') + '</div><button class="btn" type="button" id="check-drag">Check</button>';
  }

  function say(ok, text, gained) {
    const el = document.getElementById('feedback');
    const pill = document.getElementById('xp-pill');
    if (pill) pill.textContent = xpNow() + ' XP';
    if (!el) return;
    el.className = 'feedback ' + (ok ? 'good' : 'bad');
    el.textContent = text + (gained ? '  +' + gained + ' XP' : '');
  }

  function bindMcq(item) {
    app.querySelectorAll('.choice').forEach(function (btn) {
      btn.onclick = function () {
        const pick = Number(btn.dataset.i);
        app.querySelectorAll('.choice').forEach(function (b) { b.classList.remove('good', 'bad'); });
        if (pick === item.answer) {
          btn.classList.add('good');
          const gained = award(item.id, item.xp) + maybeBonuses();
          markModule(track.module);
          say(true, gained ? 'Nice.' : 'Already collected.', gained);
          if (categoryDone() || track.items.every(function (it) { return solvedSet(read()).has(it.id); })) render();
        } else {
          btn.classList.add('bad');
          say(false, item.hint, 0);
        }
      };
    });
  }

  function bindConcept(item) {
    document.getElementById('mark-read').onclick = function () {
      const gained = award(item.id, item.xp) + maybeBonuses();
      markModule(track.module);
      say(true, gained ? 'Concept saved.' : 'Already collected.', gained);
      if (categoryDone() || track.items.every(function (it) { return solvedSet(read()).has(it.id); })) render();
    };
  }

  function bindDrag(item) {
    const slot = document.getElementById('slot');
    let held = '';
    function fill(value) { slot.textContent = value; slot.classList.remove('good'); }
    app.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('dragstart', function () { held = chip.dataset.chip; });
      chip.onclick = function () { fill(chip.dataset.chip); };
    });
    slot.addEventListener('dragover', function (e) { e.preventDefault(); slot.classList.add('over'); });
    slot.addEventListener('dragleave', function () { slot.classList.remove('over'); });
    slot.addEventListener('drop', function (e) {
      e.preventDefault();
      slot.classList.remove('over');
      if (held) fill(held);
    });
    slot.onclick = function () { slot.textContent = 'drop'; slot.classList.remove('good'); };
    document.getElementById('check-drag').onclick = function () {
      if (slot.textContent === item.answer) {
        slot.classList.add('good');
        const gained = award(item.id, item.xp) + maybeBonuses();
        markModule(track.module);
        say(true, gained ? 'That fits.' : 'Already collected.', gained);
        if (categoryDone() || track.items.every(function (it) { return solvedSet(read()).has(it.id); })) render();
      } else {
        say(false, 'Not that one. Try another chip.', 0);
      }
    };
  }

  function startLearn() {
    syncAll();
    if (track.categories) showCategories();
    else render();
  }

  if (window.EduSync) window.EduSync.hydrate().then(startLearn, startLearn);
  else startLearn();
})();
