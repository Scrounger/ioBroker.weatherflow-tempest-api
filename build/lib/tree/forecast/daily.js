import moment from "moment";
import * as myHelper from '../../helper.js';
import { ApiEndpoints } from "../../api/wft-api.js";
export var daily;
(function (daily) {
    let keys = undefined;
    daily.idChannel = 'forecast.daily';
    function get() {
        return {
            air_temp_high: {
                id: 'temperature_high',
                iobType: 'number',
                unit(objDevice, objChannel, adapter) {
                    return adapter.config.unitTemperature;
                },
            },
            air_temp_low: {
                id: 'temperature_low',
                iobType: 'number',
                unit(objDevice, objChannel, adapter) {
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
                id: 'timestamp',
                iobType: 'number',
                readVal(val, adapter, device, channel, id) {
                    return val * 1000;
                },
            },
            date: {
                id: 'date',
                iobType: 'string',
                valFromProperty: 'day_start_local',
                readVal(val, adapter, device, channel, id) {
                    return moment(val * 1000).format('ddd DD.MM.YYYY');
                },
            },
            icon: {
                id: 'icon_url',
                iobType: 'string',
                role: 'url.icon',
                readVal(val, adapter, device, channel, id) {
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
                readVal(val, adapter, device, channel, id) {
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
                readVal(val, adapter, device, channel, id) {
                    return moment(val * 1000).format('HH:mm');
                },
            },
            sunset: {
                iobType: 'string',
                readVal(val, adapter, device, channel, id) {
                    return moment(val * 1000).format('HH:mm');
                },
            },
        };
    }
    daily.get = get;
    function getKeys() {
        if (keys === undefined) {
            keys = myHelper.getAllKeysOfTreeDefinition(get());
            // manual add keys here:
            keys.push(...['fingerprint.computed_engine', 'fingerprint.dev_id_override', 'fingerprint.dev_id', 'fingerprint.has_override']);
        }
        return keys;
    }
    daily.getKeys = getKeys;
    function getStateIDs() {
        return myHelper.getAllIdsOfTreeDefinition(get());
    }
    daily.getStateIDs = getStateIDs;
})(daily || (daily = {}));
