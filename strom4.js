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
      winter_profile: "1.75",
      billing_deadline: "",
      feed_in_active: false,
      feed_in_price: 0.082,
      pv_wp: 4000,
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
    const currentWinterProfile = localStorage.getItem('strom_config_winter_profile') ?? this.config.winter_profile;
    const currentDeadline = localStorage.getItem('strom_config_deadline') ?? this.config.billing_deadline;
    const currentPvWp = localStorage.getItem('strom_config_pv_wp') ?? this.config.pv_wp;
    
    const savedFeedInActive = localStorage.getItem('strom_config_feed_in_active');
    const currentFeedInActive = savedFeedInActive !== null ? savedFeedInActive === 'true' : this.config.feed_in_active;
    const currentFeedInPrice = localStorage.getItem('strom_config_feed_in_price') ?? this.config.feed_in_price;

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

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
            <div>
              <label style="font-size: 0.75em; color: var(--secondary-text-color); display: block; margin-bottom: 4px;">Standard-Abschlag (€/M):</label>
              <div style="display: flex; gap: 6px;">
                <input type="number" step="0.01" id="cfg_default_abschlag" value="${currentDefaultAbschlag}" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);">
                <button id="apply_all_abschlag" type="button" style="padding: 8px 10px; background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 6px; cursor: pointer; font-size: 0.8em; color: var(--primary-text-color);" title="Auf alle Monate übertragen">Alle</button>
              </div>
            </div>
            <div>
              <label style="font-size: 0.75em; color: var(--secondary-text-color); display: block; margin-bottom: 4px;">Abrechnungs-Stichtag:</label>
              <input type="date" id="cfg_deadline" value="${currentDeadline}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); box-sizing: border-box;">
            </div>
          </div>

          <div style="margin-bottom: 10px;">
            <label style="font-size: 0.75em; color: var(--secondary-text-color); display: block; margin-bottom: 4px;">PV-Leistung Gesamtanlage (Wp, z.B. 4000):</label>
            <input type="number" step="100" id="cfg_pv_wp" value="${currentPvWp}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); box-sizing: border-box;">
          </div>

          <div style="background: var(--card-background-color); padding: 10px; border-radius: 8px; border: 1px solid var(--divider-color); margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <input type="checkbox" id="cfg_feed_in_active" ${currentFeedInActive ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;">
              <label for="cfg_feed_in_active" style="font-size: 0.8em; font-weight: 500; color: var(--primary-text-color); cursor: pointer;">Einspeisevergütung erhalten (PV-Gutschrift aktiv)</label>
            </div>
            <div id="feed_in_price_container" style="display: ${currentFeedInActive ? 'block' : 'none'};">
              <label style="font-size: 0.75em; color: var(--secondary-text-color); display: block; margin-bottom: 4px;">Einspeisevergütung (€ / kWh):</label>
              <input type="number" step="0.001" id="cfg_feed_in_price" value="${currentFeedInPrice}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--divider-color); background: var(--secondary-background-color); color: var(--primary-text-color); box-sizing: border-box;">
            </div>
          </div>

          <div style="margin-bottom: 10px;">
            <label style="font-size: 0.75em; color: var(--secondary-text-color); display: block; margin-bottom: 4px;">Netzbezug Winter-Faktor (Dez–Feb):</label>
            <select id="cfg_winter_profile" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);">
              <option value="1.2" ${currentWinterProfile === "1.2" ? 'selected' : ''}>Wenig (Faktor 1.2 - leichter Winteranstieg)</option>
              <option value="1.7" ${currentWinterProfile === "1.7" ? 'selected' : ''}>Mittel / Normal (Faktor 1.7)</option>
              <option value="2.3" ${currentWinterProfile === "2.3" ? 'selected' : ''}>Viel (Faktor 2.3 - Hoher Winterbedarf)</option>
              <option value="3.0" ${currentWinterProfile === "3.0" ? 'selected' : ''}>🔥 Extrem-Modus (Faktor 3.0 - Massiver Winterbedarf)</option>
            </select>
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

        <!-- TABELLEN-KOPF -->
        <div style="display: flex; justify-content: space-between; padding: 0 8px 6px 8px; font-size: 0.75em; color: var(--secondary-text-color); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
          <span style="width: 95px;">Monat</span>
          <span style="flex: 1; text-align: right;">Netz (kWh)</span>
          <span style="flex: 1; text-align: right;">PV (kWh)</span>
          <span style="flex: 1; text-align: right; padding-right: 4px;">Abschlag (€)</span>
        </div>

        <!-- MONATE GRID -->
        <div id="months_grid" style="display: flex; flex-direction: column; gap: 8px;"></div>

        <div style="height: 1px; background: var(--divider-color); margin: 16px 0;"></div>

        <!-- GESAMTANZEIGE & PROGNOSE -->
        <div style="background: var(--secondary-background-color); padding: 14px; border-radius: 10px; border: 1px solid var(--divider-color);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9em;">
            <span style="color: var(--secondary-text-color);">Bezahlte Abschläge:</span>
            <strong id="total_paid" style="color: var(--primary-text-color);">0,00 €</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9em;">
            <span style="color: var(--secondary-text-color);">Stromkosten (Netz kWh):</span>
            <strong id="energy_cost" style="color: var(--primary-text-color);">0,00 €</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9em;">
            <span style="color: var(--secondary-text-color);">PV-Ertrag (Ersparnis/Gutschrift):</span>
            <strong id="total_pv_savings" style="color: var(--success-color, #43a047);">0,00 kWh</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9em;">
            <span style="color: var(--secondary-text-color);">Grundgebühr (Anteilig):</span>
            <strong id="fee_display" style="color: var(--primary-text-color);">0,00 €</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85em; color: var(--secondary-text-color); margin-bottom: 8px; border-top: 1px solid var(--divider-color); padding-top: 6px;">
            <span>Gesamtkosten bisher:</span>
            <strong id="total_cost" style="color: var(--primary-text-color);">0,00 €</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 1.05em; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--divider-color);">
            <span style="font-weight: 500; color: var(--primary-text-color);">Aktuelle Bilanz:</span>
            <strong id="balance_result" style="font-size: 1.15em;">0,00 €</strong>
          </div>
          
          <!-- PROGNOSE BOX -->
          <div id="forecast_box" style="margin-top: 12px; padding: 10px; background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.1); border-radius: 8px; font-size: 0.85em; border: 1px solid var(--primary-color);">
            <div style="font-weight: 500; color: var(--primary-text-color); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              <span>🔮 Realistische Jahresend-Prognose:</span>
            </div>
            <div id="forecast_text" style="color: var(--secondary-text-color);">Berechne Prognose...</div>
          </div>
        </div>

      </ha-card>

      <!-- CSS für komfortable Eingabefelder -->
      <style>
        .wide-input {
          width: 100%;
          padding: 8px 8px !important;
          font-size: 0.95em !important;
          font-weight: 500;
          border-radius: 6px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          text-align: right;
          box-sizing: border-box;
        }
      </style>
    `;
    this.content = true;

    const feedInCheckbox = this.querySelector('#cfg_feed_in_active');
    const feedInPriceContainer = this.querySelector('#feed_in_price_container');
    if (feedInCheckbox && feedInPriceContainer) {
      feedInCheckbox.addEventListener('change', (e) => {
        feedInPriceContainer.style.display = e.target.checked ? 'block' : 'none';
      });
    }

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
    const winterProfileSelect = this.querySelector('#cfg_winter_profile');
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

    // Live-Update direkt bei Änderung im Dropdown
    if (winterProfileSelect) {
      winterProfileSelect.addEventListener('change', (e) => {
        localStorage.setItem('strom_config_winter_profile', e.target.value);
        this.config.winter_profile = e.target.value;
        this.renderGrid(); 
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
        const newWinterProfile = this.querySelector('#cfg_winter_profile').value;
        const newDeadline = this.querySelector('#cfg_deadline').value;
        const newFeedInActive = this.querySelector('#cfg_feed_in_active').checked;
        const newFeedInPrice = parseFloat(this.querySelector('#cfg_feed_in_price').value) || 0;
        const newPvWp = parseFloat(this.querySelector('#cfg_pv_wp').value) || 4000;
        
        const sensorPicker = this.querySelector('#cfg_sensor_picker');
        const newSensor = sensorPicker ? sensorPicker.value : this.config.sensor;

        const pvSensorPicker = this.querySelector('#cfg_pv_sensor_picker');
        const newPvSensor = pvSensorPicker ? pvSensorPicker.value : this.config.pv_sensor;

        localStorage.setItem('strom_config_start_month', newStartMonth);
        localStorage.setItem('strom_view_billing_year', newYear);
        localStorage.setItem('strom_config_price', newPrice);
        localStorage.setItem('strom_config_base_fee', newBaseFee);
        localStorage.setItem('strom_config_default_abschlag', newDefaultAbschlag);
        localStorage.setItem('strom_config_winter_profile', newWinterProfile);
        localStorage.setItem('strom_config_deadline', newDeadline);
        localStorage.setItem('strom_config_feed_in_active', newFeedInActive);
        localStorage.setItem('strom_config_feed_in_price', newFeedInPrice);
        localStorage.setItem('strom_config_pv_wp', newPvWp);
        localStorage.setItem('strom_config_sensor', newSensor);
        localStorage.setItem('strom_config_pv_sensor', newPvSensor);

        this.config.price = newPrice;
        this.config.base_fee = newBaseFee;
        this.config.default_abschlag = newDefaultAbschlag;
        this.config.winter_profile = newWinterProfile;
        this.config.billing_deadline = newDeadline;
        this.config.feed_in_active = newFeedInActive;
        this.config.feed_in_price = newFeedInPrice;
        this.config.pv_wp = newPvWp;
        this.config.sensor = newSensor;
        this.config.pv_sensor = newPvSensor;

        settingsPanel.style.display = 'none';
        this.render();
      });
    }

    const savedPrice = localStorage.getItem('strom_config_price');
    const savedBaseFee = localStorage.getItem('strom_config_base_fee');
    const savedAbschlag = localStorage.getItem('strom_config_default_abschlag');
    const savedWinterProfile = localStorage.getItem('strom_config_winter_profile');
    const savedDeadline = localStorage.getItem('strom_config_deadline');
    const savedPvWp = localStorage.getItem('strom_config_pv_wp');
    const savedSensor = localStorage.getItem('strom_config_sensor');
    const savedPvSensor = localStorage.getItem('strom_config_pv_sensor');

    if (savedPrice !== null) this.config.price = parseFloat(savedPrice);
    if (savedBaseFee !== null) this.config.base_fee = parseFloat(savedBaseFee);
    if (savedAbschlag !== null) this.config.default_abschlag = parseFloat(savedAbschlag);
    if (savedWinterProfile !== null) this.config.winter_profile = savedWinterProfile;
    if (savedDeadline !== null) this.config.billing_deadline = savedDeadline;
    if (savedPvWp !== null) this.config.pv_wp = parseFloat(savedPvWp);
    if (savedSensor) this.config.sensor = savedSensor;
    if (savedPvSensor) this.config.pv_sensor = savedPvSensor;
  }

  initCard() {
    this.renderGrid();
  }

  renderGrid() {
    const baseMonths = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    const activeYearStr = this.getActiveBillingYear(); 
    const startYear = parseInt(activeYearStr.split('/')[0]);
    const startMonth = this.getStartMonth();

    const months = [];
    let dateCursor = new Date(startYear, startMonth, 1); 
    for (let i = 0; i < 12; i++) {
      const mName = baseMonths[dateCursor.getMonth()];
      const yNum = dateCursor.getFullYear();
      months.push({ name: `${mName} ${yNum}`, index: i, monthNumber: dateCursor.getMonth() });
      dateCursor.setMonth(dateCursor.getMonth() + 1);
    }

    const defaultAbschlag = parseFloat(localStorage.getItem('strom_config_default_abschlag')) || this.config.default_abschlag;
    const grid = this.querySelector('#months_grid');
    grid.innerHTML = '';

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth();
    
    let currentMonthOffset = (currentYear - startYear) * 12 + (currentMonthNum - startMonth);
    if (currentMonthOffset < 0) currentMonthOffset = -999;
    if (currentMonthOffset > 11) currentMonthOffset = 999;

    months.forEach((mObj, index) => {
      const yearKeyPrefix = activeYearStr.replace('/', '_');
      const savedAbschlag = localStorage.getItem(`strom_abschlag_${yearKeyPrefix}_${index}`) ?? defaultAbschlag;
      
      let savedKwh = localStorage.getItem(`strom_kwh_${yearKeyPrefix}_${index}`) ?? '';
      let savedPv = localStorage.getItem(`strom_pv_${yearKeyPrefix}_${index}`) ?? '';

      const isCurrentMonth = (index === currentMonthOffset);
      const isFutureMonth = (index > currentMonthOffset && activeYearStr === this.getCurrentActiveBillingYear());

      if (isCurrentMonth && !savedKwh && this._hass) {
        const sensorId = localStorage.getItem('strom_config_sensor') || this.config.sensor;
        if (sensorId && this._hass.states[sensorId]) {
          const val = parseFloat(this._hass.states[sensorId].state);
          if (!isNaN(val)) savedKwh = val;
        }
      }

      if (isCurrentMonth && !savedPv && this._hass) {
        const pvSensorId = localStorage.getItem('strom_config_pv_sensor') || this.config.pv_sensor;
        if (pvSensorId && this._hass.states[pvSensorId]) {
          const pvVal = parseFloat(this._hass.states[pvSensorId].state);
          if (!isNaN(pvVal)) savedPv = pvVal;
        }
      }

      const rowBackground = isCurrentMonth ? 'var(--card-background-color)' : 'var(--secondary-background-color)';
      const rowBorder = isCurrentMonth ? '1px solid var(--primary-color)' : '1px solid var(--divider-color)';

      const div = document.createElement('div');
      div.style.cssText = `display: flex; align-items: center; justify-content: space-between; background: ${rowBackground}; padding: 8px 10px; border-radius: 8px; gap: 8px; border: ${rowBorder};`;
      
      let kwhFieldHtml = `<input type="number" step="0.1" class="kwh-input wide-input" data-index="${index}" value="${savedKwh}" placeholder="kWh">`;
      let pvFieldHtml = `<input type="number" step="0.1" class="pv-input wide-input" data-index="${index}" value="${savedPv}" placeholder="PV kWh">`;

      if (isFutureMonth) {
        kwhFieldHtml = `<div class="forecast-kwh-display" data-index="${index}" style="font-size: 0.8em; font-weight: 500; text-align: right; padding: 8px 6px; color: var(--secondary-text-color);">--</div>`;
        pvFieldHtml = `<div class="forecast-pv-display" data-index="${index}" style="font-size: 0.8em; font-weight: 500; text-align: right; padding: 8px 6px; color: var(--success-color, #43a047);">--</div>`;
      }

      div.innerHTML = `
        <div style="font-size: 0.8em; font-weight: ${isCurrentMonth ? '600' : '400'}; width: 95px; color: var(--primary-text-color);">${mObj.name}</div>
        <div style="flex: 1;" title="Netzbezug in kWh">${kwhFieldHtml}</div>
        <div style="flex: 1;" title="PV-Ertrag in kWh">${pvFieldHtml}</div>
        <div style="flex: 1;" title="Abschlag in €"><input type="number" step="0.01" class="month-input wide-input" data-index="${index}" value="${savedAbschlag}"></div>
      `;
      grid.appendChild(div);
    });

    this.querySelectorAll('.month-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const yearKeyPrefix = activeYearStr.replace('/', '_');
        localStorage.setItem(`strom_abschlag_${yearKeyPrefix}_${e.target.dataset.index}`, e.target.value);
        this.calculateTotals();
      });
    });

    this.querySelectorAll('.kwh-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const yearKeyPrefix = activeYearStr.replace('/', '_');
        localStorage.setItem(`strom_kwh_${yearKeyPrefix}_${e.target.dataset.index}`, e.target.value);
        this.calculateTotals();
      });
    });

    this.querySelectorAll('.pv-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const yearKeyPrefix = activeYearStr.replace('/', '_');
        localStorage.setItem(`strom_pv_${yearKeyPrefix}_${e.target.dataset.index}`, e.target.value);
        this.calculateTotals();
      });
    });

    this.calculateTotals();
  }

  calculateTotals() {
    if (!this._hass) return;

    const activeYearStr = this.getActiveBillingYear();
    const startYear = parseInt(activeYearStr.split('/')[0]);
    const startMonth = this.getStartMonth();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth();
    let currentMonthOffset = (currentYear - startYear) * 12 + (currentMonthNum - startMonth);
    
    let activeLimit = 11;
    if (activeYearStr !== this.getCurrentActiveBillingYear()) {
      activeLimit = 11;
    } else {
      if (currentMonthOffset < 0) activeLimit = -1;
      else if (currentMonthOffset <= 11) activeLimit = currentMonthOffset;
    }

    let totalPaid = 0;
    let totalKwh = 0;
    let totalPvKwh = 0;

    const abschlagInputs = this.querySelectorAll('.month-input');
    const kwhInputs = this.querySelectorAll('.kwh-input');
    const pvInputs = this.querySelectorAll('.pv-input');
    
    abschlagInputs.forEach((input, index) => {
      if (index <= activeLimit) {
        totalPaid += parseFloat(input.value) || 0;
      }
    });

    let pastKwhTotal = 0;
    let pastPvTotal = 0;
    let pastMonthsCount = activeLimit < 0 ? 0 : (activeLimit + 1);

    kwhInputs.forEach((input, index) => {
      const val = parseFloat(input.value) || 0;
      if (index <= activeLimit || activeYearStr !== this.getCurrentActiveBillingYear()) {
        totalKwh += val;
        pastKwhTotal += val;
      }
    });

    pvInputs.forEach((input, index) => {
      const val = parseFloat(input.value) || 0;
      if (index <= activeLimit || activeYearStr !== this.getCurrentActiveBillingYear()) {
        totalPvKwh += val;
        pastPvTotal += val;
      }
    });

    const pricePerKwh = parseFloat(localStorage.getItem('strom_config_price')) || this.config.price;
    const energyCost = totalKwh * pricePerKwh; 

    const feedInActive = localStorage.getItem('strom_config_feed_in_active') === 'true';
    const feedInPrice = parseFloat(localStorage.getItem('strom_config_feed_in_price')) || 0;
    const feedInEarnings = feedInActive ? (totalPvKwh * feedInPrice) : 0;

    const totalAnnualFee = parseFloat(localStorage.getItem('strom_config_base_fee')) || this.config.base_fee;
    
    let proRataFee = (totalAnnualFee / 12) * pastMonthsCount;
    const deadlineStr = localStorage.getItem('strom_config_deadline');
    if (deadlineStr) {
      const deadlineDate = new Date(deadlineStr);
      const yearStart = new Date(startYear, startMonth, 1);
      const totalDaysInYear = (new Date(startYear + 1, startMonth, 1) - yearStart) / (1000 * 60 * 60 * 24);
      const elapsedDays = Math.max(0, Math.min(totalDaysInYear, (now - yearStart) / (1000 * 60 * 60 * 24)));
      proRataFee = (totalAnnualFee / totalDaysInYear) * elapsedDays;
    }

    const totalCost = energyCost + proRataFee - feedInEarnings;
    const balance = totalPaid - totalCost;

    let forecastText = "Noch nicht genügend Daten für Prognose.";
    const isCurrentYear = (activeYearStr === this.getCurrentActiveBillingYear());
    
    if (pastMonthsCount > 0 && pastMonthsCount < 12 && isCurrentYear) {
      const baseAvgKwh = pastKwhTotal / pastMonthsCount;
      const winterMultiplier = parseFloat(localStorage.getItem('strom_config_winter_profile') || this.config.winter_profile);

      // --- Saisonaler Faktor: Winter (Dez, Jan, Feb) nutzt nun sauber den ausgewählten Multiplikator auf die Basis ---
      const getMonthKwhFactor = (mIndex) => {
        if ([11, 0, 1].includes(mIndex)) return winterMultiplier;      // Dezember, Januar, Februar (Höchster Verbrauch)
        if ([2, 10].includes(mIndex)) return 1.25;                      // März, November (Übergang)
        if ([3, 9].includes(mIndex)) return 1.00;                       // April, Oktober
        if ([4, 8].includes(mIndex)) return 0.85;                       // Mai, September
        return 0.70;                                                    // Juni, Juli, August (Sommer-Tief)
      };

      const pvWp = parseFloat(localStorage.getItem('strom_config_pv_wp')) || this.config.pv_wp;
      const kwp = pvWp / 1000;

      const monthlyKwhPerKwp = [
        14,  // Januar (~56 kWh)
        20,  // Februar (~80 kWh)
        50,  // März (~200 kWh)
        90,  // April (~360 kWh)
        115, // Mai (~460 kWh)
        125, // Juni (~500 kWh)
        115, // Juli (~460 kWh)
        95,  // August (~380 kWh)
        70,  // September (~280 kWh)
        40,  // Oktober (~160 kWh)
        18,  // November (~72 kWh)
        14   // Dezember (~56 kWh)
      ];

      let tempCursorMonth = (startMonth + pastMonthsCount) % 12;
      for (let i = 0; i < 12; i++) {
        if (i > activeLimit) {
          const kF = getMonthKwhFactor(tempCursorMonth);
          const monthEstKwh = baseAvgKwh * kF;
          const monthEstPv = kwp * monthlyKwhPerKwp[tempCursorMonth];

          const rowKwhDisp = this.querySelector(`.forecast-kwh-display[data-index="${i}"]`);
          const rowPvDisp = this.querySelector(`.forecast-pv-display[data-index="${i}"]`);
          if (rowKwhDisp) rowKwhDisp.innerText = `~${monthEstKwh.toFixed(0)} kWh`;
          if (rowPvDisp) rowPvDisp.innerText = `~${monthEstPv.toFixed(0)} kWh`;
        }
        tempCursorMonth = (tempCursorMonth + 1) % 12;
      }

      let estimatedRemainingKwh = 0;
      let estimatedRemainingPv = 0;
      
      let cursorMonth = (startMonth + pastMonthsCount) % 12;
      const remainingMonths = 12 - pastMonthsCount;
      
      for (let r = 0; r < remainingMonths; r++) {
        const kF = getMonthKwhFactor(cursorMonth);
        estimatedRemainingKwh += (baseAvgKwh * kF);
        estimatedRemainingPv += (kwp * monthlyKwhPerKwp[cursorMonth]);

        cursorMonth = (cursorMonth + 1) % 12;
      }

      const predictedTotalKwh = pastKwhTotal + estimatedRemainingKwh;
      const predictedTotalPvKwh = pastPvTotal + estimatedRemainingPv;
      
      const predictedEnergyCost = predictedTotalKwh * pricePerKwh;
      const predictedFeedInEarnings = feedInActive ? (predictedTotalPvKwh * feedInPrice) : 0;
      const predictedTotalCost = predictedEnergyCost + totalAnnualFee - predictedFeedInEarnings;
      
      let totalAnnualPaid = 0;
      abschlagInputs.forEach(input => {
        totalAnnualPaid += parseFloat(input.value) || 0;
      });

      const predictedBalance = totalAnnualPaid - predictedTotalCost;
      const formattedBalance = `${predictedBalance >= 0 ? '+' : ''}${predictedBalance.toFixed(2)} €`;
      const statusText = predictedBalance >= 0 ? 'Erwartete Rückzahlung' : 'Erwartete Nachzahlung';

      let deadlineInfo = "";
      if (deadlineStr) {
        const dDate = new Date(deadlineStr);
        const daysLeft = Math.ceil((dDate - now) / (1000 * 60 * 60 * 24));
        deadlineInfo = `Noch <strong>${daysLeft > 0 ? daysLeft : 0} Tage</strong> bis zum Stichtag (${dDate.toLocaleDateString('de-DE')})<br>`;
      }

      let forecastPvLabel = `${predictedTotalPvKwh.toFixed(0)} kWh PV`;
      if (feedInActive) {
        forecastPvLabel += ` (~${predictedFeedInEarnings.toFixed(2)} € Gutschrift)`;
      }

      forecastText = `${deadlineInfo}` +
                     `Restliche Monate (Prognose auf Vormonats-Basis):<br>` +
                     `• Netzbezug: <strong>+${estimatedRemainingKwh.toFixed(0)} kWh</strong><br>` +
                     `• PV-Ertrag: <strong style="color: var(--success-color, #43a047);">+${estimatedRemainingPv.toFixed(0)} kWh</strong><br>` +
                     `-----------------------------------<br>` +
                     `Vorauss. Gesamt (12 Mon.): <strong>${predictedTotalKwh.toFixed(0)} kWh Netz</strong> | <strong style="color: var(--success-color, #43a047);">${forecastPvLabel}</strong><br>` +
                     `${statusText}: <strong style="color: ${predictedBalance >= 0 ? 'var(--success-color, #43a047)' : 'var(--error-color, #e53935)'};">${formattedBalance}</strong>`;
    }

    if (this.querySelector('#total_paid')) {
      this.querySelector('#total_paid').innerText = `${totalPaid.toFixed(2)} €`;
      this.querySelector('#energy_cost').innerText = `${energyCost.toFixed(2)} € (${totalKwh.toFixed(1)} kWh)`;
      
      let pvDisplayStr = `${totalPvKwh.toFixed(1)} kWh`;
      if (feedInActive) {
        pvDisplayStr += ` (+${feedInEarnings.toFixed(2)} €)`;
      }
      this.querySelector('#total_pv_savings').innerText = pvDisplayStr;

      this.querySelector('#fee_display').innerText = `${proRataFee.toFixed(2)} €`;
      this.querySelector('#total_cost').innerText = `${totalCost.toFixed(2)} €`;
      
      const balanceElem = this.querySelector('#balance_result');
      balanceElem.innerText = `${balance >= 0 ? '+' : ''}${balance.toFixed(2)} €`;
      balanceElem.style.color = balance >= 0 ? 'var(--success-color, #43a047)' : 'var(--error-color, #e53935)';

      const forecastElem = this.querySelector('#forecast_text');
      if (forecastElem) forecastElem.innerHTML = forecastText;
    }
  }

  getCardSize() { return 12; }
}

customElements.define('strom-abrechnung-card', StromAbrechnungCard);
