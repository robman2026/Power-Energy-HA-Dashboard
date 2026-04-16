# ⚡ Power Monitor Card

A responsive, multi-device glassmorphism Lovelace card for monitoring power circuits in Home Assistant.  
Configure any number of devices — show them in a responsive grid that adapts to desktop and mobile automatically.

---

## ✨ Features

- 📊 **Multiple devices** in one card — one tile per circuit/outlet
- 📱 **Responsive grid** — auto or fixed columns (1 / 2 / 3 / 4)
- 🎛️ **Visual editor** — configure everything without touching YAML
- 🌊 **Glassmorphism** design with animated arc gauge and soft glow
- 🔌 Per-tile: Power · Energy · Current · Power Factor · Voltage · Frequency
- 🟢 Online / Offline status per device
- 👆 Tap any metric → opens the HA more-info dialog
- 🧩 All entity fields optional — only configured sensors are shown

---

## 📦 Installation

### HACS (recommended)
1. Open HACS → Frontend → ⊕ Explore & Download
2. Search for **Power Monitor Card**
3. Download and reload the browser

### Manual
1. Copy `power-monitor-card.js` to `config/www/power-monitor-card/power-monitor-card.js`
2. Go to **Settings → Dashboards → ⋮ → Resources**
3. Add resource: `/local/power-monitor-card/power-monitor-card.js` (type: JavaScript Module)
4. Reload the browser

---

## ⚙️ Configuration

The card supports a **visual editor** — click the pencil icon when adding the card to configure it without YAML.

### Minimal YAML example

```yaml
type: custom:power-monitor-card
devices:
  - name: Laundry
    power_entity: sensor.consum_laundry
```

### Full YAML example

```yaml
type: custom:power-monitor-card
title: Power Monitor           # optional card header
columns: 3                     # 1-4 or omit for auto

devices:
  - name: Laundry
    power_entity:        sensor.consum_laundry
    flow_entity:         sensor.flow_laundry
    energy_entity:       sensor.total_laundry
    current_entity:      sensor.amperaj_laundry
    power_factor_entity: sensor.factor_laundry
    voltage_entity:      sensor.voltaj
    frequency_entity:    sensor.frecventa
    max_power: 500

  - name: Kitchen, WC
    power_entity:        sensor.consum_kitchen_wc
    flow_entity:         sensor.flow_kitchen_wc
    energy_entity:       sensor.total_kitchen_wc
    current_entity:      sensor.amperaj_kitchen_wc
    power_factor_entity: sensor.factor_kitchen_wc
    voltage_entity:      sensor.voltaj
    frequency_entity:    sensor.frecventa

  - name: Heating
    power_entity:        sensor.consum_heitzung
    energy_entity:       sensor.total_heitzung
    current_entity:      sensor.amperaj_heitzung
    max_power: 3000
```

### Card options

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | string | — | Optional header shown above the grid |
| `columns` | number | auto | Fixed column count (1–4). Omit for auto responsive |
| `devices` | list | required | List of device objects (see below) |

### Device options

| Option | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Display name for the tile |
| `power_entity` | string | ✅ | Current power sensor (W) |
| `flow_entity` | string | — | Flow direction sensor (`consuming` / `returning`) |
| `energy_entity` | string | — | Total energy sensor (kWh) |
| `current_entity` | string | — | Current sensor (A) |
| `power_factor_entity` | string | — | Power factor sensor (%) |
| `voltage_entity` | string | — | Voltage sensor (V) |
| `frequency_entity` | string | — | Frequency sensor (Hz) |
| `max_power` | number | — | Max W for the gauge arc scale (default: 500) |

---

## 🖼️ Preview

Open `preview.html` in any browser for an interactive live demo with sliders and column switcher.

---

## 📄 License

MIT
