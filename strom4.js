class StromAbrechnungCard extends HTMLElement {
  setConfig(config) {
    if (!config) {
      throw new Error("Ungültige Konfiguration");
    }
    this.config = {
      sensor: "sensor.smart_meter_netzbezug_monatlich",
      pv_sensor: "",
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

  getStartMonth() {
    const saved = localStorage.getItem('strom_config_start_month');
    return saved !== null ? parseInt(saved) : 3; // Standard: April
  }

  getCurrentActiveBillingYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startMonth = this.getStartMonth();
    let startYear = (month < startMonth) ? year - 1 : year;
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
    const startMonth = this.getStartMonth();

    const availableYearsSet = new Set([currentRealYearStr]);
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('strom_abschlag_') || key.startsWith('strom_kwh_') || key.startsWith('strom_pv_')) {
        const parts = key.split('_');
        if (parts.length >= 4) {
          availableYearsSet.add(`${parts[2]}/${parts[3]}`);
        }
      }
    });
    const sortedYears = Array.from(availableYearsSet).sort().reverse();

    const currentSensor = localStorage.getItem('strom_config_sensor') || this.config.sensor;
    const currentPvSensor = localStorage.getItem('strom_config_pv_sensor') || this.config.pv_sensor;
    const currentPrice = localStorage.getItem('strom_config_price') ?? this.config.price;
    const currentBaseFee = localStorage.getItem('strom_config_base_fee') ?? this.config.base_fee;
    const currentDefaultAbschlag = localStorage.getItem('strom_config_default_abschlag') ?? this.config.default_abschlag;

    const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

    this.innerHTML = `
      <ha-card style="padding: 16px; border-radius: var(--ha-card-border-radius, 12px); box-shadow: var(--ha-card-box-shadow, none); border: 1px solid var(--divider-color);">
        
        <!-- HEADER -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.1); padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--primary-color);">
              ⚡
            </div>
            <div>
              <div style="font-size: 1.1em; font-weight: 500; color: var(--primary-text-color);">Strom- & PV-Bilanz</div>
              <div style="font-size: 0.8em; color: var(--secondary-text-color);">Abrechnungsjahr: ${activeYearStr}</div>
            </div>
          </div>
          <ha-button id="settings_toggle_btn" style="--mdc-theme-primary: var(--secondary-text-color); font-size: 0.85em;">⚙️ Einstellungen</ha-button>
        </div>

        <!-- EINSTELLUNGS-MENÜ -->
        <div id="settings_panel" style="display: none; background: var(--secondary-background-color); padding: 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid var(--divider-color);">
          <div style="font-weight: 500; margin-bottom: 12px; font-size: 0.95em; display: flex; justify-content: space-between; align-items: center; color: var(--primary-text-color);">
            <span>⚙️ Karteneinstellungen & Backup</span>
            <span id="close_settings" style="cursor: pointer; font-size: 1.2em; padding: 0 4px;" title="Schließen">✕</span>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
            <div>
              <label style="font-size: 0.75em; color: var(--secondary-text-color); display: block; margin-bottom: 4px;">Jahr anzeigen:</label>
              <select id="cfg_billing_year" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);">
                ${sortedYears.map(y => `<option value="${y}" ${y === activeYearStr ? 'selected' : ''}>${y} ${y === currentRealYearStr ? '(Aktuell)' : ''}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size: 0.75em; color: var(--secondary-text-color); display: block; margin-bottom: 4px;">Startmonat:</label>
              <select id="cfg_start_month" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);">
                ${monthNames.map((m, i) => `<option value="${i}" ${i === startMonth ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
            <div>
              <label style="font-size: 0.75em; color: var(--secondary-text-color); display: block; margin-bottom: 4px;">Arbeitspreis (€/kWh):</label>
              <input type="number" step="0.001" id="cfg_price" value="${currentPrice}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); box-sizing: border-box;">
            </div>
            <div>
              <label style="font-size: 0.75em; color: var(--secondary-text-color); display: block; margin-bottom: 4px;">Grundgebühr/Jahr (€):</label>
              <input type="number" step="0.01" id="cfg_base_fee" value="${currentBaseFee}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); box-sizing: border-box;">
            </div>
          </div>

          <div style="margin-bottom: 10px;">
            <label style="font-size: 0.75em; color: var(--secondary-text-color); display: block; margin-bottom: 4px;">Standard-Abschlag (€ / Monat):</label>
            <div style="display: flex; gap: 6px;">
              <input type="number" step="0.01" id="cfg_default_abschlag" value="${currentDefaultAbschlag}" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);">
              <button id="apply_all_abschlag" type="button" style="padding: 8px 12px; background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 6px; cursor: pointer; font-size: 0.8em; color: var(--primary-text-color);" title="Auf alle Monate übertragen">Auf alle</button>
            </div>
          </div>

          <div style="margin-bottom: 10px;">
            <label style="font-size: 0.75em; color: var(--secondary-text-color); display: block; margin-bottom: 4px;">Netzbezug-Sensor (Monatlicher Verbrauch):</label>
            <ha-entity-picker id="cfg_sensor_picker" value="${currentSensor}" style="width: 100%; display: block;"></ha-entity-picker>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="font-size: 0.75em; color: var(--secondary-text-color); display: block; margin-bottom: 4px;">PV-Ertrag / Eigenverbrauch-Sensor (Monatlich):</label>
            <ha-entity-picker id="cfg_pv_sensor_picker" value="${currentPvSensor}" style="width: 100%; display: block;"></ha-entity-picker>
          </div>

          <div
