/**
 * In-memory replacement for the ioBroker adapter instance used by the unit tests.
 *
 * Only the members that `src/` uses are implemented. Object and state ids are relative to the namespace
 * (`forecast.current.temperature`), the same way the adapter addresses them.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sinon from 'sinon';
import { WftApi } from '../../../src/lib/api/wft-api.js';

export const TEST_NAMESPACE = 'weatherflow-tempest-api.0';

/** Admin directory with the real translation files (used by `utils.I18n.init`). */
export const ADMIN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'admin');

/** Loose tree definition, used to call the functions of the tree definitions without type gymnastics. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LooseDef = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StoredObject = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StoredState = Record<string, any>;

const isPlainObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Test configuration with valid defaults (matches `io-package.json`). */
export function createTestConfig(overrides: Partial<ioBroker.AdapterConfig> = {}): ioBroker.AdapterConfig {
    return {
        stationId: '12345',
        accessToken: 'test-token',
        unitTemperature: 'c',
        unitWind: 'kph',
        unitPressure: 'mb',
        unitPrecipitation: 'mm',
        unitDistance: 'km',
        currentEnabled: true,
        hourlyEnabled: true,
        hourlyMax: 1000,
        dailyEnabled: true,
        dailyMax: 1000,
        updateCron: '1,16,31,46 * * * *',
        ...overrides,
    };
}

/** Creates an in-memory adapter. `objects` and `states` can be inspected directly by the tests. */
export function createFakeAdapter(configOverrides: Partial<ioBroker.AdapterConfig> = {}) {
    const objects = new Map<string, StoredObject>();
    const states = new Map<string, StoredState>();
    const subscribed: string[] = [];

    const writeState = (id: string, value: unknown, ack?: boolean): { id: string; notChanged: boolean } => {
        const prev = states.get(id);
        // an object without `val` (e.g. `{ ack: true }`) is a partial update, like in ioBroker
        const partial = isPlainObject(value) ? { ...value } : { val: value };
        const next: StoredState = { ...prev, ...partial };

        if (ack !== undefined) {
            next.ack = ack;
        }

        const notChanged = prev !== undefined && JSON.stringify(prev.val) === JSON.stringify(next.val);
        states.set(id, next);

        return { id, notChanged };
    };

    const log = {
        level: 'info' as string,
        silly: sinon.spy(),
        debug: sinon.spy(),
        info: sinon.spy(),
        warn: sinon.spy(),
        error: sinon.spy(),
    };

    return {
        namespace: TEST_NAMESPACE,
        name: 'weatherflow-tempest-api',
        language: 'en' as string,
        dateFormat: 'DD.MM.YYYY',
        connected: true,
        config: createTestConfig(configOverrides),
        log,
        objects,
        states,
        subscribed,

        objectExists: async (id: string): Promise<boolean> => objects.has(id),

        getObjectAsync: async (id: string): Promise<StoredObject | null> => objects.get(id) ?? null,

        setObjectNotExistsAsync: async (id: string, obj: StoredObject): Promise<{ id: string } | undefined> => {
            if (objects.has(id)) {
                return undefined;
            }
            objects.set(id, obj);
            return { id };
        },

        setObjectAsync: async (id: string, obj: StoredObject): Promise<{ id: string }> => {
            objects.set(id, obj);
            return { id };
        },

        extendObject: async (id: string, obj: StoredObject): Promise<{ id: string }> => {
            const existing = objects.get(id) ?? {};
            objects.set(id, { ...existing, ...obj, common: { ...existing.common, ...obj.common } });
            return { id };
        },

        delObjectAsync: async (id: string, options?: { recursive?: boolean }): Promise<void> => {
            const matches = (key: string): boolean => key === id || (options?.recursive === true && key.startsWith(`${id}.`));

            for (const key of [...objects.keys()]) {
                if (matches(key)) {
                    objects.delete(key);
                }
            }
            for (const key of [...states.keys()]) {
                if (matches(key)) {
                    states.delete(key);
                }
            }
        },

        getStateAsync: async (id: string): Promise<StoredState | null> => states.get(id) ?? null,

        setStateChangedAsync: async (id: string, value: unknown, ack?: boolean): Promise<{ id: string; notChanged: boolean }> => writeState(id, value, ack),

        setState: async (id: string, value: unknown, ack?: boolean): Promise<{ id: string; notChanged: boolean }> => writeState(id, value, ack),

        subscribeStatesAsync: async (pattern: string): Promise<void> => {
            subscribed.push(pattern);
        },

        setTimeout: sinon.spy((callback: () => void, ms: number) => setTimeout(callback, ms)),

        clearTimeout: sinon.spy((timer?: ReturnType<typeof setTimeout>) => clearTimeout(timer)),
    };
}

export type FakeAdapter = ReturnType<typeof createFakeAdapter>;

/** Casts the fake adapter to the adapter type expected by `src/` (test-only). */
export function asAdapter(fake: object): ioBroker.myAdapter {
    return fake as unknown as ioBroker.myAdapter;
}

/** Fake adapter with a `WftApi` instance on `wft`, as the adapter has it after `onReady`. */
export function createTestAdapter(configOverrides: Partial<ioBroker.AdapterConfig> = {}): FakeAdapter & { wft: WftApi } {
    const fake = createFakeAdapter(configOverrides);
    return Object.assign(fake, { wft: new WftApi(asAdapter(fake)) });
}
