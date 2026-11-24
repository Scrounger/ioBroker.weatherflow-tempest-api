import { expect } from 'chai';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { findLeaks, type Secret } from '../../tools/anonymizeFixtures.js';
import { API_FIXTURE_DIR } from '../../tools/fixtures.js';
import { expectForecastStructure } from './forecastStructure.js';
import { getLiveConfig } from './wft-session.js';

interface RecordedFixture {
    endpoint: string;
    recordedAt: string;
    /** False if the fixture was recorded with `--no-anonymize`. */
    anonymized?: boolean;
    response: unknown;
}

interface FixtureFile {
    file: string;
    content: string;
    fixture: RecordedFixture;
}

function readFixtures(): FixtureFile[] {
    if (!existsSync(API_FIXTURE_DIR)) {
        return [];
    }

    return readdirSync(API_FIXTURE_DIR)
        .filter((file: string): boolean => file.endsWith('.json'))
        .map((file: string): FixtureFile => {
            const content = readFileSync(path.join(API_FIXTURE_DIR, file), 'utf8');
            return { file, content, fixture: JSON.parse(content) as RecordedFixture };
        });
}

describe('Recorded API fixtures (offline)', function () {
    before(function () {
        if (readFixtures().length === 0) {
            this.skip();
        }
    });

    it('every file has endpoint, recordedAt and response', () => {
        for (const { file, fixture } of readFixtures()) {
            expect(fixture.endpoint, file).to.equal(path.basename(file, '.json'));
            expect(Number.isNaN(Date.parse(fixture.recordedAt)), file).to.equal(false);
            expect(fixture.response, file).to.not.equal(undefined);
        }
    });

    it('the recorded forecast has the fields the adapter reads', () => {
        const forecast = readFixtures().find(({ fixture }) => fixture.endpoint === 'better_forecast');
        expect(forecast, 'better_forecast.json is missing').to.not.equal(undefined);

        expectForecastStructure(forecast?.fixture.response);
    });

    it('contains no anonymization leaks', function () {
        const anonymized = readFixtures().filter(({ fixture }) => fixture.anonymized !== false);
        if (anonymized.length === 0) {
            this.skip();
        }

        const config = getLiveConfig();
        const secrets: Secret[] = config
            ? [
                { name: 'access token', value: config.accessToken },
                { name: 'station id', value: config.stationId },
            ]
            : [];

        for (const { file, content } of anonymized) {
            expect(findLeaks(content, secrets), file).to.deep.equal([]);
        }
    });
});
