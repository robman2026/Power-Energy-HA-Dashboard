# Device Power Energy Card

A beautiful, modern Home Assistant custom card for monitoring device power consumption and electrical metrics. Features a glassmorphic design with soft glow effects and real-time data visualization.

![Preview](preview.html)

## Features

✨ **Modern Design**
- Glassmorphic card design with backdrop blur effects
- Soft glow animations and smooth transitions
- Responsive layout for mobile and desktop
- Dark theme optimized for Home Assistant

⚡ **Real-Time Monitoring**
- Large, animated power consumption ring display
- Active/Idle status indicator
- Live metric updates
- Green status indicator with pulse animation

📊 **Comprehensive Metrics**
- Power consumption (Watts)
- Total energy usage (kWh)
- Electrical current (Amps)
- Power factor (%)
- Voltage (V)
- Frequency (Hz)

🎨 **Visual Effects**
- Animated glow pulse on the power ring
- Hover effects on metric cards
- Gradient text for power values
- Floating background animations
- Smooth state transitions

## Installation

### 1. Download the card

Copy the `server-rack-card.js` file to your Home Assistant configuration:

```
~/.homeassistant/www/community/server-rack-card/server-rack-card.js
```

If the directory doesn't exist, create it.

### 2. Add to your dashboard

Add the custom card to your Home Assistant YAML configuration:

```yaml
type: custom:server-rack-card
title: Server Rack
power_entity: sensor.consum_server_rack
energy_entity: sensor.total_server_rack
current_entity: sensor.amperaj_server_rack
power_factor_entity: sensor.factor_server_rack
voltage_entity: sensor.voltaj
frequency_entity: sensor.frecventa
flow_entity: binary_sensor.flow_server_rack
```

### 3. Register the resource

In Home Assistant, go to:
- Settings → Dashboards → Resources
- Click "Create Resource"
- URL: `/local/community/server-rack-card/server-rack-card.js`
- Resource type: JavaScript Module

## Configuration

### Basic Configuration

```yaml
type: custom:server-rack-card
title: Server Rack                          # Card title
power_entity: sensor.power                  # Current power (W)
energy_entity: sensor.energy                # Total energy (kWh)
current_entity: sensor.current              # Electrical current (A)
power_factor_entity: sensor.power_factor    # Power factor (%)
voltage_entity: sensor.voltage              # Voltage (V)
frequency_entity: sensor.frequency          # Frequency (Hz)
flow_entity: binary_sensor.flow             # Flow status
```

### Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `type` | string | Yes | Must be `custom:server-rack-card` |
| `title` | string | No | Card title (default: "Server Rack") |
| `power_entity` | string | Yes | Entity for power consumption in Watts |
| `energy_entity` | string | Yes | Entity for total energy in kWh |
| `current_entity` | string | Yes | Entity for current in Amps |
| `power_factor_entity` | string | Yes | Entity for power factor in % |
| `voltage_entity` | string | Yes | Entity for voltage in Volts |
| `frequency_entity` | string | Yes | Entity for frequency in Hz |
| `flow_entity` | string | No | Entity for flow status (optional) |

## Example Dashboard Configuration

```yaml
views:
  - title: Power Monitoring
    cards:
      - type: custom:server-rack-card
        title: Main Server Rack
        power_entity: sensor.rack_power_consumption
        energy_entity: sensor.rack_total_energy
        current_entity: sensor.rack_current
        power_factor_entity: sensor.rack_power_factor
        voltage_entity: sensor.rack_voltage
        frequency_entity: sensor.rack_frequency
        flow_entity: binary_sensor.rack_flow_status

      - type: custom:server-rack-card
        title: Backup Server
        power_entity: sensor.backup_power_consumption
        energy_entity: sensor.backup_total_energy
        current_entity: sensor.backup_current
        power_factor_entity: sensor.backup_power_factor
        voltage_entity: sensor.backup_voltage
        frequency_entity: sensor.backup_frequency
```

## Requirements

- Home Assistant 2023.8 or later
- A compatible browser with support for:
  - CSS Grid
  - CSS Variables
  - Backdrop Filter
  - Custom Elements API

## Entity Mapping Examples

### For Modbus/TCP Devices

If you're using Modbus to read power data, map your registers:

```yaml
sensor:
  - platform: modbus
    name: Rack Power
    slave: 1
    register: 0
    unit_of_measurement: W
    device_class: power
```

### For MQTT/Home Assistant Companion

```yaml
sensor:
  - platform: mqtt
    name: "Rack Power"
    state_topic: "home/rack/power"
    unit_of_measurement: "W"
    device_class: power
```

### For Shelly EM Devices

```yaml
sensor:
  - platform: shellyem
    name: Rack Power
```

## Customization

### Change Colors

The card uses CSS variables for theming. To customize, add to your Home Assistant `www/custom_styles.css`:

```css
server-rack-card {
  --primary-color: #3b82f6;           /* Blue accent */
  --primary-glow: rgba(59, 130, 246, 0.3);
  --bg-dark: rgba(15, 23, 42, 0.8);
  --border-color: rgba(59, 130, 246, 0.2);
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --accent-glow: rgba(59, 130, 246, 0.5);
}
```

### Adjust Size

The card is responsive but defaults to 400px max-width. To change:

```css
server-rack-card {
  max-width: 500px;
}
```

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full support |
| Firefox | ✅ Full support |
| Safari | ✅ Full support (14+) |
| Edge | ✅ Full support |
| IE 11 | ❌ Not supported |

## Troubleshooting

### Card Not Appearing

1. Check that the resource is properly registered in Settings → Dashboards → Resources
2. Verify the file path is correct
3. Clear browser cache (Ctrl+Shift+Del)
4. Check browser console for errors (F12)

### Entities Not Showing Data

1. Verify entity names in configuration match your actual entities
2. Check Home Assistant logs: `Settings → System → Logs`
3. Ensure sensors have valid numeric values
4. Use Developer Tools → States to verify entity exists

### Styling Issues

1. Check that backdrop-filter is supported in your browser
2. Try updating Home Assistant to the latest version
3. Disable browser extensions that might interfere with CSS
4. Clear cache and reload dashboard

## Development

### File Structure

```
server-rack-card/
├── server-rack-card.js      # Main custom card component
├── preview.html             # HTML preview/demo
├── README.md                # This file
└── hacs.json                # HACS manifest (optional)
```

### Building From Source

The card is built with vanilla JavaScript and CSS. No build process required.

To modify:
1. Edit `server-rack-card.js`
2. Reload Home Assistant (or clear browser cache)
3. Test on your dashboard

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check existing issues for solutions
- Provide Home Assistant version and browser information
