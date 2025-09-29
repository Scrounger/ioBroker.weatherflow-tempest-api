import { ForeCastData, ForeCastCurrent, ForeCastDaily, ForeCastHourly, ForeCastStatus } from "./api/wft-types-forecast.js";
export type myTreeData = ForeCastData | ForeCastStatus | ForeCastCurrent | ForeCastHourly | ForeCastDaily;
