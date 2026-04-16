/**
 * Power Monitor Card
 * Multi-device, responsive, glassmorphism Lovelace custom card for Home Assistant.
 * Supports a visual editor and any number of monitored circuits/devices.
 *
 * https://github.com/robman2026/power-monitor-card
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_VERSION = '1.0.0';
const CARD_TAG     = 'power-monitor-card';
const EDITOR_TAG   = 'power-monitor-card-editor';

const DEVICE_FIELDS = [
  { key: 'power_entity',        label: 'Power entity (W)',          required: true  },
  { key: 'flow_entity',         label: 'Flow / direction entity',   required: false },
  { key: 'energy_entity',       label: 'Energy entity (kWh)',       required: false },
  { key: 'current_entity',      label: 'Current entity (A)',        required: false },
  { key: 'power_factor_entity', label: 'Power factor entity (%)',   required: false },
  { key: 'voltage_entity',      label: 'Voltage entity (V)',        required: false },
  { key: 'frequency_entity',    label: 'Frequency entity (Hz)',     required: false },
];

// ─── Visual Editor ────────────────────────────────────────────────────────────

class PowerMonitorCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config     = { devices: [] };
    this._expanded   = {};   // track which device accordion is open
    this._hass       = null;
  }

  set hass(hass) {
    this._hass = hass;
    // Pass hass to any already-rendered entity pickers
    this.shadowRoot.querySelectorAll('ha-entity-picker').forEach(p => { p.hass = hass; });
  }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._config.devices) this._config.devices = [];
    this._render();
  }

  _fire() {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  _updateGlobal(key, value) {
    if (value === '' || value == null) {
      delete this._config[key];
    } else {
      this._config[key] = value;
    }
    this._fire();
  }

  _updateDevice(index, key, value) {
    if (!this._config.devices[index]) return;
    if (value === '' || value == null) {
      delete this._config.devices[index][key];
    } else {
      this._config.devices[index][key] = value;
    }
    this._fire();
  }

  _addDevice() {
    this._config.devices.push({ name: 'New Device', power_entity: '' });
    const newIdx = this._config.devices.length - 1;
    this._expanded[newIdx] = true;
    this._render();
    this._fire();
  }

  _removeDevice(index) {
    this._config.devices.splice(index, 1);
    delete this._expanded[index];
    this._render();
    this._fire();
  }

  _moveDevice(index, dir) {
    const arr = this._config.devices;
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    this._render();
    this._fire();
  }

  _toggleExpanded(index) {
    this._expanded[index] = !this._expanded[index];
    this._render();
  }

  _render() {
    const cfg = this._config;
    const devices = cfg.devices || [];

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .editor { padding: 0; }

        /* Global section */
        .section { margin-bottom: 20px; }
        .section-label {
          font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
          color: var(--secondary-text-color); margin-bottom: 10px; padding-bottom: 4px;
          border-bottom: 1px solid var(--divider-color);
        }

        .row { display: flex; gap: 10px; margin-bottom: 10px; }
        .row > * { flex: 1; }

        .field { margin-bottom: 10px; }
        .field label {
          display: block; font-size: 12px; margin-bottom: 4px;
          color: var(--secondary-text-color);
        }
        .field input, .field select {
          width: 100%; padding: 8px 10px; border-radius: 6px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color, #1e293b);
          color: var(--primary-text-color); font-size: 14px;
          box-sizing: border-box; outline: none;
          transition: border-color .15s;
        }
        .field input:focus, .field select:focus {
          border-color: var(--primary-color);
        }

        /* Device accordion */
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
        .device-actions { display: flex; gap: 4px; }
        .icon-btn {
          background: none; border: none; cursor: pointer; padding: 4px 6px;
          border-radius: 4px; font-size: 14px; color: var(--secondary-text-color);
          transition: background .15s;
        }
        .icon-btn:hover { background: rgba(0,0,0,0.1); }
        .icon-btn.danger:hover { background: rgba(239,68,68,0.1); color: #ef4444; }

        .device-body { padding: 0 12px 12px; }
        .device-body ha-entity-picker { display: block; margin-bottom: 6px; }

        .add-btn {
          width: 100%; padding: 10px; background: none;
          border: 1px dashed var(--divider-color); border-radius: 10px;
          color: var(--primary-color); cursor: pointer; font-size: 14px;
          transition: background .15s, border-color .15s;
        }
        .add-btn:hover { background: rgba(var(--rgb-primary-color, 96,165,250),0.08); border-color: var(--primary-color); }

        .max-power-row { display: flex; gap: 10px; align-items: flex-end; }
        .max-power-row .field { flex: 1; margin-bottom: 0; }

        ha-entity-picker { --paper-input-container_-_padding: 0; }
      </style>

      <div class="editor">

        <!-- Global settings -->
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
                <option value=""  ${!cfg.columns                    ? 'selected' : ''}>Auto</option>
                <option value="1" ${cfg.columns == 1                ? 'selected' : ''}>1</option>
                <option value="2" ${cfg.columns == 2                ? 'selected' : ''}>2</option>
                <option value="3" ${cfg.columns == 3                ? 'selected' : ''}>3</option>
                <option value="4" ${cfg.columns == 4                ? 'selected' : ''}>4</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Devices -->
        <div class="section">
          <div class="section-label">Devices (${devices.length})</div>
          <div id="devices-list">
            ${devices.map((dev, i) => `
              <div class="device-card" data-index="${i}">
                <div class="device-header" data-toggle="${i}">
                  <span class="device-chevron ${this._expanded[i] ? 'open' : ''}">&#9654;</span>
                  <span class="device-name">${dev.name || 'Device ' + (i + 1)}</span>
                  <div class="device-actions" onclick="event.stopPropagation()">
                    <button class="icon-btn" data-move="${i}" data-dir="-1" title="Move up">&#8679;</button>
                    <button class="icon-btn" data-move="${i}" data-dir="1"  title="Move down">&#8681;</button>
                    <button class="icon-btn danger" data-remove="${i}" title="Remove">&#10005;</button>
                  </div>
                </div>
                ${this._expanded[i] ? `
                  <div class="device-body">
                    <div class="field">
                      <label>Device Name</label>
                      <input type="text" data-device="${i}" data-key="name" value="${dev.name || ''}" placeholder="e.g. Laundry">
                    </div>
                    <div class="field">
                      <label>Max Power (W) for gauge scale</label>
                      <input type="number" data-device="${i}" data-key="max_power" value="${dev.max_power || ''}" placeholder="500">
                    </div>
                    ${DEVICE_FIELDS.map(f => `
                      <div id="picker-${i}-${f.key}"></div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
          <button class="add-btn" id="add-device">+ Add Device</button>
        </div>

      </div>
    `;

    // ── Wire global fields ────────────────────────────────────────────────────
    this.shadowRoot.querySelector('#g-title').addEventListener('change', e => this._updateGlobal('title', e.target.value));
    this.shadowRoot.querySelector('#g-columns').addEventListener('change', e => {
      const v = e.target.value ? parseInt(e.target.value) : null;
      this._updateGlobal('columns', v);
    });

    // ── Wire device toggles ───────────────────────────────────────────────────
    this.shadowRoot.querySelectorAll('[data-toggle]').forEach(el => {
      el.addEventListener('click', () => this._toggleExpanded(parseInt(el.dataset.toggle)));
    });

    // ── Wire move / remove ────────────────────────────────────────────────────
    this.shadowRoot.querySelectorAll('[data-move]').forEach(btn => {
      btn.addEventListener('click', () => this._moveDevice(parseInt(btn.dataset.move), parseInt(btn.dataset.dir)));
    });
    this.shadowRoot.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => this._removeDevice(parseInt(btn.dataset.remove)));
    });

    // ── Wire device text inputs ───────────────────────────────────────────────
    this.shadowRoot.querySelectorAll('input[data-device]').forEach(input => {
      input.addEventListener('change', e => {
        const idx = parseInt(e.target.dataset.device);
        const key = e.target.dataset.key;
        const val = key === 'max_power' ? (e.target.value ? parseInt(e.target.value) : null) : e.target.value;
        this._updateDevice(idx, key, val);
        if (key === 'name') this._render(); // refresh accordion title
      });
    });

    // ── Add device ────────────────────────────────────────────────────────────
    this.shadowRoot.querySelector('#add-device').addEventListener('click', () => this._addDevice());

    // ── Inject ha-entity-picker for expanded devices ──────────────────────────
    (this._config.devices || []).forEach((dev, i) => {
      if (!this._expanded[i]) return;
      DEVICE_FIELDS.forEach(field => {
        const slot = this.shadowRoot.querySelector(`#picker-${i}-${field.key}`);
        if (!slot) return;
        const picker = document.createElement('ha-entity-picker');
        picker.hass        = this._hass;
        picker.value       = dev[field.key] || '';
        picker.label       = field.label + (field.required ? ' *' : '');
        picker.allowCustomEntity = true;
        picker.addEventListener('value-changed', e => {
          this._updateDevice(i, field.key, e.detail.value);
        });
        slot.appendChild(picker);
      });
    });
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

  // ── HA API ─────────────────────────────────────────────────────────────────

  static getConfigElement() {
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig() {
    return {
      title: 'Power Monitor',
      columns: 3,
      devices: [
        {
          name: 'Device 1',
          power_entity:        'sensor.power_device1',
          flow_entity:         'sensor.flow_device1',
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

  // ── Helpers ────────────────────────────────────────────────────────────────

  _state(id) {
    return (id && this._hass) ? this._hass.states[id] : null;
  }

  _val(id, fallback) {
    const s = this._state(id);
    if (!s || s.state === 'unavailable' || s.state === 'unknown') return fallback != null ? fallback : '–';
    const n = parseFloat(s.state);
    if (isNaN(n)) return s.state;
    return n % 1 !== 0 ? n.toFixed(2) : String(n);
  }

  _unit(id, def) {
    const s = this._state(id);
    return (s && s.attributes && s.attributes.unit_of_measurement) ? s.attributes.unit_of_measurement : (def || '');
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
    const r = 52, cx = 60, cy = 60;
    const s = -220, span = 260;
    const endDeg = s + (full ? span : span * Math.min(pct, 100) / 100);
    const rad = function(d) { return d * Math.PI / 180; };
    const x1 = cx + r * Math.cos(rad(s));
    const y1 = cy + r * Math.sin(rad(s));
    const x2 = cx + r * Math.cos(rad(endDeg));
    const y2 = cy + r * Math.sin(rad(endDeg));
    const lg = (full ? span : span * pct / 100) > 180 ? 1 : 0;
    if (!full && pct <= 0) return '';
    return 'M ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' A ' + r + ' ' + r + ' 0 ' + lg + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2);
  }

  _moreInfo(id) {
    if (!id) return;
    this.dispatchEvent(new CustomEvent('hass-more-info', {
      bubbles: true, composed: true, detail: { entityId: id },
    }));
  }

  // ── Device tile HTML ───────────────────────────────────────────────────────

  _deviceTile(dev) {
    const online  = this._isOnline(dev);
    const power   = this._val(dev.power_entity, '0');
    const powerU  = this._unit(dev.power_entity, 'W');
    const flow    = this._flowLabel(dev);
    const pct     = this._arcPct(dev);
    const trackD  = this._arcD(100, true);
    const arcD    = this._arcD(pct, false);

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

    const hasEnergy  = dev.energy_entity;
    const hasCurrent = dev.current_entity;
    const hasPF      = dev.power_factor_entity;
    const hasVolt    = dev.voltage_entity;
    const hasFreq    = dev.frequency_entity;
    const hasStats   = hasEnergy || hasCurrent || hasPF;
    const hasBottom  = hasVolt || hasFreq;

    return `
      <div class="tile">
        <!-- header -->
        <div class="tile-header">
          <span class="tile-name">${dev.name || 'Device'}</span>
          <div class="status">
            <div class="dot ${online ? '' : 'off'}"></div>
            <span>${online ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        <!-- gauge -->
        <div class="gauge-wrap" data-entity="${dev.power_entity}">
          <svg class="gauge-svg" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="grad-${dev.power_entity}" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stop-color="#818cf8"/>
                <stop offset="100%" stop-color="#38bdf8"/>
              </linearGradient>
            </defs>
            <path class="g-track" d="${trackD}"/>
            ${arcD ? `
              <path class="g-glow" d="${arcD}" stroke="url(#grad-${dev.power_entity})"/>
              <path class="g-arc"  d="${arcD}" stroke="url(#grad-${dev.power_entity})"/>
            ` : ''}
          </svg>
          <div class="gauge-center">
            <div class="g-row">
              <span class="g-num">${power}</span>
              <span class="g-unit">${powerU}</span>
            </div>
            <div class="g-lbl">${flow}</div>
          </div>
        </div>

        <!-- stat tiles -->
        ${hasStats ? `
          <div class="stats cols-${[hasEnergy, hasCurrent, hasPF].filter(Boolean).length}">
            ${hasEnergy  ? `<div class="stat" data-entity="${dev.energy_entity}">
              <span class="s-val">${energy}</span><span class="s-unit"> ${energyU}</span>
              <span class="s-lbl">Energy</span>
            </div>` : ''}
            ${hasCurrent ? `<div class="stat" data-entity="${dev.current_entity}">
              <span class="s-val">${curr}</span><span class="s-unit"> ${currU}</span>
              <span class="s-lbl">Current</span>
            </div>` : ''}
            ${hasPF      ? `<div class="stat" data-entity="${dev.power_factor_entity}">
              <span class="s-val">${pf}</span><span class="s-unit">${pfU}</span>
              <span class="s-lbl">PF</span>
            </div>` : ''}
          </div>
        ` : ''}

        <!-- voltage / frequency -->
        ${hasBottom ? `
          <div class="bottom">
            ${hasVolt ? `<div class="b-item" data-entity="${dev.voltage_entity}">
              <span class="b-wave" style="color:#a78bfa">&#8767;</span>
              <div>
                <span class="b-val">${volt}</span><span class="b-unit"> ${voltU}</span>
                <span class="b-lbl">Voltage</span>
              </div>
            </div>` : ''}
            ${hasVolt && hasFreq ? '<div class="b-div"></div>' : ''}
            ${hasFreq ? `<div class="b-item" data-entity="${dev.frequency_entity}">
              <span class="b-wave" style="color:#38bdf8">&#8767;</span>
              <div>
                <span class="b-val">${freq}</span><span class="b-unit"> ${freqU}</span>
                <span class="b-lbl">Frequency</span>
              </div>
            </div>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  // ── Main render ────────────────────────────────────────────────────────────

  _render() {
    if (!this._config || !this._hass) return;
    const cfg     = this._config;
    const devices = cfg.devices || [];
    const cols    = cfg.columns ? `repeat(${cfg.columns}, minmax(0, 1fr))` : 'repeat(auto-fill, minmax(240px, 1fr))';

    this.shadowRoot.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700&family=Rajdhani:wght@400;600&display=swap');

        :host { display: block; font-family: 'Exo 2', sans-serif; }

        /* Outer card shell */
        ha-card {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
        }
        .card-wrap {
          padding: 0;
        }
        .card-title {
          font-family: 'Rajdhani', sans-serif; font-size: 16px; font-weight: 600;
          letter-spacing: 2px; text-transform: uppercase; color: rgba(148,163,184,0.7);
          padding: 4px 2px 12px;
        }

        /* Grid */
        .grid {
          display: grid;
          grid-template-columns: ${cols};
          gap: 14px;
          container-type: inline-size;
          container-name: power-grid;
        }

        /* Responsive overrides — collapse to 2 cols below ~520px, 1 col below ~340px */
        @media (max-width: 520px) {
          .grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px; }
        }
        @media (max-width: 340px) {
          .grid { grid-template-columns: 1fr !important; gap: 8px; }
        }

        /* Device tile */
        .tile {
          background: linear-gradient(145deg, #0d1b2e 0%, #0a1628 55%, #0e2040 100%);
          border-radius: 16px;
          padding: 16px;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(66,153,225,0.13);
          box-shadow:
            0 0 30px rgba(66,153,225,0.04),
            0 12px 40px rgba(0,0,0,0.45),
            inset 0 1px 0 rgba(255,255,255,0.04);
          min-width: 0; /* prevent tile overflow in narrow grid cells */
        }

        /* Narrow tile adjustments (when tile is squeezed) */
        @media (max-width: 520px) {
          .tile { padding: 10px 8px; border-radius: 12px; }
          .tile-name { font-size: 10px; letter-spacing: 1px; }
          .gauge-svg { width: 90px; height: 90px; }
          .g-num { font-size: 20px; }
          .g-lbl { font-size: 9px; }
          .s-val { font-size: 12px; }
          .s-lbl, .s-unit { font-size: 8px; }
          .b-val { font-size: 12px; }
          .b-lbl, .b-unit { font-size: 8px; }
          .stat { padding: 6px 4px; }
          .bottom { padding: 6px 8px; }
        }
        .tile::before {
          content:''; position:absolute; top:-50px; right:-50px;
          width:160px; height:160px; pointer-events:none;
          background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%);
        }
        .tile::after {
          content:''; position:absolute; bottom:-30px; left:-30px;
          width:120px; height:120px; pointer-events:none;
          background: radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%);
        }

        /* Tile header */
        .tile-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px;
        }
        .tile-name {
          font-family: 'Rajdhani', sans-serif; font-size: 12px; font-weight: 600;
          letter-spacing: 2px; text-transform: uppercase; color: rgba(148,163,184,0.8);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;
        }
        .status { display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(148,163,184,0.6); }
        .dot    { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 6px #22c55e; animation: blink 2s ease-in-out infinite; }
        .dot.off{ background: #ef4444; box-shadow: 0 0 6px #ef4444; animation: none; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.55} }

        /* Gauge */
        .gauge-wrap {
          display: flex; justify-content: center; position: relative;
          margin-bottom: 12px; cursor: pointer;
        }
        .gauge-svg {
          width: 120px; height: 120px;
          filter: drop-shadow(0 0 8px rgba(96,165,250,0.2));
        }
        .g-track { fill: none; stroke: rgba(255,255,255,0.05); stroke-width: 5; stroke-linecap: round; }
        .g-glow  { fill: none; stroke-width: 12; stroke-linecap: round; opacity: .13; }
        .g-arc   { fill: none; stroke-width: 5;  stroke-linecap: round; filter: drop-shadow(0 0 5px rgba(96,165,250,0.75)); }
        .gauge-center {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          text-align: center; pointer-events: none;
        }
        .g-row  { display: flex; align-items: baseline; justify-content: center; gap: 1px; line-height: 1; }
        .g-num  { font-size: 26px; font-weight: 700; color: #fff; letter-spacing: -1px; text-shadow: 0 0 16px rgba(96,165,250,0.5); }
        .g-unit { font-size: 11px; font-weight: 300; color: rgba(148,163,184,0.7); margin-bottom: 2px; }
        .g-lbl  { font-size: 10px; color: rgba(96,165,250,0.85); letter-spacing: 1px; text-transform: uppercase; margin-top: 3px; }

        /* Stats */
        .stats {
          display: grid; gap: 7px; margin-bottom: 7px;
        }
        .stats.cols-1 { grid-template-columns: 1fr; }
        .stats.cols-2 { grid-template-columns: repeat(2, 1fr); }
        .stats.cols-3 { grid-template-columns: repeat(3, 1fr); }
        .stat {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 9px; padding: 8px 6px; text-align: center;
          cursor: pointer; transition: background .2s, border-color .2s, transform .15s;
          display: flex; flex-direction: column; align-items: center;
        }
        .stat:hover { background: rgba(96,165,250,0.08); border-color: rgba(96,165,250,0.2); transform: translateY(-1px); }
        .s-val  { font-size: 15px; font-weight: 700; color: #f1f5f9; line-height: 1; }
        .s-unit { font-size: 9px;  font-weight: 400; color: rgba(148,163,184,0.55); }
        .s-lbl  { font-size: 9px;  color: rgba(100,116,139,0.85); text-transform: uppercase; letter-spacing: .6px; margin-top: 3px; }

        /* Bottom row */
        .bottom {
          background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 9px; padding: 8px 12px; display: flex; justify-content: space-around;
        }
        .b-item { display: flex; align-items: center; gap: 6px; cursor: pointer; transition: opacity .2s; }
        .b-item:hover { opacity: .7; }
        .b-wave { font-size: 15px; opacity: .7; }
        .b-val  { font-size: 14px; font-weight: 600; color: #e2e8f0; line-height: 1.1; }
        .b-unit { font-size: 9px;  font-weight: 300; color: rgba(148,163,184,0.55); }
        .b-lbl  { font-size: 9px;  color: rgba(100,116,139,0.8); text-transform: uppercase; letter-spacing: .6px; }
        .b-div  { width: 1px; background: rgba(255,255,255,0.06); align-self: stretch; }
      </style>

      <ha-card>
        <div class="card-wrap">
          ${cfg.title ? `<div class="card-title">${cfg.title}</div>` : ''}
          <div class="grid">
            ${devices.map(dev => this._deviceTile(dev)).join('')}
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
if (!window.customCards.find(function(c) { return c.type === CARD_TAG; })) {
  window.customCards.push({
    type: CARD_TAG,
    name: 'Power Monitor Card',
    description: 'Multi-device responsive power monitoring dashboard card',
    preview: true,
    documentationURL: 'https://github.com/robman2026/power-monitor-card',
  });
}

console.info('%c POWER-MONITOR-CARD %c v' + CARD_VERSION + ' ', 'color:#fff;background:#3b82f6;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px', 'color:#3b82f6;background:#1e3a5f;font-weight:700;padding:2px 6px;border-radius:0 3px 3px 0');
