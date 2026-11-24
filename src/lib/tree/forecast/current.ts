import { ApiEndpoints } from "../../api/wft-api.js";
import { ForeCastCurrent } from "../../api/wft-types-forecast.js";
import * as myHelper from '../../helper.js';
import { myTreeDefinition } from "../../myIob.js";

export namespace current {
    let keys: string[] | undefined = undefined;

    export const idChannel = 'forecast.current';

    export function get(): { [key: string]: myTreeDefinition<any, ForeCastCurrent, ioBroker.myAdapter> } {
        return {
            air_density: {
                id: 'airDensity',
                iobType: 'number',
                unit: 'kg/m3',
            },
            air_temperature: {
                id: 'temperature',
                iobType: 'number',
                unit(objDevice: ForeCastCurrent, objChannel: ForeCastCurrent, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitTemperature;
                },
                role: 'value.temperature',
            },
            brightness: {
                iobType: 'number',
                unit: 'Lux'
            },
            conditions: {
                iobType: 'string',
                role: 'weather.title',
            },
            dew_point: {
                id: 'dewPoint',
                iobType: 'number',
                unit(objDevice: ForeCastCurrent, objChannel: ForeCastCurrent, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitTemperature;
                },
                role: 'value.temperature.dewpoint',
            },
            feels_like: {
                iobType: 'number',
                unit(objDevice: ForeCastCurrent, objChannel: ForeCastCurrent, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitTemperature;
                },
                role: 'value.temperature.feelslike',
            },
            icon: {
                id: 'icon_url',
                iobType: 'string',
                readVal(val: string, adapter: ioBroker.myAdapter, device: ForeCastCurrent, channel: ForeCastCurrent, id: string) {
                    return adapter.wft.getApiEndpoint(ApiEndpoints.icon, val);
                },
                role: 'url.icon',
            },
            lightning_strike_count_last_1hr: {
                iobType: 'number',
            },
            lightning_strike_count_last_3hr: {
                iobType: 'number',
            },
            lightning_strike_last_distance: {
                iobType: 'number',
                unit: 'km',
            },
            lightning_strike_last_distance_msg: {
                iobType: 'string',
            },
            lightning_strike_last_epoch: {
                id: 'lightning_strike_last_timestamp',
                iobType: 'number',
                readVal(val: number, adapter: ioBroker.Adapter | ioBroker.myAdapter, device: ForeCastCurrent, channel: ForeCastCurrent, id: string) {
                    return val * 1000;
                },
            },
            precip_accum_local_day: {
                id: 'precipitation_accum_today',
                iobType: 'number',
                unit(objDevice: ForeCastCurrent, objChannel: ForeCastCurrent, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitPrecipitation;
                },
                role: 'value.precipitation.today',
            },
            precip_accum_local_yesterday: {
                id: 'precipitation_accum_yesterday',
                iobType: 'number',
                unit(objDevice: ForeCastCurrent, objChannel: ForeCastCurrent, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitPrecipitation;
                },
                role: 'value.precipitation',
            },
            precip_minutes_local_day: {
                id: 'precipitation_duration_today',
                iobType: 'number',
                unit: 'Min.',
            },
            precip_minutes_local_yesterday: {
                id: 'precipitation_duration_yesterday',
                iobType: 'number',
                unit: 'Min.',
            },
            precip_probability: {
                id: 'precipitation_chance',
                iobType: 'number',
                unit: '%',
                role: 'value.precipitation.chance',
            },
            pressure_trend: {
                iobType: 'string'
            },
            relative_humidity: {
                id: 'humidity',
                iobType: 'number',
                unit: '%',
                role: 'value.humidity',
            },
            sea_level_pressure: {
                id: 'pressure',
                iobType: 'number',
                unit(objDevice: ForeCastCurrent, objChannel: ForeCastCurrent, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitPressure;
                },
                role: 'value.pressure',
            },
            solar_radiation: {
                id: 'solarRadiation',
                iobType: 'number',
                unit: 'W/m2',
                role: 'value.radiation',
            },
            station_pressure: {
                iobType: 'number',
                unit(objDevice: ForeCastCurrent, objChannel: ForeCastCurrent, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitPressure;
                },
                role: 'value.pressure',
            },
            time: {
                id: 'timestamp',
                iobType: 'number',
                readVal(val: number, adapter: ioBroker.Adapter | ioBroker.myAdapter, device: ForeCastCurrent, channel: ForeCastCurrent, id: string) {
                    return val * 1000;
                },
            },
            uv: {
                iobType: 'number',
                name: 'uv index',
                role: 'value.uv',
            },
            wet_bulb_globe_temperature: {
                id: 'wet_bulb_globe_temperature',
                iobType: 'number',
                unit(objDevice: ForeCastCurrent, objChannel: ForeCastCurrent, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitTemperature;
                },
            },
            wet_bulb_temperature: {
                id: 'wet_bulb_temperature',
                iobType: 'number',
                unit(objDevice: ForeCastCurrent, objChannel: ForeCastCurrent, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitTemperature;
                },
            },
            wind_avg: {
                id: 'windAvg',
                iobType: 'number',
                unit(objDevice: ForeCastCurrent, objChannel: ForeCastCurrent, adapter: ioBroker.myAdapter) {
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
                unit(objDevice: ForeCastCurrent, objChannel: ForeCastCurrent, adapter: ioBroker.myAdapter) {
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