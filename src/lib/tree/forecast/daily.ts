import moment from "moment";

import { myTreeDefinition } from "../../myIob.js";
import * as myHelper from '../../helper.js';
import { ForeCastDaily } from "../../api/wft-types-forecast.js";
import { ApiEndpoints } from "../../api/wft-api.js";

export namespace daily {
    let keys: string[] = undefined;

    export const idChannel = 'forecast.daily';

    export function get(): { [key: string]: myTreeDefinition } {
        return {
            air_temp_high: {
                id: 'temperature_high',
                iobType: 'number',
                unit(objDevice: ForeCastDaily, objChannel: ForeCastDaily, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitTemperature;
                },
                role: 'value.temperature.max',
            },
            air_temp_low: {
                id: 'temperature_low',
                iobType: 'number',
                unit(objDevice: ForeCastDaily, objChannel: ForeCastDaily, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitTemperature;
                },
                role: 'value.temperature.min',
            },
            conditions: {
                iobType: 'string',
                role: 'weather.title',
            },
            day_num: {
                iobType: 'number',
            },
            day_start_local: {
                id: 'timestamp',
                iobType: 'number',
                readVal(val: number, adapter: ioBroker.myAdapter, device: ForeCastDaily, channel: ForeCastDaily, id: string) {
                    return val * 1000;
                },
            },
            date: {
                id: 'date',
                iobType: 'string',
                valFromProperty: 'day_start_local',
                readVal(val: number, adapter: ioBroker.myAdapter, device: ForeCastDaily, channel: ForeCastDaily, id: string) {
                    return moment(val * 1000).format('ddd DD.MM.YYYY');
                },
            },
            icon: {
                id: 'icon_url',
                iobType: 'string',
                readVal(val: string, adapter: ioBroker.myAdapter, device: ForeCastDaily, channel: ForeCastDaily, id: string) {
                    return adapter.wft.getApiEndpoint(ApiEndpoints.icon, val);
                },
                role: 'weather.icon',
            },
            month_num: {
                iobType: 'number',
            },
            precip_icon: {
                id: 'precipitation_icon_url',
                iobType: 'string',
                readVal(val: string, adapter: ioBroker.myAdapter, device: ForeCastDaily, channel: ForeCastDaily, id: string) {
                    return adapter.wft.getApiEndpoint(ApiEndpoints.icon, val);
                },
                role: 'weather.icon',
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
            sunrise: {
                iobType: 'string',
                readVal(val: number, adapter: ioBroker.myAdapter, device: ForeCastDaily, channel: ForeCastDaily, id: string) {
                    return moment(val * 1000).format('HH:mm');
                },
                role: 'date.sunrise',
            },
            sunset: {
                iobType: 'string',
                readVal(val: number, adapter: ioBroker.myAdapter, device: ForeCastDaily, channel: ForeCastDaily, id: string) {
                    return moment(val * 1000).format('HH:mm');
                },
                role: 'date.sunset',
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