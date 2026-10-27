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
      <ha-card header="⚡ Strom-Monatsbilanz">
        <div class="card-content" style="padding: 16px;">
          
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
      months.push({ name: `${mName}${yNum}`, index: i });
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
      const savedAbschlag = localStorage.getItem(`strom_absch
