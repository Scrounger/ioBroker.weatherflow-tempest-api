import * as utils from '@iobroker/adapter-core';
import { expect } from 'chai';
import sinon from 'sinon';
import { myIob, type myTreeDefinition } from '../../../src/lib/myIob.js';
import * as tree from '../../../src/lib/tree/index.js';
import { ADMIN_DIR, asAdapter, createTestAdapter, type FakeAdapter } from '../helpers/fakeAdapter.js';
import { getForecastSources } from '../helpers/forecastSources.js';

type TreeDef = Parameters<myIob['createOrUpdateStates']>[1];
type TreeData = Parameters<myIob['createOrUpdateStates']>[2];
type Blacklist = Parameters<myIob['createOrUpdateStates']>[4];

function asData(value: object): TreeData {
    return value as unknown as TreeData;
}

function createIob(fake: FakeAdapter, statesUsingValAsLastChanged: string[] = []): myIob {
    return new myIob(asAdapter(fake), utils, statesUsingValAsLastChanged);
}

describe('lib/myIob.ts', () => {
    before(async () => {
        await utils.I18n.init(ADMIN_DIR, 'en');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('createOrUpdateDevice', () => {
        it('legt ein Gerät mit Namen an', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            await iob.createOrUpdateDevice('dev', 'Gerät');

            expect(fake.objects.get('dev')?.type).to.equal('device');
            expect(fake.objects.get('dev')?.common.name).to.equal('Gerät');
        });

        it('übersetzt bekannte Übersetzungsschlüssel als Objekt', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            await iob.createOrUpdateDevice('dev', 'inXhours');

            expect(fake.objects.get('dev')?.common.name).to.be.an('object');
            expect(fake.objects.get('dev')?.common.name.en).to.equal('in {0} hours');
        });

        it('setzt Status- und Fehler-States mit Namespace', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            await iob.createOrUpdateDevice('dev', 'Gerät', 'online', 'error');
            await iob.createOrUpdateDevice('dev2', 'Gerät', 'weatherflow-tempest-api.0.online');

            expect(fake.objects.get('dev')?.common.statusStates).to.deep.equal({
                onlineId: 'weatherflow-tempest-api.0.online',
                errorId: 'weatherflow-tempest-api.0.error',
            });
            expect(fake.objects.get('dev2')?.common.statusStates.onlineId).to.equal('weatherflow-tempest-api.0.online');
        });

        it('aktualisiert das Gerät nur mit updateObject', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            await iob.createOrUpdateDevice('dev', 'Alt');
            await iob.createOrUpdateDevice('dev', 'Neu');
            expect(fake.objects.get('dev')?.common.name).to.equal('Alt');

            await iob.createOrUpdateDevice('dev', 'Neu', undefined, undefined, undefined, true);
            expect(fake.objects.get('dev')?.common.name).to.equal('Neu');
        });

        it('behält den vorhandenen Namen, wenn kein Name übergeben wird', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            await iob.createOrUpdateDevice('dev', 'Gerät');
            await iob.createOrUpdateDevice('dev', undefined, undefined, undefined, undefined, true);

            expect(fake.objects.get('dev')?.common.name).to.equal('Gerät');
        });

        it('setzt ohne Namen den Platzhalter "undefined"', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            await iob.createOrUpdateDevice('dev', undefined);

            expect(fake.objects.get('dev')?.common.name).to.equal('undefined');
        });

        it('protokolliert Fehler, ohne zu werfen', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            sinon.stub(fake, 'objectExists').rejects(new Error('kaputt'));

            await iob.createOrUpdateDevice('dev', 'Gerät');

            expect(fake.log.error).to.have.been.called;
        });
    });

    describe('createOrUpdateChannel', () => {
        it('legt einen Channel an', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            await iob.createOrUpdateChannel('ch', 'Kanal', 'icon.png');

            expect(fake.objects.get('ch')?.type).to.equal('channel');
            expect(fake.objects.get('ch')?.common.name).to.equal('Kanal');
            expect(fake.objects.get('ch')?.common.icon).to.equal('icon.png');
        });

        it('aktualisiert den Channel nur mit updateObject', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            await iob.createOrUpdateChannel('ch', 'Alt');
            await iob.createOrUpdateChannel('ch', 'Neu');
            expect(fake.objects.get('ch')?.common.name).to.equal('Alt');

            await iob.createOrUpdateChannel('ch', 'Neu', undefined, true);
            expect(fake.objects.get('ch')?.common.name).to.equal('Neu');
        });
    });

    describe('createOrUpdateStates', () => {
        it('legt einen State mit Common-Eigenschaften und Wert an', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                temp: { iobType: 'number', name: 'Temperatur', unit: '°C', min: -40, max: 60, step: 0.1, read: true, write: false },
            };

            const changed = await iob.createOrUpdateStates('ch', def, asData({ temp: 21.5 }), asData({ temp: 21.5 }));

            expect(changed).to.equal(true);
            expect(fake.objects.get('ch.temp')?.type).to.equal('state');
            expect(fake.objects.get('ch.temp')?.common.name).to.equal('Temperatur');
            expect(fake.objects.get('ch.temp')?.common.unit).to.equal('°C');
            expect(fake.objects.get('ch.temp')?.common.min).to.equal(-40);
            expect(fake.objects.get('ch.temp')?.common.max).to.equal(60);
            expect(fake.objects.get('ch.temp')?.common.step).to.equal(0.1);
            expect(fake.objects.get('ch.temp')?.common.role).to.equal('value.temperature');
            expect(fake.states.get('ch.temp')?.val).to.equal(21.5);
        });

        it('meldet false, wenn der Wert unverändert ist, und true bei Änderung', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = { v: { iobType: 'number', read: true, write: false } };

            expect(await iob.createOrUpdateStates('ch', def, asData({ v: 1 }), asData({ v: 1 }))).to.equal(true);
            expect(await iob.createOrUpdateStates('ch', def, asData({ v: 1 }), asData({ v: 1 }))).to.equal(false);
            expect(await iob.createOrUpdateStates('ch', def, asData({ v: 2 }), asData({ v: 2 }))).to.equal(true);
        });

        it('aktualisiert Common-Eigenschaften nur mit updateObject', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const defOld: TreeDef = { v: { iobType: 'number', read: true, write: false, min: -40 } };
            const defNew: TreeDef = { v: { iobType: 'number', read: true, write: false, min: -50 } };
            const data = asData({ v: 1 });

            await iob.createOrUpdateStates('ch', defOld, data, data);
            await iob.createOrUpdateStates('ch', defNew, data, data);
            expect(fake.objects.get('ch.v')?.common.min).to.equal(-40);

            await iob.createOrUpdateStates('ch', defNew, data, data, undefined, false, 'test', true);
            expect(fake.objects.get('ch.v')?.common.min).to.equal(-50);
        });

        it('verwendet readVal zur Wertumwandlung', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                x: { iobType: 'number', read: true, write: false, readVal: (val: number) => val * 2 },
            };

            await iob.createOrUpdateStates('ch', def, asData({ x: 2 }), asData({ x: 2 }));

            expect(fake.states.get('ch.x')?.val).to.equal(4);
        });

        it('verwendet die definierte id statt des Schlüssels', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = { x: { id: 'custom', iobType: 'string', read: true, write: false } };

            await iob.createOrUpdateStates('ch', def, asData({ x: 'abc' }), asData({ x: 'abc' }));

            expect(fake.objects.has('ch.custom')).to.equal(true);
            expect(fake.states.get('ch.custom')?.val).to.equal('abc');
        });

        it('überspringt Einträge der Blacklist', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                a: { iobType: 'number', read: true, write: false },
                b: { iobType: 'number', read: true, write: false },
            };
            const blacklist: Blacklist = [{ id: 'b' }];

            await iob.createOrUpdateStates('ch', def, asData({ a: 1, b: 2 }), asData({ a: 1, b: 2 }), blacklist);

            expect(fake.objects.has('ch.a')).to.equal(true);
            expect(fake.objects.has('ch.b')).to.equal(false);
        });

        it('entfernt einen bereits vorhandenen State, der auf der Blacklist steht', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = { b: { iobType: 'number', read: true, write: false } };
            const data = asData({ b: 2 });

            await iob.createOrUpdateStates('ch', def, data, data);
            expect(fake.objects.has('ch.b')).to.equal(true);

            await iob.createOrUpdateStates('ch', def, data, data, [{ id: 'b' }]);
            expect(fake.objects.has('ch.b')).to.equal(false);
        });

        it('erstellt im Whitelist-Modus nur States der Whitelist', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                a: { iobType: 'number', read: true, write: false },
                b: { iobType: 'number', read: true, write: false },
            };

            await iob.createOrUpdateStates('ch', def, asData({ a: 1, b: 2 }), asData({ a: 1, b: 2 }), [{ id: 'a' }], true);

            expect(fake.objects.has('ch.a')).to.equal(true);
            expect(fake.objects.has('ch.b')).to.equal(false);
        });

        it('erstellt keinen State, wenn conditionToCreateState false liefert', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                c: { iobType: 'number', read: true, write: false, conditionToCreateState: () => false },
            };

            await iob.createOrUpdateStates('ch', def, asData({ c: 1 }), asData({ c: 1 }));

            expect(fake.objects.has('ch.c')).to.equal(false);
        });

        it('löscht einen State bei false-Bedingung nur mit updateObject', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            let enabled = true;
            const def: TreeDef = {
                c: { iobType: 'number', read: true, write: false, conditionToCreateState: () => enabled },
            };
            const data = asData({ c: 1 });

            await iob.createOrUpdateStates('ch', def, data, data);
            expect(fake.objects.has('ch.c')).to.equal(true);

            enabled = false;
            await iob.createOrUpdateStates('ch', def, data, data);
            expect(fake.objects.has('ch.c')).to.equal(true);

            await iob.createOrUpdateStates('ch', def, data, data, undefined, false, 'test', true);
            expect(fake.objects.has('ch.c')).to.equal(false);
        });

        it('abonniert beschreibbare States und speichert deren writeVal', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const writeVal = (val: boolean): boolean => !val;
            const def: TreeDef = {
                w: { iobType: 'boolean', read: true, write: true, writeVal },
                s: { iobType: 'string', read: true, write: false, subscribeMe: true },
            };

            await iob.createOrUpdateStates('ch', def, asData({ w: true, s: 'x' }), asData({ w: true, s: 'x' }));

            expect(fake.subscribed).to.include('ch.w');
            expect(fake.subscribed).to.include('ch.s');
            expect(iob.statesWithWriteFunction['ch.w']).to.equal(writeVal);
        });

        it('setzt den Zeitstempel bei unverändertem Wert mit updateTs', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = { t: { iobType: 'number', read: true, write: false, updateTs: true } };
            const data = asData({ t: 5 });

            await iob.createOrUpdateStates('ch', def, data, data);
            const setStateSpy = sinon.spy(fake, 'setState');
            await iob.createOrUpdateStates('ch', def, data, data);

            expect(setStateSpy).to.have.been.calledWith('ch.t', 5, true);
        });

        it('setzt lc bei Zahlen für States in statesUsingValAsLastChanged', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake, ['x']);
            const def: TreeDef = { x: { iobType: 'number', read: true, write: false } };
            const spy = sinon.spy(fake, 'setStateChangedAsync');

            await iob.createOrUpdateStates('ch', def, asData({ x: 5 }), asData({ x: 5 }));

            expect(spy).to.have.been.calledWith('ch.x', { val: 5, lc: 5 }, true);
        });

        it('verarbeitet Objekte mit Channel und Unterstates', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                obj: {
                    name: 'Objekt',
                    idChannel: 'objekt',
                    object: { inner: { iobType: 'number', read: true, write: false } },
                } as myTreeDefinition<any, any, any>,
            };

            await iob.createOrUpdateStates('ch', def, asData({ obj: { inner: 3 } }), asData({ obj: { inner: 3 } }));

            expect([...fake.objects.keys()].some(key => key.endsWith('.inner'))).to.equal(true);
            expect([...fake.states.values()].map(state => state.val)).to.include(3);
        });

        it('verarbeitet Arrays mit Präfix und Startnummer', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                arr: {
                    name: 'Liste',
                    arrayStartNumber: 1,
                    arrayChannelIdPrefix: 'item_',
                    array: { value: { iobType: 'number', read: true, write: false } },
                } as myTreeDefinition<any, any, any>,
            };
            const data = asData({ arr: [{ value: 1 }, null, { value: 2 }] });

            await iob.createOrUpdateStates('ch', def, data, data);

            const keys = [...fake.objects.keys()];
            // Die Nummer ergibt sich aus dem Index (null-Eintrag wird übersprungen, Index 2 -> item_3)
            expect(keys.some(key => key.includes('item_1'))).to.equal(true);
            expect(keys.some(key => key.includes('item_3'))).to.equal(true);
            expect(keys.some(key => key.includes('item_2'))).to.equal(false);
        });

        it('füllt die Array-Nummer mit arrayChannelIdZeroPad auf', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                arr: {
                    name: 'Liste',
                    arrayChannelIdPrefix: 'item_',
                    arrayChannelIdZeroPad: 2,
                    array: { value: { iobType: 'number', read: true, write: false } },
                } as myTreeDefinition<any, any, any>,
            };
            const data = asData({ arr: [{ value: 1 }] });

            await iob.createOrUpdateStates('ch', def, data, data);

            expect([...fake.objects.keys()].some(key => key.includes('item_00'))).to.equal(true);
        });

        it('überspringt Array-Einträge ohne arrayChannelIdFromProperty-Ergebnis', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                arr: {
                    name: 'Liste',
                    arrayChannelIdFromProperty: () => undefined,
                    array: { value: { iobType: 'number', read: true, write: false } },
                } as myTreeDefinition<any, any, any>,
            };
            const data = asData({ arr: [{ value: 1 }] });

            await iob.createOrUpdateStates('ch', def, data, data);

            expect([...fake.objects.keys()].some(key => key.endsWith('.value'))).to.equal(false);
        });

        it('liefert false und legt nichts an, wenn der Adapter nicht verbunden ist', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            fake.connected = false;
            const def: TreeDef = { v: { iobType: 'number', read: true, write: false } };

            const changed = await iob.createOrUpdateStates('ch', def, asData({ v: 1 }), asData({ v: 1 }));

            expect(changed).to.equal(false);
            expect(fake.objects.size).to.equal(0);
        });

        it('protokolliert Fehler einzelner Einträge, ohne zu werfen', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            sinon.stub(fake, 'objectExists').rejects(new Error('kaputt'));
            const def: TreeDef = { v: { iobType: 'number', read: true, write: false } };

            await iob.createOrUpdateStates('ch', def, asData({ v: 1 }), asData({ v: 1 }));

            expect(fake.log.error).to.have.been.called;
        });
    });

    describe('assignPredefinedRoles (privat)', () => {
        type Roles = {
            assignPredefinedRoles(common: Record<string, unknown>, id: string): string;
        };

        const roleOf = (fake: FakeAdapter, common: Record<string, unknown>, id: string): string =>
            (createIob(fake) as unknown as Roles).assignPredefinedRoles(common, id);

        it('vergibt Rollen für beschreibbare boolean-Werte', () => {
            const fake = createTestAdapter();
            const base = { type: 'boolean', read: true, write: true };

            expect(roleOf(fake, base, 'x.enable_me')).to.equal('switch.enable');
            expect(roleOf(fake, base, 'x.light')).to.equal('switch.light');
            expect(roleOf(fake, base, 'x.power')).to.equal('switch.power');
            expect(roleOf(fake, base, 'x.other')).to.equal('switch');
        });

        it('vergibt Rollen für nur lesbare boolean-Werte', () => {
            const fake = createTestAdapter();
            const base = { type: 'boolean', read: true, write: false };

            expect(roleOf(fake, base, 'x.connected')).to.equal('indicator.reachable');
            expect(roleOf(fake, base, 'x.error')).to.equal('indicator.error');
            expect(roleOf(fake, base, 'x.alarm')).to.equal('indicator.alarm');
            expect(roleOf(fake, base, 'x.maintenance')).to.equal('indicator.maintenance');
            expect(roleOf(fake, base, 'x.other')).to.equal('sensor');
        });

        it('vergibt Rollen für Zahlen mit Einheit oder Id', () => {
            const fake = createTestAdapter();
            const readOnly = (unit: string): Record<string, unknown> => ({ type: 'number', read: true, write: false, unit });

            expect(roleOf(fake, { type: 'number', read: true, write: true }, 'x.temperatur')).to.equal('level.temperature');
            expect(roleOf(fake, readOnly('lux'), 'x.v')).to.equal('value.brightness');
            expect(roleOf(fake, readOnly('ppm'), 'x.v')).to.equal('value.co2');
            expect(roleOf(fake, readOnly('mbar'), 'x.v')).to.equal('value.pressure');
            expect(roleOf(fake, readOnly('kWh'), 'x.v')).to.equal('value.energy');
            expect(roleOf(fake, readOnly('kW'), 'x.v')).to.equal('value.power');
            expect(roleOf(fake, readOnly('A'), 'x.v')).to.equal('value.current');
            expect(roleOf(fake, readOnly('V'), 'x.v')).to.equal('value.voltage');
            expect(roleOf(fake, readOnly('Hz'), 'x.v')).to.equal('value.frequency');
            expect(roleOf(fake, readOnly(''), 'x.longitude')).to.equal('value.gps.longitude');
            expect(roleOf(fake, readOnly(''), 'x.latitude')).to.equal('value.gps.latitude');
            expect(roleOf(fake, readOnly('%'), 'x.humidity')).to.equal('value.humidity');
            expect(roleOf(fake, readOnly('%'), 'x.battery')).to.equal('value.battery');
            expect(roleOf(fake, readOnly('%'), 'x.volume')).to.equal('value.volume');
        });

        it('vergibt Info-Rollen für nur lesbare Strings', () => {
            const fake = createTestAdapter();
            const base = { type: 'string', read: true, write: false };

            expect(roleOf(fake, base, 'x.firmware')).to.equal('info.firmware');
            expect(roleOf(fake, base, 'x.status')).to.equal('info.status');
            expect(roleOf(fake, base, 'x.model')).to.equal('info.model');
            expect(roleOf(fake, base, 'x.mac')).to.equal('info.mac');
            expect(roleOf(fake, base, 'x.name')).to.equal('info.name');
        });

        it('liefert für andere Typen die Standardrolle state', () => {
            const fake = createTestAdapter();

            expect(roleOf(fake, { type: 'object', read: true, write: false }, 'x.y')).to.equal('state');
        });
    });

    describe('Hilfsfunktionen', () => {
        it('setStateExists schreibt nur vorhandene States', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = { s: { iobType: 'number', read: true, write: false } };
            await iob.createOrUpdateStates('ch', def, asData({ s: 1 }), asData({ s: 1 }));

            await iob.setStateExists('ch.s', 7, asAdapter(fake));
            await iob.setStateExists('ch.unbekannt', 7, asAdapter(fake));

            expect(fake.states.get('ch.s')?.val).to.equal(7);
            expect(fake.states.has('ch.unbekannt')).to.equal(false);
        });

        it('setStateExists nutzt setStateChangedAsync bei onlyChanges', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = { s: { iobType: 'number', read: true, write: false } };
            await iob.createOrUpdateStates('ch', def, asData({ s: 1 }), asData({ s: 1 }));
            const spy = sinon.spy(fake, 'setStateChangedAsync');

            await iob.setStateExists('ch.s', 8, asAdapter(fake), true);

            expect(spy).to.have.been.calledWith('ch.s', 8, true);
        });

        it('setStateExists protokolliert Fehler', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            sinon.stub(fake, 'objectExists').rejects(new Error('kaputt'));

            await iob.setStateExists('ch.s', 1, asAdapter(fake));

            expect(fake.log.error).to.have.been.called;
        });

        it('zerlegt IDs in letzten Teil und Rest', () => {
            const iob = createIob(createTestAdapter());

            expect(iob.getIdLastPart('a.b.c')).to.equal('c');
            expect(iob.getIdLastPart('')).to.equal('');
            expect(iob.getIdWithoutLastPart('a.b.c')).to.equal('a.b');
        });

        it('hasKey prüft nur eigene Schlüssel', () => {
            const iob = createIob(createTestAdapter());

            expect(iob.hasKey({ a: 1 }, 'a')).to.equal(true);
            expect(iob.hasKey({ a: 1 }, 'b')).to.equal(false);
            expect(iob.hasKey({ a: 1 }, undefined)).to.equal(false);
        });

        it('deepDiffBetweenObjects liefert die geänderten Werte', () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            const diff = iob.deepDiffBetweenObjects({ a: 1, b: 2 }, { a: 1, b: 3 }, asAdapter(fake));

            expect(diff).to.have.property('b');
            expect(diff).to.not.have.property('a');
        });

        it('findMissingTranslation läuft ohne Fehler durch', () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            iob.findMissingTranslation();

            expect(fake.log.error).to.not.have.been.called;
        });
    });

    describe('Verzweigungen in Geräten, Channels und States', () => {
        const objectDef = (extra: object = {}): myTreeDefinition<any, any, any> =>
            ({ object: { v: { iobType: 'number', read: true, write: false } }, ...extra }) as myTreeDefinition<any, any, any>;

        const arrayDef = (extra: object = {}): myTreeDefinition<any, any, any> =>
            ({ array: { value: { iobType: 'number', read: true, write: false } }, ...extra }) as myTreeDefinition<any, any, any>;

        it('übernimmt einen Fehler-State mit Namespace ohne vorhandenes Status-Objekt', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            await iob.createOrUpdateDevice('dev', 'Gerät', undefined, 'weatherflow-tempest-api.0.error');

            expect(fake.objects.get('dev')?.common.statusStates).to.deep.equal({ errorId: 'weatherflow-tempest-api.0.error' });
        });

        it('aktualisiert das Geräte-Icon ohne Log-Details', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            await iob.createOrUpdateDevice('dev', 'Gerät', undefined, undefined, 'icon-a');
            await iob.createOrUpdateDevice('dev', 'Gerät', undefined, undefined, 'icon-b', true, false);

            expect(fake.objects.get('dev')?.common.icon).to.equal('icon-b');
        });

        it('aktualisiert das Channel-Icon', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            await iob.createOrUpdateChannel('ch', 'Kanal', 'icon-a');
            await iob.createOrUpdateChannel('ch', 'Kanal', 'icon-b', true);

            expect(fake.objects.get('ch')?.common.icon).to.equal('icon-b');
        });

        it('setzt bei Channels ohne Namen den Platzhalter und behält ihn bei Updates', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            await iob.createOrUpdateChannel('ch', undefined);
            await iob.createOrUpdateChannel('ch', undefined, undefined, true);

            expect(fake.objects.get('ch')?.common.name).to.equal('undefined');
        });

        it('behält bei Channels den vorhandenen Namen, wenn kein Name übergeben wird', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            await iob.createOrUpdateChannel('ch', 'Kanal');
            await iob.createOrUpdateChannel('ch', undefined, undefined, true);

            expect(fake.objects.get('ch')?.common.name).to.equal('Kanal');
        });

        it('protokolliert Fehler beim Anlegen eines Channels, ohne zu werfen', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            sinon.stub(fake, 'objectExists').rejects(new Error('kaputt'));

            await iob.createOrUpdateChannel('ch', 'Kanal');

            expect(fake.log.error).to.have.been.called;
        });

        it('legt Blacklist-States an, wenn required true oder eine Funktion true liefert', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                a: { iobType: 'number', read: true, write: false, required: () => true },
                b: { iobType: 'number', read: true, write: false, required: true },
                c: { iobType: 'number', read: true, write: false, required: () => false },
            };
            const data = asData({ a: 1, b: 2, c: 3 });
            const blacklist: Blacklist = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

            await iob.createOrUpdateStates('ch', def, data, data, blacklist);

            expect(fake.objects.has('ch.a')).to.equal(true);
            expect(fake.objects.has('ch.b')).to.equal(true);
            expect(fake.objects.has('ch.c')).to.equal(false);
        });

        it('nutzt mac, ip oder _id der Quelldaten für die Log-Details', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = { v: { iobType: 'number', read: true, write: false } };
            const data = asData({ v: 1 });

            await iob.createOrUpdateStates('ch', def, data, asData({ mac: 'AA' }));
            await iob.createOrUpdateStates('ch', def, data, asData({ ip: '1.2.3.4' }));
            await iob.createOrUpdateStates('ch', def, data, asData({ _id: 'id1' }));

            expect(fake.objects.has('ch.v')).to.equal(true);
        });

        it('überspringt States mit fehlendem valFromProperty und legt Custom-States ohne Daten still an', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                v: { iobType: 'number', read: true, write: false, valFromProperty: 'fehlt' },
                x: { id: 'custom', iobType: 'number', read: true, write: false },
            };

            await iob.createOrUpdateStates('ch', def, asData({}), asData({}));

            expect(fake.objects.has('ch.v')).to.equal(false);
            expect(fake.objects.has('ch.custom')).to.equal(true);
            expect(fake.log.debug).to.not.have.been.called;
        });

        it('setzt bei Texten in statesUsingValAsLastChanged nur val', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake, ['s']);
            const def: TreeDef = { s: { iobType: 'string', read: true, write: false } };
            const spy = sinon.spy(fake, 'setStateChangedAsync');

            await iob.createOrUpdateStates('ch', def, asData({ s: 'x' }), asData({ s: 'x' }));

            expect(spy).to.have.been.calledWith('ch.s', { val: 'x' }, true);
        });

        it('löscht States außerhalb der Whitelist mit Log-Details', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                a: { iobType: 'number', read: true, write: false },
                b: { iobType: 'number', read: true, write: false },
            };
            const data = asData({ a: 1, b: 2 });

            await iob.createOrUpdateStates('ch', def, data, data);
            expect(fake.objects.has('ch.b')).to.equal(true);

            await iob.createOrUpdateStates('ch', def, data, asData({ mac: 'AA', a: 1, b: 2 }), [{ id: 'a' }], true);

            expect(fake.objects.has('ch.a')).to.equal(true);
            expect(fake.objects.has('ch.b')).to.equal(false);
        });

        it('löscht bei false-Bedingung mit updateObject und Log-Details', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            let enabled = true;
            const def: TreeDef = {
                c: { iobType: 'number', read: true, write: false, conditionToCreateState: () => enabled },
            };

            await iob.createOrUpdateStates('ch', def, asData({ c: 1 }), asData({ c: 1 }));
            expect(fake.objects.has('ch.c')).to.equal(true);

            enabled = false;
            await iob.createOrUpdateStates('ch', def, asData({ c: 1 }), asData({ mac: 'AA', c: 1 }), undefined, false, 'test', true);

            expect(fake.objects.has('ch.c')).to.equal(false);
        });

        it('protokolliert Fehler mit und ohne Daten zum Schlüssel', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            sinon.stub(fake, 'objectExists').rejects(new Error('kaputt'));
            const def: TreeDef = { x: { id: 'custom', iobType: 'number', read: true, write: false } };

            await iob.createOrUpdateStates('ch', def, asData({ x: 1 }), asData({}));
            await iob.createOrUpdateStates('ch', def, asData({}), asData({ mac: 'AA' }));

            expect(fake.log.error.callCount).to.be.greaterThan(1);
        });

        it('warnt bei fehlender Verbindung nur im Debug-Level', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            fake.connected = false;
            fake.log.level = 'debug';

            await iob.createOrUpdateStates('ch', { v: { iobType: 'number', read: true, write: false } }, asData({ v: 1 }), asData({ v: 1 }));

            expect(fake.log.warn).to.have.been.called;
        });

        it('protokolliert Fehler außerhalb der Einzelverarbeitung, ohne zu werfen', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            Object.defineProperty(fake, 'connected', {
                configurable: true,
                get: () => {
                    throw new Error('kaputt');
                },
            });

            await iob.createOrUpdateStates('ch', { v: { iobType: 'number', read: true, write: false } }, asData({ v: 1 }), asData({ v: 1 }));

            expect(fake.log.error).to.have.been.called;
        });

        it('übernimmt Expert-Flag, Default, Beschreibung, Zustände und statesFromProperty', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                e: { iobType: 'number', read: true, write: false, expert: true, desc: 'Beschreibung', def: 0 },
                f: { iobType: 'boolean', read: true, write: true, def: false },
                s: { iobType: 'number', read: true, write: true, states: { 0: 'aus', 1: 'an' } },
                p: { iobType: 'string', read: true, write: true, statesFromProperty: () => ['a', 'b'] },
            };
            const data = asData({ e: 1, f: true, s: 0, p: 'a' });

            await iob.createOrUpdateStates('ch', def, data, data);

            expect(fake.objects.get('ch.e')?.common.expert).to.equal(true);
            expect(fake.objects.get('ch.e')?.common.desc).to.equal('Beschreibung');
            expect(fake.objects.get('ch.e')?.common.def).to.equal(0);
            expect(fake.objects.get('ch.f')?.common.def).to.equal(false);
            expect(fake.objects.get('ch.s')?.common.states).to.deep.equal({ 0: 'aus', 1: 'an' });
            expect(fake.objects.get('ch.p')?.common.states).to.deep.equal(['a', 'b']);
        });

        it('protokolliert Fehler beim Erstellen der Common-Eigenschaften', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                u: { iobType: 'number', read: true, write: false, unit: () => { throw new Error('kaputt'); } },
            };

            await iob.createOrUpdateStates('ch', def, asData({ u: 1 }), asData({ u: 1 }));

            expect(fake.log.error).to.have.been.called;
        });

        it('nutzt für Objekt-Channels den Schlüssel oder eine Namensfunktion', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                ohne: objectDef(),
                mit: objectDef({ name: () => 'Funktionsname' }),
            };
            const data = asData({ ohne: { v: 1 }, mit: { v: 2 } });

            await iob.createOrUpdateStates('ch', def, data, data);

            expect(fake.objects.get('ch.ohne')?.common.name).to.equal('ohne');
            expect(fake.objects.get('ch.mit')?.common.name).to.equal('Funktionsname');
        });

        it('behandelt Objekt-Channels bei Blacklist, required und false-Bedingung', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            let enabled = true;
            const def: TreeDef = {
                obj: objectDef({ idChannel: 'objekt' }),
                req: objectDef({ idChannel: 'objekt2', required: true }),
                cond: objectDef({ idChannel: 'bedingt', conditionToCreateState: () => enabled }),
            };
            const data = asData({ obj: { v: 1 }, req: { v: 2 }, cond: { v: 3 } });

            await iob.createOrUpdateStates('ch', def, data, data);
            expect(fake.objects.has('ch.objekt')).to.equal(true);
            expect(fake.objects.has('ch.bedingt')).to.equal(true);

            await iob.createOrUpdateStates('ch', def, data, data, [{ id: 'objekt' }, { id: 'objekt2' }]);
            expect(fake.objects.has('ch.objekt')).to.equal(false);
            expect(fake.objects.has('ch.objekt2')).to.equal(true);

            enabled = false;
            await iob.createOrUpdateStates('ch', def, data, data);
            expect(fake.objects.has('ch.bedingt')).to.equal(false);
        });

        it('legt Objekt-Channels auf der Whitelist an', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = { obj: objectDef({ idChannel: 'objekt' }) };
            const data = asData({ obj: { v: 1 } });

            await iob.createOrUpdateStates('ch', def, data, data, [{ id: 'objekt' }], true);

            expect(fake.objects.has('ch.objekt')).to.equal(true);
        });

        it('nutzt bei Arrays idChannel, Namensfunktion und arrayStartNumber undefined', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                liste: arrayDef({
                    idChannel: 'listenkanal',
                    icon: 'list.png',
                    arrayStartNumber: undefined,
                    arrayChannelNameFromProperty: (_objDevice: unknown, _objChannel: unknown, i: number) => `Eintrag ${i}`,
                }),
            };
            const data = asData({ liste: [{ value: 1 }] });

            await iob.createOrUpdateStates('ch', def, data, data);

            expect(fake.objects.get('ch.listenkanal')?.common.icon).to.equal('list.png');
            expect(fake.objects.get('ch.listenkanal.0')?.common.name).to.equal('Eintrag 0');
        });

        it('nutzt bei Arrays ohne Namen den Schlüssel und arrayChannelIdFromProperty', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                ohneName: arrayDef({ arrayChannelIdFromProperty: (_objDevice: unknown, _objChannel: unknown, i: number) => `id${i}` }),
            };
            const data = asData({ ohneName: [{ value: 1 }] });

            await iob.createOrUpdateStates('ch', def, data, data);

            expect(fake.objects.get('ch.ohneName')?.common.name).to.equal('ohneName');
            expect(fake.objects.has('ch.ohneName.id0')).to.equal(true);
        });

        it('behandelt Arrays auf Blacklist, mit required und auf der Whitelist', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const def: TreeDef = {
                bl: arrayDef(),
                req: arrayDef({ required: true }),
                wl: arrayDef(),
            };
            const data = asData({ bl: [{ value: 1 }], req: [{ value: 2 }], wl: [{ value: 3 }] });

            await iob.createOrUpdateStates('ch', def, data, data);
            expect(fake.objects.has('ch.bl')).to.equal(true);

            await iob.createOrUpdateStates('ch', def, data, data, [{ id: 'bl' }, { id: 'req' }]);
            expect(fake.objects.has('ch.bl')).to.equal(false);
            expect(fake.objects.has('ch.req')).to.equal(true);

            await iob.createOrUpdateStates('ch', def, data, data, [{ id: 'wl' }], true);
            expect(fake.objects.has('ch.wl')).to.equal(true);
            expect(fake.objects.has('ch.bl')).to.equal(false);
        });

        it('löscht Arrays bei false-Bedingung und legt sie bei true an', async () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            let enabled = true;
            const def: TreeDef = { c: arrayDef({ conditionToCreateState: () => enabled }) };
            const data = asData({ c: [{ value: 1 }] });

            await iob.createOrUpdateStates('ch', def, data, data);
            expect(fake.objects.has('ch.c')).to.equal(true);

            enabled = false;
            await iob.createOrUpdateStates('ch', def, data, data);
            expect(fake.objects.has('ch.c')).to.equal(false);
        });
    });

    describe('assignPredefinedRoles Sonderfälle (privat)', () => {
        type Roles = {
            assignPredefinedRoles(common: Record<string, unknown>, id: string): string;
        };

        const roleOf = (fake: FakeAdapter, common: Record<string, unknown>, id: string): string =>
            (createIob(fake) as unknown as Roles).assignPredefinedRoles(common, id);

        it('vergibt für Zahlen mit nur Schreibzugriff die Rolle level', () => {
            const fake = createTestAdapter();

            expect(roleOf(fake, { type: 'number', read: false, write: true }, 'x.v')).to.equal('level');
        });

        it('vergibt Hardware- und Seriennummer-Rollen und sonst text', () => {
            const fake = createTestAdapter();
            const base = { type: 'string', read: true, write: false };

            expect(roleOf(fake, base, 'x.hardware')).to.equal('info.hardware');
            expect(roleOf(fake, base, 'x.serial')).to.equal('info.serial');
            expect(roleOf(fake, base, 'x.other')).to.equal('text');
            expect(roleOf(fake, { type: 'string', read: true, write: true }, 'x.firmware')).to.equal('text');
        });

        it('liefert bei ungültiger Id die Standardrolle state und protokolliert den Fehler', () => {
            const fake = createTestAdapter();

            expect(roleOf(fake, { type: 'boolean', read: true, write: true }, undefined as unknown as string)).to.equal('state');
            expect(fake.log.error).to.have.been.called;
        });
    });

    describe('Hilfsfunktionen Sonderfälle', () => {
        it('deepDiffBetweenObjects liefert verschachtelte Unterschiede', () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            expect(iob.deepDiffBetweenObjects({ a: { b: 1 } }, { a: { b: 2 } }, asAdapter(fake))).to.deep.equal({ a: { b: 1 } });
        });

        it('deepDiffBetweenObjects berücksichtigt allowedKeys', () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            expect(iob.deepDiffBetweenObjects({ a: 1, b: 2 }, { a: 0, b: 0 }, asAdapter(fake), ['a'])).to.deep.equal({ a: 1 });
        });

        it('deepDiffBetweenObjects vergleicht reine Arrays und Arrays mit Objekten', () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const adapter = asAdapter(fake);

            expect(iob.deepDiffBetweenObjects({ arr: [1, 2] }, { arr: [1, 3] }, adapter)).to.deep.equal({ arr: [1, 2] });
            expect(iob.deepDiffBetweenObjects({ arr: [{ x: 1 }, { x: 2 }] }, { arr: [{ x: 1 }, { x: 3 }] }, adapter)).to.deep.equal({ arr: [null, { x: 2 }] });
            expect(iob.deepDiffBetweenObjects({ arr: [{ x: 1 }] }, { arr: [] }, adapter)).to.deep.equal({ arr: [{ x: 1 }] });
        });

        it('deepDiffBetweenObjects übernimmt Objekte, wenn der Vergleichswert kein Objekt ist', () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            expect(iob.deepDiffBetweenObjects({ a: { b: 1 } }, { a: 5 }, asAdapter(fake))).to.deep.equal({ a: { b: 1 } });
        });

        it('deepDiffBetweenObjects protokolliert Fehler in der Schleife ohne zu werfen', () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            iob.deepDiffBetweenObjects({ a: 1 }, null, asAdapter(fake));

            expect(fake.log.error).to.have.been.called;
        });

        it('deepDiffBetweenObjects protokolliert einen Fehler außerhalb der Schleife und liefert das Objekt', () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            let calls = 0;
            // Der Getter wirft nur beim ersten Zugriff, damit die Fehlermeldung selbst (JSON.stringify) nicht erneut fehlschlägt
            const flaky = {
                get a(): number {
                    calls += 1;
                    if (calls === 1) {
                        throw new Error('kaputt');
                    }
                    return 1;
                },
            };

            const result = iob.deepDiffBetweenObjects(flaky, {}, asAdapter(fake));

            expect(fake.log.error).to.have.been.called;
            expect(result).to.equal(flaky);
        });

        it('_findMissingTranslation meldet fehlende Übersetzungen in verschachtelten Gruppen', () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);
            const obj = {
                gruppe: {
                    untergruppe: {
                        get: () => ({ x: { iobType: 'number', name: 'zz_ohne_uebersetzung' } }),
                    },
                },
            };

            iob._findMissingTranslation(obj);

            expect(fake.log.warn).to.have.been.called;
        });

        it('_findMissingTranslation protokolliert Fehler beim Auslesen einer Gruppe', () => {
            const fake = createTestAdapter();
            const iob = createIob(fake);

            iob._findMissingTranslation({ kaputt: { get: () => { throw new Error('kaputt'); } } });

            expect(fake.log.error).to.have.been.called;
        });
    });

    for (const source of getForecastSources()) {
        describe(`Vorhersage-States (${source.name})`, () => {
            it('legt die Current-States mit Zeitwert an', async () => {
                const fake = createTestAdapter();
                const iob = createIob(fake);
                const current = source.response.current_conditions;

                const changed = await iob.createOrUpdateStates('forecast.current', tree.forecast.current.get(), asData(current), asData(source.response));

                expect(changed).to.equal(true);
                expect(fake.objects.has('forecast.current.temperature')).to.equal(true);
                expect(fake.states.get('forecast.current.timestamp')?.val).to.equal(current.time * 1000);
            });

            it('aktualisiert die Current-States mit updateObject', async () => {
                const fake = createTestAdapter();
                const iob = createIob(fake);
                const current = source.response.current_conditions;
                const definition = tree.forecast.current.get();

                await iob.createOrUpdateStates('forecast.current', definition, asData(current), asData(source.response));
                const changed = await iob.createOrUpdateStates('forecast.current', definition, asData(current), asData(source.response), undefined, false, 'test', true);

                expect(changed).to.equal(false);
            });

            it('legt die Hourly-States an', async () => {
                const fake = createTestAdapter();
                const iob = createIob(fake);
                const hourly = source.response.forecast.hourly[0];

                await iob.createOrUpdateStates('forecast.hourly', tree.forecast.hourly.get(), asData(hourly), asData(source.response));

                expect(fake.objects.has('forecast.hourly.temperature')).to.equal(true);
                expect(fake.objects.has('forecast.hourly.date')).to.equal(true);
                expect(fake.states.get('forecast.hourly.timestamp')?.val).to.equal(hourly.time * 1000);
            });

            it('legt die Daily-States an', async () => {
                const fake = createTestAdapter();
                const iob = createIob(fake);
                const daily = source.response.forecast.daily[0];

                await iob.createOrUpdateStates('forecast.daily', tree.forecast.daily.get(), asData(daily), asData(source.response));

                expect(fake.objects.has('forecast.daily.date')).to.equal(true);
                expect(fake.objects.has('forecast.daily.sunrise')).to.equal(true);
            });
        });
    }
});
