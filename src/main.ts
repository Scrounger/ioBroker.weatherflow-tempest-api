/*
 * Created with @iobroker/create-adapter v2.6.4
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';
import { XMLHttpRequest } from 'xmlhttprequest-ts';
import moment from 'moment';

import * as forecCastTypes from './lib/foreCastTypes';
import * as myHelper from './lib/helper';

// Load your modules here, e.g.:
// import * as fs from "fs";

class WeatherflowTempestApi extends utils.Adapter {
	apiEndpoint = 'https://swd.weatherflow.com/swd/rest/';
	myTranslation: { [key: string]: any; } | undefined;

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
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback();
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

	private async updateForeCast(): Promise<void> {
		const logPrefix = '[updateForeCast]:';

		try {
			if (this.config.hourlyEnabled || this.config.dailyEnabled) {
				const url = `${this.apiEndpoint}better_forecast?station_id=${this.config.stationId}&units_temp=${this.config.unitTemperature}&units_wind=${this.config.unitWind}&units_pressure=${this.config.unitPressure}&units_precip=${this.config.unitPrecipitation}&units_distance=${this.config.unitDistance}&token=${this.config.accessToken}`;
				const data = await this.downloadData(url);

				this.log.warn(JSON.stringify(data));

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
			if (this.config.currentEnabled) {
				if (data) {
					await this.createOrUpdateChannel(`forecast.current`, this.getTranslation('current_conditions'));

					for (const [key, val] of Object.entries(data)) {
						if (Object.prototype.hasOwnProperty.call(forecCastTypes.stateDefinition, key)) {
							if (!forecCastTypes.stateDefinition[key].ignore) {
								await this.createOrUpdateState(`forecast.current`, forecCastTypes.stateDefinition[key], val, key);
							} else {
								this.log.debug(`${logPrefix} state '${key}' will be ignored`);
							}
						} else {
							this.log.warn(`${logPrefix} no state definition exist for '${key}' (file: './lib/foreCastTypes.ts')`);
						}
					}
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

					for (var i = 0; i <= data.length - 1; i++) {
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
											await this.createOrUpdateState(idChannel, forecCastTypes.stateDefinition[key], val, key);
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
				} else {
					this.log.warn(`${logPrefix} downloaded data does not contain a hourly forecast!`);
				}
			} else {
				if (await this.objectExists(idChannelPrefix)) {
					await this.delObjectAsync(idChannelPrefix, { recursive: true });
					this.log.info(`${logPrefix} deleting channel '${idChannelPrefix}' (config.currentEnabled: ${this.config.currentEnabled})`);
				}
			}

		} catch (error: any) {
			this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
		}
	}

	private async updateForeCastDaily(data: Array<forecCastTypes.tForeCastDaily>): Promise<void> {
		const logPrefix = '[updateForeCastDaily]:';

		try {
			if (this.config.dailyEnabled && data) {

			} else {
				this.log.warn(`${logPrefix} downloaded data does not contain a daily forecast!`);
			}

		} catch (error: any) {
			this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
		}
	}

	private async createOrUpdateChannel(id: string, name: string) {
		const logPrefix = '[updateForeCastDaily]:';

		try {
			const common = {
				name: name,
				// icon: myDeviceImages[nvr.type] ? myDeviceImages[nvr.type] : null
			};

			if (!await this.objectExists(id)) {
				this.log.debug(`${logPrefix} - creating channel '${id}'`);
				await this.setObjectAsync(id, {
					type: 'channel',
					common: common,
					native: {}
				});
			} else {
				const obj = await this.getObjectAsync(id);

				if (obj && obj.common) {
					if (JSON.stringify(obj.common) !== JSON.stringify(common)) {
						await this.extendObject(id, { common: common });
						this.log.debug(`${logPrefix} channel updated '${id}'`);
					}
				}
			}
		} catch (error: any) {
			this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
		}
	}

	private async createOrUpdateState(idChannel: string, stateDef: forecCastTypes.tStateDefinition, val: string | number, key: string) {
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

				// @ts-ignore
				await this.setObjectAsync(id, obj);
			} else {
				// update State if needed
				const obj = await this.getObjectAsync(id);

				if (obj && obj.common) {
					if (JSON.stringify(obj.common) !== JSON.stringify(stateDef.common)) {
						await this.extendObject(id, { common: stateDef.common });
						this.log.debug(`${logPrefix} updated common properties of state '${id}'`);
					}
				}
			}

			if (key === 'time') {
				await this.setStateChangedAsync(id, moment.unix(Number(val)).format(`ddd ${this.dateFormat} HH:mm`), true);
			} else {
				await this.setStateChangedAsync(id, val, true);
			}

		} catch (err: any) {
			console.error(`${logPrefix} error: ${err.message}, stack: ${err.stack}`);
		}

	}

	private async downloadData(url: string): Promise<forecCastTypes.tData | undefined> {
		const logPrefix = '[downloadData]:';

		try {
			let xhr = new XMLHttpRequest();
			xhr.open("GET", url, false);
			xhr.send();

			if (xhr.status === 200) {
				this.log.debug(`${logPrefix} Tempest ForeCast data successfully received`);
				return JSON.parse(xhr.responseText);
			} else {
				this.log.error(`${logPrefix} Tempest Forecast error, code: ${xhr.status}`);
			}

			// const objects = require('../test/testData.json');
			// return objects;

		} catch (error: any) {
			this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
		}

		return undefined;
	}

	private async loadTranslation() {
		const logPrefix = '[loadTranslation]:';

		try {
			moment.locale(this.language || 'en');

			const fileName = `../admin/i18n/${this.language || 'en'}/translations.json`

			this.myTranslation = (await import(fileName, { assert: { type: "json" } })).default;

			this.log.debug(`${logPrefix} translation data loaded from '${fileName}'`);

		} catch (err: any) {
			console.error(`${logPrefix} error: ${err.message}, stack: ${err.stack}`);
		}
	}

	private getTranslation(str: string) {
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

if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new WeatherflowTempestApi(options);
} else {
	// otherwise start the instance directly
	(() => new WeatherflowTempestApi())();
}