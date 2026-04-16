/**
 * Server Rack Card
 * Glassmorphism power monitoring card for Home Assistant Lovelace
 * https://github.com/your-username/server-rack-card
 */

class ServerRackCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  // ─── HA lifecycle ────────────────────────────────────────────────────────────

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  setConfig(config) {
    if (!config.power_entity) {
      throw new Error('server-rack-card: you must define power_entity');
    }
    this._config = {
      title: 'Server Rack',
      max_power: 500,
      ...config,
    };
  }

  getCardSize() {
    return 5;
  }

  // Called by HA when adding the card via UI – pre-fills the YAML editor
  static getStubConfig() {
    return {
      type: 'custom:server-rack-card',
      title: 'Server Rack',
      power_entity: 'sensor.consum_server_rack',
      flow_entity: 'sensor.flow_server_rack',
      energy_entity: 'sensor.total_server_rack',
      current_entity: 'sensor.amperaj_server_rack',
      power_factor_entity: 'sensor.factor_server_rack',
      voltage_entity: 'sensor.voltaj',
      frequency_entity: 'sensor.frecventa',
      max_power: 500,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  _state(id) {
    return id && this._hass ? this._hass.states[id] : null;
  }

  _val(id, fallback = '-') {
    const s = this._state(id);
    if (!s || s.state === 'unavailable' || s.state === 'unknown') return fallback;
    const n = parseFloat(s.state);
    if (isNaN(n)) return s.state;
    return n % 1 !== 0 ? n.toFixed(2) : String(n);
  }

  _unit(id, def = '') {
    const s = this._state(id);
    return (s && s.attributes && s.attributes.unit_of_measurement) ? s.attributes.unit_of_measurement : def;
  }

  _isOnline() {
    const s = this._state(this._config.power_entity);
    return s && s.state !== 'unavailable' && s.state !== 'unknown';
  }

  _flowLabel() {
    const flow = this._val(this._config.flow_entity, '');
    if (flow && flow !== '-') return flow.charAt(0).toUpperCase() + flow.slice(1);
    return parseFloat(this._val(this._config.power_entity, '0')) > 0 ? 'Consuming' : 'Standby';
  }

  _arcPercent() {
    const w = parseFloat(this._val(this._config.power_entity, '0'));
    return Math.min((w / this._config.max_power) * 100, 100);
  }

  _arcD(pct, full) {
    const r = 70, cx = 90, cy = 90;
    const startDeg = -220;
    const span = 260;
    const endDeg = startDeg + (full ? span : span * Math.min(pct, 100) / 100);
    const rad = function(d) { return d * Math.PI / 180; };
    const x1 = cx + r * Math.cos(rad(startDeg));
    const y1 = cy + r * Math.sin(rad(startDeg));
    const x2 = cx + r * Math.cos(rad(endDeg));
    const y2 = cy + r * Math.sin(rad(endDeg));
    const large = (full ? span : span * pct / 100) > 180 ? 1 : 0;
    if (!full && pct <= 0) return '';
    return 'M ' + x1 + ' ' + y1 + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2 + ' ' + y2;
  }

  _moreInfo(id) {
    if (!id) return;
    this.dispatchEvent(new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: id },
    }));
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  _render() {
    if (!this._config || !this._hass) return;

    const cfg = this._config;
    const power    = this._val(cfg.power_entity, '0');
    const powerU   = this._unit(cfg.power_entity, 'W');
    const energy   = this._val(cfg.energy_entity);
    const energyU  = this._unit(cfg.energy_entity, 'kWh');
    const current  = this._val(cfg.current_entity);
    const currentU = this._unit(cfg.current_entity, 'A');
    const pf       = this._val(cfg.power_factor_entity);
    const pfU      = this._unit(cfg.power_factor_entity, '%');
    const voltage  = this._val(cfg.voltage_entity);
    const voltageU = this._unit(cfg.voltage_entity, 'V');
    const freq     = this._val(cfg.frequency_entity);
    const freqU    = this._unit(cfg.frequency_entity, 'Hz');

    const online   = this._isOnline();
    const flow     = this._flowLabel();
    const pct      = this._arcPercent();
    const trackD   = this._arcD(100, true);
    const arcD     = this._arcD(pct, false);

    this.shadowRoot.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700&family=Rajdhani:wght@400;600&display=swap');

        :host { display:block; font-family:'Exo 2',sans-serif; }

        .card {
          background: linear-gradient(145deg,#0d1b2e 0%,#0a1628 50%,#0d1f3c 100%);
          border-radius:20px; padding:20px; position:relative; overflow:hidden;
          border:1px solid rgba(66,153,225,0.15);
          box-shadow:
            0 0 40px rgba(66,153,225,0.05),
            0 20px 60px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .card::before {
          content:''; position:absolute; top:-60px; right:-60px;
          width:200px; height:200px; pointer-events:none;
          background:radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%);
        }
        .card::after {
          content:''; position:absolute; bottom:-40px; left:-40px;
          width:150px; height:150px; pointer-events:none;
          background:radial-gradient(circle,rgba(56,189,248,0.07) 0%,transparent 70%);
        }

        .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
        .title  { font-family:'Rajdhani',sans-serif; font-size:13px; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:rgba(148,163,184,0.8); }
        .status { display:flex; align-items:center; gap:6px; font-size:12px; color:rgba(148,163,184,0.7); }
        .dot    { width:7px; height:7px; border-radius:50%; background:#22c55e; box-shadow:0 0 8px #22c55e,0 0 16px rgba(34,197,94,0.4); animation:blink 2s ease-in-out infinite; }
        .dot.off{ background:#ef4444; box-shadow:0 0 8px #ef4444; animation:none; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.6} }

        .gauge-wrap { display:flex; justify-content:center; position:relative; margin-bottom:20px; cursor:pointer; }
        .gauge-svg  { width:180px; height:180px; filter:drop-shadow(0 0 12px rgba(96,165,250,0.25)); }
        .track { fill:none; stroke:rgba(255,255,255,0.05); stroke-width:6; stroke-linecap:round; }
        .glow  { fill:none; stroke:url(#grad); stroke-width:14; stroke-linecap:round; opacity:.15; }
        .arc   { fill:none; stroke:url(#grad); stroke-width:6;  stroke-linecap:round; filter:drop-shadow(0 0 6px rgba(96,165,250,0.8)); }
        .gauge-center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; pointer-events:none; }
        .g-icon { font-size:16px; line-height:1; margin-bottom:2px; }
        .g-row  { display:flex; align-items:baseline; justify-content:center; gap:2px; line-height:1; }
        .g-num  { font-size:36px; font-weight:700; color:#fff; letter-spacing:-1px; text-shadow:0 0 20px rgba(96,165,250,0.5); }
        .g-unit { font-size:14px; font-weight:300; color:rgba(148,163,184,0.8); margin-bottom:4px; }
        .g-lbl  { font-size:11px; color:rgba(96,165,250,0.9); letter-spacing:1.5px; text-transform:uppercase; margin-top:4px; }

        .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:10px; }
        .tile  { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:12px 10px; text-align:center; cursor:pointer; transition:background .2s,border-color .2s,transform .15s; }
        .tile:hover { background:rgba(96,165,250,0.08); border-color:rgba(96,165,250,0.2); transform:translateY(-1px); }
        .t-icon { font-size:14px; display:block; margin-bottom:6px; opacity:.8; }
        .t-val  { font-size:18px; font-weight:700; color:#f1f5f9; line-height:1; margin-bottom:2px; }
        .t-unit { font-size:10px; font-weight:400; color:rgba(148,163,184,0.6); }
        .t-lbl  { font-size:10px; color:rgba(100,116,139,0.9); text-transform:uppercase; letter-spacing:.8px; margin-top:4px; }

        .bottom { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:12px 16px; display:flex; justify-content:space-around; margin-bottom:10px; }
        .b-item { display:flex; align-items:center; gap:8px; cursor:pointer; transition:opacity .2s; }
        .b-item:hover { opacity:.7; }
        .b-wave { font-size:18px; opacity:.7; }
        .b-val  { font-size:17px; font-weight:600; color:#e2e8f0; }
        .b-unit { font-size:10px; font-weight:300; color:rgba(148,163,184,0.6); display:block; }
        .b-lbl  { font-size:10px; color:rgba(100,116,139,0.8); text-transform:uppercase; letter-spacing:.8px; }
        .b-div  { width:1px; background:rgba(255,255,255,0.07); align-self:stretch; }

        .det-btn {
          width:100%; padding:12px; background:rgba(96,165,250,0.08); border:1px solid rgba(96,165,250,0.2);
          border-radius:12px; color:rgba(148,163,184,0.9); font-family:'Exo 2',sans-serif;
          font-size:13px; font-weight:600; letter-spacing:1px; cursor:pointer;
          transition:background .2s,border-color .2s,color .2s;
          display:flex; align-items:center; justify-content:center; gap:8px;
        }
        .det-btn:hover { background:rgba(96,165,250,0.15); border-color:rgba(96,165,250,0.4); color:#fff; }
      </style>

      <ha-card>
        <div class="card">
          <div class="header">
            <span class="title">${cfg.title}</span>
            <div class="status">
              <div class="dot ${online ? '' : 'off'}"></div>
              <span>${online ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          <div class="gauge-wrap" data-entity="${cfg.power_entity}">
            <svg class="gauge-svg" viewBox="0 0 180 180">
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stop-color="#818cf8"/>
                  <stop offset="100%" stop-color="#38bdf8"/>
                </linearGradient>
              </defs>
              <path class="track" d="${trackD}"/>
              ${arcD ? '<path class="glow" d="' + arcD + '"/><path class="arc" d="' + arcD + '"/>' : ''}
            </svg>
            <div class="gauge-center">
              <div class="g-icon">&#9889;</div>
              <div class="g-row">
                <span class="g-num">${power}</span>
                <span class="g-unit">${powerU}</span>
              </div>
              <div class="g-lbl">${flow}</div>
            </div>
          </div>

          <div class="stats">
            <div class="tile" data-entity="${cfg.energy_entity}">
              <span class="t-icon">&#9889;</span>
              <div class="t-val">${energy}<span class="t-unit"> ${energyU}</span></div>
              <div class="t-lbl">Energy</div>
            </div>
            <div class="tile" data-entity="${cfg.current_entity}">
              <span class="t-icon">&#12316;</span>
              <div class="t-val">${current}<span class="t-unit"> ${currentU}</span></div>
              <div class="t-lbl">Current</div>
            </div>
            <div class="tile" data-entity="${cfg.power_factor_entity}">
              <span class="t-icon">&#9678;</span>
              <div class="t-val">${pf}<span class="t-unit">${pfU}</span></div>
              <div class="t-lbl">Power Factor</div>
            </div>
          </div>

          <div class="bottom">
            <div class="b-item" data-entity="${cfg.voltage_entity}">
              <span class="b-wave" style="color:#a78bfa">&#8767;</span>
              <div>
                <span class="b-val">${voltage} <span class="b-unit">${voltageU}</span></span>
                <span class="b-lbl">Voltage</span>
              </div>
            </div>
            <div class="b-div"></div>
            <div class="b-item" data-entity="${cfg.frequency_entity}">
              <span class="b-wave" style="color:#38bdf8">&#8767;</span>
              <div>
                <span class="b-val">${freq} <span class="b-unit">${freqU}</span></span>
                <span class="b-lbl">Frequency</span>
              </div>
            </div>
          </div>

          <button class="det-btn" data-entity="${cfg.power_entity}">&#x2139;&#xFE0F; &nbsp;Details</button>
        </div>
      </ha-card>
    `;

    // Wire every data-entity element to open the more-info dialog
    this.shadowRoot.querySelectorAll('[data-entity]').forEach(function(el) {
      el.addEventListener('click', function() {
        this._moreInfo(el.dataset.entity);
      }.bind(this));
    }.bind(this));
  }
}

// Guard against double-registration (hot-reload / HACS reload)
if (!customElements.get('server-rack-card')) {
  customElements.define('server-rack-card', ServerRackCard);
}

// Register in the HA "Add card" picker
window.customCards = window.customCards || [];
if (!window.customCards.find(function(c) { return c.type === 'server-rack-card'; })) {
  window.customCards.push({
    type: 'server-rack-card',
    name: 'Server Rack Card',
    description: 'Glassmorphism power monitoring card for server racks',
    preview: true,
    documentationURL: 'https://github.com/your-username/server-rack-card',
  });
}
