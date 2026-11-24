import { expect } from 'chai';
import { forecast } from '../../../src/lib/tree/index.js';
import { expectForecastStructure } from '../../tools/forecastStructure.js';
import { createTestAdapter, type LooseDef } from '../helpers/fakeAdapter.js';
import { getForecastSources } from '../helpers/forecastSources.js';

type TestAdapter = ReturnType<typeof createTestAdapter>;

/**
 * Calls every `unit` function and every `readVal` function of a tree with the values of one forecast entry.
 * Ensures that all of them run without errors and produce a value.
 */
function exerciseDefinitions(defs: Record<string, LooseDef>, entry: LooseDef, adapter: TestAdapter): void {
    for (const [key, def] of Object.entries(defs)) {
        if (typeof def.unit === 'function') {
            expect(def.unit(entry, entry, adapter), `unit von ${key}`).to.be.a('string');
        }

        if (typeof def.readVal === 'function') {
            const raw = entry[def.valFromProperty ?? key];

            if (raw !== undefined && raw !== null) {
                expect(def.readVal(raw, adapter, entry, entry, key), `readVal von ${key}`).to.not.be.undefined;
            }
        }
    }
}

describe('lib/tree/forecast', () => {
    describe('Wurzel-Definition get()', () => {
        it('enthält update, hourly und daily', () => {
            const defs = forecast.get() as Record<string, LooseDef>;

            expect(Object.keys(defs)).to.have.members(['update', 'hourly', 'daily']);
        });

        it('definiert update als schreibbaren Button', () => {
            const defs = forecast.get() as Record<string, LooseDef>;

            expect(defs.update.write).to.equal(true);
            expect(defs.update.read).to.equal(false);
            expect(defs.update.role).to.equal('button');
        });

        it('steuert hourly und daily über die Konfiguration', () => {
            const adapter = createTestAdapter();
            const defs = forecast.get() as Record<string, LooseDef>;
            const sample = getForecastSources()[0].response;

            adapter.config.hourlyEnabled = true;
            expect(defs.hourly.conditionToCreateState(sample, sample, adapter)).to.equal(true);
            adapter.config.hourlyEnabled = false;
            expect(defs.hourly.conditionToCreateState(sample, sample, adapter)).to.equal(false);

            adapter.config.dailyEnabled = true;
            expect(defs.daily.conditionToCreateState(sample, sample, adapter)).to.equal(true);
            adapter.config.dailyEnabled = false;
            expect(defs.daily.conditionToCreateState(sample, sample, adapter)).to.equal(false);
        });
    });

    for (const source of getForecastSources()) {
        describe(`Datenquelle: ${source.name}`, () => {
            const adapter = createTestAdapter();
            const response = source.response;

            it('entspricht der erwarteten API-Struktur', () => {
                expectForecastStructure(response);
            });

            describe('current', () => {
                const defs = forecast.current.get() as Record<string, LooseDef>;
                const entry = response.current_conditions as unknown as LooseDef;

                it('hat die Kanal-ID forecast.current', () => {
                    expect(forecast.current.idChannel).to.equal('forecast.current');
                });

                it('rechnet time in Millisekunden um', () => {
                    expect(defs.time.readVal(1700000000, adapter, entry, entry, 'time')).to.equal(1700000000000);
                });

                it('liefert für alle Definitionen eine gültige Einheit und einen Wert', () => {
                    exerciseDefinitions(defs, entry, adapter);
                });

                it('liefert getKeys() mit den vier fingerprint-Schlüsseln und cached Ergebnis', () => {
                    const keys = forecast.current.getKeys();

                    expect(keys.filter(key => key.startsWith('fingerprint.'))).to.have.length(4);
                    expect(forecast.current.getKeys()).to.equal(keys);
                });

                it('liefert getStateIDs() im Kanal forecast.current', () => {
                    const ids = forecast.current.getStateIDs();

                    expect(ids).to.not.be.empty;
                    expect(ids).to.include('temperature');
                    expect(ids).to.include('timestamp');
                });
            });

            describe('hourly', () => {
                const defs = forecast.hourly.get() as Record<string, LooseDef>;
                const entry = response.forecast.hourly[0] as unknown as LooseDef;

                it('hat die Kanal-ID forecast.hourly', () => {
                    expect(forecast.hourly.idChannel).to.equal('forecast.hourly');
                });

                it('baut die Icon-URL über getApiEndpoint', () => {
                    expect(defs.icon.readVal('partly-cloudy-day', adapter, entry, entry, 'icon'))
                        .to.equal('https://tempestwx.com/images/Updated/partly-cloudy-day.svg');
                });

                it('liefert für alle Definitionen eine gültige Einheit und einen Wert', () => {
                    exerciseDefinitions(defs, entry, adapter);
                });

                it('liefert date als formatierten Text aus time', () => {
                    const date = defs.date.readVal(entry.time, adapter, entry, entry, 'date');

                    expect(date).to.be.a('string').that.is.not.empty;
                });

                it('liefert getKeys() und getStateIDs()', () => {
                    expect(forecast.hourly.getKeys()).to.include('time');
                    expect(forecast.hourly.getStateIDs()).to.not.be.empty;
                });
            });

            describe('daily', () => {
                const defs = forecast.daily.get() as Record<string, LooseDef>;
                const entry = response.forecast.daily[0] as unknown as LooseDef;

                it('hat die Kanal-ID forecast.daily', () => {
                    expect(forecast.daily.idChannel).to.equal('forecast.daily');
                });

                it('baut die Icon-URL über getApiEndpoint', () => {
                    expect(defs.icon.readVal('clear-day', adapter, entry, entry, 'icon'))
                        .to.equal('https://tempestwx.com/images/Updated/clear-day.svg');
                });

                it('liefert für alle Definitionen eine gültige Einheit und einen Wert', () => {
                    exerciseDefinitions(defs, entry, adapter);
                });

                it('formatiert sunrise und sunset als HH:mm', () => {
                    expect(defs.sunrise.readVal(entry.sunrise, adapter, entry, entry, 'sunrise')).to.match(/^\d{2}:\d{2}$/);
                    expect(defs.sunset.readVal(entry.sunset, adapter, entry, entry, 'sunset')).to.match(/^\d{2}:\d{2}$/);
                });

                it('liefert getKeys() und getStateIDs()', () => {
                    expect(forecast.daily.getKeys()).to.include('day_start_local');
                    expect(forecast.daily.getStateIDs()).to.not.be.empty;
                });
            });
        });
    }
});
