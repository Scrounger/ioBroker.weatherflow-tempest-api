import { myTreeDefinition } from "../../myIob.js";
import * as myHelper from '../../helper.js';
import { ForeCastHourly } from "../../api/wft-types-forecast.js";
import { ApiEndpoints } from "../../api/wft-api.js";

export namespace hourly {
    let keys: string[] = undefined;

    export const idChannel = 'forecast.hourly';

    export function get(): { [key: string]: myTreeDefinition } {
        return {
            air_temperature: {
                id: 'temperature',
                iobType: 'number',
                unit(objDevice: ForeCastHourly, objChannel: ForeCastHourly, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitTemperature;
                },
            },
            conditions: {
                iobType: 'string',
            },
            feels_like: {
                iobType: 'number',
                unit(objDevice: ForeCastHourly, objChannel: ForeCastHourly, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitTemperature;
                },
            },
            icon: {
                id: 'icon_url',
                iobType: 'string',
                role: 'url.icon',
                readVal(val: string, adapter: ioBroker.myAdapter, device: ForeCastHourly, channel: ForeCastHourly, id: string) {
                    return adapter.wft.getApiEndpoint(ApiEndpoints.icon, val);
                },
            },
            local_day: {
                iobType: 'number',
            },
            local_hour: {
                iobType: 'number',
            },
            precip: {
                id: 'precipitation',
                iobType: 'number',
                unit(objDevice: ForeCastHourly, objChannel: ForeCastHourly, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitPrecipitation;
                },
            },
            precip_icon: {
                id: 'precipitation_icon_url',
                iobType: 'string',
                role: 'url.icon',
                readVal(val: string, adapter: ioBroker.myAdapter, device: ForeCastHourly, channel: ForeCastHourly, id: string) {
                    return adapter.wft.getApiEndpoint(ApiEndpoints.icon, val);
                },
            },
            precip_probability: {
                id: 'precipitation_chance',
                iobType: 'number',
                unit: '%',
            },
            precip_type: {
                id: 'precipitation_type',
                iobType: 'string',
            },
            relative_humidity: {
                id: 'humidity',
                iobType: 'number',
                unit: '%',
            },
            station_pressure: {
                iobType: 'number',
                unit(objDevice: ForeCastHourly, objChannel: ForeCastHourly, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitPressure;
                },
            },
            sea_level_pressure: {
                id: 'pressure',
                iobType: 'number',
                unit(objDevice: ForeCastHourly, objChannel: ForeCastHourly, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitPressure;
                },
            },
            time: {
                id: 'timestamp',
                iobType: 'number',
                readVal(val: number, adapter: ioBroker.myAdapter, device: ForeCastHourly, channel: ForeCastHourly, id: string) {
                    return val * 1000;
                },
            },
            uv: {
                iobType: 'number',
                name: 'uv index',
            },
            wind_avg: {
                id: 'windAvg',
                iobType: 'number',
                unit(objDevice: ForeCastHourly, objChannel: ForeCastHourly, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitWind;
                },
            },
            wind_direction: {
                id: 'windDirection',
                iobType: 'number',
                unit: '°',
            },
            wind_direction_cardinal: {
                id: 'windDirectionCardinal',
                iobType: 'string',
            },
            wind_gust: {
                id: 'windGust',
                iobType: 'number',
                unit(objDevice: ForeCastHourly, objChannel: ForeCastHourly, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitWind;
                },
            },
        }
    }

    export function getKeys(): string[] {
        if (keys === undefined) {
            keys = myHelper.getAllKeysOfTreeDefinition(get());
            // manual add keys here:
            keys.push(...['fingerprint.computed_engine', 'fingerprint.dev_id_override', 'fingerprint.dev_id', 'fingerprint.has_override']);
        }

        return keys
    }

    export function getStateIDs(): string[] {
        return myHelper.getAllIdsOfTreeDefinition(get());
    }
}