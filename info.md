# Power Monitor Card

Responsive, multi-device glassmorphism card for monitoring power circuits.

**Features:** multiple devices · visual editor · responsive grid · arc gauge · online status

## Quick start

```yaml
type: custom:power-monitor-card
columns: 3
devices:
  - name: Laundry
    power_entity:        sensor.consum_laundry
    energy_entity:       sensor.total_laundry
    current_entity:      sensor.amperaj_laundry
    power_factor_entity: sensor.factor_laundry
    voltage_entity:      sensor.voltaj
    frequency_entity:    sensor.frecventa

  - name: Kitchen, WC
    power_entity:        sensor.consum_kitchen_wc
    energy_entity:       sensor.total_kitchen_wc
    current_entity:      sensor.amperaj_kitchen_wc
    voltage_entity:      sensor.voltaj
    frequency_entity:    sensor.frecventa
```

See the [README](README.md) for all configuration options.
