import { current } from './current.js';
import { hourly } from './hourly.js';
import { daily } from './daily.js';
import { myTreeDefinition } from '../../myIob.js';
declare const idChannel = "forecast";
declare function get(): {
    [key: string]: myTreeDefinition;
};
export { idChannel, get, current, hourly, daily };
