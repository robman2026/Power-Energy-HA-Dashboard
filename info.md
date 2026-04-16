# Server Rack Card

Glassmorphism-style Lovelace card for monitoring server rack power metrics.

## Quick start

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

See the [README](README.md) for the full configuration reference.
