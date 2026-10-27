class StromAbrechnungCard extends HTMLElement {
  setConfig(config) {
    if (!config) {
      throw new Error("Ungültige Konfiguration");
    }
    this.config = {
      sensor: "sensor.smart_meter_netzbezug_monatlich",
      price: 0.32,
      base_fee: 146.72,
      default_abschlag: 238.45,
      ...config
    };
    this.requestUpdate();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.content) {
      this.render();
    } else {
      this.calculateTotals();
    }
  }

  requestUpdate() {
    if (this._hass && this.content) {
      this.render();
    }
  }

  getCurrentActiveBillingYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); 
    let startYear = (month < 3) ? year - 1 : year;
    return `${startYear}/${startYear + 1}`;
  }

  getActiveBillingYear() {
    const savedViewYear = localStorage.getItem('strom_view_billing_year');
    if (savedViewYear) {
      return savedViewYear;
    }
    return this.getCurrentActiveBillingYear();
  }

  render() {
    const activeYearStr = this.getActiveBillingYear();
    const currentRealYearStr = this.getCurrentActiveBillingYear();

    const availableYearsSet = new Set([currentRealYearStr]);
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('strom_abschlag_') || key.startsWith('strom_kwh_')) {
        const parts = key.split('_');
        if (parts.length >= 4) {
          availableYearsSet.add(`${parts[2]}/${parts[3]}`);
        }
      }
    });
    const sortedYears = Array.from(availableYearsSet).sort().reverse();

    // Gespeicherten Sensor oder Config-Sensor holen
    const currentSensor = localStorage.getItem('strom_config_sensor') || this.config.sensor;

    this.innerHTML = `
      <ha-card>
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <span>⚡ Strom-Monatsbilanz (${activeYearStr})</span>
          <ha-button id="settings_toggle_btn" style="--mdc-theme-primary: var(--secondary-text-color);">⚙️ Einstellungen</ha-button>
        </div>

        <div class="card-content" style="padding: 16px;">
          
          <!-- EINSTELLUNGS-MENÜ -->
          <div id="settings_panel" style="display: none; background: var(--secondary-background-color); padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--divider-color);">
            <div style="font-weight: bold; margin-bottom: 10px; font-size: 0.95em; display: flex; justify-content: space-between; align-items: center;">
              <span>⚙️ Karteneinstellungen & Historie</span>
              <span id="close_settings" style="cursor: pointer; font-size: 1.1em;" title="Schließen">✕</span>
            </div>
            
            <div style="margin-bottom: 8px;">
              <label style="font-size: 0.8em; display: block; margin-bottom: 2px;">Abrechnungsjahr anzeigen:</label>
              <select id="cfg_billing_year" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);">
                ${sortedYears.map(y => `<option value="${y}" ${y === activeYearStr ? 'selected' : ''}>${y}${y === currentRealYearStr ? '(Aktuell)' : ''}</option>`).join('')}
              </select>
            </div>

            <div style="margin-bottom: 8px;">
              <label style="font-size: 0.8em; display: block; margin-bottom: 2px;">Arbeitspreis (€ / kWh):</label>
              <input type="number" step="0.001" id="cfg_price" value="${this.config.price}" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);">
            </div>

            <div style="margin-bottom: 8px;">
              <label style="font-size: 0.8em; display: block; margin-bottom: 2px;">Grundgebühr pro Jahr (€):</label>
              <input type="number" step="0.01" id="cfg_base_fee" value="${this.config.base_fee}" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);">
            </div>

            <div style="margin-bottom: 10px;">
              <label style="font-size: 0.8em; display: block; margin-bottom: 2px;">Netzbezug-Sensor (Monatlicher Verbrauch):</label>
              <ha-entity-picker id="cfg_sensor_picker" value="${currentSensor}" style="width: 100%; display: block;"></ha-entity-picker>
            </div>

            <button id="save_settings_btn" style="width: 100%; margin-top: 8px; padding: 6px; background: var(--primary-color); color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Speichern</button>
          </div>

          <!-- MONATE GRID (April bis März) -->
          <div id="months_grid" style="display: flex; flex-direction: column; gap: 8px;"></div>

          <hr style="margin: 20px 0; border: none; border-top: 1px solid var(--divider-color);">

          <!-- GESAMTANZEIGE -->
          <div style="background: var(--secondary-background-color); padding: 12px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>Bezahlte Abschläge (Bisher):</span>
              <strong id="total_paid">0,00 €</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>Stromkosten (aus kWh × Euro):</span>
              <strong id="energy_cost">0,00 €</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>Zähler-Grundgebühr (Anteilig):</span>
              <strong id="fee_display">0,00 €</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.9em; color: var(--secondary-text-color); margin-bottom: 6px; border-top: 1px solid var(--divider-color); padding-top: 4px;">
              <span>Gesamtkosten bisher:</span>
              <strong id="total_cost">0,00 €</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1.1em; margin-top: 8px; padding-top: 6px; border-top: 1px dashed var(--divider-color);">
              <span>Aktuelle Bilanz (Plus/Minus):</span>
              <strong id="balance_result">0,00 €</strong>
            </div>
          </div>

        </div>
      </ha-card>
    `;
    this.content = true;

    // Hasse-Objekt an den Entity-Picker übergeben, damit er alle Sensoren laden kann
    const sensorPicker = this.querySelector('#cfg_sensor_picker');
    if (sensorPicker && this._hass) {
      sensorPicker.hass = this._hass;
    }

    this.initCard();
    this.initSettingsPanel();
  }

  initSettingsPanel() {
    const settingsBtn = this.querySelector('#settings_toggle_btn');
    const settingsPanel = this.querySelector('#settings_panel');
    const closeSettings = this.querySelector('#close_settings');
    const saveBtn = this.querySelector('#save_settings_btn');

    if (settingsBtn && settingsPanel) {
      settingsBtn.addEventListener('click', () => {
        settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
      });
    }

    if (closeSettings && settingsPanel) {
      closeSettings.addEventListener('click', () => {
        settingsPanel.style.display = 'none';
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const newYear = this.querySelector('#cfg_billing_year').value;
        const newPrice = parseFloat(this.querySelector('#cfg_price').value) || 0;
        const newBaseFee = parseFloat(this.querySelector('#cfg_base_fee').value) || 0;
        
        // Wert direkt aus dem ha-entity-picker auslesen
        const sensorPicker = this.querySelector('#cfg_sensor_picker');
        const newSensor = sensorPicker ? sensorPicker.value : this.config.sensor;

        localStorage.setItem('strom_view_billing_year', newYear);
        localStorage.setItem('strom_config_price', newPrice);
        localStorage.setItem('strom_config_base_fee', newBaseFee);
        localStorage.setItem('strom_config_sensor', newSensor);

        this.config.price = newPrice;
        this.config.base_fee = newBaseFee;
        this.config.sensor = newSensor;

        settingsPanel.style.display = 'none';
        this.render();
      });
    }

    const savedPrice = localStorage.getItem('strom_config_price');
    const savedBaseFee = localStorage.getItem('strom_config_
