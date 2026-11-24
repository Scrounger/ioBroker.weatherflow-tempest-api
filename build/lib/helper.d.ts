import { myTreeDefinition } from "./myIob.js";
export declare function zeroPad(source: any, places: number): string;
/**
 * Collect all properties used in tree defintions
 *
 * @param treefDefintion definitions from tree-devices.ts and tree-clients.ts
 * @returns
 */
export declare function getAllKeysOfTreeDefinition(treefDefintion: {
    [key: string]: myTreeDefinition;
}): string[];
export declare function getAllIdsOfTreeDefinition(treefDefintion: {
    [key: string]: myTreeDefinition;
}): string[];
