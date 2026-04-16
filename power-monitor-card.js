/**
 * Power Monitor Card  v1.2.0
 * Multi-device, responsive, glassmorphism Lovelace custom card for Home Assistant.
 * Supports a visual editor and any number of monitored circuits/devices.
 *
 * https://github.com/robman2026/power-monitor-card
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_VERSION = '1.4.0';
const CARD_TAG     = 'power-monitor-card';
const EDITOR_TAG   = 'power-monitor-card-editor';

// Single-phase entity fields
const DEVICE_FIELDS_1P = [
  { key: 'power_entity',        label: 'Power (W)',               required: true  },
  { key: 'flow_entity',         label: 'Flow / direction',        required: false },
  { key: 'energy_entity',       label: 'Energy (kWh)',            required: false },
  { key: 'current_entity',      label: 'Current (A)',             required: false },
  { key: 'power_factor_entity', label: 'Power Factor (%)',        required: false },
  { key: 'voltage_entity',      label: 'Voltage (V)',             required: false },
  { key: 'frequency_entity',    label: 'Frequency (Hz)',          required: false },
];

// Three-phase entity fields
const DEVICE_FIELDS_3P = [
  { key: 'power_entity',          label: 'Total Power (W)',         required: true  },
  { key: 'power_a_entity',        label: 'Power Phase A (W)',       required: false },
  { key: 'power_b_entity',        label: 'Power Phase B (W)',       required: false },
  { key: 'power_c_entity',        label: 'Power Phase C (W)',       required: false },
  { key: 'flow_entity',           label: 'Flow / direction',        required: false },
  { key: 'energy_entity',         label: 'Total Energy (kWh)',      required: false },
  { key: 'energy_a_entity',       label: 'Energy Phase A (kWh)',    required: false },
  { key: 'energy_b_entity',       label: 'Energy Phase B (kWh)',    required: false },
  { key: 'energy_c_entity',       label: 'Energy Phase C (kWh)',    required: false },
  { key: 'current_a_entity',      label: 'Current Phase A (A)',     required: false },
  { key: 'current_b_entity',      label: 'Current Phase B (A)',     required: false },
  { key: 'current_c_entity',      label: 'Current Phase C (A)',     required: false },
  { key: 'voltage_a_entity',      label: 'Voltage Phase A (V)',     required: false },
  { key: 'voltage_b_entity',      label: 'Voltage Phase B (V)',     required: false },
  { key: 'voltage_c_entity',      label: 'Voltage Phase C (V)',     required: false },
  { key: 'power_factor_entity',   label: 'Power Factor (%)',        required: false },
  { key: 'power_reactive_entity', label: 'Reactive Power (VAR)',    required: false },
];

// ─── Visual Editor ────────────────────────────────────────────────────────────

class PowerMonitorCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config   = { devices: [] };
    this._expanded = {};
    this._hass     = null;
  }

  // ── HA lifecycle ───────────────────────────────────────────────────────────

  set hass(hass) {
    this._hass = hass;
    // Push hass into any already-mounted pickers immediately
    this.shadowRoot.querySelectorAll('ha-entity-picker').forEach(p => { p.hass = hass; });
    // If _render() ran before hass was ready, inject pickers now
    this._injectPickers();
  }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._config.devices) this._config.devices = [];
    this._render();
    // _injectPickers is called at end of _render(); if hass isn't ready yet
    // the hass setter will call it again once hass arrives.
  }

  // ── Config helpers ─────────────────────────────────────────────────────────

  _fire() {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  _updateGlobal(key, value) {
    if (value === '' || value == null) delete this._config[key];
    else this._config[key] = value;
    this._fire();
  }

  _updateDevice(index, key, value) {
    if (!this._config.devices[index]) return;
    if (value === '' || value == null) delete this._config.devices[index][key];
    else this._config.devices[index][key] = value;
    this._fire();
  }

  // ── Device list management ─────────────────────────────────────────────────

  _addDevice() {
    this._config.devices.push({ name: 'New Device', phase_mode: '1', power_entity: '' });
    const idx = this._config.devices.length - 1;
    this._expanded[idx] = true;
    this._render();
    this._fire();
  }

  _removeDevice(index) {
    this._config.devices.splice(index, 1);
    const newExp = {};
    Object.keys(this._expanded).forEach(k => {
      const ki = parseInt(k);
      if (ki < index) newExp[ki] = this._expanded[ki];
      else if (ki > index) newExp[ki - 1] = this._expanded[ki];
    });
    this._expanded = newExp;
    this._render();
    this._fire();
  }

  _moveDevice(index, dir) {
    const arr = this._config.devices;
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    const tmp = this._expanded[index];
    this._expanded[index]  = this._expanded[target];
    this._expanded[target] = tmp;
    this._render();
    this._fire();
  }

  _toggleExpanded(index) {
    this._expanded[index] = !this._expanded[index];
    this._render();
  }

  // ── Picker injection — separated from _render so it can be retried ─────────
  //
  // Strategy: _render() builds the shell HTML with empty <div id="picker-N-KEY">
  // slots. _injectPickers() fills those slots with ha-entity-picker elements.
  // It is called:
  //   1. At the end of _render() (covers case where hass is already set)
  //   2. From the hass setter (covers case where hass arrives after _render)
  // The guard `slot.children.length > 0` prevents double-injection.

  _injectPickers() {
    if (!this._hass) return;   // not ready yet — hass setter will retry
    const devices = this._config.devices || [];
    devices.forEach((dev, i) => {
      if (!this._expanded[i]) return;
      const fields = (dev.phase_mode === '3') ? DEVICE_FIELDS_3P : DEVICE_FIELDS_1P;
      fields.forEach(field => {
        const slot = this.shadowRoot.querySelector(`#picker-${i}-${field.key}`);
        if (!slot || slot.children.length > 0) return; // already injected
        const picker = document.createElement('ha-entity-picker');
        picker.hass              = this._hass;
        picker.value             = dev[field.key] || '';
        picker.label             = field.label + (field.required ? ' *' : '');
        picker.allowCustomEntity = true;
        picker.addEventListener('value-changed', e => {
          this._updateDevice(i, field.key, e.detail.value);
        });
        slot.appendChild(picker);
      });
    });
  }

  // ── Editor HTML render ─────────────────────────────────────────────────────

  _render() {
    const cfg     = this._config;
    const devices = cfg.devices || [];

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .editor { padding: 0; }

        .section { margin-bottom: 20px; }
        .section-label {
          font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
          color: var(--secondary-text-color); margin-bottom: 10px; padding-bottom: 4px;
          border-bottom: 1px solid var(--divider-color);
        }
        .sub-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase;
          color: var(--secondary-text-color); margin: 10px 0 6px;
          padding-bottom: 3px; border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .row { display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
        .row > * { flex: 1; min-width: 120px; }

        .field { margin-bottom: 10px; }
        .field label { display: block; font-size: 12px; margin-bottom: 4px; color: var(--secondary-text-color); }
        .field input[type="text"],
        .field input[type="number"],
        .field select {
          width: 100%; padding: 8px 10px; border-radius: 6px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color, #1e293b);
          color: var(--primary-text-color); font-size: 14px;
          box-sizing: border-box; outline: none; transition: border-color .15s;
        }
        .field input:focus, .field select:focus { border-color: var(--primary-color); }

        .color-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .color-row label { font-size: 12px; color: var(--secondary-text-color); flex: 1; }
        .color-row input[type="color"] {
          width: 40px; height: 32px; padding: 2px; border-radius: 6px;
          border: 1px solid var(--divider-color); background: none; cursor: pointer;
        }
        .color-reset {
          background: none; border: 1px solid var(--divider-color); border-radius: 6px;
          color: var(--secondary-text-color); font-size: 11px; padding: 4px 8px;
          cursor: pointer; white-space: nowrap;
        }
        .color-reset:hover { border-color: var(--primary-color); color: var(--primary-color); }

        .phase-toggle { display: flex; gap: 6px; margin-bottom: 10px; }
        .phase-btn {
          flex: 1; padding: 7px 4px; border-radius: 6px;
          border: 1px solid var(--divider-color); background: none;
          cursor: pointer; font-size: 13px; font-weight: 600;
          color: var(--secondary-text-color);
          transition: background .15s, border-color .15s, color .15s;
        }
        .phase-btn.active {
          background: var(--primary-color); border-color: var(--primary-color); color: #fff;
        }

        .device-card {
          border: 1px solid var(--divider-color); border-radius: 10px;
          margin-bottom: 8px; overflow: hidden;
          background: var(--secondary-background-color, rgba(255,255,255,0.03));
        }
        .device-header {
          display: flex; align-items: center; padding: 10px 12px; gap: 8px;
          cursor: pointer; user-select: none;
        }
        .device-header:hover { background: rgba(0,0,0,0.05); }
        .device-chevron { font-size: 10px; transition: transform .2s; color: var(--secondary-text-color); min-width: 14px; }
        .device-chevron.open { transform: rotate(90deg); }
        .device-name { flex: 1; font-size: 14px; font-weight: 600; }
        .device-mode-badge {
          font-size: 9px; font-weight: 700; letter-spacing: 1px; padding: 2px 6px;
          border-radius: 4px; background: rgba(96,165,250,0.12); color: rgba(96,165,250,0.9);
          border: 1px solid rgba(96,165,250,0.2);
        }
        .device-color-dot {
          width: 10px; height: 10px; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.2); flex-shrink: 0;
        }
        .device-actions { display: flex; gap: 4px; }
        .icon-btn {
          background: none; border: none; cursor: pointer; padding: 4px 6px;
          border-radius: 4px; font-size: 14px; color: var(--secondary-text-color);
          transition: background .15s;
        }
        .icon-btn:hover { background: rgba(0,0,0,0.1); }
        .icon-btn.danger:hover { background: rgba(239,68,68,0.1); color: #ef4444; }

        .device-body { padding: 0 12px 12px; }
        /* Make entity pickers look native */
        ha-entity-picker {
          display: block;
          margin-bottom: 8px;
        }

        .add-btn {
          width: 100%; padding: 10px; background: none;
          border: 1px dashed var(--divider-color); border-radius: 10px;
          color: var(--primary-color); cursor: pointer; font-size: 14px;
          transition: background .15s, border-color .15s;
        }
        .add-btn:hover { background: rgba(96,165,250,0.08); border-color: var(--primary-color); }
      </style>

      <div class="editor">

        <!-- ── Card settings ───────────────────────────────────────────── -->
        <div class="section">
          <div class="section-label">Card Settings</div>
          <div class="row">
            <div class="field">
              <label>Title (optional)</label>
              <input type="text" id="g-title" value="${cfg.title || ''}" placeholder="Power Monitor">
            </div>
            <div class="field">
              <label>Columns</label>
              <select id="g-columns">
                <option value=""  ${!cfg.columns    ? 'selected' : ''}>Auto</option>
                <option value="1" ${cfg.columns == 1 ? 'selected' : ''}>1</option>
                <option value="2" ${cfg.columns == 2 ? 'selected' : ''}>2</option>
                <option value="3" ${cfg.columns == 3 ? 'selected' : ''}>3</option>
                <option value="4" ${cfg.columns == 4 ? 'selected' : ''}>4</option>
                <option value="5" ${cfg.columns == 5 ? 'selected' : ''}>5</option>
                <option value="6" ${cfg.columns == 6 ? 'selected' : ''}>6</option>
              </select>
            </div>
          </div>
        </div>

        <!-- ── Devices ─────────────────────────────────────────────────── -->
        <div class="section">
          <div class="section-label">Devices (${devices.length})</div>
          <div id="devices-list">
            ${devices.map((dev, i) => {
              const mode     = dev.phase_mode || '1';
              const dotStyle = dev.bg_color
                ? `background:${dev.bg_color};`
                : 'background:rgba(96,165,250,0.3);';
              return `
              <div class="device-card" data-index="${i}">
                <div class="device-header" data-toggle="${i}">
                  <span class="device-chevron ${this._expanded[i] ? 'open' : ''}">&#9654;</span>
                  <span class="device-color-dot" style="${dotStyle}"></span>
                  <span class="device-name">${dev.name || 'Device ' + (i + 1)}</span>
                  <span class="device-mode-badge">${mode === '3' ? '3-phase' : '1-phase'}</span>
                  <div class="device-actions" onclick="event.stopPropagation()">
                    <button class="icon-btn" data-move="${i}" data-dir="-1" title="Move up">&#8679;</button>
                    <button class="icon-btn" data-move="${i}" data-dir="1"  title="Move down">&#8681;</button>
                    <button class="icon-btn danger" data-remove="${i}" title="Remove">&#10005;</button>
                  </div>
                </div>
                ${this._expanded[i] ? `
                  <div class="device-body">
                    <div class="row">
                      <div class="field">
                        <label>Device Name</label>
                        <input type="text" data-device="${i}" data-key="name"
                          value="${dev.name || ''}" placeholder="e.g. Server Rack">
                      </div>
                      <div class="field">
                        <label>Max Power (W)</label>
                        <input type="number" data-device="${i}" data-key="max_power"
                          value="${dev.max_power || ''}" placeholder="500">
                      </div>
                    </div>

                    <div class="color-row">
                      <label>Tile background colour</label>
                      <input type="color" data-device="${i}" data-key="bg_color"
                        value="${dev.bg_color || '#0d1b2e'}" title="Pick background colour">
                      <button class="color-reset" data-reset-color="${i}">Reset</button>
                    </div>

                    <div class="sub-label">Phase Mode</div>
                    <div class="phase-toggle">
                      <button class="phase-btn ${mode === '1' ? 'active' : ''}"
                        data-phase-btn="${i}" data-phase="1">1-Phase</button>
                      <button class="phase-btn ${mode === '3' ? 'active' : ''}"
                        data-phase-btn="${i}" data-phase="3">3-Phase</button>
                    </div>

                    <div class="sub-label">Entities</div>
                    ${(mode === '3' ? DEVICE_FIELDS_3P : DEVICE_FIELDS_1P).map(f => `
                      <div id="picker-${i}-${f.key}"></div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>`;
            }).join('')}
          </div>
          <button class="add-btn" id="add-device">+ Add Device</button>
        </div>

      </div>
    `;

    // ── Wire global inputs ───────────────────────────────────────────────────
    this.shadowRoot.querySelector('#g-title').addEventListener('change', e =>
      this._updateGlobal('title', e.target.value));
    this.shadowRoot.querySelector('#g-columns').addEventListener('change', e => {
      const v = e.target.value ? parseInt(e.target.value) : null;
      this._updateGlobal('columns', v);
    });

    // ── Accordion toggles ────────────────────────────────────────────────────
    this.shadowRoot.querySelectorAll('[data-toggle]').forEach(el =>
      el.addEventListener('click', () => this._toggleExpanded(parseInt(el.dataset.toggle))));

    // ── Move / remove ────────────────────────────────────────────────────────
    this.shadowRoot.querySelectorAll('[data-move]').forEach(btn =>
      btn.addEventListener('click', () =>
        this._moveDevice(parseInt(btn.dataset.move), parseInt(btn.dataset.dir))));
    this.shadowRoot.querySelectorAll('[data-remove]').forEach(btn =>
      btn.addEventListener('click', () => this._removeDevice(parseInt(btn.dataset.remove))));

    // ── Text / number inputs ─────────────────────────────────────────────────
    this.shadowRoot.querySelectorAll('input[data-device][data-key]').forEach(input => {
      if (input.type === 'color') return;
      input.addEventListener('change', e => {
        const idx = parseInt(e.target.dataset.device);
        const key = e.target.dataset.key;
        let val = e.target.value;
        if (key === 'max_power') val = val ? parseInt(val) : null;
        this._updateDevice(idx, key, val);
        if (key === 'name') this._render();
      });
    });

    // ── Colour picker ────────────────────────────────────────────────────────
    this.shadowRoot.querySelectorAll('input[type="color"][data-device]').forEach(input => {
      input.addEventListener('input', e => {
        this._updateDevice(parseInt(e.target.dataset.device), 'bg_color', e.target.value);
      });
    });
    this.shadowRoot.querySelectorAll('[data-reset-color]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this._updateDevice(parseInt(btn.dataset.resetColor), 'bg_color', null);
        this._render();
      });
    });

    // ── Phase-mode buttons ───────────────────────────────────────────────────
    this.shadowRoot.querySelectorAll('[data-phase-btn]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this._updateDevice(parseInt(btn.dataset.phaseBtn), 'phase_mode', btn.dataset.phase);
        this._render();
      });
    });

    // ── Add device button ────────────────────────────────────────────────────
    this.shadowRoot.querySelector('#add-device').addEventListener('click', () => this._addDevice());

    // ── Inject entity pickers into their slots ───────────────────────────────
    // Called synchronously here; hass setter will call again if hass was null.
    this._injectPickers();
  }
}

if (!customElements.get(EDITOR_TAG)) {
  customElements.define(EDITOR_TAG, PowerMonitorCardEditor);
}

// ─── Main Card ────────────────────────────────────────────────────────────────

class PowerMonitorCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static getConfigElement() { return document.createElement(EDITOR_TAG); }

  static getStubConfig() {
    return {
      title: 'Power Monitor',
      columns: 3,
      devices: [
        {
          name: 'Device 1',
          phase_mode:          '1',
          power_entity:        'sensor.power_device1',
          energy_entity:       'sensor.energy_device1',
          current_entity:      'sensor.current_device1',
          power_factor_entity: 'sensor.power_factor_device1',
          voltage_entity:      'sensor.voltage',
          frequency_entity:    'sensor.frequency',
          max_power: 500,
        },
      ],
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  setConfig(config) {
    if (!config.devices || !config.devices.length) {
      throw new Error('power-monitor-card: at least one device must be defined');
    }
    this._config = { title: '', columns: 0, ...config };
  }

  getCardSize() {
    return Math.ceil((this._config?.devices?.length || 1) / (this._config?.columns || 3)) * 4;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  _state(id) {
    return (id && this._hass) ? this._hass.states[id] : null;
  }

  _val(id, fallback) {
    const s = this._state(id);
    if (!s || s.state === 'unavailable' || s.state === 'unknown')
      return fallback != null ? fallback : '–';
    const n = parseFloat(s.state);
    if (isNaN(n)) return s.state;
    return n % 1 !== 0 ? n.toFixed(2) : String(n);
  }

  _unit(id, def) {
    const s = this._state(id);
    return (s?.attributes?.unit_of_measurement) || def || '';
  }

  _isOnline(dev) {
    const s = this._state(dev.power_entity);
    return s && s.state !== 'unavailable' && s.state !== 'unknown';
  }

  _flowLabel(dev) {
    const f = this._val(dev.flow_entity, '');
    if (f && f !== '–') return f.charAt(0).toUpperCase() + f.slice(1);
    const w = parseFloat(this._val(dev.power_entity, '0'));
    return w > 0 ? 'Consuming' : 'Standby';
  }

  _arcPct(dev) {
    const w   = parseFloat(this._val(dev.power_entity, '0')) || 0;
    const max = parseInt(dev.max_power) || 500;
    return Math.min((w / max) * 100, 100);
  }

  _arcD(pct, full) {
    const r = 52, cx = 60, cy = 60, s = -220, span = 260;
    const endDeg = s + (full ? span : span * Math.min(pct, 100) / 100);
    const rad = d => d * Math.PI / 180;
    const x1 = cx + r * Math.cos(rad(s)),      y1 = cy + r * Math.sin(rad(s));
    const x2 = cx + r * Math.cos(rad(endDeg)), y2 = cy + r * Math.sin(rad(endDeg));
    const lg = (full ? span : span * pct / 100) > 180 ? 1 : 0;
    if (!full && pct <= 0) return '';
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${lg} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }

  // Returns two colours [arcColor, glowColor] based on load percentage:
  //   0–50%  → green  (#22c55e)
  //  50–75%  → yellow (#eab308)  interpolated
  //  75–100% → red    (#ef4444)  interpolated
  _arcColors(pct) {
    const p = Math.min(pct, 100);
    let r, g, b;
    if (p <= 50) {
      // green only
      r = 34; g = 197; b = 94;
    } else if (p <= 75) {
      // green → yellow  (0..1 within 50-75 range)
      const t = (p - 50) / 25;
      r = Math.round(34  + t * (234 - 34));   // 34→234
      g = Math.round(197 + t * (179 - 197));  // 197→179
      b = Math.round(94  + t * (8   - 94));   // 94→8
    } else {
      // yellow → red  (0..1 within 75-100 range)
      const t = (p - 75) / 25;
      r = Math.round(234 + t * (239 - 234));  // 234→239
      g = Math.round(179 + t * (68  - 179));  // 179→68
      b = Math.round(8   + t * (68  - 8));    // 8→68
    }
    const hex = (v) => v.toString(16).padStart(2, '0');
    const color = `#${hex(r)}${hex(g)}${hex(b)}`;
    const glow  = `rgba(${r},${g},${b},0.75)`;
    const glowSoft = `rgba(${r},${g},${b},0.13)`;
    return { color, glow, glowSoft };
  }

  _moreInfo(id) {
    if (!id) return;
    this.dispatchEvent(new CustomEvent('hass-more-info', {
      bubbles: true, composed: true, detail: { entityId: id },
    }));
  }

  // ── 1-Phase tile ─────────────────────────────────────────────────────────────

  _deviceTile1P(dev) {
    const online  = this._isOnline(dev);
    const power   = this._val(dev.power_entity, '0');
    const powerU  = this._unit(dev.power_entity, 'W');
    const flow    = this._flowLabel(dev);
    const pct     = this._arcPct(dev);
    const trackD  = this._arcD(100, true);
    const arcD    = this._arcD(pct, false);
    const { color: arcColor, glow: arcGlow, glowSoft } = this._arcColors(pct);

    const energy  = this._val(dev.energy_entity);
    const energyU = this._unit(dev.energy_entity, 'kWh');
    const curr    = this._val(dev.current_entity);
    const currU   = this._unit(dev.current_entity, 'A');
    const pf      = this._val(dev.power_factor_entity);
    const pfU     = this._unit(dev.power_factor_entity, '%');
    const volt    = this._val(dev.voltage_entity);
    const voltU   = this._unit(dev.voltage_entity, 'V');
    const freq    = this._val(dev.frequency_entity);
    const freqU   = this._unit(dev.frequency_entity, 'Hz');

    const hasEnergy  = !!dev.energy_entity;
    const hasCurrent = !!dev.current_entity;
    const hasPF      = !!dev.power_factor_entity;
    const hasVolt    = !!dev.voltage_entity;
    const hasFreq    = !!dev.frequency_entity;
    const hasStats   = hasEnergy || hasCurrent || hasPF;
    const hasBottom  = hasVolt || hasFreq;
    const statCount  = [hasEnergy, hasCurrent, hasPF].filter(Boolean).length;

    // bg_color: applied as a very subtle tint overlay so text stays readable.
    // We inject a ::before pseudo via inline style variable instead of replacing the gradient.
    const tileStyle = dev.bg_color
      ? `--tile-tint:${dev.bg_color};`
      : '';

    return `
      <div class="tile" style="${tileStyle}">
        <div class="tile-header">
          <span class="tile-name">${dev.name || 'Device'}</span>
          <div class="status">
            <div class="dot ${online ? '' : 'off'}"></div>
            <span>${online ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        <div class="gauge-wrap" data-entity="${dev.power_entity}">
          <svg class="gauge-svg" viewBox="0 0 120 120">
            <path class="g-track" d="${trackD}"/>
            ${arcD ? `
              <path class="g-glow" d="${arcD}"
                stroke="${arcColor}" opacity="0.18" fill="none" stroke-width="12" stroke-linecap="round"/>
              <path class="g-arc"  d="${arcD}"
                stroke="${arcColor}" fill="none" stroke-width="5" stroke-linecap="round"
                style="filter:drop-shadow(0 0 5px ${arcGlow})"/>
            ` : ''}
          </svg>
          <div class="gauge-center">
            <div class="g-row">
              <span class="g-num">${power}</span>
              <span class="g-unit">${powerU}</span>
            </div>
            <div class="g-lbl" style="color:${arcColor}">${flow}</div>
          </div>
        </div>
        ${hasStats ? `
          <div class="stats cols-${statCount}">
            ${hasEnergy  ? `<div class="stat" data-entity="${dev.energy_entity}">
              <span class="s-val">${energy}</span><span class="s-unit"> ${energyU}</span>
              <span class="s-lbl">Energy</span></div>` : ''}
            ${hasCurrent ? `<div class="stat" data-entity="${dev.current_entity}">
              <span class="s-val">${curr}</span><span class="s-unit"> ${currU}</span>
              <span class="s-lbl">Current</span></div>` : ''}
            ${hasPF      ? `<div class="stat" data-entity="${dev.power_factor_entity}">
              <span class="s-val">${pf}</span><span class="s-unit">${pfU}</span>
              <span class="s-lbl">PF</span></div>` : ''}
          </div>
        ` : ''}
        ${hasBottom ? `
          <div class="bottom">
            ${hasVolt ? `<div class="b-item" data-entity="${dev.voltage_entity}">
              <span class="b-wave" style="color:#a78bfa">&#8767;</span>
              <div>
                <span class="b-val">${volt}</span><span class="b-unit"> ${voltU}</span>
                <div class="b-lbl">Voltage</div>
              </div>
            </div>` : ''}
            ${hasVolt && hasFreq ? '<div class="b-div"></div>' : ''}
            ${hasFreq ? `<div class="b-item" data-entity="${dev.frequency_entity}">
              <span class="b-wave" style="color:#38bdf8">&#8767;</span>
              <div>
                <span class="b-val">${freq}</span><span class="b-unit"> ${freqU}</span>
                <div class="b-lbl">Frequency</div>
              </div>
            </div>` : ''}
          </div>
        ` : ''}
      </div>`;
  }

  // ── 3-Phase tile ─────────────────────────────────────────────────────────────

  _deviceTile3P(dev) {
    const online  = this._isOnline(dev);
    const power   = this._val(dev.power_entity, '0');
    const powerU  = this._unit(dev.power_entity, 'W');
    const flow    = this._flowLabel(dev);
    const pct     = this._arcPct(dev);
    const trackD  = this._arcD(100, true);
    const arcD    = this._arcD(pct, false);
    const { color: arcColor, glow: arcGlow } = this._arcColors(pct);

    const tileStyle = dev.bg_color ? `--tile-tint:${dev.bg_color};` : '';

    // Per-phase power
    const pwrA = dev.power_a_entity ? this._val(dev.power_a_entity) : null;
    const pwrB = dev.power_b_entity ? this._val(dev.power_b_entity) : null;
    const pwrC = dev.power_c_entity ? this._val(dev.power_c_entity) : null;
    const pwrU = this._unit(dev.power_a_entity || dev.power_entity, 'W');

    // Energy
    const energy  = dev.energy_entity   ? this._val(dev.energy_entity)   : null;
    const energyU = this._unit(dev.energy_entity, 'kWh');
    const enA  = dev.energy_a_entity    ? this._val(dev.energy_a_entity)  : null;
    const enB  = dev.energy_b_entity    ? this._val(dev.energy_b_entity)  : null;
    const enC  = dev.energy_c_entity    ? this._val(dev.energy_c_entity)  : null;

    // Current
    const curA = dev.current_a_entity   ? this._val(dev.current_a_entity) : null;
    const curB = dev.current_b_entity   ? this._val(dev.current_b_entity) : null;
    const curC = dev.current_c_entity   ? this._val(dev.current_c_entity) : null;
    const curU = this._unit(dev.current_a_entity, 'A');

    // Voltage
    const voltA = dev.voltage_a_entity  ? this._val(dev.voltage_a_entity) : null;
    const voltB = dev.voltage_b_entity  ? this._val(dev.voltage_b_entity) : null;
    const voltC = dev.voltage_c_entity  ? this._val(dev.voltage_c_entity) : null;
    const voltU = this._unit(dev.voltage_a_entity, 'V');

    // Misc (no frequency for 3-phase)
    const pf     = dev.power_factor_entity   ? this._val(dev.power_factor_entity)   : null;
    const pfU    = this._unit(dev.power_factor_entity, '%');
    const react  = dev.power_reactive_entity ? this._val(dev.power_reactive_entity) : null;
    const reactU = this._unit(dev.power_reactive_entity, 'VAR');

    const phaseRow = (label, vA, vB, vC, unit, eA, eB, eC) => {
      if (vA === null && vB === null && vC === null) return '';
      const cell = (v, e, tag) => v !== null
        ? `<div class="ph-cell"${e ? ` data-entity="${e}"` : ''}>
             <span class="ph-val">${v}</span><span class="ph-unit">${unit}</span>
             <span class="ph-tag">${tag}</span></div>`
        : `<div class="ph-cell ph-empty"></div>`;
      return `
        <div class="phase-row">
          <span class="ph-label">${label}</span>
          ${cell(vA, eA, 'A')}${cell(vB, eB, 'B')}${cell(vC, eC, 'C')}
        </div>`;
    };

    const miscCount = [energy, pf, react].filter(Boolean).length;

    return `
      <div class="tile tile-3p" style="${tileStyle}">
        <div class="tile-header">
          <span class="tile-name">${dev.name || 'Device'}</span>
          <div class="status">
            <div class="dot ${online ? '' : 'off'}"></div>
            <span>${online ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        <div class="gauge-wrap" data-entity="${dev.power_entity}">
          <svg class="gauge-svg" viewBox="0 0 120 120">
            <path class="g-track" d="${trackD}"/>
            ${arcD ? `
              <path class="g-glow" d="${arcD}"
                stroke="${arcColor}" opacity="0.18" fill="none" stroke-width="12" stroke-linecap="round"/>
              <path class="g-arc"  d="${arcD}"
                stroke="${arcColor}" fill="none" stroke-width="5" stroke-linecap="round"
                style="filter:drop-shadow(0 0 5px ${arcGlow})"/>
            ` : ''}
          </svg>
          <div class="gauge-center">
            <div class="g-row">
              <span class="g-num">${power}</span>
              <span class="g-unit">${powerU}</span>
            </div>
            <div class="g-lbl" style="color:${arcColor}">${flow}</div>
          </div>
        </div>
        <div class="phase-table">
          ${phaseRow('Power',   pwrA,  pwrB,  pwrC,  pwrU,
            dev.power_a_entity,   dev.power_b_entity,   dev.power_c_entity)}
          ${phaseRow('Current', curA,  curB,  curC,  curU,
            dev.current_a_entity, dev.current_b_entity, dev.current_c_entity)}
          ${phaseRow('Voltage', voltA, voltB, voltC, voltU,
            dev.voltage_a_entity, dev.voltage_b_entity, dev.voltage_c_entity)}
          ${phaseRow('Energy',  enA,   enB,   enC,  'kWh',
            dev.energy_a_entity,  dev.energy_b_entity,  dev.energy_c_entity)}
        </div>
        ${miscCount > 0 ? `
          <div class="stats cols-${miscCount}">
            ${energy ? `<div class="stat" data-entity="${dev.energy_entity}">
              <span class="s-val">${energy}</span><span class="s-unit"> ${energyU}</span>
              <span class="s-lbl">Total</span></div>` : ''}
            ${pf ? `<div class="stat" data-entity="${dev.power_factor_entity}">
              <span class="s-val">${pf}</span><span class="s-unit">${pfU}</span>
              <span class="s-lbl">PF</span></div>` : ''}
            ${react ? `<div class="stat" data-entity="${dev.power_reactive_entity}">
              <span class="s-val">${react}</span><span class="s-unit"> ${reactU}</span>
              <span class="s-lbl">Reactive</span></div>` : ''}
          </div>
        ` : ''}
      </div>`;
  }

  // ── Main render ──────────────────────────────────────────────────────────────

  _render() {
    if (!this._config || !this._hass) return;
    const cfg     = this._config;
    const devices = cfg.devices || [];
    const cols    = cfg.columns
      ? `repeat(${cfg.columns}, minmax(0, 1fr))`
      : 'repeat(auto-fill, minmax(240px, 1fr))';

    this.shadowRoot.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700&family=Rajdhani:wght@400;600&display=swap');

        :host {
          display: block;
          font-family: 'Exo 2', sans-serif;
          /* Mobile scroll fix: do not create an independent scroll/touch context */
          touch-action: pan-y;
          -webkit-overflow-scrolling: auto;
        }

        ha-card {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
          overflow: visible !important;
        }
        .card-wrap { padding: 0; }
        .card-title {
          font-family: 'Rajdhani', sans-serif; font-size: 16px; font-weight: 600;
          letter-spacing: 2px; text-transform: uppercase; color: rgba(148,163,184,0.7);
          padding: 4px 2px 12px;
        }

        /* ── Responsive grid ── */
        .grid {
          display: grid;
          grid-template-columns: ${cols};
          gap: 14px;
        }
        @media (max-width: 520px) {
          .grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px; }
        }
        @media (max-width: 340px) {
          .grid { grid-template-columns: 1fr !important; gap: 8px; }
        }

        /* ── Tile ── */
        .tile {
          background: linear-gradient(145deg, #0d1b2e 0%, #0a1628 55%, #0e2040 100%);
          border-radius: 16px; padding: 16px;
          position: relative; overflow: hidden; min-width: 0;
          border: 1px solid rgba(66,153,225,0.13);
          box-shadow: 0 0 30px rgba(66,153,225,0.04), 0 12px 40px rgba(0,0,0,0.45),
                      inset 0 1px 0 rgba(255,255,255,0.04);
          touch-action: pan-y;
        }
        /* Decorative radial highlight (top-right) */
        .tile::before {
          content:''; position:absolute; top:-50px; right:-50px; pointer-events:none;
          width:160px; height:160px; z-index:0;
          background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%);
        }
        /* Colour tint overlay — activated via --tile-tint CSS variable */
        .tile::after {
          content:''; position:absolute; inset:0; pointer-events:none; z-index:0; border-radius:16px;
          background: var(--tile-tint, transparent);
          opacity: 0.18;   /* subtle: colour bleeds through without killing text readability */
          mix-blend-mode: color;
        }

        @media (max-width: 520px) {
          .tile { padding: 10px 8px; border-radius: 12px; }
          .tile-name { font-size: 10px; letter-spacing: 1px; }
          .gauge-svg { width: 90px; height: 90px; }
          .g-num { font-size: 20px; }
          .g-lbl  { font-size: 8px; }
          .s-val  { font-size: 12px; }
          .s-lbl, .s-unit, .b-lbl, .b-unit { font-size: 8px; }
          .b-val  { font-size: 12px; }
          .stat   { padding: 6px 4px; }
          .bottom { padding: 6px 8px; }
          .ph-val { font-size: 11px; }
          .ph-unit, .ph-tag { font-size: 7px; }
        }

        /* ── Tile header ── */
        .tile-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px; position: relative; z-index: 1;
        }
        .tile-name {
          font-family: 'Rajdhani', sans-serif; font-size: 12px; font-weight: 600;
          letter-spacing: 2px; text-transform: uppercase; color: rgba(148,163,184,0.8);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;
        }
        .status { display:flex; align-items:center; gap:5px; font-size:11px; color:rgba(148,163,184,0.6); }
        .dot     { width:6px; height:6px; border-radius:50%; background:#22c55e; box-shadow:0 0 6px #22c55e; animation:blink 2s ease-in-out infinite; }
        .dot.off { background:#ef4444; box-shadow:0 0 6px #ef4444; animation:none; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.55} }

        /* ── Gauge ── */
        .gauge-wrap {
          display:flex; justify-content:center; position:relative; z-index:1;
          margin-bottom:12px; cursor:pointer;
        }
        .gauge-svg { width:120px; height:120px; filter:drop-shadow(0 0 8px rgba(96,165,250,0.2)); }
        .g-track { fill:none; stroke:rgba(255,255,255,0.05); stroke-width:5; stroke-linecap:round; }
        .g-glow  { fill:none; stroke-width:12; stroke-linecap:round; opacity:.13; }
        .g-arc   { fill:none; stroke-width:5;  stroke-linecap:round; filter:drop-shadow(0 0 5px rgba(96,165,250,0.75)); }
        .gauge-center {
          position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
          text-align:center; pointer-events:none;
        }
        .g-row  { display:flex; align-items:baseline; justify-content:center; gap:1px; line-height:1; }
        .g-num  { font-size:26px; font-weight:700; color:#fff; letter-spacing:-1px; text-shadow:0 0 16px rgba(96,165,250,0.5); }
        .g-unit { font-size:11px; font-weight:300; color:rgba(148,163,184,0.7); margin-bottom:2px; }
        .g-lbl  { font-size:10px; color:rgba(96,165,250,0.85); letter-spacing:1px; text-transform:uppercase; margin-top:3px; }

        /* ── Stats ── */
        .stats { display:grid; gap:7px; margin-bottom:7px; position:relative; z-index:1; }
        .stats.cols-1 { grid-template-columns:1fr; }
        .stats.cols-2 { grid-template-columns:repeat(2,1fr); }
        .stats.cols-3 { grid-template-columns:repeat(3,1fr); }
        .stat {
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06);
          border-radius:9px; padding:8px 6px; text-align:center;
          cursor:pointer; transition:background .2s, border-color .2s, transform .15s;
          display:flex; flex-direction:column; align-items:center;
        }
        .stat:hover { background:rgba(96,165,250,0.08); border-color:rgba(96,165,250,0.2); transform:translateY(-1px); }
        .s-val  { font-size:15px; font-weight:700; color:#f1f5f9; line-height:1; }
        .s-unit { font-size:9px;  color:rgba(148,163,184,0.55); }
        .s-lbl  { font-size:9px;  color:rgba(100,116,139,0.85); text-transform:uppercase; letter-spacing:.6px; margin-top:3px; }

        /* ── Bottom row (voltage / freq) ── */
        .bottom {
          background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.05);
          border-radius:9px; padding:8px 12px; display:flex; justify-content:space-around;
          position:relative; z-index:1;
        }
        .b-item { display:flex; align-items:center; gap:6px; cursor:pointer; transition:opacity .2s; }
        .b-item:hover { opacity:.7; }
        .b-wave { font-size:15px; opacity:.7; }
        .b-val  { font-size:14px; font-weight:600; color:#e2e8f0; line-height:1.1; }
        .b-unit { font-size:9px;  color:rgba(148,163,184,0.55); }
        .b-lbl  { font-size:9px;  color:rgba(100,116,139,0.8); text-transform:uppercase; letter-spacing:.6px; }
        .b-div  { width:1px; background:rgba(255,255,255,0.06); align-self:stretch; }

        /* ── 3-Phase table ── */
        .phase-table {
          background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 10px; padding: 6px; margin-bottom: 7px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .phase-row {
          display: grid; grid-template-columns: 52px repeat(3, 1fr); gap: 4px;
          align-items: center;
        }
        .ph-label {
          font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px;
          color: rgba(100,116,139,0.75);
        }
        .ph-cell {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 6px; padding: 4px 5px; text-align: center;
          cursor: pointer; transition: background .2s;
          display: flex; flex-direction: column; align-items: center;
        }
        .ph-cell:hover { background: rgba(96,165,250,0.08); }
        .ph-cell.ph-empty { background: none; border-color: transparent; cursor: default; }
        .ph-val  { font-size: 13px; font-weight: 700; color: #f1f5f9; line-height: 1; }
        .ph-unit { font-size: 8px;  color: rgba(148,163,184,0.5); }
        .ph-tag  {
          font-size: 8px; font-weight: 700; letter-spacing: .5px;
          color: rgba(96,165,250,0.7); margin-top: 1px;
        }
      </style>

      <ha-card>
        <div class="card-wrap">
          ${cfg.title ? `<div class="card-title">${cfg.title}</div>` : ''}
          <div class="grid">
            ${devices.map(dev =>
              (dev.phase_mode === '3') ? this._deviceTile3P(dev) : this._deviceTile1P(dev)
            ).join('')}
          </div>
        </div>
      </ha-card>
    `;

    // Wire all [data-entity] clicks → more-info
    this.shadowRoot.querySelectorAll('[data-entity]').forEach(el => {
      const id = el.dataset.entity;
      if (id) el.addEventListener('click', () => this._moreInfo(id));
    });
  }
}

if (!customElements.get(CARD_TAG)) {
  customElements.define(CARD_TAG, PowerMonitorCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === CARD_TAG)) {
  window.customCards.push({
    type:             CARD_TAG,
    name:             'Power Monitor Card',
    description:      'Multi-device responsive power monitoring — supports 1-phase and 3-phase circuits',
    preview:          true,
    documentationURL: 'https://github.com/robman2026/power-monitor-card',
  });
}

console.info(
  '%c POWER-MONITOR-CARD %c v' + CARD_VERSION + ' ',
  'color:#fff;background:#3b82f6;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px',
  'color:#3b82f6;background:#1e3a5f;font-weight:700;padding:2px 6px;border-radius:0 3px 3px 0'
);
