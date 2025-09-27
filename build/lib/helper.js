export function zeroPad(source, places) {
    let zero = places - source.toString().length + 1;
    return Array(+(zero > 0 && zero)).join('0') + source;
}
export function isStateCommonEqual(objCommon, myCommon) {
    return JSON.stringify(objCommon.name) === JSON.stringify(myCommon.name) &&
        objCommon.type === myCommon.type &&
        objCommon.read === myCommon.read &&
        objCommon.write === objCommon.write &&
        objCommon.role === myCommon.role &&
        objCommon.def === myCommon.def &&
        objCommon.unit === myCommon.unit &&
        objCommon.icon === myCommon.icon &&
        objCommon.desc == myCommon.desc &&
        objCommon.max === myCommon.max &&
        objCommon.min === myCommon.min &&
        JSON.stringify(objCommon.states) === JSON.stringify(myCommon.states);
}
export function isChannelCommonEqual(objCommon, myCommon) {
    return JSON.stringify(objCommon.name) === JSON.stringify(myCommon.name) &&
        objCommon.icon == myCommon.icon &&
        objCommon.desc === myCommon.desc &&
        objCommon.role === myCommon.role;
}
