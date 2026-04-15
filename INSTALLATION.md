# Server Rack Card - Installation Guide

## Quick Start

### Option 1: Manual Installation (Recommended)

1. **Download the card file**
   - Get `server-rack-card.js` from the repository

2. **Place in Home Assistant**
   - Copy the file to: `~/.homeassistant/www/community/server-rack-card/`
   - Create directories if they don't exist

3. **Register the resource**
   - Open Home Assistant web interface
   - Go to: **Settings → Dashboards → Resources**
   - Click **"Create Resource"** (blue button, bottom right)
   - Enter:
     - URL: `/local/community/server-rack-card/server-rack-card.js`
     - Resource type: **JavaScript Module**
   - Click **Create**

4. **Add to your dashboard**
   - Edit your dashboard
   - Click **Create card** (or edit existing dashboard YAML)
   - Paste the configuration below
   - Adjust entity names to match your sensors

### Configuration Template

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

## Finding Your Entity Names

1. Go to: **Settings → Devices & Services → Entities**
2. Search for your power monitoring device
3. Look for entities like:
   - `sensor.*_power` (Power in Watts)
   - `sensor.*_energy` (Total energy in kWh)
   - `sensor.*_current` (Current in Amps)
   - `sensor.*_power_factor` (Power factor as %)
   - `sensor.*_voltage` (Voltage in V)
   - `sensor.*_frequency` (Frequency in Hz)

Copy the entity IDs (e.g., `sensor.consum_server_rack`) to your configuration.

## Troubleshooting

### "Custom element not found" error

**Solution:**
1. Hard refresh your browser: `Ctrl+Shift+Del` (Windows) or `Cmd+Shift+Del` (Mac)
2. Clear Home Assistant browser cache:
   - Settings → Developer Tools → Clear Cache
3. Reload the page: `F5`

### Entities showing as "unavailable" or "--"

**Solution:**
1. Check entity names are correct
2. Go to Developer Tools → States
3. Search for your entities
4. Verify they have valid numeric values
5. Check Home Assistant logs for errors

### Card not updating in real-time

**Solution:**
1. Verify entity state changes in Developer Tools
2. Check that sensors are updating properly
3. Reload the dashboard
4. If using MQTT, ensure broker is connected

### Styling looks wrong

**Solution:**
1. Check browser compatibility (IE11 not supported)
2. Clear cache and hard refresh
3. Try a different browser
4. Check for CSS conflicts with other cards

## File Structure for GitHub Repo

```
server-rack-card/
├── server-rack-card.js          # Main card component
├── preview.html                 # Preview/demo page
├── README.md                    # Full documentation
├── INSTALLATION.md              # This file
├── package.json                 # NPM metadata
├── LICENSE                      # MIT license
├── .gitignore                   # Git ignore rules
└── hacs.json                    # HACS manifest (optional)
```

## Optional: HACS Installation

If you want to support installation via HACS (Home Assistant Community Store):

1. Add `hacs.json` to your repo:

```json
{
  "name": "Server Rack Card",
  "content_in_root": false,
  "filename": "server-rack-card.js",
  "homeassistant": "2023.8.0",
  "render_readme": true,
  "domains": ["sensor", "binary_sensor"]
}
```

2. Follow HACS submission guidelines at: https://hacs.xyz/docs/publish/include

## Advanced Configuration

### Multiple Cards on One Dashboard

```yaml
type: vertical-stack
cards:
  - type: custom:server-rack-card
    title: Main Server Rack
    power_entity: sensor.main_rack_power
    energy_entity: sensor.main_rack_energy
    current_entity: sensor.main_rack_current
    power_factor_entity: sensor.main_rack_power_factor
    voltage_entity: sensor.main_rack_voltage
    frequency_entity: sensor.main_rack_frequency

  - type: custom:server-rack-card
    title: Backup Server Rack
    power_entity: sensor.backup_rack_power
    energy_entity: sensor.backup_rack_energy
    current_entity: sensor.backup_rack_current
    power_factor_entity: sensor.backup_rack_power_factor
    voltage_entity: sensor.backup_rack_voltage
    frequency_entity: sensor.backup_rack_frequency
```

### With Custom Styling

Add to your Home Assistant `www/custom.css`:

```css
/* Change primary accent color */
server-rack-card {
  --primary-color: #8b5cf6;              /* Purple instead of blue */
  --primary-glow: rgba(139, 92, 246, 0.3);
  --accent-glow: rgba(139, 92, 246, 0.5);
  --border-color: rgba(139, 92, 246, 0.2);
}

/* Make card taller */
.server-rack-card {
  min-height: 600px;
}
```

Then include in your Lovelace config:

```yaml
resources:
  - url: /local/custom.css
    type: css
```

## Performance Tips

1. **Use local sensors**: Avoid polling external APIs in the card
2. **Limit update frequency**: Sensor update_interval = 30s is fine
3. **Minimize dashboards**: Don't have 20+ cards on one dashboard
4. **Browser caching**: Clear cache monthly to prevent issues

## Sensor Setup Examples

### Shelly EM (Recommended)

Shelly EM automatically creates proper entities in Home Assistant:

```yaml
shelly:
  username: !secret shelly_username
  password: !secret shelly_password
```

Then use the auto-discovered entities.

### Modbus RTU/TCP

```yaml
modbus:
  - name: power_meter
    type: tcp
    host: 192.168.1.100
    port: 502
    sensors:
      - name: Power
        slave: 1
        address: 0
        unit_of_measurement: W
        count: 2
```

### MQTT (Homekit Bridge)

```yaml
mqtt:
  sensor:
    - name: "Server Power"
      state_topic: "home/server/power"
      unit_of_measurement: "W"
      device_class: power
```

### Template Sensor

If you need to derive values:

```yaml
template:
  - sensor:
      - name: "Server Power Factor"
        unit_of_measurement: "%"
        value_template: "{{ (states('sensor.power') | float / states('sensor.apparent_power') | float * 100) | round(0) }}"
```

## Need Help?

1. **Check the README.md** for full documentation
2. **View preview.html** in a browser for visual demo
3. **Open an issue** on GitHub with:
   - Home Assistant version
   - Browser and version
   - Screenshot of error
   - Your configuration (mask sensitive info)

## What's Next?

After installation:
- Customize colors and styling
- Add multiple cards for different devices
- Create automations triggered by power thresholds
- Set up energy monitoring dashboard

Happy monitoring! 🎉
