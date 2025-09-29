export interface ForeCast {
    current_conditions: ForeCastCurrent;
    forecast: ForeCastData;
    units: { [key: string]: string };
    latitude: number;
    longitude: number;
    location_name: string;
    timezone: string;
    timezone_offset_minutes: number;
    status: ForeCastStatus;
}

export interface ForeCastData {
    hourly: Array<ForeCastHourly>;
    daily: Array<ForeCastDaily>;
}

export interface ForeCastCurrent {
    air_density: number;
    air_temperature: number;
    brightness: number;
    delta_t: number;
    dew_point: number;
    feels_like: number;
    is_precip_local_day_rain_check: boolean;
    is_precip_local_yesterday_rain_check: boolean;
    lightning_strike_count_last_1hr: number;
    lightning_strike_count_last_3hr: number;
    lightning_strike_last_distance: number;
    lightning_strike_last_distance_msg: string;
    lightning_strike_last_epoch: number;
    precip_accum_local_day: number;
    precip_accum_local_yesterday: number;
    precip_minutes_local_day: number;
    precip_minutes_local_yesterday: number;
    pressure_trend: string;
    relative_humidity: number;
    sea_level_pressure: number;
    solar_radiation: number;
    station_pressure: number;
    time: number;
    uv: number;
    wet_bulb_globe_temperature: number;
    wet_bulb_temperature: number;
    wind_avg: number;
    wind_direction: number;
    wind_direction_cardinal: string;
    wind_gust: number;
}

export interface ForeCastHourly {
    air_temperature: number;
    conditions: string;
    feels_like: number;
    icon: string;
    local_day: number;
    local_hour: number;
    precip: number;
    precip_icon: string;
    precip_probability: number;
    precip_type: string;
    relative_humidity: number;
    station_pressure: number;
    sea_level_pressure: number;
    time: number;
    uv: number;
    wind_avg: number;
    wind_direction: number;
    wind_direction_cardinal: string;
    wind_gust: number;
}

export interface ForeCastDaily {
    air_temp_high: number;
    air_temp_low: number;
    conditions: string;
    day_num: number;
    day_start_local: number;
    icon: string;
    month_num: number;
    precip_icon: string;
    precip_probability: number;
    precip_type: string;
    sunrise: number;
    sunset: number;
}

export interface ForeCastStatus {
    status_code: number;
    status_message: string;
}