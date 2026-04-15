/**

- Server Rack Power Card
- A glassmorphism-style Lovelace custom card for monitoring server rack power metrics.
- https://github.com/your-username/server-rack-card
  */

class ServerRackCard extends HTMLElement {
constructor() {
super();
this.attachShadow({ mode: ‘open’ });
}

set hass(hass) {
this._hass = hass;
this._render();
}

setConfig(config) {
if (!config.power_entity) {
throw new Error(‘You must define a power_entity’);
}
this._config = {
title: config.title || ‘Server Rack’,
power_entity: config.power_entity,
flow_entity: config.flow_entity || null,
energy_entity: config.energy_entity || null,
current_entity: config.current_entity || null,
power_factor_entity: config.power_factor_entity || null,
voltage_entity: config.voltage_entity || null,
frequency_entity: config.frequency_entity || null,
max_power: config.max_power || 500,
details_entity: config.details_entity || null,
…config
};
}

getCardSize() {
return 5;
}

_getState(entity_id) {
if (!entity_id || !this._hass) return null;
const state = this._hass.states[entity_id];
return state ? state : null;
}

_getStateValue(entity_id, fallback = ‘–’) {
const state = this._getState(entity_id);
return state ? state.state : fallback;
}

_isOnline() {
const state = this._getState(this._config.power_entity);
return state && state.state !== ‘unavailable’ && state.state !== ‘unknown’;
}

_getFlowLabel() {
const flow = this._getStateValue(this._config.flow_entity, ‘’);
if (!flow) {
const power = parseFloat(this._getStateValue(this._config.power_entity, ‘0’));
return power > 0 ? ‘Consuming’ : ‘Standby’;
}
return flow.charAt(0).toUpperCase() + flow.slice(1);
}

_getPowerPercent() {
const power = parseFloat(this._getStateValue(this._config.power_entity, ‘0’));
const max = this._config.max_power;
return Math.min((power / max) * 100, 100);
}

_getArcPath(percent) {
const r = 70;
const cx = 90, cy = 90;
const startAngle = -220;
const totalDeg = 260;
const endAngle = startAngle + (totalDeg * percent / 100);
const toRad = deg => (deg * Math.PI) / 180;
const x1 = cx + r * Math.cos(toRad(startAngle));
const y1 = cy + r * Math.sin(toRad(startAngle));
const x2 = cx + r * Math.cos(toRad(endAngle));
const y2 = cy + r * Math.sin(toRad(endAngle));
const largeArc = (totalDeg * percent / 100) > 180 ? 1 : 0;
if (percent <= 0) return ‘’;
return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

_getTrackPath() {
const r = 70;
const cx = 90, cy = 90;
const startAngle = -220;
const totalDeg = 260;
const endAngle = startAngle + totalDeg;
const toRad = deg => (deg * Math.PI) / 180;
const x1 = cx + r * Math.cos(toRad(startAngle));
const y1 = cy + r * Math.sin(toRad(startAngle));
const x2 = cx + r * Math.cos(toRad(endAngle));
const y2 = cy + r * Math.sin(toRad(endAngle));
return `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;
}

_formatValue(entity_id, fallback = ‘–’) {
const state = this._getState(entity_id);
if (!state) return fallback;
const val = parseFloat(state.state);
if (isNaN(val)) return state.state;
return val % 1 !== 0 ? val.toFixed(2) : val.toString();
}

_getUnit(entity_id) {
const state = this._getState(entity_id);
return state?.attributes?.unit_of_measurement || ‘’;
}

_handleMoreInfo(entity_id) {
if (!entity_id) return;
const event = new CustomEvent(‘hass-more-info’, {
bubbles: true,
composed: true,
detail: { entityId: entity_id }
});
this.dispatchEvent(event);
}

_render() {
if (!this._config || !this._hass) return;

```
const power = this._formatValue(this._config.power_entity, '0');
const powerUnit = this._getUnit(this._config.power_entity) || 'W';
const energy = this._formatValue(this._config.energy_entity);
const energyUnit = this._getUnit(this._config.energy_entity) || 'kWh';
const current = this._formatValue(this._config.current_entity);
const currentUnit = this._getUnit(this._config.current_entity) || 'A';
const pf = this._formatValue(this._config.power_factor_entity);
const pfUnit = this._getUnit(this._config.power_factor_entity) || '%';
const voltage = this._formatValue(this._config.voltage_entity);
const voltageUnit = this._getUnit(this._config.voltage_entity) || 'V';
const frequency = this._formatValue(this._config.frequency_entity);
const frequencyUnit = this._getUnit(this._config.frequency_entity) || 'Hz';
const flowLabel = this._getFlowLabel();
const online = this._isOnline();
const arcPercent = this._getPowerPercent();
const arcPath = this._getArcPath(arcPercent);
const trackPath = this._getTrackPath();

this.shadowRoot.innerHTML = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700&family=Rajdhani:wght@400;600&display=swap');

    :host {
      display: block;
      font-family: 'Exo 2', sans-serif;
    }

    .card {
      background: linear-gradient(145deg, #0d1b2e 0%, #0a1628 50%, #0d1f3c 100%);
      border-radius: 20px;
      padding: 20px;
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(66, 153, 225, 0.15);
      box-shadow:
        0 0 40px rgba(66, 153, 225, 0.05),
        0 20px 60px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255,255,255,0.05);
    }

    .card::before {
      content: '';
      position: absolute;
      top: -60px;
      right: -60px;
      width: 200px;
      height: 200px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%);
      pointer-events: none;
    }

    .card::after {
      content: '';
      position: absolute;
      bottom: -40px;
      left: -40px;
      width: 150px;
      height: 150px;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.07) 0%, transparent 70%);
      pointer-events: none;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: rgba(148, 163, 184, 0.8);
    }

    .status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 400;
      color: rgba(148, 163, 184, 0.7);
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 8px #22c55e, 0 0 16px rgba(34, 197, 94, 0.4);
      animation: pulse-dot 2s ease-in-out infinite;
    }

    .status-dot.offline {
      background: #ef4444;
      box-shadow: 0 0 8px #ef4444;
      animation: none;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; box-shadow: 0 0 8px #22c55e, 0 0 16px rgba(34,197,94,0.4); }
      50% { opacity: 0.7; box-shadow: 0 0 4px #22c55e, 0 0 8px rgba(34,197,94,0.2); }
    }

    /* Gauge */
    .gauge-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
      position: relative;
    }

    .gauge-svg {
      width: 180px;
      height: 180px;
      filter: drop-shadow(0 0 12px rgba(96, 165, 250, 0.25));
    }

    .gauge-track {
      fill: none;
      stroke: rgba(255,255,255,0.05);
      stroke-width: 6;
      stroke-linecap: round;
    }

    .gauge-fill {
      fill: none;
      stroke: url(#arcGradient);
      stroke-width: 6;
      stroke-linecap: round;
      transition: stroke-dasharray 0.8s ease;
      filter: drop-shadow(0 0 6px rgba(96, 165, 250, 0.8));
    }

    .gauge-glow {
      fill: none;
      stroke: url(#arcGradient);
      stroke-width: 14;
      stroke-linecap: round;
      opacity: 0.15;
      transition: stroke-dasharray 0.8s ease;
    }

    .gauge-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }

    .gauge-icon {
      font-size: 16px;
      line-height: 1;
      margin-bottom: 2px;
      filter: drop-shadow(0 0 6px rgba(96, 165, 250, 0.8));
    }

    .gauge-value {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 2px;
      line-height: 1;
    }

    .gauge-number {
      font-size: 36px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -1px;
      text-shadow: 0 0 20px rgba(96, 165, 250, 0.5);
    }

    .gauge-unit {
      font-size: 14px;
      font-weight: 300;
      color: rgba(148, 163, 184, 0.8);
      margin-bottom: 4px;
    }

    .gauge-label {
      font-size: 11px;
      color: rgba(96, 165, 250, 0.9);
      letter-spacing: 1.5px;
      text-transform: uppercase;
      font-weight: 400;
      margin-top: 4px;
    }

    /* Stat cards */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 10px;
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 12px;
      padding: 12px 10px;
      text-align: center;
      backdrop-filter: blur(10px);
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, transform 0.15s;
    }

    .stat-card:hover {
      background: rgba(96, 165, 250, 0.08);
      border-color: rgba(96, 165, 250, 0.2);
      transform: translateY(-1px);
    }

    .stat-icon {
      font-size: 14px;
      margin-bottom: 6px;
      display: block;
      opacity: 0.8;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: #f1f5f9;
      line-height: 1;
      margin-bottom: 2px;
    }

    .stat-unit {
      font-size: 10px;
      font-weight: 400;
      color: rgba(148, 163, 184, 0.6);
    }

    .stat-label {
      font-size: 10px;
      color: rgba(100, 116, 139, 0.9);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 4px;
    }

    /* Voltage / Frequency row */
    .bottom-row {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      justify-content: space-around;
      margin-bottom: 10px;
      backdrop-filter: blur(10px);
    }

    .bottom-item {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .bottom-item:hover { opacity: 0.7; }

    .wave-icon {
      font-size: 18px;
      opacity: 0.7;
    }

    .wave-icon.violet { filter: hue-rotate(30deg); }
    .wave-icon.cyan { filter: hue-rotate(-30deg); }

    .bottom-value {
      font-size: 17px;
      font-weight: 600;
      color: #e2e8f0;
    }

    .bottom-unit {
      font-size: 10px;
      font-weight: 300;
      color: rgba(148, 163, 184, 0.6);
      display: block;
    }

    .bottom-label {
      font-size: 10px;
      color: rgba(100, 116, 139, 0.8);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .bottom-divider {
      width: 1px;
      background: rgba(255,255,255,0.07);
      align-self: stretch;
    }

    /* Details button */
    .details-btn {
      width: 100%;
      padding: 12px;
      background: rgba(96, 165, 250, 0.08);
      border: 1px solid rgba(96, 165, 250, 0.2);
      border-radius: 12px;
      color: rgba(148, 163, 184, 0.9);
      font-family: 'Exo 2', sans-serif;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 1px;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .details-btn:hover {
      background: rgba(96, 165, 250, 0.15);
      border-color: rgba(96, 165, 250, 0.4);
      color: #fff;
    }

    .btn-icon {
      font-size: 14px;
    }
  </style>

  <ha-card>
    <div class="card">

      <div class="header">
        <span class="title">${this._config.title}</span>
        <div class="status">
          <div class="status-dot ${online ? '' : 'offline'}"></div>
          <span>${online ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      <!-- Gauge -->
      <div class="gauge-wrapper" @click="${() => this._handleMoreInfo(this._config.power_entity)}">
        <svg class="gauge-svg" viewBox="0 0 180 180">
          <defs>
            <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#818cf8"/>
              <stop offset="100%" stop-color="#38bdf8"/>
            </linearGradient>
          </defs>
          <path class="gauge-track" d="${trackPath}"/>
          ${arcPath ? `
            <path class="gauge-glow" d="${arcPath}"/>
            <path class="gauge-fill" d="${arcPath}"/>
          ` : ''}
        </svg>
        <div class="gauge-center">
          <div class="gauge-icon">⚡</div>
          <div class="gauge-value">
            <span class="gauge-number">${power}</span>
            <span class="gauge-unit">${powerUnit}</span>
          </div>
          <div class="gauge-label">${flowLabel}</div>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card" @click="${() => this._handleMoreInfo(this._config.energy_entity)}">
          <span class="stat-icon">⚡</span>
          <div class="stat-value">${energy}<span class="stat-unit"> ${energyUnit}</span></div>
          <div class="stat-label">Energy</div>
        </div>
        <div class="stat-card" @click="${() => this._handleMoreInfo(this._config.current_entity)}">
          <span class="stat-icon">〜</span>
          <div class="stat-value">${current}<span class="stat-unit"> ${currentUnit}</span></div>
          <div class="stat-label">Current</div>
        </div>
        <div class="stat-card" @click="${() => this._handleMoreInfo(this._config.power_factor_entity)}">
          <span class="stat-icon">◎</span>
          <div class="stat-value">${pf}<span class="stat-unit">${pfUnit}</span></div>
          <div class="stat-label">Power Factor</div>
        </div>
      </div>

      <!-- Voltage & Frequency -->
      <div class="bottom-row">
        <div class="bottom-item" @click="${() => this._handleMoreInfo(this._config.voltage_entity)}">
          <span class="wave-icon violet">∿</span>
          <div>
            <span class="bottom-value">${voltage} <span class="bottom-unit">${voltageUnit}</span></span>
            <span class="bottom-label">Voltage</span>
          </div>
        </div>
        <div class="bottom-divider"></div>
        <div class="bottom-item" @click="${() => this._handleMoreInfo(this._config.frequency_entity)}">
          <span class="wave-icon cyan">∿</span>
          <div>
            <span class="bottom-value">${frequency} <span class="bottom-unit">${frequencyUnit}</span></span>
            <span class="bottom-label">Frequency</span>
          </div>
        </div>
      </div>

      <!-- Details -->
      <button class="details-btn" @click="${() => this._handleMoreInfo(this._config.power_entity)}">
        <span class="btn-icon">ℹ️</span> Details
      </button>

    </div>
  </ha-card>
`;

// Attach click listeners (shadow DOM doesn't support @click in innerHTML)
const gaugeWrapper = this.shadowRoot.querySelector('.gauge-wrapper');
if (gaugeWrapper) gaugeWrapper.addEventListener('click', () => this._handleMoreInfo(this._config.power_entity));

const statCards = this.shadowRoot.querySelectorAll('.stat-card');
const statEntities = [this._config.energy_entity, this._config.current_entity, this._config.power_factor_entity];
statCards.forEach((card, i) => card.addEventListener('click', () => this._handleMoreInfo(statEntities[i])));

const bottomItems = this.shadowRoot.querySelectorAll('.bottom-item');
const bottomEntities = [this._config.voltage_entity, this._config.frequency_entity];
bottomItems.forEach((item, i) => item.addEventListener('click', () => this._handleMoreInfo(bottomEntities[i])));

const detailsBtn = this.shadowRoot.querySelector('.details-btn');
if (detailsBtn) detailsBtn.addEventListener('click', () => this._handleMoreInfo(this._config.power_entity));
```

}
}

customElements.define(‘server-rack-card’, ServerRackCard);

window.customCards = window.customCards || [];
window.customCards.push({
type: ‘server-rack-card’,
name: ‘Server Rack Card’,
description: ‘Glassmorphism power monitoring card for server racks’,
preview: true,
});
