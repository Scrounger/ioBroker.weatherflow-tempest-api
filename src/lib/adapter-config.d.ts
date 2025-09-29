// This file extends the AdapterConfig type from "@types/iobroker"
import { WftApi } from './lib/api/wft-api.js';
import { myIob } from './myIob.js'

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface AdapterConfig {
			stationId: string;
			accessToken: string;
			unitTemperature: string;
			unitWind: string;
			unitPressure: string;
			unitPrecipitation: string;
			unitDistance: string;
			currentEnabled: boolean;
			hourlyEnabled: boolean;
			hourlyMax: number;
			dailyEnabled: boolean;
			dailyMax: number;
			updateCron: string;
		}

		interface myAdapter extends ioBroker.Adapter {
			wft: WftApi;
			myIob: myIob;
		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export { };