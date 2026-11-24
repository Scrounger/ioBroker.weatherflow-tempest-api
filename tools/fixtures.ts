/**
 * Location of the local fixtures recorded from the real WeatherFlow API (git-ignored).
 *
 * The WeatherFlow responses have no version field, so the fixtures are not split by version as in the UniFi project.
 * Layout: `test/fixtures/local/api/<endpoint>.json`.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Root of all local fixtures (git-ignored). */
export const FIXTURE_ROOT = fileURLToPath(new URL('../test/fixtures/local/', import.meta.url));

/** Recorded API responses, one file per endpoint. */
export const API_FIXTURE_DIR = path.join(FIXTURE_ROOT, 'api');
