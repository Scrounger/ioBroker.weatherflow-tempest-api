"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_moment = __toESM(require("moment"));
var schedule = __toESM(require("node-schedule"));
var forecCastTypes = __toESM(require("./lib/foreCastTypes"));
var myHelper = __toESM(require("./lib/helper"));
class WeatherflowTempestApi extends utils.Adapter {
  apiEndpoint = "https://swd.weatherflow.com/swd/rest/";
  myTranslation;
  updateSchedule = void 0;
  constructor(options = {}) {
    super({
      ...options,
      name: "weatherflow-tempest-api",
      useFormatDate: true
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    const logPrefix = "[onReady]:";
    try {
      await this.loadTranslation();
      this.subscribeStates("forecast.update");
      await this.updateData();
    } catch (error) {
      this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
    }
  }
  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   */
  onUnload(callback) {
    try {
      if (this.updateSchedule)
        this.updateSchedule.cancel();
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
  async onStateChange(id, state) {
    const logPrefix = "[onStateChange]:";
    try {
      if (state && !state.from.includes(this.namespace)) {
        if (id.includes(this.namespace)) {
          if (id === `${this.namespace}.forecast.update`) {
            this.updateForeCast();
          }
        }
      } else {
        this.log.info(`state ${id} deleted`);
      }
    } catch (error) {
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
  async updateData() {
    const logPrefix = "[updateData]:";
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
    } catch (error) {
      this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
    }
  }
  async updateForeCast() {
    const logPrefix = "[updateForeCast]:";
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
    } catch (error) {
      this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
    }
  }
  async updateForeCastCurrent(data) {
    const logPrefix = "[updateForeCastCurrent]:";
    try {
      const idChannelPrefix = `forecast.current`;
      if (this.config.currentEnabled) {
        if (data) {
          await this.createOrUpdateChannel(idChannelPrefix, this.getTranslation("current_conditions"));
          let statesChanged = false;
          for (const [key, val] of Object.entries(data)) {
            if (Object.prototype.hasOwnProperty.call(forecCastTypes.stateDefinition, key)) {
              if (!forecCastTypes.stateDefinition[key].ignore) {
                const res = await this.createOrUpdateState(idChannelPrefix, forecCastTypes.stateDefinition[key], val, key);
                if (res === true)
                  statesChanged = true;
              } else {
                this.log.debug(`${logPrefix} state '${key}' will be ignored`);
              }
            } else {
              this.log.warn(`${logPrefix} no state definition exist for '${key}' (file: './lib/foreCastTypes.ts')`);
            }
          }
          if (statesChanged) {
            const now = (0, import_moment.default)().unix();
            this.createOrUpdateState(idChannelPrefix, forecCastTypes.stateDefinition["lastUpdate"], now, "lastUpdate");
            this.log.debug(`${logPrefix} current data changed -> update state '${idChannelPrefix}.lastUpdate' - ${import_moment.default.unix(Number(now)).format(`ddd ${this.dateFormat} HH:mm`)} `);
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
    } catch (error) {
      this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
    }
  }
  async updateForeCastHourly(data) {
    const logPrefix = "[updateForeCastHourly]:";
    try {
      const idChannelPrefix = `forecast.hourly`;
      if (this.config.hourlyEnabled) {
        if (data) {
          await this.createOrUpdateChannel(idChannelPrefix, this.getTranslation("hourly"));
          let statesChanged = false;
          for (let i = 0; i <= data.length - 1; i++) {
            const item = data[i];
            const timestamp = import_moment.default.unix(item.time);
            const calcHours = import_moment.default.duration(timestamp.diff((0, import_moment.default)().startOf("hour"))).asHours();
            const idChannel = `${idChannelPrefix}.${myHelper.zeroPad(calcHours, 3)}`;
            if (calcHours <= this.config.hourlyMax) {
              if (calcHours >= 0) {
                await this.createOrUpdateChannel(idChannel, this.getTranslation("inXhours").replace("{0}", calcHours.toString()));
                for (const [key, val] of Object.entries(item)) {
                  if (Object.prototype.hasOwnProperty.call(forecCastTypes.stateDefinition, key)) {
                    if (!forecCastTypes.stateDefinition[key].ignore) {
                      const res = await this.createOrUpdateState(idChannel, forecCastTypes.stateDefinition[key], val, key);
                      if (res === true)
                        statesChanged = true;
                    } else {
                      this.log.debug(`${logPrefix} state '${key}' will be ignored`);
                    }
                  } else {
                    this.log.warn(`${logPrefix} no state definition exist for '${key}' (file: './lib/foreCastTypes.ts')`);
                  }
                }
              }
            } else {
              if (await this.objectExists(idChannel)) {
                await this.delObjectAsync(idChannel, { recursive: true });
                this.log.info(`${logPrefix} deleting channel '${idChannel}'`);
              }
            }
          }
          if (statesChanged) {
            const now = (0, import_moment.default)().unix();
            this.createOrUpdateState(idChannelPrefix, forecCastTypes.stateDefinition["lastUpdate"], now, "lastUpdate");
            this.log.debug(`${logPrefix} hourly data changed -> update state '${idChannelPrefix}.lastUpdate' - ${import_moment.default.unix(Number(now)).format(`ddd ${this.dateFormat} HH:mm`)} `);
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
    } catch (error) {
      this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
    }
  }
  async updateForeCastDaily(data) {
    const logPrefix = "[updateForeCastDaily]:";
    try {
      const idChannelPrefix = `forecast.daily`;
      if (this.config.dailyEnabled) {
        if (data) {
          await this.createOrUpdateChannel(idChannelPrefix, this.getTranslation("daily"));
          let statesChanged = false;
          for (let i = 0; i <= data.length - 1; i++) {
            const item = data[i];
            const timestamp = import_moment.default.unix(item.day_start_local);
            const calcDay = timestamp.dayOfYear() - (0, import_moment.default)().dayOfYear();
            const idChannel = `${idChannelPrefix}.${myHelper.zeroPad(calcDay, 3)}`;
            if (calcDay <= this.config.dailyMax) {
              if (calcDay >= 0) {
                await this.createOrUpdateChannel(idChannel, this.getTranslation("inXDays").replace("{0}", calcDay.toString()));
                for (const [key, val] of Object.entries(item)) {
                  if (Object.prototype.hasOwnProperty.call(forecCastTypes.stateDefinition, key)) {
                    if (!forecCastTypes.stateDefinition[key].ignore) {
                      const res = await this.createOrUpdateState(idChannel, forecCastTypes.stateDefinition[key], val, key);
                      if (res === true)
                        statesChanged = true;
                    } else {
                      this.log.debug(`${logPrefix} state '${key}' will be ignored`);
                    }
                  } else {
                    this.log.warn(`${logPrefix} no state definition exist for '${key}' (file: './lib/foreCastTypes.ts')`);
                  }
                }
              }
            } else {
              if (await this.objectExists(idChannel)) {
                await this.delObjectAsync(idChannel, { recursive: true });
                this.log.info(`${logPrefix} deleting channel '${idChannel}'`);
              }
            }
          }
          if (statesChanged) {
            const now = (0, import_moment.default)().unix();
            this.createOrUpdateState(idChannelPrefix, forecCastTypes.stateDefinition["lastUpdate"], now, "lastUpdate");
            this.log.debug(`${logPrefix} daily data changed -> update state '${idChannelPrefix}.lastUpdate' - ${import_moment.default.unix(Number(now)).format(`ddd ${this.dateFormat} HH:mm`)} `);
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
    } catch (error) {
      this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
    }
  }
  async createOrUpdateChannel(id, name) {
    const logPrefix = "[createOrUpdateChannel]:";
    try {
      const common = {
        name
        // icon: myDeviceImages[nvr.type] ? myDeviceImages[nvr.type] : null
      };
      if (!await this.objectExists(id)) {
        this.log.debug(`${logPrefix} creating channel '${id}'`);
        await this.setObjectAsync(id, {
          type: "channel",
          common,
          native: {}
        });
      } else {
        const obj = await this.getObjectAsync(id);
        if (obj && obj.common) {
          if (!myHelper.isChannelCommonEqual(obj.common, common)) {
            await this.extendObject(id, { common });
            this.log.debug(`${logPrefix} channel updated '${id}'`);
          }
        }
      }
    } catch (error) {
      this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
    }
  }
  async createOrUpdateState(idChannel, stateDef, val, key) {
    const logPrefix = "[createOrUpdateState]:";
    try {
      const id = `${idChannel}.${stateDef.id}`;
      stateDef.common.name = this.getTranslation(key);
      if (stateDef.common.unit && Object.prototype.hasOwnProperty.call(this.config, stateDef.common.unit)) {
        stateDef.common.unit = this.getTranslation(this.config[stateDef.common.unit]) || stateDef.common.unit;
      }
      if (!await this.objectExists(id)) {
        this.log.debug(`${logPrefix} creating state '${id}'`);
        const obj = {
          type: "state",
          common: stateDef.common,
          native: {}
        };
        await this.setObjectAsync(id, obj);
      } else {
        const obj = await this.getObjectAsync(id);
        if (obj && obj.common) {
          if (!myHelper.isStateCommonEqual(obj.common, stateDef.common)) {
            await this.extendObject(id, { common: stateDef.common });
            this.log.debug(`${logPrefix} updated common properties of state '${id}'`);
          }
        }
      }
      let changedObj = void 0;
      if (key === "time" || key === "lastUpdate") {
        changedObj = await this.setStateChangedAsync(id, import_moment.default.unix(Number(val)).format(`ddd ${this.dateFormat} HH:mm`), true);
      } else if (key === "day_start_local") {
        changedObj = await this.setStateChangedAsync(id, import_moment.default.unix(Number(val)).format(`ddd ${this.dateFormat}`), true);
      } else if (key === "sunrise" || key === "sunset") {
        changedObj = await this.setStateChangedAsync(id, import_moment.default.unix(Number(val)).format(`HH:mm`), true);
      } else {
        changedObj = await this.setStateChangedAsync(id, val, true);
      }
      if (changedObj && Object.prototype.hasOwnProperty.call(changedObj, "notChanged") && !changedObj.notChanged) {
        this.log.silly(`${logPrefix} value of state '${id}' changed`);
        return !changedObj.notChanged;
      }
    } catch (err) {
      console.error(`${logPrefix} error: ${err.message}, stack: ${err.stack}`);
    }
    return false;
  }
  async downloadData(url) {
    const logPrefix = "[downloadData]:";
    try {
      const response = await fetch(url);
      if (response.status === 200) {
        this.log.debug(`${logPrefix} Tempest ForeCast data successfully received`);
        return await response.json();
      } else {
        this.log.error(`${logPrefix} Tempest Forecast error, code: ${response.status}`);
      }
    } catch (error) {
      this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
    }
    return void 0;
  }
  async loadTranslation() {
    const logPrefix = "[loadTranslation]:";
    try {
      import_moment.default.locale(this.language || "en");
      const fileName = `../admin/i18n/${this.language || "en"}/translations.json`;
      this.myTranslation = (await Promise.resolve().then(() => __toESM(require(fileName)))).default;
      this.log.debug(`${logPrefix} translation data loaded from '${fileName}'`);
    } catch (err) {
      console.error(`${logPrefix} error: ${err.message}, stack: ${err.stack}`);
    }
  }
  getTranslation(str) {
    const logPrefix = "[getTranslation]:";
    try {
      if (this.myTranslation && this.myTranslation[str]) {
        return this.myTranslation[str];
      } else {
        this.log.warn(`${logPrefix} no translation for key '${str}' exists!`);
      }
    } catch (err) {
      console.error(`${logPrefix} error: ${err.message}, stack: ${err.stack}`);
    }
    return str;
  }
}
if (require.main !== module) {
  module.exports = (options) => new WeatherflowTempestApi(options);
} else {
  (() => new WeatherflowTempestApi())();
}
//# sourceMappingURL=main.js.map
