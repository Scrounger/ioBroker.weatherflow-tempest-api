import { myTreeDefinition } from "../../myIob.js";
export declare namespace hourly {
    const idChannel = "forecast.hourly";
    function get(): {
        [key: string]: myTreeDefinition;
    };
    function getKeys(): string[];
    function getStateIDs(): string[];
}
