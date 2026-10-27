# ⚡ Strom- & PV-Abrechnungskarte für Home Assistant (`ha-strom-abrechnung-card`)

Eine moderne, hochflexible Custom Lovelace Card für Home Assistant zur lückenlosen Verwaltung, Abrechnung und visuellen Übersicht deines Stromverbrauchs sowie deines PV-Ertrags im individuellen Abrechnungsjahr.

---

## 🚀 Key Features

* **Flexibles Abrechnungsjahr:** Der Startmonat des Abrechnungsjahres (z. B. April bis März oder Januar bis Dezember) ist frei in den Karteneinstellungen wählbar.
* **PV-Ertrags- & Ersparnis-Anzeige:** Erfassung deines PV-Ertrags/Eigenverbrauchs pro Monat inklusive automatischer Berechnung der Ersparnis (€) basierend auf deinem Arbeitspreis.
* **Automatischer Monats-Import:** Liest den aktuellen Verbrauch (Netzbezug) und PV-Ertrag für den laufenden Monat automatisch aus Home-Assistant-Sensoren aus.
* **Eigener Einstellungs-Dialog (Internal GUI):** Konfiguration von Arbeitspreis, Grundgebühr, Standard-Abschlag und Sensoren direkt über das Zahnrad-Menü (⚙️) der Karte – ganz ohne kompliziertes YAML.
* **Abschlag auf alle Monate übernehmen:** Ein-Klick-Übernahme deines Standard-Abschlags auf alle 12 Monate des aktiven Abrechnungsjahres.
* **Historie & Archiv:** Schnelles Umschalten zwischen vergangenen und aktuellen Abrechnungsjahren.
* **JSON Import & Export:** Einfache Sicherung aller historischen kWh-, PV- und Abschlagsdaten zur Wiederherstellung oder Geräte-Synchronisation.
* **Modernes Design:** Nahtlose Integration in Home-Assistant-Themes (Support für Dark & Light Mode), visuelle Hervorhebung des aktuellen Monats und farblich dynamische Bilanzanzeige (Plus/Minus).

---

## 📋 Voraussetzungen (Sensoren in Home Assistant)

Damit die Karte den aktuellen Monatsverbrauch sowie den PV-Ertrag im laufenden Monat vollautomatisch auslesen kann, werden monatliche Zähler-Helfer (**Utility Meter / Dienstprogramm**) benötigt, die sich jeden Monat automatisch auf `0` zurücksetzen.

### 1. Netzbezug-Sensor anlegen:
1. Gehe in Home Assistant auf **Einstellungen** ➔ **Geräte & Dienste** ➔ **Helfer** ➔ **+ Helfer erstellen**.
2. Wähle **Dienstprogramm (Utility Meter)**.
3. Vergib einen Namen (z. B. `Smart Meter Stromverbrauch Monatlich`).
4. Wähle deinen Gesamtzähler / Integral-Sensor für Netzbezug als **Eingabesensor** und wähle den Zyklus **Monatlich**.

### 2. PV-Ertrag-Sensor anlegen (Optional):
1. Erstelle nach dem gleichen Prinzip einen zweiten **Utility Meter (Dienstprogramm)**.
2. Wähle als **Eingabesensor** den Gesamtertrags- oder Eigenverbrauchs-Sensor deiner Solaranlage/Wechselrichter und den Zyklus **Monatlich** (z. B. `PV Ertrag Monatlich`).

> **Hinweis bei neu angelegten Helfern:** Neu erstellte Utility Meter beginnen am Tag der Erstellung bei `0 kWh`. Für den bereits laufenden Monat kannst du den bisherigen Monats-Wert einfach manuell in die jeweilige Monatszeile der Karte eintragen. Ab dem Folgemonat läuft die Erfassung komplett automatisch.

---

## ⚙️ Installation & Konfiguration

### 1. HACS (Empfohlen)
1. Öffne **HACS** in Home Assistant.
2. Füge dieses Repository als **Benutzerdefiniertes Repository** (Typ: *Lovelace / Dashboard*) hinzu.
3. Installiere die **Strom- & PV-Abrechnungskarte** und lade dein Dashboard neu.

### 2. Dashboard Hinzufügen (YAML)
Füge die Karte auf deinem Dashboard hinzu:

```yaml
type: custom:strom-abrechnung-card
