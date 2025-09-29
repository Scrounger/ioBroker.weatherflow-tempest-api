import { current } from './current.js';
import { hourly } from './hourly.js';
import { daily } from './daily.js';
const idChannel = 'forecast';
function get() {
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
            conditionToCreateState(objDevice, objChannel, adapter) {
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
            conditionToCreateState(objDevice, objChannel, adapter) {
                return adapter.config.dailyEnabled;
            },
            object: {
                lastUpdate: {
                    id: 'lastUpdate',
                    iobType: 'string',
                },
            },
        },
    };
}
export { idChannel, get, current, hourly, daily };
