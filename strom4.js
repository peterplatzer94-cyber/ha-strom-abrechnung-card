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

  render() {
    this.innerHTML = `
      <ha-card>
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <span>⚡ Strom-Monatsbilanz</span>
          <ha-button id="settings_toggle_btn" style="--mdc-theme-primary: var(--secondary-text-color);">⚙️ Einstellungen</ha-button>
        </div>

        <div class="card-content" style="padding: 16px;">
          
          <!-- EINSTELLUNGS-MENÜ -->
          <div id="settings_panel" style="display: none; background: var(--secondary-background-color); padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--divider-color);">
            <div style="font-weight: bold; margin-bottom: 10px; font-size: 0.95em; display: flex; justify-content: space-between; align-items: center;">
              <span>⚙️ Karteneinstellungen</span>
              <span id="close_settings" style="cursor: pointer; font-size: 1.1em;" title="Schließen">✕</span>
            </div>
            
            <div style="margin-bottom: 8px;">
              <label style="font-size: 0.8em; display: block; margin-bottom: 2px;">Arbeitspreis (€ / kWh):</label>
              <input type="number" step="0.001" id="cfg_price" value="${this.config.price}" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);">
            </div>

            <div style="margin-bottom: 8px;">
              <label style="font-size: 0.8em; display: block; margin-bottom: 2px;">Grundgebühr pro Jahr (€):</label>
              <input type="number" step="0.01" id="cfg_base_fee" value="${this.config.base_fee}" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);">
            </div>

            <div style="margin-bottom: 8px;">
              <label style="font-size: 0.8em; display: block; margin-bottom: 2px;">Sensor ID (Monatlicher Verbrauch):</label>
              <input type="text" id="cfg_sensor" value="${this.config.sensor}" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);">
            </div>

            <button id="save_settings_btn" style="width: 100%; margin-top: 8px; padding: 6px; background: var(--primary-color); color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Speichern</button>
          </div>

          <!-- HAUPT-ANSICHT -->
          <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--divider-color); padding-bottom: 10px;">
            <label style="font-size: 0.9em;"><b>Abrechnungsjahr:</b></label>
            <select id="billing_year_select" style="padding: 6px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);">
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027" selected>2026/2027</option>
              <option value="2027/2028">2027/2028</option>
              <option value="2028/2029">2028/2029</option>
            </select>
          </div>

          <div id="months_grid" style="display: flex; flex-direction: column; gap: 8px;"></div>

          <hr style="margin: 20px 0; border: none; border-top: 1px solid var(--divider-color);">

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
        const newPrice = parseFloat(this.querySelector('#cfg_price').value) || 0;
        const newBaseFee = parseFloat(this.querySelector('#cfg_base_fee').value) || 0;
        const newSensor = this.querySelector('#cfg_sensor').value.trim();

        localStorage.setItem('strom_config_price', newPrice);
        localStorage.setItem('strom_config_base_fee', newBaseFee);
        localStorage.setItem('strom_config_sensor', newSensor);

        this.config.price = newPrice;
        this.config.base_fee = newBaseFee;
        this.config.sensor = newSensor;

        settingsPanel.style.display = 'none';
        this.calculateTotals();
      });
    }

    const savedPrice = localStorage.getItem('strom_config_price');
    const savedBaseFee = localStorage.getItem('strom_config_base_fee');
    const savedSensor = localStorage.getItem('strom_config_sensor');

    if (savedPrice !== null) this.config.price = parseFloat(savedPrice);
    if (savedBaseFee !== null) this.config.base_fee = parseFloat(savedBaseFee);
    if (savedSensor) this.config.sensor = savedSensor;
  }

  initCard() {
    const baseMonths = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    
    const yearSelect = this.querySelector('#billing_year_select');
    const allowedYears = ["2025/2026", "2026/2027", "2027/2028", "2028/2029"];
    
    let savedYear = localStorage.getItem('strom_billing_year');
    if (!allowedYears.includes(savedYear)) {
      savedYear = "2026/2027";
      localStorage.setItem('strom_billing_year', savedYear);
    }

    if (yearSelect) {
      yearSelect.value = savedYear;
      yearSelect.addEventListener('change', (e) => {
        localStorage.setItem('strom_billing_year', e.target.value);
        this.initCard();
      });
    }

    const startYear = parseInt(yearSelect.value.split('/')[0]) || 2026;

    const months = [];
    const dateCursor = new Date(startYear, 3, 1); 
    for (let i = 0; i < 12; i++) {
      const mName = baseMonths[dateCursor.getMonth()];
      const yNum = dateCursor.getFullYear();
      months.push({ name: `${mName} ${yNum}`, index: i });
      dateCursor.setMonth(dateCursor.getMonth() + 1);
    }

    const defaultAbschlag = this.config.default_abschlag;
    const grid = this.querySelector('#months_grid');
    grid.innerHTML = '';

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth();
    let currentMonthOffset = (currentYear - startYear) * 12 + currentMonthNum - 3;
    if (currentMonthOffset < 0) currentMonthOffset = -999;
    if (currentMonthOffset > 11) currentMonthOffset = 999;

    months.forEach((mObj, index) => {
      const yearKeyPrefix = yearSelect.value.replace('/', '_');
      const savedAbschlag = localStorage.getItem(`strom_abschlag_${yearKeyPrefix}_${index}`) ?? defaultAbschlag;
      const savedKwh = localStorage.getItem(`strom_kwh_${yearKeyPrefix}_${index}`) ?? '0';

      const div = document.createElement('div');
      div.style.cssText = "display: flex; align-items: center; justify-content: space-between; background: var(--secondary-background-color); padding: 8px; border-radius: 6px; gap: 8px;";
      
      let kwhFieldHtml = `<input type="number" step="0.1" class="kwh-input" data-index="${index}" value="${savedKwh}" placeholder="kWh" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); text-align: right;">`;
      if (index === currentMonthOffset) {
        kwhFieldHtml = `<div id="auto_kwh_display" style="font-size: 0.85em; font-weight: bold; text-align: right; padding: 6px; color: var(--primary-text-color);">Lädt...</div>`;
      }

      div.innerHTML = `
        <div style="font-size: 0.85em; font-weight: bold; width: 110px;">${mObj.name}</div>
        <div style="flex: 1;" title="Verbrauch in kWh">${kwhFieldHtml}</div>
        <div style="flex: 1;" title="Abschlag in €"><input type="number" step="0.01" class="month-input" data-index="${index}" value="${savedAbschlag}" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); text-align: right;"></div>
      `;
      grid.appendChild(div);
    });

    this.querySelectorAll('.month-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const yearKeyPrefix = yearSelect.value.replace('/', '_');
        localStorage.setItem(`strom_abschlag_${yearKeyPrefix}_${e.target.dataset.index}`, e.target.value);
        this.calculateTotals();
      });
    });

    this.querySelectorAll('.kwh-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const yearKeyPrefix = yearSelect.value.replace('/', '_');
        localStorage.setItem(`strom_kwh_${yearKeyPrefix}_${e.target.dataset.index}`, e.target.value);
        this.calculateTotals();
      });
    });

    this.calculateTotals();
  }

  calculateTotals() {
    if (!this._hass) return;

    const yearSelect = this.querySelector('#billing_year_select');
    const startYear = yearSelect ? parseInt(yearSelect.value.split('/')[0]) || 2026 : 2026;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth();
    let currentMonthOffset = (currentYear - startYear) * 12 + currentMonthNum - 3;
    
    let activeLimit = 11;
    if (currentMonthOffset < 0) activeLimit = -1;
    else if (currentMonthOffset <= 11) activeLimit = currentMonthOffset;

    let totalPaid = 0;
    let totalKwh = 0;

    const abschlagInputs = this.querySelectorAll('.month-input');
    const kwhInputs = this.querySelectorAll('.kwh-input');
    
    abschlagInputs.forEach((input, index) => {
      if (index <= activeLimit) {
        totalPaid += parseFloat(input.value) || 0;
      }
    });

    let autoKwh = 0;
    const sensorId = this.config.sensor;
    if (sensorId && this._hass.states[sensorId] && activeLimit >= 0 && activeLimit <= 11) {
      autoKwh = parseFloat(this._hass.states[sensorId].state) || 0;
    }

    const autoDisplay = this.querySelector('#auto_kwh_display');
    if (autoDisplay && activeLimit >= 0 && activeLimit <= 11) {
      autoDisplay.innerText = `${autoKwh.toFixed(1)} kWh (Auto)`;
    }

    kwhInputs.forEach((input, index) => {
      if (index < activeLimit) {
        totalKwh += parseFloat(input.value) || 0;
      } else if (index === activeLimit) {
        totalKwh += autoKwh;
      }
    });

    const pricePerKwh = parseFloat(this.config.price) || 0;
    const energyCost = totalKwh * pricePerKwh;

    const totalAnnualFee = parseFloat(this.config.base_fee) || 0;
    const monthlyFee = totalAnnualFee / 12;
    const monthsCount = activeLimit < 0 ? 0 : (activeLimit + 1);
    const proRataFee = monthlyFee * monthsCount;

    const totalCost = energyCost + proRataFee;
    const balance = totalPaid - totalCost;

    if (this.querySelector('#total_paid')) {
      this.querySelector('#total_paid').innerText = `${totalPaid.toFixed(2)} €`;
      this.querySelector('#energy_cost').innerText = `${energyCost.toFixed(2)} € (${totalKwh.toFixed(1)} kWh)`;
      this.querySelector('#fee_display').innerText = `${proRataFee.toFixed(2)} €`;
      this.querySelector('#total_cost').innerText = `${totalCost.toFixed(2)} €`;
      
      const balanceElem = this.querySelector('#balance_result');
      balanceElem.innerText = `${balance >= 0 ? '+' : ''}${balance.toFixed(2)} €`;
      balanceElem.style.color = balance >= 0 ? 'var(--success-color, green)' : 'var(--error-color, red)';
    }
  }

  getCardSize() { return 12; }
}

customElements.define('strom-abrechnung-card', StromAbrechnungCard);
