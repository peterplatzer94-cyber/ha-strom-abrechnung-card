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
                ${sortedYears.map(y => `<option value="${y}" ${y === activeYearStr ? 'selected' : ''}>${y}${y === currentRealYearStr ? '(Aktuell)' : ''}</option>`).join('')}
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

          <div style="display: flex; gap: 6px; margin-bottom: 12px;">
            <button id="export_json_btn" type="button" style="flex: 1; padding: 8px; background: var(--card-background-color); color: var(--primary-text-color); border: 1px solid var(--divider-color); border-radius: 6px; cursor: pointer; font-size: 0.8em;">📥 Backup</button>
            <button id="import_json_btn" type="button" style="flex: 1; padding: 8px; background: var(--card-background-color); color: var(--primary-text-color); border: 1px solid var(--divider-color); border-radius: 6px; cursor: pointer; font-size: 0.8em;">📤 Import</button>
            <button id="export_csv_btn" type="button" style="flex: 1; padding: 8px; background: var(--card-background-color); color: var(--primary-text-color); border: 1px solid var(--divider-color); border-radius: 6px; cursor: pointer; font-size: 0.8em;">📊 CSV</button>
            <input type="file" id="import_file_input" style="display: none;" accept=".json">
          </div>

          <button id="save_settings_btn" style="width: 100%; padding: 10px; background: var(--primary-color); color: var(--text-primary-color, #fff); border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Speichern & Anwenden</button>
        </div>

        <!-- HAUPT-LAYOUT (2 SPALTEN AB TABLET/PC) -->
        <div class="card-grid-layout" style="display: grid; grid-template-columns: 1fr; gap: 16px;">
          
          <!-- LINKE SPALTE: MONATE -->
          <div>
            <div style="display: flex; justify-content: space-between; padding: 0 6px 6px 6px; font-size: 0.75em; color: var(--secondary-text-color); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
              <span style="width: 95px;">Monat</span>
              <span style="flex: 1; text-align: right;">Netz (kWh)</span>
              <span style="flex: 1; text-align: right;">PV (kWh / €)</span>
              <span style="flex: 1; text-align: right; padding-right: 4px;">Abschlag (€)</span>
            </div>
            <div id="months_grid" style="display: flex; flex-direction: column; gap: 6px;"></div>
          </div>

          <!-- RECHTE SPALTE: AUSWERTUNG & PROGNOSE -->
          <div>
            <div style="background: var(--secondary-background-color); padding: 14px; border-radius: 10px; border: 1px solid var(--divider-color); height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="font-weight: 500; font-size: 0.95em; color: var(--primary-text-color); margin-bottom: 12px; border-bottom: 1px solid var(--divider-color); padding-bottom: 6px;">
                  📊 Jahresbilanz
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9em;">
                  <span style="color: var(--secondary-text-color);">Bezahlte Abschläge:</span>
                  <strong id="total_paid" style="color: var(--primary-text-color);">0,00 €</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9em;">
                  <span style="color: var(--secondary-text-color);">Stromkosten (Netz kWh):</span>
                  <strong id="energy_cost" style="color: var(--primary-text-color);">0,00 €</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9em;">
                  <span style="color: var(--secondary-text-color);">PV-Ersparnis (bisher):</span>
                  <strong id="total_pv_savings" style="color: var(--success-color, #43a047);">0,00 €</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9em;">
                  <span style="color: var(--secondary-text-color);">Grundgebühr (Anteilig):</span>
                  <strong id="fee_display" style="color: var(--primary-text-color);">0,00 €</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.85em; color: var(--secondary-text-color); margin-bottom: 8px; border-top: 1px solid var(--divider-color); padding-top: 6px;">
                  <span>Gesamtkosten bisher:</span>
                  <strong id="total_cost" style="color: var(--primary-text-color);">0,00 €</strong>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 1.05em; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--divider-color);">
                  <span style="font-weight: 500; color: var(--primary-text-color);">Aktuelle Bilanz:</span>
                  <strong id="balance_result" style="font-size: 1.15em;">0,00 €</strong>
                </div>
                
                <!-- SAISONALE PROGNOSE BOX -->
                <div id="forecast_box" style="margin-top: 12px; padding: 10px; background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.1); border-radius: 8px; font-size: 0.85em; border: 1px solid var(--primary-color);">
                  <div style="font-weight: 500; color: var(--primary-text-color); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                    <span>🔮 Jahresend-Prognose (Saisonal):</span>
                  </div>
                  <div id="forecast_text" style="color: var(--secondary-text-color);">Berechne Prognose...</div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </ha-card>

      <!-- CSS für responsives Grid (Auf großen Bildschirmen 2 Spalten, auf Handy 1 Spalte) -->
      <style>
        @media (min-width: 768px) {
          .card-grid-layout {
            grid-template-columns: 1.3fr 1fr !important;
          }
        }
      </style>
    `;
    this.content = true;

    const sensorPicker = this.querySelector('#cfg_sensor_picker');
    if (sensorPicker && this._hass) sensorPicker.hass = this._hass;

    const pvSensorPicker = this.querySelector('#cfg_pv_sensor_picker');
    if (pvSensorPicker && this._hass) pvSensorPicker.hass = this._hass;

    this.initCard();
    this.initSettingsPanel();
  }

  initSettingsPanel() {
    const settingsBtn = this.querySelector('#settings_toggle_btn');
    const settingsPanel = this.querySelector('#settings_panel');
    const closeSettings = this.querySelector('#close_settings');
    const saveBtn = this.querySelector('#save_settings_btn');
    const applyAllBtn = this.querySelector('#apply_all_abschlag');
    const exportJsonBtn = this.querySelector('#export_json_btn');
    const importJsonBtn = this.querySelector('#import_json_btn');
    const exportCsvBtn = this.querySelector('#export_csv_btn');
    const fileInput = this.querySelector('#import_file_input');

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

    if (applyAllBtn) {
      applyAllBtn.addEventListener('click', () => {
        const val = this.querySelector('#cfg_default_abschlag').value;
        const activeYearStr = this.getActiveBillingYear();
        const yearKeyPrefix = activeYearStr.replace('/', '_');
        for (let i = 0; i < 12; i++) {
          localStorage.setItem(`strom_abschlag_${yearKeyPrefix}_${i}`, val);
        }
        this.render();
      });
    }

    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith('strom_')) {
            data[key] = localStorage.getItem(key);
          }
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `strom_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (importJsonBtn && fileInput) {
      importJsonBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            Object.keys(data).forEach(key => {
              if (key.startsWith('strom_')) {
                localStorage.setItem(key, data[key]);
              }
            });
            this.render();
          } catch (err) {
            alert('Fehler beim Lesen der Backup-Datei.');
          }
        };
        reader.readAsText(file);
      });
    }

    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        const activeYearStr = this.getActiveBillingYear();
        const yearKeyPrefix = activeYearStr.replace('/', '_');
        let csv = "Monat;Netz (kWh);PV (kWh);Abschlag (€)\n";
        
        for (let i = 0; i < 12; i++) {
          const kwh = localStorage.getItem(`strom_kwh_${yearKeyPrefix}_${i}`) || "0";
          const pv = localStorage.getItem(`strom_pv_${yearKeyPrefix}_${i}`) || "0";
          const abschlag = localStorage.getItem(`strom_abschlag_${yearKeyPrefix}_${i}`) || "0";
          csv += `Monat ${i+1};${kwh};${pv};${abschlag}\n`;
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `strom_abrechnung_${yearKeyPrefix}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const newYear = this.querySelector('#cfg_billing_year').value;
        const newStartMonth = parseInt(this.querySelector('#cfg_start_month').value);
        const newPrice = parseFloat(this.querySelector('#cfg_price').value) || 0;
        const newBaseFee = parseFloat(this.querySelector('#cfg_base_fee').value) || 0;
        const newDefaultAbschlag = parseFloat(this.querySelector('#cfg_default_abschlag').value) || 0;
        
        const sensorPicker = this.querySelector('#cfg_sensor_picker');
        const newSensor = sensorPicker ? sensorPicker.value : this.config.sensor;

        const pvSensorPicker = this.querySelector('#cfg_pv_sensor_picker');
        const newPvSensor = pvSensorPicker ? pvSensorPicker.value : this.config.pv_sensor;

        localStorage.setItem('strom_config_start_month', newStartMonth);
        localStorage.setItem('strom_view_billing_year', newYear);
        localStorage.setItem('strom_config_price', newPrice);
        localStorage.setItem('strom_config_base_fee', newBaseFee);
        localStorage.setItem('strom_config_default_abschlag', newDefaultAbschlag);
        localStorage.setItem('strom_config_sensor', newSensor);
        localStorage.setItem('strom_config_pv_sensor', newPvSensor);

        this.config.price = newPrice;
        this.config.base_fee = newBaseFee;
        this.config.default_abschlag = newDefaultAbschlag;
        this.config.sensor = newSensor;
        this.config.pv_sensor = newPvSensor;

        settingsPanel.style.display = 'none';
        this.render();
      });
    }

    const savedPrice = localStorage.
