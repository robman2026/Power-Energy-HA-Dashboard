/**
 * Power Monitor Card  v2.0.0
 * Multi-device, responsive, glassmorphism Lovelace custom card for Home Assistant.
 * Supports a visual editor and any number of monitored circuits/devices.
 *
 * Layout: Variant C – gauge left / phase-table right on 3-phase tiles.
 * https://github.com/robman2026/Power-Energy-HA-Dashboard
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_VERSION = '2.1.0';
const CARD_TAG     = 'power-monitor-card';
const EDITOR_TAG   = 'power-monitor-card-editor';

// ── Single-phase entity fields ────────────────────────────────────────────────
const DEVICE_FIELDS_1P = [
  { key: 'power_entity',        label: 'Power (W)',        required: true  },
  { key: 'flow_entity',         label: 'Flow / direction', required: false },
  { key: 'energy_entity',       label: 'Energy (kWh)',     required: false },
  { key: 'current_entity',      label: 'Current (A)',      required: false },
  { key: 'power_factor_entity', label: 'Power Factor (%)', required: false },
  { key: 'voltage_entity',      label: 'Voltage (V)',      required: false },
  { key: 'frequency_entity',    label: 'Frequency (Hz)',   required: false },
];

// ── Three-phase entity fields ─────────────────────────────────────────────────
// NOTE: no current_entity / voltage_entity / frequency_entity here.
//       Those scalar keys are 1-phase only.  3-phase uses per-phase _a/_b/_c variants.
const DEVICE_FIELDS_3P = [
  { key: 'power_entity',          label: 'Total Power (W)',       required: true  },
  { key: 'power_a_entity',        label: 'Power Phase A (W)',     required: false },
  { key: 'power_b_entity',        label: 'Power Phase B (W)',     required: false },
  { key: 'power_c_entity',        label: 'Power Phase C (W)',     required: false },
  { key: 'energy_entity',         label: 'Total Energy (kWh)',    required: false },
  { key: 'energy_p_entity',       label: 'Energy Produced (kWh)', required: false },
  { key: 'energy_c_entity',       label: 'Energy Consumed (kWh)', required: false },
  { key: 'current_a_entity',      label: 'Current Phase A (A)',   required: false },
  { key: 'current_b_entity',      label: 'Current Phase B (A)',   required: false },
  { key: 'current_c_entity',      label: 'Current Phase C (A)',   required: false },
  { key: 'voltage_a_entity',      label: 'Voltage Phase A (V)',   required: false },
  { key: 'voltage_b_entity',      label: 'Voltage Phase B (V)',   required: false },
  { key: 'voltage_c_entity',      label: 'Voltage Phase C (V)',   required: false },
  { key: 'power_factor_entity',   label: 'Power Factor (%)',      required: false },
  { key: 'power_reactive_entity', label: 'Reactive Power (VAR)',  required: false },
];

// ── Phase-row icons (inline SVG) ──────────────────────────────────────────────
//
// POWER   – solid lightning bolt  (universally understood as electrical power / watts)
// CURRENT – smooth sine wave + arrow  (standard AC-current symbol, shows direction)
// VOLTAGE – sawtooth zigzag  (represents potential difference / voltage waveform)
// ENERGY  – hollow circle with internal bolt  (accumulated energy / kWh counter)

const ICON_POWER = `<svg viewBox="0 0 14 14" width="14" height="14"
  fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M8.5 1.5 L4 8 H7.5 L5.5 12.5 L11 6 H7.5 Z"/>
</svg>`;

const ICON_CURRENT = `<svg viewBox="0 0 18 10" width="18" height="10"
  fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"
  xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M0.5 5 C2 5 2.5 1.5 5 1.5 S7.5 8.5 10 8.5 S12.5 5 14 5"/>
  <path d="M13.5 5 H16 M15 3.5 L16.5 5 L15 6.5" stroke-width="1.4"/>
</svg>`;

const ICON_VOLTAGE = `<svg viewBox="0 0 16 10" width="16" height="10"
  fill="none" stroke="currentColor" stroke-width="1.7"
  stroke-linecap="round" stroke-linejoin="round"
  xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M1 5 L4 1.5 L7.5 8.5 L11 1.5 L14 5"/>
</svg>`;

const ICON_ENERGY = `<svg viewBox="0 0 14 14" width="14" height="14"
  fill="none" stroke="currentColor" stroke-width="1.3"
  stroke-linecap="round" stroke-linejoin="round"
  xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="7" cy="7" r="5.5"/>
  <path d="M8.3 3.8 L5.7 7 H8 L5.7 10.2" stroke-width="1.5"/>
</svg>`;

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

  // connectedCallback: pre-load ha-entity-picker via loadCardHelpers so that
  // _injectPickers() always finds the custom element already registered.
  // Without this, the injected <ha-entity-picker> elements exist in the DOM
  // but are never upgraded and therefore render as invisible blank divs.
  connectedCallback() {
    if (!this._pickersLoaded) {
      const load = async () => {
        try {
          if (!customElements.get('ha-entity-picker')) {
            const helpers = await window.loadCardHelpers();
            // Instantiating an "entities" card forces HA to register ha-entity-picker
            const card = await helpers.createCardElement({ type: 'entities', entities: [] });
            await card.constructor.getConfigElement?.();
          }
        } catch (_) {}
        this._pickersLoaded = true;
        // Retry injection now that the element is registered
        this._injectPickers();
      };
      // Safety valve: mark loaded after 3 s even if the above fails
      const timeout = setTimeout(() => {
        this._pickersLoaded = true;
        this._injectPickers();
      }, 3000);
      load().then(() => clearTimeout(timeout));
    }
  }

  set hass(hass) {
    this._hass = hass;
    // Push updated hass into already-mounted pickers
    this.shadowRoot.querySelectorAll('ha-entity-picker').forEach(p => { p.hass = hass; });
    // Retry injection (covers the case where hass arrives after _render)
    this._injectPickers();
  }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._config.devices) this._config.devices = [];
    this._render();
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
      if (ki < index)      newExp[ki]     = this._expanded[ki];
      else if (ki > index) newExp[ki - 1] = this._expanded[ki];
    });
    this._expanded = newExp;
    this._render();
    this._fire();
  }

  _moveDevice(index, dir) {
    const arr    = this._config.devices;
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

  // ── Entity picker injection ────────────────────────────────────────────────
  //
  // _render() writes empty <div class="picker-slot" id="picker-N-KEY"> divs.
  // _injectPickers() fills each slot with one ha-entity-picker element.
  //
  // Called from three places:
  //   1. End of _render() — works when hass already available
  //   2. requestAnimationFrame after _render() — picks up DOM-settled state
  //   3. hass setter — picks up late hass arrival
  //   4. customElements.whenDefined('ha-entity-picker') — picks up late CE registration
  //
  // Guard: slot.children.length > 0 prevents double-injection.

  _injectPickers() {
    if (!this._hass) return;
    const devices = this._config.devices || [];
    devices.forEach((dev, i) => {
      if (!this._expanded[i]) return;
      const fields = (dev.phase_mode === '3') ? DEVICE_FIELDS_3P : DEVICE_FIELDS_1P;
      fields.forEach(field => {
        const slot = this.shadowRoot.querySelector(`#picker-${i}-${field.key}`);
        if (!slot || slot.children.length > 0) return;

        const picker = document.createElement('ha-entity-picker');
        picker.hass              = this._hass;
        picker.value             = dev[field.key] || '';
        picker.label             = field.label + (field.required ? ' *' : '');
        picker.allowCustomEntity = true;
        // Polymer attribute form (needed in some HA versions)
        picker.setAttribute('allow-custom-entity', '');
        picker.addEventListener('value-changed', e => {
          this._updateDevice(i, field.key, e.detail.value);
        });
        slot.appendChild(picker);
      });
    });
  }

  // ── Editor HTML ────────────────────────────────────────────────────────────

  _render() {
    const cfg     = this._config;
    const devices = cfg.devices || [];

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }

        .section { margin-bottom: 20px; }
        .section-label {
          font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; color: var(--secondary-text-color);
          margin-bottom: 10px; padding-bottom: 4px;
          border-bottom: 1px solid var(--divider-color);
        }
        .sub-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: var(--secondary-text-color);
          margin: 10px 0 6px; padding-bottom: 3px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
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

        /* picker-slot is the wrapper div; ha-entity-picker is injected inside it */
        .picker-slot { display: block; margin-bottom: 8px; }
        .picker-slot ha-entity-picker { display: block; width: 100%; }

        .add-btn {
          width: 100%; padding: 10px; background: none;
          border: 1px dashed var(--divider-color); border-radius: 10px;
          color: var(--primary-color); cursor: pointer; font-size: 14px;
          transition: background .15s, border-color .15s;
        }
        .add-btn:hover { background: rgba(96,165,250,0.08); border-color: var(--primary-color); }
      </style>

      <div class="editor">

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
                          value="${dev.name || ''}" placeholder="e.g. Laundry">
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
                        value="${dev.bg_color || '#0d1b2e'}">
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
                      <div class="picker-slot" id="picker-${i}-${f.key}"></div>
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

    // Wire global inputs
    this.shadowRoot.querySelector('#g-title').addEventListener('change', e =>
      this._updateGlobal('title', e.target.value));
    this.shadowRoot.querySelector('#g-columns').addEventListener('change', e =>
      this._updateGlobal('columns', e.target.value ? parseInt(e.target.value) : null));

    // Accordion toggles
    this.shadowRoot.querySelectorAll('[data-toggle]').forEach(el =>
      el.addEventListener('click', () => this._toggleExpanded(parseInt(el.dataset.toggle))));

    // Move / remove
    this.shadowRoot.querySelectorAll('[data-move]').forEach(btn =>
      btn.addEventListener('click', () =>
        this._moveDevice(parseInt(btn.dataset.move), parseInt(btn.dataset.dir))));
    this.shadowRoot.querySelectorAll('[data-remove]').forEach(btn =>
      btn.addEventListener('click', () => this._removeDevice(parseInt(btn.dataset.remove))));

    // Text / number inputs
    this.shadowRoot.querySelectorAll('input[data-device][data-key]').forEach(input => {
      if (input.type === 'color') return;
      input.addEventListener('change', e => {
        const idx = parseInt(e.target.dataset.device);
        const key = e.target.dataset.key;
        let val   = e.target.value;
        if (key === 'max_power') val = val ? parseInt(val) : null;
        this._updateDevice(idx, key, val);
        if (key === 'name') this._render();
      });
    });

    // Colour picker
    this.shadowRoot.querySelectorAll('input[type="color"][data-device]').forEach(input =>
      input.addEventListener('input', e =>
        this._updateDevice(parseInt(e.target.dataset.device), 'bg_color', e.target.value)));
    this.shadowRoot.querySelectorAll('[data-reset-color]').forEach(btn =>
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this._updateDevice(parseInt(btn.dataset.resetColor), 'bg_color', null);
        this._render();
      }));

    // Phase-mode buttons
    this.shadowRoot.querySelectorAll('[data-phase-btn]').forEach(btn =>
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this._updateDevice(parseInt(btn.dataset.phaseBtn), 'phase_mode', btn.dataset.phase);
        this._render();
      }));

    // Add device
    this.shadowRoot.querySelector('#add-device').addEventListener('click', () => this._addDevice());

    // Inject pickers — three strategies for reliability
    this._injectPickers();                                    // 1. Immediate
    requestAnimationFrame(() => this._injectPickers());       // 2. After paint
    if (typeof customElements !== 'undefined') {
      customElements.whenDefined('ha-entity-picker')          // 3. After CE registration
        .then(() => this._injectPickers());
    }
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
          name:         'Device 1',
          phase_mode:   '1',
          power_entity: 'sensor.power_device1',
          max_power:    500,
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

  // ── Helpers ───────────────────────────────────────────────────────────────────

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
    return this._state(id)?.attributes?.unit_of_measurement || def || '';
  }

  _isOnline(dev) {
    const s = this._state(dev.power_entity);
    return s && s.state !== 'unavailable' && s.state !== 'unknown';
  }

  _flowLabel(dev) {
    const f = this._val(dev.flow_entity, '');
    if (f && f !== '–') return f.charAt(0).toUpperCase() + f.slice(1);
    return parseFloat(this._val(dev.power_entity, '0')) > 0 ? 'Consuming' : 'Standby';
  }

  _arcPct(dev) {
    const w   = parseFloat(this._val(dev.power_entity, '0')) || 0;
    const max = parseInt(dev.max_power) || 500;
    return Math.min((w / max) * 100, 100);
  }

  _arcD(pct, full) {
    const r = 52, cx = 60, cy = 60, s = -220, span = 260;
    const endDeg = s + (full ? span : span * Math.min(pct, 100) / 100);
    const rad    = d => d * Math.PI / 180;
    const x1 = cx + r * Math.cos(rad(s)),      y1 = cy + r * Math.sin(rad(s));
    const x2 = cx + r * Math.cos(rad(endDeg)), y2 = cy + r * Math.sin(rad(endDeg));
    const lg = (full ? span : span * pct / 100) > 180 ? 1 : 0;
    if (!full && pct <= 0) return '';
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${lg} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }

  // Arc colour: green → yellow → red as load increases 0→50→75→100%
  _arcColors(pct) {
    const p = Math.min(pct, 100);
    let r, g, b;
    if (p <= 50) {
      r = 34;  g = 197; b = 94;
    } else if (p <= 75) {
      const t = (p - 50) / 25;
      r = Math.round(34  + t * (234 - 34));
      g = Math.round(197 + t * (179 - 197));
      b = Math.round(94  + t * (8   - 94));
    } else {
      const t = (p - 75) / 25;
      r = Math.round(234 + t * (239 - 234));
      g = Math.round(179 + t * (68  - 179));
      b = Math.round(8   + t * (68  - 8));
    }
    const hex  = v => v.toString(16).padStart(2, '0');
    return {
      color: `#${hex(r)}${hex(g)}${hex(b)}`,
      glow:  `rgba(${r},${g},${b},0.75)`,
    };
  }

  _moreInfo(id) {
    if (!id) return;
    this.dispatchEvent(new CustomEvent('hass-more-info', {
      bubbles: true, composed: true, detail: { entityId: id },
    }));
  }

  // ── 1-Phase tile ──────────────────────────────────────────────────────────────
  // Reads ONLY 1-phase entity keys.  Never reads _a/_b/_c variants.

  _deviceTile1P(dev) {
    const online = this._isOnline(dev);
    const power  = this._val(dev.power_entity, '0');
    const powerU = this._unit(dev.power_entity, 'W');
    const flow   = this._flowLabel(dev);
    const pct    = this._arcPct(dev);
    const trackD = this._arcD(100, true);
    const arcD   = this._arcD(pct, false);
    const { color: arcColor, glow: arcGlow } = this._arcColors(pct);

    // 1-phase-only entities
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
    const statCount  = [hasEnergy, hasCurrent, hasPF].filter(Boolean).length;
    const tileStyle  = dev.bg_color ? `--tile-tint:${dev.bg_color};` : '';

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
              <path fill="none" stroke="${arcColor}" stroke-width="12" stroke-linecap="round"
                opacity="0.18" d="${arcD}"/>
              <path fill="none" stroke="${arcColor}" stroke-width="5" stroke-linecap="round"
                style="filter:drop-shadow(0 0 5px ${arcGlow})" d="${arcD}"/>
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

        ${statCount > 0 ? `
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

        ${(hasVolt || hasFreq) ? `
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

  // ── 3-Phase tile — Variant C ──────────────────────────────────────────────────
  // Layout: gauge LEFT · phase table RIGHT (flex-wrap to vertical when tile is narrow).
  // Reads ONLY 3-phase entity keys (power_a/b/c, current_a/b/c, voltage_a/b/c, etc.).
  // Never reads current_entity / voltage_entity / frequency_entity (those are 1P-only).

  _deviceTile3P(dev) {
    const online = this._isOnline(dev);
    const power  = this._val(dev.power_entity, '0');
    const powerU = this._unit(dev.power_entity, 'W');
    const flow   = this._flowLabel(dev);
    const pct    = this._arcPct(dev);
    const trackD = this._arcD(100, true);
    const arcD   = this._arcD(pct, false);
    const { color: arcColor, glow: arcGlow } = this._arcColors(pct);
    const tileStyle = dev.bg_color ? `--tile-tint:${dev.bg_color};` : '';

    // Per-phase Power — 3P keys only
    const pwrA = dev.power_a_entity ? this._val(dev.power_a_entity) : null;
    const pwrB = dev.power_b_entity ? this._val(dev.power_b_entity) : null;
    const pwrC = dev.power_c_entity ? this._val(dev.power_c_entity) : null;
    const pwrU = this._unit(dev.power_a_entity || dev.power_b_entity || dev.power_entity, 'W');

    // Per-phase Current — 3P keys only
    const curA = dev.current_a_entity ? this._val(dev.current_a_entity) : null;
    const curB = dev.current_b_entity ? this._val(dev.current_b_entity) : null;
    const curC = dev.current_c_entity ? this._val(dev.current_c_entity) : null;
    const curU = this._unit(dev.current_a_entity || dev.current_b_entity, 'A');

    // Per-phase Voltage — 3P keys only
    const voltA = dev.voltage_a_entity ? this._val(dev.voltage_a_entity) : null;
    const voltB = dev.voltage_b_entity ? this._val(dev.voltage_b_entity) : null;
    const voltC = dev.voltage_c_entity ? this._val(dev.voltage_c_entity) : null;
    const voltU = this._unit(dev.voltage_a_entity || dev.voltage_b_entity, 'V');

    // Energy row (produced / consumed / total)
    const enP = dev.energy_p_entity ? this._val(dev.energy_p_entity) : null;
    const enC = dev.energy_c_entity ? this._val(dev.energy_c_entity) : null;
    const enT = dev.energy_t_entity ? this._val(dev.energy_t_entity) : null;

    // Summary stats below phase table
    const energy  = dev.energy_entity         ? this._val(dev.energy_entity)         : null;
    const energyU = this._unit(dev.energy_entity, 'kWh');
    const pf      = dev.power_factor_entity   ? this._val(dev.power_factor_entity)   : null;
    const pfU     = this._unit(dev.power_factor_entity, '%');
    const react   = dev.power_reactive_entity ? this._val(dev.power_reactive_entity) : null;
    const reactU  = this._unit(dev.power_reactive_entity, 'VAR');

    // Phase-row builder — returns '' when all three values are null (row not configured)
    const phaseRow = (icon, iconColor, vA, vB, vC, unit, idA, idB, idC) => {
      if (vA === null && vB === null && vC === null) return '';
      const cell = (v, id) => v !== null
        ? `<div class="ph-cell"${id ? ` data-entity="${id}"` : ''}>
             <span class="ph-val">${v}</span><span class="ph-unit">${unit}</span>
           </div>`
        : `<div class="ph-cell ph-empty"></div>`;
      return `
        <div class="phase-row">
          <div class="ph-icon-cell" style="color:${iconColor}">${icon}</div>
          ${cell(vA, idA)}${cell(vB, idB)}${cell(vC, idC)}
        </div>`;
    };

    const hasPhaseTable = [pwrA, pwrB, pwrC, curA, curB, curC, voltA, voltB, voltC, enP, enC, enT]
      .some(v => v !== null);
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

        <!-- Variant C: flex row — gauge left, phase table right.
             flex-wrap causes the table to drop below the gauge when
             the tile is too narrow (e.g. 2-col on mobile). -->
        <div class="tile-3p-body">

          <div class="tile-3p-gauge">
            <div class="gauge-wrap" data-entity="${dev.power_entity}">
              <svg class="gauge-svg gauge-3p" viewBox="0 0 120 120">
                <path class="g-track" d="${trackD}"/>
                ${arcD ? `
                  <path fill="none" stroke="${arcColor}" stroke-width="12" stroke-linecap="round"
                    opacity="0.18" d="${arcD}"/>
                  <path fill="none" stroke="${arcColor}" stroke-width="5" stroke-linecap="round"
                    style="filter:drop-shadow(0 0 5px ${arcGlow})" d="${arcD}"/>
                ` : ''}
              </svg>
              <div class="gauge-center">
                <div class="g-row">
                  <span class="g-num g-num-3p">${power}</span>
                  <span class="g-unit">${powerU}</span>
                </div>
                <div class="g-lbl" style="color:${arcColor}">${flow}</div>
              </div>
            </div>
          </div>

          ${hasPhaseTable ? `
          <div class="phase-table">
            <!-- Column headers -->
            <div class="phase-row ph-hdr-row">
              <div class="ph-icon-spacer"></div>
              <div class="ph-hdr">Phase A</div>
              <div class="ph-hdr">Phase B</div>
              <div class="ph-hdr">Phase C</div>
            </div>
            <!-- Data rows: icon + Phase A / Phase B / Phase C cells -->
            ${phaseRow(ICON_POWER,   '#fbbf24',
                pwrA, pwrB, pwrC, pwrU,
                dev.power_a_entity,   dev.power_b_entity,   dev.power_c_entity)}
            ${phaseRow(ICON_CURRENT, '#60a5fa',
                curA, curB, curC, curU,
                dev.current_a_entity, dev.current_b_entity, dev.current_c_entity)}
            ${phaseRow(ICON_VOLTAGE, '#a78bfa',
                voltA, voltB, voltC, voltU,
                dev.voltage_a_entity, dev.voltage_b_entity, dev.voltage_c_entity)}
            ${phaseRow(ICON_ENERGY,  '#34d399',
                enP, enC, enT, 'kWh',
                dev.energy_p_entity,  dev.energy_c_entity,  dev.energy_t_entity)}
          </div>
          ` : ''}

        </div><!-- /.tile-3p-body -->

        <!-- Summary stats: Total Energy | Power Factor | Reactive Power -->
        ${miscCount > 0 ? `
          <div class="stats cols-${miscCount}">
            ${energy ? `<div class="stat" data-entity="${dev.energy_entity}">
              <span class="s-val">${energy}</span><span class="s-unit"> ${energyU}</span>
              <span class="s-lbl">Total Energy</span></div>` : ''}
            ${pf ? `<div class="stat" data-entity="${dev.power_factor_entity}">
              <span class="s-val">${pf}</span><span class="s-unit">${pfU}</span>
              <span class="s-lbl">PF</span></div>` : ''}
            ${react ? `<div class="stat" data-entity="${dev.power_reactive_entity}">
              <span class="s-val">${react}</span><span class="s-unit"> ${reactU}</span>
              <span class="s-lbl">Reactive</span></div>` : ''}
          </div>
        ` : ''}

      </div>`;
    // No voltage/frequency bottom bar on 3-phase tiles —
    // phase voltages are shown per-phase in the table above.
  }

  // ── Main render ───────────────────────────────────────────────────────────────

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

        /* ── Tile base ── */
        .tile {
          background: linear-gradient(145deg, #0d1b2e 0%, #0a1628 55%, #0e2040 100%);
          border-radius: 16px; padding: 16px;
          position: relative; overflow: hidden; min-width: 0;
          border: 1px solid rgba(66,153,225,0.13);
          box-shadow: 0 0 30px rgba(66,153,225,0.04), 0 12px 40px rgba(0,0,0,0.45),
                      inset 0 1px 0 rgba(255,255,255,0.04);
          touch-action: pan-y;
        }
        .tile::before {
          content:''; position:absolute; top:-50px; right:-50px; pointer-events:none;
          width:160px; height:160px; z-index:0;
          background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%);
        }
        .tile::after {
          content:''; position:absolute; inset:0; pointer-events:none; z-index:0;
          border-radius:16px; background: var(--tile-tint, transparent);
          opacity: 0.18; mix-blend-mode: color;
        }

        @media (max-width: 520px) {
          .tile          { padding: 10px 8px; border-radius: 12px; }
          .tile-name     { font-size: 10px !important; letter-spacing: 1px; }
          .g-num         { font-size: 20px !important; }
          .g-lbl         { font-size: 8px; }
          .s-val         { font-size: 12px; }
          .s-lbl, .s-unit, .b-lbl, .b-unit { font-size: 8px; }
          .b-val         { font-size: 12px; }
          .stat          { padding: 6px 4px; }
          .bottom        { padding: 6px 8px; }
          .ph-val        { font-size: 10px !important; }
          .ph-unit, .ph-hdr { font-size: 7px !important; }
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
        .gauge-svg  { width:120px; height:120px; filter:drop-shadow(0 0 8px rgba(96,165,250,0.2)); }
        .g-track    { fill:none; stroke:rgba(255,255,255,0.05); stroke-width:5; stroke-linecap:round; }
        .gauge-center {
          position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
          text-align:center; pointer-events:none;
        }
        .g-row  { display:flex; align-items:baseline; justify-content:center; gap:1px; line-height:1; }
        .g-num  { font-size:26px; font-weight:700; color:#fff; letter-spacing:-1px; text-shadow:0 0 16px rgba(96,165,250,0.5); }
        .g-unit { font-size:11px; font-weight:300; color:rgba(148,163,184,0.7); margin-bottom:2px; }
        .g-lbl  { font-size:10px; letter-spacing:1px; text-transform:uppercase; margin-top:3px; font-weight:600; }

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

        /* ── Bottom row: voltage / frequency (1-phase only) ── */
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

        /* ── 3-Phase Variant C body ── */
        .tile-3p-body {
          display: flex;
          flex-wrap: wrap;      /* wraps to vertical when tile is too narrow */
          gap: 10px;
          align-items: flex-start;
          margin-bottom: 7px;
          position: relative;
          z-index: 1;
        }
        .tile-3p-gauge { flex-shrink: 0; }
        /* Remove bottom margin from gauge when it's beside the phase table */
        .tile-3p-body .gauge-wrap { margin-bottom: 0; }
        /* Smaller gauge in 3P tile to leave room for the phase table */
        .tile-3p-body .gauge-3p  { width: 90px; height: 90px; }
        .tile-3p-body .g-num-3p  { font-size: 20px; }

        /* ── Phase table ── */
        .phase-table {
          flex: 1;
          min-width: 168px;   /* if tile < ~268px wide, wraps below gauge automatically */
          background: rgba(0,0,0,0.15);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 10px;
          padding: 5px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .phase-row {
          display: grid;
          grid-template-columns: 22px repeat(3, 1fr);
          gap: 3px;
          align-items: center;
        }
        /* Header row — re-uses .phase-row grid, no icon cell */
        .ph-hdr-row { }
        .ph-icon-spacer { width: 22px; }
        .ph-hdr {
          font-size: 8px; font-weight: 700; letter-spacing: 0.5px;
          text-transform: uppercase; color: rgba(96,165,250,0.75);
          text-align: center; padding: 2px 0;
        }
        .ph-icon-cell {
          display: flex; align-items: center; justify-content: center;
          padding: 2px 0; flex-shrink: 0;
        }
        .ph-cell {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 5px; padding: 4px 2px; text-align: center;
          cursor: pointer; transition: background .2s;
          display: flex; flex-direction: column; align-items: center; min-width: 0;
        }
        .ph-cell:hover { background: rgba(96,165,250,0.08); }
        .ph-cell.ph-empty { background: none; border-color: transparent; cursor: default; }
        .ph-val  { font-size: 12px; font-weight: 700; color: #f1f5f9; line-height: 1; }
        .ph-unit { font-size: 8px;  color: rgba(148,163,184,0.5); }
      </style>

      <ha-card>
        <div class="card-wrap">
          ${cfg.title ? `<div class="card-title">${cfg.title}</div>` : ''}
          <div class="grid">
            ${devices.map(dev =>
              (dev.phase_mode === '3')
                ? this._deviceTile3P(dev)
                : this._deviceTile1P(dev)
            ).join('')}
          </div>
        </div>
      </ha-card>
    `;

    // Wire every [data-entity] element to open the HA more-info dialog
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
    documentationURL: 'https://github.com/robman2026/Power-Energy-HA-Dashboard',
  });
}

console.info(
  '%c POWER-MONITOR-CARD %c v' + CARD_VERSION + ' ',
  'color:#fff;background:#3b82f6;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px',
  'color:#3b82f6;background:#1e3a5f;font-weight:700;padding:2px 6px;border-radius:0 3px 3px 0'
);
