# Device Power Energy Card

A glassmorphism-style custom Lovelace card for Home Assistant to monitor server rack power metrics in style.

![Preview](preview.html)

## ✨ Features

- 🌊 **Glassmorphism** design with soft glow effects
- ⚡ **Animated arc gauge** for real-time power display
- 📊 Energy · Current · Power Factor stats
- 🔌 Voltage & Frequency row
- 🟢 Online/Offline status indicator
- 👆 Tap any metric to open the HA more-info dialog

-----

## 📦 Installation

### HACS (recommended)

1. Open HACS → Frontend → ⊕ Explore & Download
1. Search for **Server Rack Card**
1. Download and reload

### Manual

1. Copy `server-rack-card.js` to `config/www/server-rack-card/server-rack-card.js`
1. In Home Assistant go to **Settings → Dashboards → ⋮ → Resources**
1. Add resource: `/local/server-rack-card/server-rack-card.js` (type: JavaScript Module)
1. Reload the browser

-----

## ⚙️ Configuration

```yaml
type: custom:server-rack-card
title: Server Rack
power_entity: sensor.consum_server_rack
flow_entity: sensor.flow_server_rack
energy_entity: sensor.total_server_rack
current_entity: sensor.amperaj_server_rack
power_factor_entity: sensor.factor_server_rack
voltage_entity: sensor.voltaj
frequency_entity: sensor.frecventa
max_power: 500
```

### Options

|Option               |Type  |Default      |Description                             |
|---------------------|------|-------------|----------------------------------------|
|`type`               |string|**required** |`custom:server-rack-card`               |
|`title`              |string|`Server Rack`|Card title                              |
|`power_entity`       |string|**required** |Current power consumption sensor (W)    |
|`flow_entity`        |string|optional     |Flow direction sensor (e.g. `consuming`)|
|`energy_entity`      |string|optional     |Total energy sensor (kWh)               |
|`current_entity`     |string|optional     |Current sensor (A)                      |
|`power_factor_entity`|string|optional     |Power factor sensor (%)                 |
|`voltage_entity`     |string|optional     |Voltage sensor (V)                      |
|`frequency_entity`   |string|optional     |Frequency sensor (Hz)                   |
|`max_power`          |number|`500`        |Max power for gauge arc scale (W)       |

-----

## 🖼️ Preview

Open `preview.html` in any browser for a live interactive demo with a power slider.

-----

## 📄 License

MIT
