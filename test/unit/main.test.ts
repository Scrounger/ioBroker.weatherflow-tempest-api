import * as utils from '@iobroker/adapter-core';
import { expect } from 'chai';
import sinon from 'sinon';
import { WftApi } from '../../src/lib/api/wft-api.js';
import startAdapter from '../../src/main.js';
import { ADMIN_DIR, createFakeAdapter, type FakeAdapter } from './helpers/fakeAdapter.js';
import { createSampleForecast } from './helpers/forecastSources.js';

/** Methods of the adapter that are registered via `on()` and are used by the tests. */
interface AdapterHandlers {
	ready(): Promise<void>;
	stateChange(id: string, state: unknown): Promise<void>;
	unload(callback: () => void): void;
}

/** Internal members of the adapter that are accessed by the tests. */
interface AdapterInternals {
	handlers: AdapterHandlers;
	updateSchedule: { cancel(): boolean } | undefined;
	wft: WftApi;
	updateForeCast(isAdapterStart?: boolean): Promise<void>;
	updateForeCastCurrent(data: unknown, isAdapterStart?: boolean): Promise<void>;
	updateForeCastHourly(data: unknown, isAdapterStart?: boolean): Promise<void>;
	updateForeCastDaily(data: unknown, isAdapterStart?: boolean): Promise<void>;
	statesChanged(statesChanged: boolean, idLastUpdate: string, logPrefix: string): Promise<void>;
}

/**
 * Creates an adapter instance from `main.ts` and equips it with the fake adapter members.
 * The adapter-core stub registers the event handlers in `handlers`.
 */
function createAdapter(configOverrides: Partial<ioBroker.AdapterConfig> = {}): { adapter: AdapterInternals; fake: FakeAdapter } {
	const fake = createFakeAdapter(configOverrides);
	const adapter = startAdapter({});
	Object.assign(adapter, fake);
	return { adapter: adapter as unknown as AdapterInternals, fake };
}

