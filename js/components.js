(function () {
  const host = document.getElementById('component-catalog');
  if (!host) return;
  const root = host.dataset.root || '';
  const rgb = '<svg viewBox="0 0 48 64" width="48" height="64"><rect x="20" y="40" width="3" height="18" fill="#94a3b8"/><rect x="26" y="44" width="3" height="14" fill="#94a3b8"/><path d="M10 40 L10 22 A14 14 0 0 1 38 22 L38 40 Z" fill="#a78bfa"/><ellipse cx="24" cy="40" rx="14" ry="4" fill="#27272a"/></svg>';
  const board = '<svg viewBox="0 0 120 70" width="96" height="56"><rect x="4" y="8" width="112" height="54" rx="4" fill="#e8d5a3" stroke="#a89060"/><g fill="#d6d3d1">' +
    [18, 34, 50, 66, 82, 98].map(function (x) { return '<circle cx="' + x + '" cy="24" r="3"/><circle cx="' + x + '" cy="40" r="3"/>'; }).join('') +
    '</g></svg>';

  const groups = [
    {
      title: 'Basics',
      items: [
        { name: 'Resistor 220Ω', svg: 'resistor.svg', example: 'led_chase', text: 'Four LEDs chase along pins 10 to 13. Each LED has its own 220Ω resistor.' },
        { name: 'Breadboard', icon: board, example: 'led_chase', breadboard: true, text: 'The same chase circuit, with the breadboard on the canvas so wires can land on its holes.' }
      ]
    },
    {
      title: 'Lights',
      items: [
        { name: 'Red LED', svg: 'led-red.svg', example: 'blink', text: 'Classic blink on pin 13, with a 220Ω resistor in series.' },
        { name: 'Green LED', svg: 'led-green.svg', example: 'serial', text: 'A green LED on pin 13. Send 1 or 0 from the serial monitor to switch it.' },
        { name: 'Yellow LED', svg: 'led-yellow.svg', example: 'water_level', text: 'Medium water level in the tank alarm. A 220Ω resistor sits in front of the yellow LED.' },
        { name: 'Blue LED', svg: 'led-blue.svg', example: 'esp32_blink', board: 'esp32', text: 'ESP32 sketch on GPIO2. The onboard LED and a blue LED blink together.' },
        { name: 'RGB LED', icon: rgb, example: 'rgb', text: 'Color mixing. The sketch drives the red, green, and blue legs.' },
        { name: 'Lamp', svg: 'bulb.svg', example: 'switch_lamp', text: 'A slide switch turns the bulb on and off.' }
      ]
    },
    {
      title: 'Controls',
      items: [
        { name: 'Push button', svg: 'button.svg', example: 'button', text: 'Hold the button and the green LED follows it.' },
        { name: 'Potentiometer', svg: 'pot.svg', example: 'pot', text: 'Turn the knob. Pin 11 fades the LED with the reading on A0.' },
        { name: 'Slide switch', svg: 'switch.svg', example: 'switch_lamp', text: 'Flip the switch to light the bulb.' }
      ]
    },
    {
      title: 'Sensors',
      items: [
        { name: 'HC-SR04', svg: 'hcsr04.svg', example: 'ultrasonic', text: 'Distance sensor. Move the slider and the serial monitor prints centimeters.' },
        { name: 'PIR', svg: 'pir.svg', example: 'pir', text: 'Motion sensor. Click the dome to toggle motion.' },
        { name: 'LDR', svg: 'ldr.svg', example: 'ldr', text: 'Light sensor used as a night light. The slider is the light level.' },
        { name: 'DHT11', svg: 'dht11.svg', example: 'dht', text: 'Temperature and humidity. Two sliders feed the serial printout.' },
        { name: 'Soil moisture', svg: 'soil.svg', example: 'plant_water', text: 'A dry reading on A0 closes the relay and starts the pump. Slide moisture up and the pump stops.' }
      ]
    },
    {
      title: 'Motion',
      items: [
        { name: 'Servo', svg: 'servo.svg', example: 'servo', text: 'SG90 on pin 9. Run the sketch and the horn sweeps to 180°.' },
        { name: 'Fan', svg: 'fan.svg', example: 'fan_speed', text: 'DC fan on pin 9. A potentiometer on A0 sets how fast the rotor spins.' },
        { name: 'Water pump', svg: 'pump.svg', example: 'plant_water', text: 'The pump runs when the soil is dry. A relay switches it from pin 7.' }
      ]
    },
    {
      title: 'Sound and displays',
      items: [
        { name: 'Buzzer', svg: 'buzzer.svg', example: 'tone', text: 'Plays a short scale with tone() on pin 8.' },
        { name: 'Relay', svg: 'relay.svg', example: 'relay', text: 'A button drives the relay coil and the module LED shows the contact.' },
        { name: '7-segment', svg: 'seg7.svg', example: 'seg7', text: 'Counts on a single digit as the segment pins go high.' },
        { name: 'LCD 16×2', svg: 'lcd.svg', example: 'lcd', text: 'Prints a message on the character display.' },
        { name: 'OLED 0.96"', svg: 'oled.svg', example: 'oled_hello', text: 'A 128×64 I2C display. The sketch prints a message on the blue module.' }
      ]
    }
  ];

  host.innerHTML = groups.map(function (group) {
    const cards = group.items.map(function (item) {
      const board = item.board || 'uno';
      let href = root + 'arduino_simulator_v7.html?board=' + board + '&example=' + item.example;
      if (item.breadboard) href += '&breadboard=1';
      const thumb = item.svg
        ? '<img class="thumb part" src="' + root + 'assets/svg/' + item.svg + '" alt="">'
        : '<div class="thumb part">' + item.icon + '</div>';
      return '<a class="module" href="' + href + '">' + thumb + '<h3>' + item.name + '</h3><p>' + item.text + '</p></a>';
    }).join('');
    return '<h3 class="group-title">' + group.title + '</h3><div class="grid">' + cards + '</div>';
  }).join('');
})();
