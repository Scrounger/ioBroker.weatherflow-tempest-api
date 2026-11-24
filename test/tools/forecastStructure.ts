/**
 * Checks that a WeatherFlow `better_forecast` response has the fields the adapter reads (see `src/lib/api/wft-types-forecast.ts`).
 * Shared by the live tests and the offline fixture tests.
 */
import { expect } from 'chai';

interface FieldGroups {
    numbers?: readonly string[];
    strings?: readonly string[];
    booleans?: readonly string[];
}

const CURRENT_CONDITIONS: FieldGroups = {
    numbers: [
        'air_density', 'air_temperature', 'brightness', 'delta_t', 'dew_point', 'feels_like',
        'lightning_strike_count_last_1hr', 'lightning_strike_count_last_3hr', 'lightning_strike_last_distance', 'lightning_strike_last_epoch',
        'precip_accum_local_day', 'precip_accum_local_yesterday', 'precip_minutes_local_day', 'precip_minutes_local_yesterday',
        'relative_humidity', 'sea_level_pressure', 'solar_radiation', 'station_pressure', 'time', 'uv',
        'wet_bulb_globe_temperature', 'wet_bulb_temperature', 'wind_avg', 'wind_direction', 'wind_gust',
    ],
    strings: ['lightning_strike_last_distance_msg', 'pressure_trend', 'wind_direction_cardinal'],
    booleans: ['is_precip_local_day_rain_check', 'is_precip_local_yesterday_rain_check'],
};

const HOURLY: FieldGroups = {
    numbers: [
        'air_temperature', 'feels_like', 'local_day', 'local_hour', 'precip', 'precip_probability', 'relative_humidity',
        'sea_level_pressure', 'station_pressure', 'time', 'uv', 'wind_avg', 'wind_direction', 'wind_gust',
    ],
    strings: ['conditions', 'icon', 'precip_icon', 'precip_type', 'wind_direction_cardinal'],
};

const DAILY: FieldGroups = {
    numbers: [
        'air_temp_high', 'air_temp_low', 'day_num', 'day_start_local', 'month_num', 'precip_probability', 'sunrise', 'sunset',
    ],
    strings: ['conditions', 'icon', 'precip_icon', 'precip_type'],
};

/**
 * Checks that an object has the listed fields with the expected types.
 *
 * @param entry object to check
 * @param label name used in assertion messages
 * @param groups expected fields per type
 */
function expectFields(entry: unknown, label: string, groups: FieldGroups): void {
    expect(entry, label).to.be.an('object');
    const record = entry as Record<string, unknown>;

    for (const field of groups.numbers ?? []) {
        expect(record[field], `${label}.${field}`).to.be.a('number');
    }
    for (const field of groups.strings ?? []) {
        expect(record[field], `${label}.${field}`).to.be.a('string');
    }
    for (const field of groups.booleans ?? []) {
        expect(record[field], `${label}.${field}`).to.be.a('boolean');
    }
}

/**
 * Asserts the structure of a `better_forecast` response.
 *
 * @param response parsed response of the API
 */
export function expectForecastStructure(response: unknown): void {
    expectFields(response, 'response', {
        numbers: ['latitude', 'longitude', 'timezone_offset_minutes'],
        strings: ['location_name', 'timezone'],
    });

    const data = response as Record<string, unknown>;
    expect(data.units, 'units').to.be.an('object');
    expectFields(data.status, 'status', { numbers: ['status_code'], strings: ['status_message'] });
    expectFields(data.current_conditions, 'current_conditions', CURRENT_CONDITIONS);

    expect(data.forecast, 'forecast').to.be.an('object');
    const { hourly, daily } = data.forecast as Record<string, unknown>;

    expect(hourly, 'forecast.hourly').to.be.an('array').that.is.not.empty;
    expect(daily, 'forecast.daily').to.be.an('array').that.is.not.empty;

    (hourly as unknown[]).forEach((entry: unknown, index: number): void => expectFields(entry, `forecast.hourly[${index}]`, HOURLY));
    (daily as unknown[]).forEach((entry: unknown, index: number): void => expectFields(entry, `forecast.daily[${index}]`, DAILY));
}
