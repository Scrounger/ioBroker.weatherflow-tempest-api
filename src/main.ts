/*
 * Created with @iobroker/create-adapter v2.6.4
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';
import url from 'node:url';
import moment from 'moment';
import * as schedule from 'node-schedule';

import * as forecCastTypes from './lib/foreCastTypes';
import * as myHelper from './lib/helper';

// Load your modules here, e.g.:
// import * as fs from "fs";

class WeatherflowTempestApi extends utils.Adapter {
	apiEndpoint = 'https://swd.weatherflow.com/swd/rest/';
	myTranslation: { [key: string]: any; } | undefined;

	updateSchedule: schedule.Job | undefined = undefined;

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: 'weatherflow-tempest-api',
			useFormatDate: true
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		const logPrefix = '[onReady]:';

		try {
			// Initialize your adapter here
			await this.loadTranslation();

			// In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
			this.subscribeStates('forecast.update');
			// You can also add a subscription for multiple states. The following line watches all states starting with "lights."
			// this.subscribeStates('lights.*');

			await this.updateData();

		} catch (error: any) {
			this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
		}
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private onUnload(callback: () => void): void {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			if (this.updateSchedule) this.updateSchedule.cancel()
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback();

			// eslint-disable-next-line
		} catch (e) {
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  */
	// private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 */
	private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
		const logPrefix = '[onStateChange]:';

		try {
			if (state && !state.from.includes(this.namespace)) {
				if (id.includes(this.namespace)) {
					if (id === `${this.namespace}.forecast.update`) {
						this.updateForeCast();
					}
				}
			} else {
				// The state was deleted
				this.log.info(`state ${id} deleted`);
			}

		} catch (error: any) {
			this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  */
	// private onMessage(obj: ioBroker.Message): void {
	// 	if (typeof obj === 'object' && obj.message) {
	// 		if (obj.command === 'send') {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info('send command');

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
	// 		}
	// 	}
	// }

	private async updateData(): Promise<void> {
		const logPrefix = '[updateData]:';

		try {
			if (this.config.stationId && this.config.accessToken) {

				await this.updateForeCast();

				this.log.debug(`${logPrefix} starting cron job with parameter '${this.config.updateCron}'`);
				this.updateSchedule = schedule.scheduleJob(this.config.updateCron, async () => {
					await this.updateForeCast();
				});

			} else {
				this.log.error(`${logPrefix} station id and / or access token missing. Please check your adapter configuration!`);
			}
		} catch (error: any) {
			this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
		}
	}

	private async updateForeCast(): Promise<void> {
		const logPrefix = '[updateForeCast]:';

		try {
			if (this.config.hourlyEnabled || this.config.dailyEnabled) {
				const url = `${this.apiEndpoint}better_forecast?station_id=${this.config.stationId}&units_temp=${this.config.unitTemperature}&units_wind=${this.config.unitWind}&units_pressure=${this.config.unitPressure}&units_precip=${this.config.unitPrecipitation}&units_distance=${this.config.unitDistance}&token=${this.config.accessToken}`;
				const data = await this.downloadData(url);

				this.log.silly(JSON.stringify(data));

				if (data && data.current_conditions) {
					await this.updateForeCastCurrent(data.current_conditions);
				} else {
					this.log.error(`${logPrefix} Tempest Forecast has no current condition data`);
				}

				if (data && data.forecast) {
					await this.updateForeCastHourly(data.forecast.hourly);
					await this.updateForeCastDaily(data.forecast.daily);
				} else {
					this.log.error(`${logPrefix} Tempest Forecast has no forecast data`);
				}
			}
		} catch (error: any) {
			this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
		}
	}

	private async updateForeCastCurrent(data: forecCastTypes.tForeCastCurrent): Promise<void> {
		const logPrefix = '[updateForeCastCurrent]:';

		try {
			const idChannelPrefix = `forecast.current`;

			if (this.config.currentEnabled) {
				if (data) {
					await this.createOrUpdateChannel(idChannelPrefix, this.getTranslation('current_conditions'));
					let statesChanged = false;

					for (const [key, val] of Object.entries(data)) {
						if (Object.prototype.hasOwnProperty.call(forecCastTypes.stateDefinition, key)) {
							if (!forecCastTypes.stateDefinition[key].ignore) {
								const res = await this.createOrUpdateState(idChannelPrefix, forecCastTypes.stateDefinition[key], val, key);
								if (res === true) statesChanged = true
							} else {
								this.log.debug(`${logPrefix} state '${key}' will be ignored`);
							}
						} else {
							this.log.warn(`${logPrefix} no state definition exist for '${key}' (file: './lib/foreCastTypes.ts')`);
						}
					}

					if (statesChanged) {
						const now = moment().unix();
						this.createOrUpdateState(idChannelPrefix, forecCastTypes.stateDefinition['lastUpdate'], now, 'lastUpdate');
						this.log.debug(`${logPrefix} current data changed -> update state '${idChannelPrefix}.lastUpdate' - ${moment.unix(Number(now)).format(`ddd ${this.dateFormat} HH:mm`)} `);
					}

					this.log.info(`${logPrefix} ForeCast data - current conditions updated (changes: ${statesChanged})`);
				} else {
					this.log.error(`${logPrefix} Tempest Forecast has no current condition data`);
				}
			} else {
				if (await this.objectExists(`forecast.current`)) {
					await this.delObjectAsync(`forecast.current`, { recursive: true });
					this.log.info(`${logPrefix} deleting channel 'forecast.current' (config.currentEnabled: ${this.config.currentEnabled})`);
				}
			}
		} catch (error: any) {
			this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
		}
	}

	private async updateForeCastHourly(data: Array<forecCastTypes.tForeCastHourly>): Promise<void> {
		const logPrefix = '[updateForeCastHourly]:';

		try {
			const idChannelPrefix = `forecast.hourly`;

			if (this.config.hourlyEnabled) {
				if (data) {
					await this.createOrUpdateChannel(idChannelPrefix, this.getTranslation('hourly'));
					let statesChanged = false;

					for (let i = 0; i <= data.length - 1; i++) {
						const item: forecCastTypes.tForeCastHourly = data[i];
						const timestamp = moment.unix(item.time);
						const calcHours = (moment.duration(timestamp.diff(moment().startOf('hour')))).asHours();
						const idChannel = `${idChannelPrefix}.${myHelper.zeroPad(calcHours, 3)}`;

						if (calcHours <= this.config.hourlyMax) {
							if (calcHours >= 0) {
								await this.createOrUpdateChannel(idChannel, this.getTranslation('inXhours').replace('{0}', calcHours.toString()));

								for (const [key, val] of Object.entries(item)) {
									if (Object.prototype.hasOwnProperty.call(forecCastTypes.stateDefinition, key)) {
										if (!forecCastTypes.stateDefinition[key].ignore) {
											const res = await this.createOrUpdateState(idChannel, forecCastTypes.stateDefinition[key], val, key);
											if (res === true) statesChanged = true
										} else {
											this.log.debug(`${logPrefix} state '${key}' will be ignored`);
										}
									} else {
										this.log.warn(`${logPrefix} no state definition exist for '${key}' (file: './lib/foreCastTypes.ts')`);
									}
								}
							}


						} else {
							// delete channels
							if (await this.objectExists(idChannel)) {
								await this.delObjectAsync(idChannel, { recursive: true });
								this.log.info(`${logPrefix} deleting channel '${idChannel}'`);
							}
						}
					}

					if (statesChanged) {
						const now = moment().unix();
						this.createOrUpdateState(idChannelPrefix, forecCastTypes.stateDefinition['lastUpdate'], now, 'lastUpdate');
						this.log.debug(`${logPrefix} hourly data changed -> update state '${idChannelPrefix}.lastUpdate' - ${moment.unix(Number(now)).format(`ddd ${this.dateFormat} HH:mm`)} `);
					}

					this.log.info(`${logPrefix} ForeCast data - hourly updated (changes: ${statesChanged})`);
				} else {
					this.log.warn(`${logPrefix} downloaded data does not contain a hourly forecast!`);
				}
			} else {
				if (await this.objectExists(idChannelPrefix)) {
					await this.delObjectAsync(idChannelPrefix, { recursive: true });
					this.log.info(`${logPrefix} deleting channel '${idChannelPrefix}' (config.hourlyEnabled: ${this.config.hourlyEnabled})`);
				}
			}

		} catch (error: any) {
			this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
		}
	}

	private async updateForeCastDaily(data: Array<forecCastTypes.tForeCastDaily>): Promise<void> {
		const logPrefix = '[updateForeCastDaily]:';

		try {
			const idChannelPrefix = `forecast.daily`;

			if (this.config.dailyEnabled) {
				if (data) {
					await this.createOrUpdateChannel(idChannelPrefix, this.getTranslation('daily'));
					let statesChanged = false;

					for (let i = 0; i <= data.length - 1; i++) {
						const item: forecCastTypes.tForeCastDaily = data[i];
						const timestamp = moment.unix(item.day_start_local);
						const calcDay = timestamp.dayOfYear() - moment().dayOfYear();
						const idChannel = `${idChannelPrefix}.${myHelper.zeroPad(calcDay, 3)}`;

						if (calcDay <= this.config.dailyMax) {
							if (calcDay >= 0) {
								await this.createOrUpdateChannel(idChannel, this.getTranslation('inXDays').replace('{0}', calcDay.toString()));

								for (const [key, val] of Object.entries(item)) {
									if (Object.prototype.hasOwnProperty.call(forecCastTypes.stateDefinition, key)) {
										if (!forecCastTypes.stateDefinition[key].ignore) {
											const res = await this.createOrUpdateState(idChannel, forecCastTypes.stateDefinition[key], val, key)
											if (res === true) statesChanged = true
										} else {
											this.log.debug(`${logPrefix} state '${key}' will be ignored`);
										}
									} else {
										this.log.warn(`${logPrefix} no state definition exist for '${key}' (file: './lib/foreCastTypes.ts')`);
									}
								}
							}
						} else {
							// delete channels
							if (await this.objectExists(idChannel)) {
								await this.delObjectAsync(idChannel, { recursive: true });
								this.log.info(`${logPrefix} deleting channel '${idChannel}'`);
							}
						}
					}

					if (statesChanged) {
						const now = moment().unix();
						this.createOrUpdateState(idChannelPrefix, forecCastTypes.stateDefinition['lastUpdate'], now, 'lastUpdate');
						this.log.debug(`${logPrefix} daily data changed -> update state '${idChannelPrefix}.lastUpdate' - ${moment.unix(Number(now)).format(`ddd ${this.dateFormat} HH:mm`)} `);
					}

					this.log.info(`${logPrefix} ForeCast data - daily updated (changes: ${statesChanged})`);
				} else {
					this.log.warn(`${logPrefix} downloaded data does not contain a daily forecast!`);
				}
			} else {
				if (await this.objectExists(idChannelPrefix)) {
					await this.delObjectAsync(idChannelPrefix, { recursive: true });
					this.log.info(`${logPrefix} deleting channel '${idChannelPrefix}' (config.dailyEnabled: ${this.config.dailyEnabled})`);
				}
			}

		} catch (error: any) {
			this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
		}
	}

	private async createOrUpdateChannel(id: string, name: string): Promise<void> {
		const logPrefix = '[createOrUpdateChannel]:';

		try {
			const common = {
				name: name,
				// icon: myDeviceImages[nvr.type] ? myDeviceImages[nvr.type] : null
			};

			if (!await this.objectExists(id)) {
				this.log.debug(`${logPrefix} creating channel '${id}'`);
				await this.setObjectAsync(id, {
					type: 'channel',
					common: common,
					native: {}
				});
			} else {
				const obj = await this.getObjectAsync(id);

				if (obj && obj.common) {
					if (!myHelper.isChannelCommonEqual(obj.common as ioBroker.ChannelCommon, common)) {
						await this.extendObject(id, { common: common });
						this.log.debug(`${logPrefix} channel updated '${id}'`);
					}
				}
			}
		} catch (error: any) {
			this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
		}
	}

	private async createOrUpdateState(idChannel: string, stateDef: forecCastTypes.tStateDefinition, val: string | number, key: string): Promise<boolean> {
		const logPrefix = '[createOrUpdateState]:';

		try {
			const id = `${idChannel}.${stateDef.id}`

			stateDef.common.name = this.getTranslation(key);

			if (stateDef.common.unit && Object.prototype.hasOwnProperty.call(this.config, stateDef.common.unit)) {
				//@ts-ignore
				stateDef.common.unit = this.getTranslation(this.config[stateDef.common.unit]) || stateDef.common.unit
			}

			if (!await this.objectExists(id)) {
				this.log.debug(`${logPrefix} creating state '${id}'`);

				const obj = {
					type: 'state',
					common: stateDef.common,
					native: {}
				};

				//@ts-ignore
				await this.setObjectAsync(id, obj);
			} else {
				// update State if needed
				const obj = await this.getObjectAsync(id);

				if (obj && obj.common) {
					if (!myHelper.isStateCommonEqual(obj.common as ioBroker.StateCommon, stateDef.common)) {
						await this.extendObject(id, { common: stateDef.common });
						this.log.debug(`${logPrefix} updated common properties of state '${id}'`);
					}
				}
			}

			let changedObj: any = undefined;

			if (key === 'time' || key === 'lastUpdate') {
				changedObj = await this.setStateChangedAsync(id, moment.unix(Number(val)).format(`ddd ${this.dateFormat} HH:mm`), true);
			} else if (key === 'day_start_local') {
				changedObj = await this.setStateChangedAsync(id, moment.unix(Number(val)).format(`ddd ${this.dateFormat}`), true);
			} else if (key === 'sunrise' || key === 'sunset') {
				changedObj = await this.setStateChangedAsync(id, moment.unix(Number(val)).format(`HH:mm`), true);
			} else {
				changedObj = await this.setStateChangedAsync(id, val, true);
			}

			if (changedObj && Object.prototype.hasOwnProperty.call(changedObj, 'notChanged') && !changedObj.notChanged) {
				this.log.silly(`${logPrefix} value of state '${id}' changed`);
				return !changedObj.notChanged
			}
		} catch (err: any) {
			console.error(`${logPrefix} error: ${err.message}, stack: ${err.stack}`);
		}

		return false;
	}

	private async downloadData(url: string): Promise<forecCastTypes.tData | undefined> {
		const logPrefix = '[downloadData]:';

		try {

			const response: any = await fetch(url);

			if (response.status === 200) {
				this.log.debug(`${logPrefix} Tempest ForeCast data successfully received`);
				return await response.json();
			} else {
				this.log.error(`${logPrefix} Tempest Forecast error, code: ${response.status}`);
			}

		} catch (error: any) {
			this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
		}

		return undefined;
	}

	private async loadTranslation(): Promise<void> {
		const logPrefix = '[loadTranslation]:';

		try {
			moment.locale(this.language || 'en');

			const fileName = `../admin/i18n/${this.language || 'en'}/translations.json`

			this.myTranslation = (await import(fileName, { assert: { type: 'json' } })).default;

			this.log.debug(`${logPrefix} translation data loaded from '${fileName}'`);

		} catch (err: any) {
			console.error(`${logPrefix} error: ${err.message}, stack: ${err.stack}`);
		}
	}

	private getTranslation(str: string): string {
		const logPrefix = '[getTranslation]:';

		try {
			if (this.myTranslation && this.myTranslation[str]) {
				return this.myTranslation[str];
			} else {
				this.log.warn(`${logPrefix} no translation for key '${str}' exists!`);
			}
		} catch (err: any) {
			console.error(`${logPrefix} error: ${err.message}, stack: ${err.stack}`);
		}

		return str;
	}
}

// replace only needed for dev system
const modulePath = url.fileURLToPath(import.meta.url).replace('/development/', '/node_modules/');

if (process.argv[1] === modulePath) {
	// start the instance directly
	new WeatherflowTempestApi();
}

export default function startAdapter(options: Partial<utils.AdapterOptions> | undefined): WeatherflowTempestApi {
	// compact mode
	return new WeatherflowTempestApi(options);
}