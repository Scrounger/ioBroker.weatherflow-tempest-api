import { expect } from 'chai';
import { anonymize, findLeaks, type Secret } from '../../tools/anonymizeFixtures.js';

const secrets: Secret[] = [
    { name: 'access token', value: 'token-abcdef123456' },
    { name: 'station id', value: '98765' },
];

describe('anonymizeFixtures (offline)', function () {
    it('replaces the token and the station id in keys and free text', function () {
        const result = anonymize({ token: 'x', station_id: 98765, note: 'station 98765 token-abcdef123456' }, secrets);

        expect(result).to.deep.equal({ token: '<redacted>', station_id: '<redacted>', note: 'station <redacted> <redacted>' });
    });

    it('replaces the location values with placeholders', function () {
        const result = anonymize({ latitude: 52.52, longitude: 13.4, location_name: 'Zuhause', timezone: 'Europe/Berlin' }, secrets);

        expect(result).to.deep.equal({ latitude: 0, longitude: 0, location_name: 'location', timezone: 'Europe/Berlin' });
    });

    it('does not change the input', function () {
        const input = { latitude: 52.52 };
        anonymize(input, secrets);

        expect(input.latitude).to.equal(52.52);
    });

    it('reports only the names of the secrets that are still present', function () {
        expect(findLeaks('{"a":"token-abcdef123456"}', secrets)).to.deep.equal(['access token']);
        expect(findLeaks('{"a":"<redacted>"}', secrets)).to.deep.equal([]);
    });
});
