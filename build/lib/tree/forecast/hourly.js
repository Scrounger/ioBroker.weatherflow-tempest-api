import * as myHelper from '../../helper.js';
import { ApiEndpoints } from "../../api/wft-api.js";
import moment from "moment";
export var hourly;
(function (hourly) {
    let keys = undefined;
    hourly.idChannel = 'forecast.hourly';
    function get() {
        return {
            air_temperature: {
                id: 'temperature',
                iobType: 'number',
                unit(objDevice, objChannel, adapter) {
                    return adapter.config.unitTemperature;
                },
            },
            conditions: {
                iobType: 'string',
            },
            feels_like: {
                iobType: 'number',
                unit(objDevice, objChannel, adapter) {
                    return adapter.config.unitTemperature;
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
            local_day: {
                iobType: 'number',
            },
            local_hour: {
                iobType: 'number',
            },
            precip: {
                id: 'precipitation',
                iobType: 'number',
                unit(objDevice, objChannel, adapter) {
                    return adapter.config.unitPrecipitation;
                },
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
            relative_humidity: {
                id: 'humidity',
                iobType: 'number',
                unit: '%',
            },
            station_pressure: {
                iobType: 'number',
                unit(objDevice, objChannel, adapter) {
                    return adapter.config.unitPressure;
                },
            },
            sea_level_pressure: {
                id: 'pressure',
                iobType: 'number',
                unit(objDevice, objChannel, adapter) {
                    return adapter.config.unitPressure;
                },
            },
            time: {
                id: 'timestamp',
                iobType: 'number',
                readVal(val, adapter, device, channel, id) {
                    return val * 1000;
                },
            },
            date: {
                id: 'date',
                iobType: 'string',
                valFromProperty: 'time',
                readVal(val, adapter, device, channel, id) {
                    return moment(val * 1000).format('ddd DD.MM.YYYY HH:mm');
                },
            },
            uv: {
                iobType: 'number',
                name: 'uv index',
            },
            wind_avg: {
                id: 'windAvg',
                iobType: 'number',
                unit(objDevice, objChannel, adapter) {
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
                unit(objDevice, objChannel, adapter) {
                    return adapter.config.unitWind;
                },
            },
        };
    }
    hourly.get = get;
    function getKeys() {
        if (keys === undefined) {
            keys = myHelper.getAllKeysOfTreeDefinition(get());
            // manual add keys here:
            keys.push(...['fingerprint.computed_engine', 'fingerprint.dev_id_override', 'fingerprint.dev_id', 'fingerprint.has_override']);
        }
        return keys;
    }
    hourly.getKeys = getKeys;
    function getStateIDs() {
        return myHelper.getAllIdsOfTreeDefinition(get());
    }
    hourly.getStateIDs = getStateIDs;
})(hourly || (hourly = {}));
