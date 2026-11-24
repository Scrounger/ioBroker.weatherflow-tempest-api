/**
 * Anonymization for recorded WeatherFlow API responses (local fixtures only).
 *
 * - Values under secret-like keys (`token`, `station_id`) are replaced by `<redacted>`.
 * - Values under location keys (`latitude`, `longitude`, `location_name`, `elevation`) are replaced by neutral
 *   placeholders: numbers become `0`, strings become `location`.
 * - Literal secrets (access token, station id) are removed from all strings, so they do not leak through free text either.
 *
 * The input is never changed, `anonymize()` returns a new value.
 */

/** A literal secret to remove from the data. */
export interface Secret {
    /** Label for messages, e.g. `access token`. The value itself is never printed. */
    name: string;
    value: string;
}

const REDACTED = '<redacted>';
const LOCATION_PLACEHOLDER = 'location';
const SECRET_KEY = /token|^station_?id$/i;
const LOCATION_KEY = /^(latitude|longitude|location_name|elevation)$/;
// Shorter values would match too much of the text, e.g. a station id of "1"
const MIN_SECRET_LENGTH = 4;

/**
 * Replaces every literal secret in a string.
 *
 * @param text text to process
 * @param secrets literal secrets to remove
 */
function replaceSecrets(text: string, secrets: Secret[]): string {
    return secrets
        .filter(({ value }) => value.length >= MIN_SECRET_LENGTH)
        .reduce((result, { value }) => result.split(value).join(REDACTED), text);
}

/**
 * Anonymizes one value. The key is the name of the field the value belongs to, if any.
 *
 * @param value value to process
 * @param secrets literal secrets to remove
 * @param key name of the field the value belongs to
 */
function anonymizeValue(value: unknown, secrets: Secret[], key?: string): unknown {
    if (key !== undefined && SECRET_KEY.test(key)) {
        return REDACTED;
    }

    if (key !== undefined && LOCATION_KEY.test(key)) {
        if (typeof value === 'number') {
            return 0;
        }
        if (typeof value === 'string') {
            return LOCATION_PLACEHOLDER;
        }
    }

    if (typeof value === 'string') {
        return replaceSecrets(value, secrets);
    }

    if (Array.isArray(value)) {
        return value.map((item: unknown): unknown => anonymizeValue(item, secrets, key));
    }

    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([childKey, child]): [string, unknown] => [
                childKey,
                anonymizeValue(child, secrets, childKey),
            ]),
        );
    }

    return value;
}

/**
 * Returns an anonymized copy of the value.
 *
 * @param value data to anonymize
 * @param secrets literal secrets to remove
 */
export function anonymize<T>(value: T, secrets: Secret[]): T {
    return anonymizeValue(value, secrets) as T;
}

/**
 * Lists the secrets that are still contained in the content. Only the names are returned, never the values.
 *
 * @param content serialized fixture
 * @param secrets literal secrets to search for
 * @returns names of the secrets that were found
 */
export function findLeaks(content: string, secrets: Secret[]): string[] {
    return secrets
        .filter(({ value }) => value.length >= MIN_SECRET_LENGTH && content.includes(value))
        .map(({ name }) => name);
}
