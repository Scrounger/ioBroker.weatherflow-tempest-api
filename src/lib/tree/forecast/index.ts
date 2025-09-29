import { current } from './current.js';
import { hourly } from './hourly.js';
import { daily } from './daily.js';
import { myTreeDefinition } from '../../myIob.js';
import { ForeCastData } from '../../api/wft-types-forecast.js';

const idChannel = 'forecast'

function get(): { [key: string]: myTreeDefinition } {
    return {
        update: {
            id: 'update',
            iobType: 'boolean',
            read: false,
            write: true,
            role: 'button',
        },
        hourly: {
            name: 'hourly',
            conditionToCreateState(objDevice: ForeCastData, objChannel: ForeCastData, adapter: ioBroker.myAdapter) {
                return adapter.config.hourlyEnabled;
            },
            object: {
                lastUpdate: {
                    id: 'lastUpdate',
                    iobType: 'string',
                },
            },
        },
        daily: {
            name: 'daily',
            conditionToCreateState(objDevice: ForeCastData, objChannel: ForeCastData, adapter: ioBroker.myAdapter) {
                return adapter.config.dailyEnabled;
            },
            object: {
                lastUpdate: {
                    id: 'lastUpdate',
                    iobType: 'string',
                },
            },
        },
    }
}

export { idChannel, get, current, hourly, daily };