import * as utils from '@iobroker/adapter-core';
import * as schedule from 'node-schedule';
declare class WeatherflowTempestApi extends utils.Adapter {
    apiEndpoint: string;
    myTranslation: {
        [key: string]: any;
    } | undefined;
    updateSchedule: schedule.Job | undefined;
    constructor(options?: Partial<utils.AdapterOptions>);
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    private onReady;
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    private onUnload;
    /**
     * Is called if a subscribed state changes
     */
    private onStateChange;
    private updateData;
    private updateForeCast;
    private updateForeCastCurrent;
    private updateForeCastHourly;
    private updateForeCastDaily;
    private createOrUpdateChannel;
    private createOrUpdateState;
    private downloadData;
    private loadTranslation;
    private getTranslation;
}
export default function startAdapter(options: Partial<utils.AdapterOptions> | undefined): WeatherflowTempestApi;
export {};
