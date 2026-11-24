/**
 * Forecast responses used by the unit tests.
 *
 * - a synthetic sample that always exists (also in CI, where the git-ignored fixtures are absent)
 * - the recorded `better_forecast` fixture, only when it exists locally
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ForeCast, ForeCastCurrent, ForeCastDaily, ForeCastHourly } from '../../../src/lib/api/wft-types-forecast.js';
import dayjs, { Dayjs } from '../../../src/lib/myDayjs.js';
import { API_FIXTURE_DIR } from '../../../tools/fixtures.js';

export interface ForecastSource {
    name: string;
    response: ForeCast;
}

export const BETTER_FORECAST_FIXTURE = path.join(API_FIXTURE_DIR, 'better_forecast.json');

export const hasBetterForecastFixture = existsSync(BETTER_FORECAST_FIXTURE);

/**
 * Synthetic `better_forecast` response with 3 hourly and 3 daily items, all times relative to `now`.
 *
 * @param now reference time
 */
export function createSampleForecast(now: Dayjs = dayjs()): ForeCast {
    const hourStart = now.clone().startOf('hour');
    const dayStart = now.clone().startOf('day');

    const current: ForeCastCurrent = {
        air_density: 1.2,
        air_temperature: 15.5,
        brightness: 42000,
        delta_t: 1.2,
        dew_point: 10.1,
        feels_like: 14.9,
        is_precip_local_day_rain_check: false,
        is_precip_local_yesterday_rain_check: false,
        lightning_strike_count_last_1hr: 0,
        lightning_strike_count_last_3hr: 0,
        lightning_strike_last_distance: 0,
        lightning_strike_last_distance_msg: '-',
        lightning_strike_last_epoch: 0,
        precip_accum_local_day: 0,
        precip_accum_local_yesterday: 0.4,
        precip_minutes_local_day: 0,
        precip_minutes_local_yesterday: 5,
        pressure_trend: 'steady',
        relative_humidity: 68,
        sea_level_pressure: 1013.4,
        solar_radiation: 310,
        station_pressure: 1009.1,
        time: now.unix(),
        uv: 3.1,
        wet_bulb_globe_temperature: 16.2,
        wet_bulb_temperature: 12.4,
        wind_avg: 2.8,
        wind_direction: 221,
        wind_direction_cardinal: 'SW',
        wind_gust: 4.6,
    };

    const hourly: ForeCastHourly[] = [0, 1, 2].map((i): ForeCastHourly => {
        const time = hourStart.clone().add(i, 'hours');
        return {
            air_temperature: 15.2 + i,
            conditions: 'Partly Cloudy',
            feels_like: 14.8 + i,
            icon: 'partly-cloudy-day',
            local_day: time.date(),
            local_hour: time.hour(),
            precip: 0,
            precip_icon: 'chance-rain',
            precip_probability: 10,
            precip_type: 'rain',
            relative_humidity: 70,
            station_pressure: 1010.5,
            sea_level_pressure: 1013.2,
            time: time.unix(),
            uv: 2,
            wind_avg: 3.4,
            wind_direction: 230,
            wind_direction_cardinal: 'SW',
            wind_gust: 5.1,
        };
    });

    const daily: ForeCastDaily[] = [0, 1, 2].map((i): ForeCastDaily => {
        const day = dayStart.clone().add(i, 'days');
        return {
            air_temp_high: 18 + i,
            air_temp_low: 8 + i,
            conditions: 'Clear',
            day_num: day.date(),
            day_start_local: day.unix(),
            icon: 'clear-day',
            month_num: day.month() + 1,
            precip_icon: 'chance-rain',
            precip_probability: 20,
            precip_type: 'rain',
            sunrise: day.clone().add(6, 'hours').unix(),
            sunset: day.clone().add(18, 'hours').unix(),
        };
    });

    return {
        current_conditions: current,
        forecast: { hourly, daily },
        units: {
            units_temp: 'c',
            units_wind: 'kph',
            units_pressure: 'mb',
            units_precip: 'mm',
            units_distance: 'km',
        },
        latitude: 52.5,
        longitude: 13.4,
        location_name: 'Test Station',
        timezone: 'Europe/Berlin',
        timezone_offset_minutes: 60,
        status: { status_code: 0, status_message: 'SUCCESS' },
    } as ForeCast;
}

/**
 * All forecast responses to run the tests against: the synthetic sample and, if present, the recorded fixture.
 */
export function getForecastSources(): ForecastSource[] {
    const sources: ForecastSource[] = [{ name: 'synthetisch', response: createSampleForecast() }];

    if (hasBetterForecastFixture) {
        const recorded = JSON.parse(readFileSync(BETTER_FORECAST_FIXTURE, 'utf8')) as { response: ForeCast };
        sources.push({ name: 'Fixture better_forecast', response: recorded.response });
    }

    return sources;
}
