import * as utils from '@iobroker/adapter-core';
import * as schedule from 'node-schedule';
import { WftApi } from './lib/api/wft-api.js';
import { myIob } from './lib/myIob.js';
declare class WeatherflowTempestApi extends utils.Adapter {
    wft: WftApi;
    myIob: myIob;
    updateSchedule: schedule.Job | undefined;
    statesUsingValAsLastChanged: any[];
    constructor(options?: Partial<utils.AdapterOptions>);
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    private onReady;
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param callback
     */
    private onUnload;
    /**
     * Is called if a subscribed state changes
     *
     * @param id
     * @param state
     */
    private onStateChange;
    private updateData;
    private updateForeCast;
    private updateForeCastCurrent;
    private updateForeCastHourly;
    private updateForeCastDaily;
    private statesChanged;
}
export default function startAdapter(options: Partial<utils.AdapterOptions> | undefined): WeatherflowTempestApi;
export {};