describe('main.ts (WeatherflowTempestApi)', () => {
	let current: { adapter: AdapterInternals; fake: FakeAdapter } | undefined;

	before(async () => {
		await utils.I18n.init(ADMIN_DIR, 'en');
	});

	beforeEach(() => {
		current = undefined;
		sinon.stub(utils.I18n, 'init').resolves();
		sinon.stub(WftApi.prototype, 'getForeCast').resolves(createSampleForecast());
	});

	afterEach(() => {
		current?.adapter.updateSchedule?.cancel();
		current = undefined;
		sinon.restore();
	});

	/** Creates the adapter and stores it so that the cron job is cancelled after each test. */
	function setup(configOverrides: Partial<ioBroker.AdapterConfig> = {}): { adapter: AdapterInternals; fake: FakeAdapter } {
		current = createAdapter(configOverrides);
		return current;
	}

	describe('onReady', () => {
		it('legt Gerät, Channels und States bei gültiger Konfiguration an', async () => {
			const { adapter, fake } = setup();

			await adapter.handlers.ready();

			expect(fake.objects.get('forecast')?.type).to.equal('device');
			expect(fake.objects.has('forecast.current.temperature')).to.equal(true);
			expect([...fake.objects.keys()].some(id => /^forecast\.daily\.\d+\.date$/.test(id))).to.equal(true);
			expect(adapter.updateSchedule).to.not.equal(undefined);
		});

		it('erzeugt die Stunden-Channels mit übersetzten Namen', async () => {
			const { adapter, fake } = setup();

			await adapter.handlers.ready();

			const hourly = [...fake.objects.entries()].find(([id]) => /^forecast\.hourly\.\d+/.test(id));
			expect(hourly).to.not.equal(undefined);
			expect(String(hourly?.[1].common.name.en)).to.include('hours');
		});

		it('erzeugt die Tages-Channels mit übersetzten Namen', async () => {
			const { adapter, fake } = setup();

			await adapter.handlers.ready();

			const daily = [...fake.objects.entries()].find(([id]) => /^forecast\.daily\.\d+/.test(id));
			expect(daily).to.not.equal(undefined);
			expect(String(daily?.[1].common.name.en)).to.include('days');
		});

		it('ruft ohne Station-ID keinen Forecast ab und protokolliert', async () => {
			const { adapter, fake } = setup({ stationId: '' });

			await adapter.handlers.ready();

			expect(WftApi.prototype.getForeCast).to.not.have.been.called;
			expect(fake.log.error).to.have.been.calledWithMatch('station id');
		});

		it('ruft ohne Access-Token keinen Forecast ab und protokolliert', async () => {
			const { adapter, fake } = setup({ accessToken: '' });

			await adapter.handlers.ready();

			expect(WftApi.prototype.getForeCast).to.not.have.been.called;
			expect(fake.log.error).to.have.been.calledWithMatch('access token');
		});

		it('protokolliert Fehler bei der Initialisierung', async () => {
			const { adapter, fake } = setup();
			(utils.I18n.init as unknown as sinon.SinonStub).rejects(new Error('i18n kaputt'));

			await adapter.handlers.ready();

			expect(fake.log.error).to.have.been.called;
		});

		it('legt keine States an, wenn der Abruf keine Daten liefert', async () => {
			const { adapter, fake } = setup();
			(WftApi.prototype.getForeCast as sinon.SinonStub).resolves(undefined);

			await adapter.handlers.ready();

			expect(fake.objects.has('forecast.current.temperature')).to.equal(false);
			expect(fake.objects.get('forecast')?.type).to.equal('device');
		});

		it('protokolliert Fehler beim Abruf der Vorhersage', async () => {
			const { adapter, fake } = setup();
			(WftApi.prototype.getForeCast as sinon.SinonStub).rejects(new Error('netz kaputt'));

			await adapter.handlers.ready();

			expect(fake.log.error).to.have.been.called;
		});
	});

	describe('updateForeCast', () => {
		it('entfernt den Forecast-Channel, wenn alle Bereiche deaktiviert sind', async () => {
			const { adapter, fake } = setup();
			await adapter.handlers.ready();

			fake.config.currentEnabled = false;
			fake.config.hourlyEnabled = false;
			fake.config.dailyEnabled = false;
			await adapter.updateForeCast();

			expect(fake.objects.has('forecast')).to.equal(false);
			expect(fake.objects.has('forecast.current.temperature')).to.equal(false);
		});
	});

	describe('updateForeCastCurrent', () => {
		it('entfernt den Current-Channel, wenn er deaktiviert ist', async () => {
			const { adapter, fake } = setup();
			await adapter.handlers.ready();

			fake.config.currentEnabled = false;
			await adapter.updateForeCastCurrent(createSampleForecast().current_conditions);

			expect(fake.objects.has('forecast.current.temperature')).to.equal(false);
			expect([...fake.objects.keys()].some(id => id.startsWith('forecast.hourly.'))).to.equal(true);
		});

		it('protokolliert einen Fehler ohne Current-Daten', async () => {
			const { adapter, fake } = setup();

			await adapter.updateForeCastCurrent(undefined);

			expect(fake.log.error).to.have.been.calledWithMatch('no current condition data');
		});
	});

	describe('updateForeCastHourly', () => {
		it('entfernt den Hourly-Channel, wenn er deaktiviert ist', async () => {
			const { adapter, fake } = setup();
			await adapter.handlers.ready();

			fake.config.hourlyEnabled = false;
			await adapter.updateForeCastHourly(createSampleForecast().forecast.hourly);

			expect([...fake.objects.keys()].some(id => id.startsWith('forecast.hourly'))).to.equal(false);
		});

		it('protokolliert einen Fehler ohne Hourly-Daten', async () => {
			const { adapter, fake } = setup();

			await adapter.updateForeCastHourly(undefined);

			expect(fake.log.error).to.have.been.calledWithMatch('no hourly data');
		});
	});

	describe('updateForeCastDaily', () => {
		it('entfernt den Daily-Channel, wenn er deaktiviert ist', async () => {
			const { adapter, fake } = setup();
			await adapter.handlers.ready();

			fake.config.dailyEnabled = false;
			await adapter.updateForeCastDaily(createSampleForecast().forecast.daily);

			expect([...fake.objects.keys()].some(id => id.startsWith('forecast.daily'))).to.equal(false);
		});

		it('protokolliert einen Fehler ohne Daily-Daten', async () => {
			const { adapter, fake } = setup();

			await adapter.updateForeCastDaily(undefined);

			expect(fake.log.error).to.have.been.calledWithMatch('no daily data');
		});
	});

	describe('onStateChange', () => {
		it('löst bei einem unbestätigten Update-Button einen Abruf aus und setzt ack', async () => {
			const { adapter, fake } = setup();
			await adapter.handlers.ready();
			const setStateSpy = sinon.spy(adapter as unknown as Record<string, unknown>, 'setState');
			const id = 'weatherflow-tempest-api.0.forecast.update';

			await adapter.handlers.stateChange(id, { val: true, ack: false });

			expect(WftApi.prototype.getForeCast).to.have.been.calledTwice;
			expect(setStateSpy).to.have.been.calledWith(id, { ack: true });
			expect(fake.log.error).to.not.have.been.called;
		});

		it('ignoriert andere IDs, bestätigte und leere States', async () => {
			const { adapter } = setup();
			await adapter.handlers.ready();

			await adapter.handlers.stateChange('weatherflow-tempest-api.0.other', { val: true, ack: false });
			await adapter.handlers.stateChange('weatherflow-tempest-api.0.forecast.update', { val: true, ack: true });
			await adapter.handlers.stateChange('weatherflow-tempest-api.0.forecast.update', null);

			expect(WftApi.prototype.getForeCast).to.have.been.calledOnce;
		});

		it('protokolliert Fehler beim Setzen von ack', async () => {
			const { adapter, fake } = setup();
			await adapter.handlers.ready();
			sinon.stub(adapter as unknown as Record<string, unknown>, 'setState').rejects(new Error('setState kaputt'));

			await adapter.handlers.stateChange('weatherflow-tempest-api.0.forecast.update', { val: true, ack: false });

			expect(fake.log.error).to.have.been.called;
		});
	});

	describe('onUnload', () => {
		it('räumt Timeout und Zeitplan auf und ruft den Callback auf', async () => {
			const { adapter, fake } = setup();
			await adapter.handlers.ready();
			const job = adapter.updateSchedule;
			const cancelSpy = sinon.spy(job as { cancel(): boolean }, 'cancel');
			adapter.wft.connectionTimeout = setTimeout(() => undefined, 10000) as unknown as typeof adapter.wft.connectionTimeout;
			const callback = sinon.spy();

			adapter.handlers.unload(callback);

			expect(fake.clearTimeout).to.have.been.called;
			expect(cancelSpy).to.have.been.calledOnce;
			expect(callback).to.have.been.calledOnce;
		});

		it('ruft den Callback auch ohne initialisierten Adapter auf', () => {
			const { adapter } = setup();
			const callback = sinon.spy();

			adapter.handlers.unload(callback);

			expect(callback).to.have.been.calledOnce;
		});
	});

	describe('statesChanged', () => {
		it('setzt den Zeitstempel nur bei geänderten Daten', async () => {
			const { adapter, fake } = setup();

			await adapter.statesChanged(false, 'forecast.hourly.lastUpdate', '[test]');
			expect(fake.states.has('forecast.hourly.lastUpdate')).to.equal(false);

			await adapter.statesChanged(true, 'forecast.hourly.lastUpdate', '[test]');
			expect(fake.states.get('forecast.hourly.lastUpdate')?.val).to.be.a('string');
		});
	});
});
