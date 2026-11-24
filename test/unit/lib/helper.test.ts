import { expect } from 'chai';
import { getAllIdsOfTreeDefinition, getAllKeysOfTreeDefinition, zeroPad } from '../../../src/lib/helper.js';
import { forecast } from '../../../src/lib/tree/index.js';
import { type LooseDef } from '../helpers/fakeAdapter.js';

type TreeDef = Parameters<typeof getAllKeysOfTreeDefinition>[0][string];

describe('lib/helper.ts', () => {
    describe('zeroPad', () => {
        it('füllt Zahlen mit führenden Nullen auf die gewünschte Länge auf', () => {
            expect(zeroPad(5, 3)).to.equal('005');
            expect(zeroPad('7', 2)).to.equal('07');
        });

        it('lässt Werte unverändert, die bereits lang genug sind', () => {
            expect(zeroPad(123, 2)).to.equal('123');
            expect(zeroPad(10, 2)).to.equal('10');
        });
    });

    describe('getAllKeysOfTreeDefinition', () => {
        it('liefert Objektschlüssel und die Ziele von valFromProperty', () => {
            const keys = getAllKeysOfTreeDefinition({
                date: { id: 'date', valFromProperty: 'time' } as TreeDef,
            });

            expect(keys).to.have.members(['date', 'time']);
        });

        it('entfernt .object aus den Schlüsseln', () => {
            const keys = getAllKeysOfTreeDefinition({
                channel: { object: { foo: { id: 'foo' } } } as unknown as TreeDef,
            });

            expect(keys).to.not.include('channel.object');
            expect(keys).to.include('channel');
            expect(keys).to.include('channel.foo');
        });

        it('ignoriert den Schlüssel states', () => {
            const keys = getAllKeysOfTreeDefinition({
                st: { id: 'st', states: { 0: 'aus', 1: 'an' } } as unknown as TreeDef,
            });

            expect(keys).to.deep.equal(['st']);
        });

        it('liefert für den echten forecast-Baum keine Duplikate', () => {
            const keys = getAllKeysOfTreeDefinition(forecast.get() as LooseDef);

            expect(keys).to.deep.equal([...new Set(keys)]);
            expect(keys).to.include('hourly');
            expect(keys).to.include('daily');
        });
    });

    describe('getAllIdsOfTreeDefinition', () => {
        it('verwendet idChannel für Kanäle und id für Zustände', () => {
            const ids = getAllIdsOfTreeDefinition({
                ch: {
                    idChannel: 'ch',
                    value: { id: 'state1', iobType: 'number' } as unknown as TreeDef,
                } as unknown as TreeDef,
            });

            expect(ids).to.deep.equal(['ch', 'ch.state1']);
        });

        it('überspringt Definitionen mit required', () => {
            const ids = getAllIdsOfTreeDefinition({
                wanted: { id: 'state', required: { x: true } } as unknown as TreeDef,
            });

            expect(ids).to.not.include('state');
            expect(ids).to.not.include('wanted');
        });

        it('liefert für den echten forecast-Baum die Kanal-IDs', () => {
            const ids = getAllIdsOfTreeDefinition(forecast.get() as LooseDef);

            expect(ids).to.include('hourly');
            expect(ids).to.include('daily');
        });
    });
});
