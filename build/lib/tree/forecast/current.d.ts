import { myTreeDefinition } from "../../myIob.js";
export declare namespace current {
    const idChannel = "forecast.current";
    function get(): {
        [key: string]: myTreeDefinition;
    };
    function getKeys(): string[];
    function getStateIDs(): string[];
}
