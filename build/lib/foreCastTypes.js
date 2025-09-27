const commonDef = {
    number: {
        type: 'number',
        read: true,
        write: false,
        role: 'value'
    },
    string: {
        type: 'string',
        read: true,
        write: false,
        role: 'value'
    }
};
export const stateDefinition = {
    air_temperature: {
        id: 'temperature',
        common: { ...commonDef.number, ...{ unit: 'unitTemperature' } },
    },
    air_temp_high: {
        id: 'temperature_high',
        common: { ...commonDef.number, ...{ unit: 'unitTemperature' } },
    },
    air_temp_low: {
        id: 'temperature_low',
        common: { ...commonDef.number, ...{ unit: 'unitTemperature' } },
    },
    conditions: {
        id: 'conditions',
        common: commonDef.string
    },
    feels_like: {
        id: 'feels_like',
        common: { ...commonDef.number, ...{ unit: 'unitTemperature' } }
    },
    icon: {
        id: 'icon',
        common: commonDef.string
    },
    local_day: {
        id: 'local_day',
        common: commonDef.number
    },
    local_hour: {
        id: 'local_hour',
        common: commonDef.number
    },
    day_num: {
        id: 'day_num',
        common: commonDef.number
    },
    month_num: {
        id: 'month_num',
        common: commonDef.number
    },
    precip: {
        id: 'precipitation',
        common: { ...commonDef.number, ...{ unit: 'unitPrecipitation' } }
    },
    precip_icon: {
        id: 'precipitation_icon',
        common: commonDef.string
    },
    precip_probability: {
        id: 'precipitation_chance',
        common: { ...commonDef.number, ...{ unit: '%' } }
    },
    precip_type: {
        id: 'precipitation_type',
        common: commonDef.string
    },
    relative_humidity: {
        id: 'humidity',
        common: { ...commonDef.number, ...{ unit: '%' } }
    },
    station_pressure: {
        id: 'pressure_station',
        common: { ...commonDef.number, ...{ unit: 'unitPressure' } }
    },
    sea_level_pressure: {
        id: 'pressure',
        common: { ...commonDef.number, ...{ unit: 'unitPressure' } }
    },
    pressure_trend: {
        id: 'pressure_trend',
        common: commonDef.string
    },
    time: {
        id: 'date',
        common: commonDef.string
    },
    day_start_local: {
        id: 'date',
        common: commonDef.string
    },
    sunrise: {
        id: 'sunrise',
        common: commonDef.string
    },
    sunset: {
        id: 'sunset',
        common: commonDef.string
    },
    uv: {
        id: 'uv',
        common: { ...commonDef.number, ...{ name: 'uv index' } }
    },
    wind_avg: {
        id: 'windAvg',
        common: { ...commonDef.number, ...{ unit: 'unitWind' } }
    },
    wind_direction: {
        id: 'windDirection',
        common: { ...commonDef.number, ...{ unit: '°' } }
    },
    wind_direction_cardinal: {
        id: 'windDirectionCardinal',
        common: commonDef.string
    },
    wind_gust: {
        id: 'windGust',
        common: { ...commonDef.number, ...{ unit: 'unitWind' } }
    },
    dew_point: {
        id: 'dewPoint',
        common: { ...commonDef.number, ...{ unit: 'unitTemperature' } }
    },
    brightness: {
        id: 'brightness',
        common: { ...commonDef.number, ...{ unit: 'Lux' } }
    },
    air_density: {
        id: 'airDensity',
        common: { ...commonDef.number, ...{ unit: 'kg/m3' } }
    },
    solar_radiation: {
        id: 'solarRadiation',
        common: { ...commonDef.number, ...{ unit: 'W/m2' } }
    },
    wet_bulb_temperature: {
        id: 'wet_bulb_temperature',
        common: { ...commonDef.number, ...{ unit: 'unitTemperature' } }
    },
    wet_bulb_globe_temperature: {
        id: 'wet_bulb_globe_temperature',
        common: { ...commonDef.number, ...{ unit: 'unitTemperature' } }
    },
    precip_minutes_local_day: {
        id: 'precipitation_duration_today',
        common: { ...commonDef.number, ...{ unit: 'Min.' } }
    },
    precip_minutes_local_yesterday: {
        id: 'precipitation_duration_yesterday',
        common: { ...commonDef.number, ...{ unit: 'Min.' } }
    },
    precip_accum_local_day: {
        id: 'precipitation_accum_today',
        common: { ...commonDef.number, ...{ unit: 'unitPrecipitation' } }
    },
    precip_accum_local_yesterday: {
        id: 'precipitation_accum_yesterday',
        common: { ...commonDef.number, ...{ unit: 'unitPrecipitation' } }
    },
    lastUpdate: {
        id: 'lastUpdate',
        common: commonDef.string
    },
    is_precip_local_day_rain_check: {
        ignore: true
    },
    is_precip_local_yesterday_rain_check: {
        ignore: true
    },
    lightning_strike_last_distance_msg: {
        ignore: true
    },
    lightning_strike_count_last_3hr: {
        ignore: true
    },
    lightning_strike_count_last_1hr: {
        ignore: true
    },
    lightning_strike_last_distance: {
        ignore: true
    },
    lightning_strike_last_epoch: {
        ignore: true
    },
    delta_t: {
        ignore: true
    },
};
