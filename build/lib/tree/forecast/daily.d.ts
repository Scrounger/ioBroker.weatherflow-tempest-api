import { myTreeDefinition } from "../../myIob.js";
export declare namespace daily {
    const idChannel = "forecast.daily";
    function get(): {
        [key: string]: myTreeDefinition;
    };
    function getKeys(): string[];
    function getStateIDs(): string[];
}
