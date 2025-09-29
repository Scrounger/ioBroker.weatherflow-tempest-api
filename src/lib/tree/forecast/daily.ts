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
            },
            air_temp_low: {
                id: 'temperature_low',
                iobType: 'number',
                unit(objDevice: ForeCastDaily, objChannel: ForeCastDaily, adapter: ioBroker.myAdapter) {
                    return adapter.config.unitTemperature;
                },
            },
            conditions: {
                iobType: 'string',
            },
            day_num: {
                iobType: 'number',
            },
            day_start_local: {
                iobType: 'number',
            },
            icon: {
                id: 'icon_url',
                iobType: 'string',
                role: 'url.icon',
                readVal(val: string, adapter: ioBroker.myAdapter, device: ForeCastDaily, channel: ForeCastDaily, id: string) {
                    return adapter.wft.getApiEndpoint(ApiEndpoints.icon, val);
                },
            },
            month_num: {
                iobType: 'number',
            },
            precip_icon: {
                id: 'precipitation_icon_url',
                iobType: 'string',
                role: 'url.icon',
                readVal(val: string, adapter: ioBroker.myAdapter, device: ForeCastDaily, channel: ForeCastDaily, id: string) {
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
            sunrise: {
                iobType: 'string',
                readVal(val: number, adapter: ioBroker.myAdapter, device: ForeCastDaily, channel: ForeCastDaily, id: string) {
                    return moment(val * 1000).format('HH:mm');
                },
            },
            sunset: {
                iobType: 'string',
                readVal(val: number, adapter: ioBroker.myAdapter, device: ForeCastDaily, channel: ForeCastDaily, id: string) {
                    return moment(val * 1000).format('HH:mm');
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