import * as myHelper from '../../helper.js';
export var current;
(function (current) {
    let keys = undefined;
    current.idChannel = 'forecast.current';
    function get() {
        return {
            air_density: {
                id: 'airDensity',
                iobType: 'number',
                unit: 'kg/m3',
            },
            air_temperature: {
                id: 'temperature',
                iobType: 'number',
                unit(objDevice, objChannel, adapter) {
                    return adapter.config.unitTemperature;
                },
                role: 'value.temperature',
            },
            brightness: {
                iobType: 'number',
                unit: 'Lux'
            },
            dew_point: {
                id: 'dewPoint',
                iobType: 'number',
                unit(objDevice, objChannel, adapter) {
                    return adapter.config.unitTemperature;
                },
                role: 'value.temperature.dewpoint',
            },
            feels_like: {
                iobType: 'number',
                unit(objDevice, objChannel, adapter) {
                    return adapter.config.unitTemperature;
                },
                role: 'value.temperature.feelslike',
            },
            precip_accum_local_day: {
                id: 'precipitation_accum_today',
                iobType: 'number',
                unit(objDevice, objChannel, adapter) {
                    return adapter.config.unitPrecipitation;
                },
                role: 'value.precipitation.today',
            },
            precip_accum_local_yesterday: {
                id: 'precipitation_accum_yesterday',
                iobType: 'number',
                unit(objDevice, objChannel, adapter) {
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
                unit(objDevice, objChannel, adapter) {
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
                unit(objDevice, objChannel, adapter) {
                    return adapter.config.unitPressure;
                },
                role: 'value.pressure',
            },
            time: {
                id: 'timestamp',
                iobType: 'number',
                readVal(val, adapter, device, channel, id) {
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
                unit(objDevice, objChannel, adapter) {
                    return adapter.config.unitTemperature;
                },
            },
            wet_bulb_temperature: {
                id: 'wet_bulb_temperature',
                iobType: 'number',
                unit(objDevice, objChannel, adapter) {
                    return adapter.config.unitTemperature;
                },
            },
            wind_avg: {
                id: 'windAvg',
                iobType: 'number',
                unit(objDevice, objChannel, adapter) {
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
                unit(objDevice, objChannel, adapter) {
                    return adapter.config.unitWind;
                },
                role: 'value.speed.wind.gust',
            },
        };
    }
    current.get = get;
    function getKeys() {
        if (keys === undefined) {
            keys = myHelper.getAllKeysOfTreeDefinition(get());
            // manual add keys here:
            keys.push(...['fingerprint.computed_engine', 'fingerprint.dev_id_override', 'fingerprint.dev_id', 'fingerprint.has_override']);
        }
        return keys;
    }
    current.getKeys = getKeys;
    function getStateIDs() {
        return myHelper.getAllIdsOfTreeDefinition(get());
    }
    current.getStateIDs = getStateIDs;
})(current || (current = {}));
