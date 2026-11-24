/**
 * Shared helpers for the live tests and the fixture recorder against the real WeatherFlow API.
 *
 * - Credentials come from the `.env` in the project directory (`WFT_ACCESS_TOKEN`, `WFT_STATION_ID`).
 * - Values are never printed. Log lines are redacted, because the request URL contains the access token.
 * - Without a complete `.env`, getLiveConfig() returns undefined and the live tests are skipped.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WftApi } from '../../src/lib/api/wft-api.js';

export interface LiveConfig {
    accessToken: string;
    stationId: string;
}

/** Units the adapter uses by default (see io-package.json). The live tests and the recorder use the same units. */
export const FORECAST_UNITS = {
    unitTemperature: 'c',
    unitWind: 'kph',
    unitPressure: 'mb',
    unitPrecipitation: 'mm',
    unitDistance: 'km',
};

const REDACTED = '<redacted>';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const envFile = path.join(root, '.env');

/**
 * @returns the credentials from the .env, or undefined if they are incomplete
 */
export function getLiveConfig(): LiveConfig | undefined {
    if (!existsSync(envFile)) {
        return undefined;
    }

    process.loadEnvFile(envFile);

    const { WFT_ACCESS_TOKEN: accessToken, WFT_STATION_ID: stationId } = process.env;

    if (!accessToken || !stationId) {
        return undefined;
    }

    return { accessToken, stationId };
}

/**
 * @param config credentials for the API
 * @returns a new API client that uses the adapter units and redacts the access token in log output
 */
export function createApi(config: LiveConfig): WftApi {
    const redact = (message: string): string => message.split(config.accessToken).join(REDACTED);

    const log = {
        silly: (): void => { },
        debug: (): void => { },
        info: (): void => { },
        warn: (message: string): void => console.warn(`[wft] ${redact(message)}`),
        error: (message: string): void => console.error(`[wft] ${redact(message)}`),
    };

    // WftApi only needs the config values, the logger and the timer functions of the adapter
    const adapter = {
        config: {
            stationId: config.stationId,
            accessToken: config.accessToken,
            ...FORECAST_UNITS,
        },
        log,
        setTimeout: (callback: () => void, ms: number): ReturnType<typeof setTimeout> => setTimeout(callback, ms),
        clearTimeout: (timer: ReturnType<typeof setTimeout>): void => clearTimeout(timer),
    };

    return new WftApi(adapter as unknown as ioBroker.myAdapter);
}
