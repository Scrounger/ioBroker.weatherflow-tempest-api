import { myTreeDefinition } from "../../myIob.js";
import * as myHelper from '../../helper.js';
import { ForeCastHourly } from "../../api/wft-types-forecast.js";
import { ApiEndpoints } from "../../api/wft-api.js";
import moment from "moment";

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
                role: 'value.temperature',
            },
            conditions: {
                iobType: 'string',
                role: 'weather.title',
            },
            feels_like: {
                iobType: 'number',
                unit(objDevice: ForeCastHourly, objChannel: ForeCastHourly, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitTemperature;
                },
                role: 'value.temperature.feelslike',
            },
            icon: {
                id: 'icon_url',
                iobType: 'string',
                role: 'weather.icon',
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
                role: 'weather.icon',
                readVal(val: string, adapter: ioBroker.myAdapter, device: ForeCastHourly, channel: ForeCastHourly, id: string) {
                    return adapter.wft.getApiEndpoint(ApiEndpoints.icon, val);
                },
            },
            precip_probability: {
                id: 'precipitation_chance',
                iobType: 'number',
                unit: '%',
                role: 'value.precipitation.chance',
            },
            precip_type: {
                id: 'precipitation_type',
                iobType: 'string',
                role: 'value.precipitation.type',
            },
            relative_humidity: {
                id: 'humidity',
                iobType: 'number',
                unit: '%',
                role: 'value.humidity',
            },
            station_pressure: {
                iobType: 'number',
                unit(objDevice: ForeCastHourly, objChannel: ForeCastHourly, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitPressure;
                },
                role: 'value.pressure',
            },
            sea_level_pressure: {
                id: 'pressure',
                iobType: 'number',
                unit(objDevice: ForeCastHourly, objChannel: ForeCastHourly, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitPressure;
                },
                role: 'value.pressure',
            },
            time: {
                id: 'timestamp',
                iobType: 'number',
                readVal(val: number, adapter: ioBroker.myAdapter, device: ForeCastHourly, channel: ForeCastHourly, id: string) {
                    return val * 1000;
                },
            },
            date: {
                id: 'date',
                iobType: 'string',
                valFromProperty: 'time',
                readVal(val: number, adapter: ioBroker.myAdapter, device: ForeCastHourly, channel: ForeCastHourly, id: string) {
                    return moment(val * 1000).format('ddd DD.MM.YYYY HH:mm');
                },
            },
            uv: {
                iobType: 'number',
                name: 'uv index',
                role: 'value.uv',
            },
            wind_avg: {
                id: 'windAvg',
                iobType: 'number',
                unit(objDevice: ForeCastHourly, objChannel: ForeCastHourly, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitWind;
                },
                role: 'value.speed.wind',
            },
            wind_direction: {
                id: 'windDirection',
                iobType: 'number',
                unit: '°',
                role: 'weather.direction.wind',
            },
            wind_direction_cardinal: {
                id: 'windDirectionCardinal',
                iobType: 'string',
                role: 'weather.direction.wind',
            },
            wind_gust: {
                id: 'windGust',
                iobType: 'number',
                unit(objDevice: ForeCastHourly, objChannel: ForeCastHourly, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitWind;
                },
                role: 'value.speed.wind.gust',
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