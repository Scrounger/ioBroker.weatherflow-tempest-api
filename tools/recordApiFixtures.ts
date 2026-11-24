/**
 * Records the `better_forecast` response of the WeatherFlow API as a local, anonymized fixture.
 *
 * Writes `test/fixtures/local/api/better_forecast.json` with the envelope `{ endpoint, recordedAt, anonymized, response }`.
 *
 * - Read only: one GET request for the station with the access token from `.env`.
 * - The response is checked against the fields the adapter reads before anything is written.
 * - Anonymized with `anonymizeFixtures.ts`. Nothing is written if a secret is still found in the file.
 *
 * Usage: `npm run record:api -- [--dry-run] [--no-anonymize]`
 * - `--dry-run`: fetches and checks everything, prints the target path, writes nothing.
 * - `--no-anonymize`: writes the data unchanged, including the location. Use only for local debugging, never commit it.
 *
 * Required in `.env`: `WFT_ACCESS_TOKEN`, `WFT_STATION_ID`.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expectForecastStructure } from '../test/tools/forecastStructure.js';
import { createApi, getLiveConfig } from '../test/tools/wft-session.js';
import { anonymize, findLeaks, type Secret } from './anonymizeFixtures.js';
import { API_FIXTURE_DIR } from './fixtures.js';

const DRY_RUN = process.argv.includes('--dry-run');
const NO_ANONYMIZE = process.argv.includes('--no-anonymize');

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ENDPOINT = 'better_forecast';

async function main(): Promise<number> {
    const config = getLiveConfig();
    if (!config) {
        console.error('Missing credentials: WFT_ACCESS_TOKEN and WFT_STATION_ID must be set in .env.');
        return 1;
    }

    const response = await createApi(config).getForeCast();
    if (!response) {
        console.error('The API returned no forecast. Nothing was written.');
        return 1;
    }

    try {
        expectForecastStructure(response);
    } catch (error: unknown) {
        console.error(`The forecast does not have the expected structure. Nothing was written. ${error instanceof Error ? error.message : String(error)}`);
        return 1;
    }

    const secrets: Secret[] = [
        { name: 'access token', value: config.accessToken },
        { name: 'station id', value: config.stationId },
    ];

    if (NO_ANONYMIZE) {
        console.warn('--no-anonymize: the data contains the location, do not commit or share it.');
    }

    const content = `${JSON.stringify(
        {
            endpoint: ENDPOINT,
            recordedAt: new Date().toISOString(),
            anonymized: !NO_ANONYMIZE,
            response: NO_ANONYMIZE ? response : anonymize(response, secrets),
        },
        null,
        2,
    )}\n`;

    if (!NO_ANONYMIZE) {
        const leaks = findLeaks(content, secrets);
        if (leaks.length > 0) {
            console.error(`Aborted, the data still contains: ${leaks.join(', ')}. Nothing was written.`);
            return 1;
        }
    }

    const outputFile = path.join(API_FIXTURE_DIR, `${ENDPOINT}.json`);
    const target = path.relative(ROOT, outputFile);
    const summary = `${response.forecast.hourly.length} hourly, ${response.forecast.daily.length} daily entries`;

    if (DRY_RUN) {
        const action = existsSync(outputFile) ? 'would overwrite' : 'would create';
        console.log(`Dry run, nothing written. (${summary}): ${action} ${target}`);
        return 0;
    }

    mkdirSync(path.dirname(outputFile), { recursive: true });
    writeFileSync(outputFile, content, 'utf8');
    console.log(`(${summary}): written to ${target}`);
    return 0;
}

main().then(
    (code: number): void => process.exit(code),
    (error: unknown): void => {
        console.error(`Recording failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    },
);
