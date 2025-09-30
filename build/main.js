/*
 * Created with @iobroker/create-adapter v2.6.4
 */
// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';
import url from 'node:url';
import moment from 'moment';
import * as schedule from 'node-schedule';
import * as myHelper from './lib/helper.js';
import * as tree from './lib/tree/index.js';
import { WftApi } from './lib/api/wft-api.js';
import { myIob } from './lib/myIob.js';
class WeatherflowTempestApi extends utils.Adapter {
    wft;
    myIob;
    updateSchedule = undefined;
    statesUsingValAsLastChanged = [ // id of states where lc is taken from the value
    ];
    constructor(options = {}) {
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
    async onReady() {
        const logPrefix = '[onReady]:';
        try {
            moment.locale(this.language);
            await utils.I18n.init(`${utils.getAbsoluteDefaultDataDir().replace('iobroker-data/', '')}node_modules/iobroker.${this.name}/admin`, this);
            this.myIob = new myIob(this, utils, this.statesUsingValAsLastChanged);
            this.wft = new WftApi(this);
            await this.updateData(true);
            this.myIob.findMissingTranslation();
        }
        catch (error) {
            this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
        }
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param callback
     */
    onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            if (this.wft.connectionTimeout) {
                this.clearTimeout(this.wft.connectionTimeout);
            }
            if (this.updateSchedule) {
                this.updateSchedule.cancel();
            }
            callback();
        }
        catch (e) {
            callback();
        }
    }
    /**
     * Is called if a subscribed state changes
     *
     * @param id
     * @param state
     */
    async onStateChange(id, state) {
        const logPrefix = '[onStateChange]:';
        try {
            if (state && !state.ack) {
                if (id.endsWith(`.${tree.forecast.idChannel}.${tree.forecast.get().update.id}`)) {
                    await this.updateForeCast();
                    await this.setState(id, { ack: true });
                }
            }
        }
        catch (error) {
            this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
        }
    }
    async updateData(isAdapterStart = false) {
        const logPrefix = '[updateData]:';
        try {
            if (this.config.stationId && this.config.accessToken) {
                await this.updateForeCast(isAdapterStart);
                this.log.debug(`${logPrefix} starting cron job with parameter '${this.config.updateCron}'`);
                this.updateSchedule = schedule.scheduleJob(this.config.updateCron, async () => {
                    await this.updateForeCast();
                });
            }
            else {
                this.log.error(`${logPrefix} station id and / or access token missing. Please check your adapter configuration!`);
            }
        }
        catch (error) {
            this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
        }
    }
    async updateForeCast(isAdapterStart = false) {
        const logPrefix = '[updateForeCast]:';
        try {
            if (this.config.currentEnabled || this.config.hourlyEnabled || this.config.dailyEnabled) {
                const foreCast = await this.wft.getForeCast();
                if (isAdapterStart) {
                    await this.myIob.createOrUpdateDevice(tree.forecast.idChannel, 'forecast', undefined, undefined, undefined, true);
                    await this.myIob.createOrUpdateStates(tree.forecast.idChannel, tree.forecast.get(), foreCast.forecast, foreCast.forecast, undefined, false, 'forecast', isAdapterStart);
                }
                if (foreCast) {
                    await this.updateForeCastCurrent(foreCast.current_conditions, isAdapterStart);
                    await this.updateForeCastHourly(foreCast.forecast.hourly, isAdapterStart);
                    await this.updateForeCastDaily(foreCast.forecast.daily, isAdapterStart);
                }
            }
            else {
                if (await this.objectExists(tree.forecast.idChannel)) {
                    await this.delObjectAsync(tree.forecast.idChannel, { recursive: true });
                    this.log.info(`${logPrefix} deleting channel '${tree.forecast.idChannel}' (config.currentEnabled: ${this.config.currentEnabled})`);
                }
            }
        }
        catch (error) {
            this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
        }
    }
    async updateForeCastCurrent(data, isAdapterStart = false) {
        const logPrefix = '[updateForeCastCurrent]:';
        try {
            if (this.config.currentEnabled) {
                if (data) {
                    this.log.silly(`${logPrefix} data: ${JSON.stringify(data)}`);
                    if (isAdapterStart) {
                        await this.myIob.createOrUpdateChannel(tree.forecast.current.idChannel, 'current', undefined, true);
                    }
                    await this.myIob.createOrUpdateStates(tree.forecast.current.idChannel, tree.forecast.current.get(), data, data, undefined, false, 'forecast current', isAdapterStart);
                    this.log.info(`${logPrefix} ForeCast - current updated`);
                }
                else {
                    this.log.error(`${logPrefix} Tempest Forecast has no current condition data`);
                }
            }
            else {
                if (await this.objectExists(tree.forecast.current.idChannel)) {
                    await this.delObjectAsync(tree.forecast.current.idChannel, { recursive: true });
                    this.log.info(`${logPrefix} deleting channel '${tree.forecast.current.idChannel}' (config.currentEnabled: ${this.config.currentEnabled})`);
                }
            }
        }
        catch (error) {
            this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
        }
    }
    async updateForeCastHourly(data, isAdapterStart = false) {
        const logPrefix = '[updateForeCastHourly]:';
        try {
            if (this.config.hourlyEnabled) {
                if (data) {
                    this.log.silly(`${logPrefix} data: ${JSON.stringify(data)}`);
                    let statesChanged = false;
                    if (isAdapterStart) {
                        await this.myIob.createOrUpdateChannel(tree.forecast.hourly.idChannel, 'hourly', undefined, true);
                    }
                    for (let i = 0; i <= data.length - 1; i++) {
                        const item = data[i];
                        const timestamp = moment.unix(item.time);
                        const calcHours = (moment.duration(timestamp.diff(moment().startOf('hour')))).asHours();
                        const idChannel = `${tree.forecast.hourly.idChannel}.${myHelper.zeroPad(calcHours, 3)}`;
                        if (calcHours <= this.config.hourlyMax) {
                            if (isAdapterStart) {
                                const i18n = { ...utils.I18n.getTranslatedObject('inXhours') };
                                Object.keys(i18n).forEach(key => {
                                    i18n[key] = i18n[key].replace('{0}', calcHours.toString());
                                });
                                await this.myIob.createOrUpdateChannel(idChannel, i18n, undefined, true);
                            }
                            const res = await this.myIob.createOrUpdateStates(idChannel, tree.forecast.hourly.get(), item, item, undefined, false, 'forecast hourly', isAdapterStart);
                            statesChanged = res ? res : statesChanged;
                        }
                        else {
                            // delete channels
                            if (isAdapterStart && await this.objectExists(idChannel)) {
                                await this.delObjectAsync(idChannel, { recursive: true });
                                this.log.info(`${logPrefix} deleting channel '${idChannel}'`);
                            }
                        }
                    }
                    await this.statesChanged(statesChanged, `${tree.forecast.hourly.idChannel}.lastUpdate`, logPrefix);
                    this.log.info(`${logPrefix} ForeCast - hourly updated`);
                }
                else {
                    this.log.error(`${logPrefix} Tempest Forecast has no hourly data`);
                }
            }
            else {
                if (await this.objectExists(tree.forecast.hourly.idChannel)) {
                    await this.delObjectAsync(tree.forecast.hourly.idChannel, { recursive: true });
                    this.log.info(`${logPrefix} deleting channel '${tree.forecast.hourly.idChannel}' (config.hourlyEnabled: ${this.config.hourlyEnabled})`);
                }
            }
        }
        catch (error) {
            this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
        }
    }
    async updateForeCastDaily(data, isAdapterStart = false) {
        const logPrefix = '[updateForeCastDaily]:';
        try {
            if (this.config.dailyEnabled) {
                if (data) {
                    this.log.silly(`${logPrefix} data: ${JSON.stringify(data)}`);
                    let statesChanged = false;
                    if (isAdapterStart) {
                        await this.myIob.createOrUpdateChannel(tree.forecast.daily.idChannel, 'daily', undefined, true);
                    }
                    for (let i = 0; i <= data.length - 1; i++) {
                        const item = data[i];
                        const timestamp = moment.unix(item.day_start_local);
                        const calcDay = timestamp.dayOfYear() - moment().dayOfYear();
                        const idChannel = `${tree.forecast.daily.idChannel}.${myHelper.zeroPad(calcDay, 3)}`;
                        if (calcDay <= this.config.dailyMax) {
                            if (isAdapterStart) {
                                const i18n = { ...utils.I18n.getTranslatedObject('inXDays') };
                                Object.keys(i18n).forEach(key => {
                                    i18n[key] = i18n[key].replace('{0}', calcDay.toString());
                                });
                                await this.myIob.createOrUpdateChannel(idChannel, i18n, undefined, true);
                            }
                            const res = await this.myIob.createOrUpdateStates(idChannel, tree.forecast.daily.get(), item, item, undefined, false, 'forecast daily', isAdapterStart);
                            statesChanged = res ? res : statesChanged;
                        }
                        else {
                            if (await this.objectExists(idChannel)) {
                                await this.delObjectAsync(idChannel, { recursive: true });
                                this.log.info(`${logPrefix} deleting channel '${idChannel}'`);
                            }
                        }
                    }
                    await this.statesChanged(statesChanged, `${tree.forecast.daily.idChannel}.lastUpdate`, logPrefix);
                    this.log.info(`${logPrefix} ForeCast - daily updated`);
                }
                else {
                    this.log.error(`${logPrefix} Tempest Forecast has no daily data`);
                }
            }
            else {
                if (await this.objectExists(tree.forecast.daily.idChannel)) {
                    await this.delObjectAsync(tree.forecast.daily.idChannel, { recursive: true });
                    this.log.info(`${logPrefix} deleting channel '${tree.forecast.daily.idChannel}' (config.dailyEnabled: ${this.config.dailyEnabled})`);
                }
            }
        }
        catch (error) {
            this.log.error(`${logPrefix} error: ${error}, stack: ${error.stack}`);
        }
    }
    async statesChanged(statesChanged, idLastUpdate, logPrefix) {
        if (statesChanged) {
            const nowString = moment().format(`ddd ${this.dateFormat} HH:mm`);
            await this.setState(idLastUpdate, nowString, true);
            this.log.debug(`${logPrefix} daily data changed -> update state '${idLastUpdate}' - ${nowString}`);
        }
    }
}
// replace only needed for dev system
const modulePath = url.fileURLToPath(import.meta.url).replace('/development/', '/node_modules/');
if (process.argv[1] === modulePath) {
    // start the instance directly
    new WeatherflowTempestApi();
}
export default function startAdapter(options) {
    // compact mode
    return new WeatherflowTempestApi(options);
}
