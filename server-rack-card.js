class ServerRackCard extends HTMLElement {
  setConfig(config) {
    this.config = config;
  }

  setHass(hass) {
    this.hass = hass;
    if (!this.hasUpdated) {
      this.render();
      this.hasUpdated = true;
    } else {
      this.updateValues();
    }
  }

  getConfigElement() {
    return document.createElement('server-rack-card-editor');
  }

  static getStubConfig() {
    return {
      type: 'custom:server-rack-card',
      title: 'Server Rack',
      power_entity: 'sensor.consum_server_rack',
      energy_entity: 'sensor.total_server_rack',
      current_entity: 'sensor.amperaj_server_rack',
      power_factor_entity: 'sensor.factor_server_rack',
      voltage_entity: 'sensor.voltaj',
      frequency_entity: 'sensor.frecventa',
      flow_entity: 'binary_sensor.flow_server_rack'
    };
  }

  render() {
    this.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'server-rack-card';

    card.innerHTML = `
      <style>
        .server-rack-card {
          --primary-color: #60a5fa;
          --primary-glow: rgba(96, 165, 250, 0.3);
          --bg-dark: rgba(15, 23, 42, 0.8);
          --border-color: rgba(96, 165, 250, 0.2);
          --text-primary: #f1f5f9;
          --text-secondary: #cbd5e1;
          --accent-glow: rgba(96, 165, 250, 0.5);
          
          width: 100%;
          max-width: 400px;
          font-family: 'Segoe UI', 'Helvetica Neue', sans-serif;
          color: var(--text-primary);
        }

        .card-container {
          background: var(--bg-dark);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          position: relative;
          overflow: hidden;
        }

        .card-container::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(
            circle at 30% 30%,
            var(--primary-glow),
            transparent 80%
          );
          pointer-events: none;
          opacity: 0.6;
          animation: float 8s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-30px, -30px); }
        }

        .card-header {
          position: relative;
          z-index: 1;
          margin-bottom: 32px;
        }

        .card-title {
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.5px;
          margin: 0 0 8px 0;
        }

        .card-subtitle {
          font-size: 12px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1.2px;
          opacity: 0.7;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .main-display {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 32px;
        }

        .power-ring {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          border: 3px solid var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          margin-bottom: 20px;
          background: radial-gradient(
            circle at 35% 35%,
            rgba(96, 165, 250, 0.1),
            transparent 70%
          );
          box-shadow: 
            0 0 30px var(--primary-glow),
            inset 0 0 30px rgba(96, 165, 250, 0.1);
          animation: glow-pulse 3s ease-in-out infinite;
        }

        @keyframes glow-pulse {
          0%, 100% { box-shadow: 
            0 0 30px var(--primary-glow),
            inset 0 0 30px rgba(96, 165, 250, 0.1);
          }
          50% { box-shadow: 
            0 0 50px var(--accent-glow),
            inset 0 0 40px rgba(96, 165, 250, 0.15);
          }
        }

        .power-display {
          text-align: center;
        }

        .power-icon {
          font-size: 32px;
          margin-bottom: 8px;
          opacity: 0.9;
        }

        .power-value {
          font-size: 36px;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 4px;
          background: linear-gradient(135deg, #60a5fa, #93c5fd);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .power-unit {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .power-status {
          font-size: 12px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
        }

        .metrics-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }

        .metric-card {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 16px 12px;
          text-align: center;
          transition: all 0.3s ease;
          cursor: default;
          backdrop-filter: blur(10px);
        }

        .metric-card:hover {
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(96, 165, 250, 0.4);
          box-shadow: 0 0 20px rgba(96, 165, 250, 0.15);
        }

        .metric-icon {
          font-size: 20px;
          margin-bottom: 8px;
          opacity: 0.8;
        }

        .metric-value {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 4px;
          color: #93c5fd;
        }

        .metric-label {
          font-size: 10px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.4px;
          opacity: 0.7;
        }

        .metrics-row {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }

        .metric-card-wide {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .metric-card-wide:hover {
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(96, 165, 250, 0.4);
          box-shadow: 0 0 20px rgba(96, 165, 250, 0.15);
        }

        .metric-card-wide .metric-icon {
          margin: 0;
          margin-right: 12px;
        }

        .metric-card-wide .metric-info {
          flex: 1;
        }

        .metric-card-wide .metric-value {
          font-size: 16px;
          margin-bottom: 2px;
        }

        .metric-card-wide .metric-label {
          font-size: 11px;
        }

        .details-button {
          position: relative;
          z-index: 1;
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, rgba(96, 165, 250, 0.15), rgba(59, 130, 246, 0.1));
          border: 1px solid var(--border-color);
          border-radius: 14px;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          backdrop-filter: blur(10px);
        }

        .details-button:hover {
          background: linear-gradient(135deg, rgba(96, 165, 250, 0.25), rgba(59, 130, 246, 0.2));
          border-color: var(--primary-color);
          box-shadow: 0 0 20px rgba(96, 165, 250, 0.2);
        }

        .details-button:active {
          transform: scale(0.98);
        }

        .details-icon {
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--primary-color);
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          color: #0f172a;
        }

        .loading {
          color: var(--text-secondary);
          text-align: center;
          padding: 40px 20px;
        }

        .error {
          color: #ef4444;
          text-align: center;
          padding: 20px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          margin-top: 20px;
        }
      </style>

      <div class="card-container">
        <div class="card-header">
          <h2 class="card-title">${this.config.title || 'Server Rack'}</h2>
          <p class="card-subtitle">Power Monitor</p>
          <div class="status-indicator">
            <div class="status-dot"></div>
            <span>Online</span>
          </div>
        </div>

        <div class="main-display">
          <div class="power-ring">
            <div class="power-display">
              <div class="power-icon">⚡</div>
              <div class="power-value" id="power-value">--</div>
              <div class="power-unit">W</div>
              <div class="power-status" id="power-status">Idle</div>
            </div>
          </div>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon">⚡</div>
            <div class="metric-value" id="energy-value">--</div>
            <div class="metric-label">Energy</div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">~</div>
            <div class="metric-value" id="current-value">--</div>
            <div class="metric-label">Current</div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">👁</div>
            <div class="metric-value" id="factor-value">--</div>
            <div class="metric-label">Power Factor</div>
          </div>
        </div>

        <div class="metrics-row">
          <div class="metric-card-wide">
            <div style="display: flex; align-items: center;">
              <div class="metric-icon">~</div>
              <div class="metric-info">
                <div class="metric-value" id="voltage-value">--</div>
                <div class="metric-label">Voltage</div>
              </div>
            </div>
          </div>
          <div class="metric-card-wide">
            <div style="display: flex; align-items: center;">
              <div class="metric-icon">~</div>
              <div class="metric-info">
                <div class="metric-value" id="frequency-value">--</div>
                <div class="metric-label">Frequency</div>
              </div>
            </div>
          </div>
        </div>

        <button class="details-button">
          <span class="details-icon">i</span>
          Details
        </button>
      </div>
    `;

    this.appendChild(card);
  }

  updateValues() {
    if (!this.hass || !this.config) return;

    const getState = (entity) => {
      if (!entity) return '--';
      const state = this.hass.states[entity];
      return state ? state.state : '--';
    };

    // Update power value
    const powerValue = getState(this.config.power_entity);
    const powerDisplay = this.querySelector('#power-value');
    if (powerDisplay) {
      powerDisplay.textContent = powerValue === '--' ? '--' : Math.round(parseFloat(powerValue));
    }

    // Update power status
    const powerStatus = this.querySelector('#power-status');
    if (powerStatus) {
      powerStatus.textContent = powerValue !== '--' && parseFloat(powerValue) > 10 ? 'Active' : 'Idle';
    }

    // Update energy
    const energyValue = getState(this.config.energy_entity);
    const energyDisplay = this.querySelector('#energy-value');
    if (energyDisplay) {
      energyDisplay.textContent = energyValue === '--' ? '--' : parseFloat(energyValue).toFixed(2);
    }

    // Update current
    const currentValue = getState(this.config.current_entity);
    const currentDisplay = this.querySelector('#current-value');
    if (currentDisplay) {
      currentDisplay.textContent = currentValue === '--' ? '--' : parseFloat(currentValue).toFixed(2);
    }

    // Update power factor
    const factorValue = getState(this.config.power_factor_entity);
    const factorDisplay = this.querySelector('#factor-value');
    if (factorDisplay) {
      factorDisplay.textContent = factorValue === '--' ? '--' : parseFloat(factorValue).toFixed(0) + '%';
    }

    // Update voltage
    const voltageValue = getState(this.config.voltage_entity);
    const voltageDisplay = this.querySelector('#voltage-value');
    if (voltageDisplay) {
      voltageDisplay.textContent = voltageValue === '--' ? '--' : parseFloat(voltageValue).toFixed(0);
    }

    // Update frequency
    const frequencyValue = getState(this.config.frequency_entity);
    const frequencyDisplay = this.querySelector('#frequency-value');
    if (frequencyDisplay) {
      frequencyDisplay.textContent = frequencyValue === '--' ? '--' : parseFloat(frequencyValue).toFixed(0);
    }
  }
}

customElements.define('server-rack-card', ServerRackCard);
