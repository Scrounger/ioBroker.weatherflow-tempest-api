/**
 * Live-Test: Struktur der echten WeatherFlow-Vorhersage (better_forecast, nur lesend, ein GET pro Lauf).
 * Prüft die Felder, die der Adapter liest, sowie Reihenfolge und Einheiten.
 * Benötigt eine .env mit WFT_ACCESS_TOKEN und WFT_STATION_ID. Fehlt sie, werden die Tests übersprungen.
 * Start: npm run test:live
 */
import { expect } from 'chai';
import type { ForeCast } from '../../src/lib/api/wft-types-forecast.js';
import { expectForecastStructure } from './forecastStructure.js';
import { createApi, FORECAST_UNITS, getLiveConfig } from './wft-session.js';

const config = getLiveConfig();

describe('live: api (better_forecast)', function () {
    this.timeout(30000);

    let forecast: ForeCast | undefined;

    before(async function () {
        if (!config) {
            console.warn('[live] .env oder WFT_ACCESS_TOKEN/WFT_STATION_ID fehlt, API-Tests werden übersprungen');
            this.skip();
        }

        forecast = await createApi(config!).getForeCast();
        expect(forecast, 'getForeCast result').to.be.an('object');
    });

    it('liefert alle Felder, die der Adapter liest', () => {
        expectForecastStructure(forecast);
    });

    it('stündliche und tägliche Einträge sind zeitlich aufsteigend sortiert', () => {
        const hourlyTimes = forecast!.forecast.hourly.map((entry) => entry.time);
        const dailyStarts = forecast!.forecast.daily.map((entry) => entry.day_start_local);

        expect(hourlyTimes, 'hourly time').to.deep.equal([...hourlyTimes].sort((a, b) => a - b));
        expect(dailyStarts, 'daily day_start_local').to.deep.equal([...dailyStarts].sort((a, b) => a - b));
    });

    it('liefert die angefragten Einheiten zurück', () => {
        expect(forecast!.units.units_temp, 'units_temp').to.equal(FORECAST_UNITS.unitTemperature);
        expect(forecast!.units.units_wind, 'units_wind').to.equal(FORECAST_UNITS.unitWind);
    });
});
