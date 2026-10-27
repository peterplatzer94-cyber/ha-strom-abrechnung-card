⚡ Strom-Abrechnungskarte für Home Assistant (ha-strom-abrechnung-card)

Eine moderne, benutzerfreundliche Custom Lovelace Card für Home Assistant zur lückenlosen Verwaltung und Abrechnung deines Stromverbrauchs im jährlichen Abrechnungszyklus (April bis März).
🚀 Features

    Automatisches Abrechnungsjahr: Berechnet den Zyklus von April bis März vollautomatisch.

    Historie & Archiv: Zugriff auf vergangene Abrechnungsjahre direkt über das Einstellungs-Menü.

    Automatische Erfassung: Liest den aktuellen Monatsverbrauch vollautomatisch aus einem Home-Assistant-Sensor aus (z. B. einem monatlichen Utility Meter oder Integral-Sensor).

    Integriertes Einstellungs-Menü: Direkte Anpassung von Arbeitspreis, Grundgebühr und Sensor über ein sauberes Menü (⚙️) direkt in der Karte, ganz ohne kompliziertes YAML.

    Live-Bilanz: Automatische Gegenüberstellung von bezahlten Abschlägen und tatsächlichen Kosten (Arbeitspreis + anteilige Grundgebühr).
    📋 Voraussetzungen (Sensor in Home Assistant)Damit die automatische kWh-Erfassung im laufenden Monat funktioniert, wird ein Sensor benötigt, der den monatlichen Verbrauch in kWh anzeigt (und sich idealerweise monatlich zurücksetzt):Erstelle in Home Assistant unter Einstellungen $\rightarrow$ Helfer einen Utility Meter (Dienstprogramm) mit monatlichem Zyklus (monthly), der deinen Zähler oder Integral-Sensor als Eingabe nutzt.Beispiel: sensor.smart_meter_stromverbrauch_monatlich
    ⚙️ Installation & Konfiguration
1. Über HACS (Empfohlen)

Füge dieses Repository als benutzerdefiniertes Repository in HACS hinzu und installiere die Karte.
2. Dashboard-Konfiguration

Füge die Karte auf deinem Dashboard hinzu (entweder über den visuellen Editor oder manuell im YAML-Code):

type: custom:strom-abrechnung-card

3. Einstellungen in der Karte

Klicke nach dem Hinzufügen auf der Karte oben rechts auf ⚙️ Einstellungen, um deinen monatlichen Sensor (z. B. sensor.smart_meter_stromverbrauch_monatlich), deinen Arbeitspreis (€/kWh) und deine jährliche Grundgebühr zu hinterlegen.

Wenn du diesen Text in deine README.md auf GitHub packst, hat jeder (und du selbst bei einer Neuinstallation) sofort eine perfekte Anleitung parat!
