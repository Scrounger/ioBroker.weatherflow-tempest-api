import { expect } from 'chai';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import sinon from 'sinon';
import { ApiEndpoints, WftApi } from '../../../src/lib/api/wft-api.js';
import { createTestAdapter, type FakeAdapter } from '../helpers/fakeAdapter.js';
import { getForecastSources } from '../helpers/forecastSources.js';

const JSON_HEADERS = { 'content-type': 'application/json' };

let server: Server;
let baseUrl: string;
let forecastBody: unknown = {};
let hits: Record<string, number> = {};

/** Local test server that simulates the WeatherFlow API endpoints and error cases. */
function handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const path = req.url?.split('?')[0] ?? '';
    hits[path] = (hits[path] ?? 0) + 1;

    switch (path) {
        case '/ok':
            res.writeHead(200, JSON_HEADERS);
            res.end(JSON.stringify({ ok: true }));
            break;
        case '/error':
            res.writeHead(500);
            res.end('boom');
            break;
        case '/invalid':
            res.writeHead(200, JSON_HEADERS);
            res.end('{ kein json');
            break;
        case '/null':
            res.writeHead(200, JSON_HEADERS);
            res.end('null');
            break;
        case '/slow':
            setTimeout(() => {
                if (!res.writableEnded && !res.destroyed) {
                    res.writeHead(200, JSON_HEADERS);
                    res.end('{}');
                }
            }, 300);
            break;
        case '/forecast':
            res.writeHead(200, JSON_HEADERS);
            res.end(JSON.stringify(forecastBody));
            break;
        default:
            res.writeHead(404);
            res.end();
    }
}

/** Returns a local port on which nothing listens (connection refused). */
async function getClosedPort(): Promise<number> {
    const tmp = createServer();
    await new Promise<void>(resolve => tmp.listen(0, '127.0.0.1', resolve));
    const { port } = tmp.address() as AddressInfo;
    await new Promise<void>(resolve => tmp.close(() => resolve()));
    return port;
}

function createApi(): { api: WftApi; fake: FakeAdapter } {
    const fake = createTestAdapter();
    return { api: fake.wft, fake };
}

describe('lib/api/wft-api.ts', () => {
    before(async () => {
        server = createServer(handleRequest);
        await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
        const { port } = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${port}`;
    });

    after(async () => {
        server.closeAllConnections();
        await new Promise<void>(resolve => server.close(() => resolve()));
    });

    beforeEach(() => {
        hits = {};
        forecastBody = {};
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('responseOk', () => {
        it('akzeptiert Statuscodes von 200 bis 299', () => {
            const { api } = createApi();

            expect(api.responseOk(200)).to.equal(true);
            expect(api.responseOk(299)).to.equal(true);
        });

        it('lehnt fehlende und andere Statuscodes ab', () => {
            const { api } = createApi();

            expect(api.responseOk(undefined)).to.equal(false);
            expect(api.responseOk(199)).to.equal(false);
            expect(api.responseOk(300)).to.equal(false);
            expect(api.responseOk(500)).to.equal(false);
        });
    });

    describe('getApiEndpoint', () => {
        it('erzeugt die Forecast-URL mit Station, Einheiten und Token', () => {
            const { api } = createApi();

            expect(api.getApiEndpoint(ApiEndpoints.forecast)).to.equal(
                'https://swd.weatherflow.com/swd/rest/better_forecast?station_id=12345&units_temp=c&units_wind=kph&units_pressure=mb&units_precip=mm&units_distance=km&token=test-token',
            );
        });

        it('erzeugt die Icon-URL aus dem Parameter', () => {
            const { api } = createApi();

            expect(api.getApiEndpoint(ApiEndpoints.icon, 'rain')).to.equal('https://tempestwx.com/images/Updated/rain.svg');
        });

        it('liefert einen leeren String für unbekannte Endpunkte', () => {
            const { api } = createApi();

            expect(api.getApiEndpoint('unbekannt' as ApiEndpoints)).to.equal('');
        });
    });

    describe('retrieve', () => {
        it('liefert die Antwort bei Status 200 und setzt den Fehlerzähler zurück', async () => {
            const { api } = createApi();

            const response = await api.retrieve(`${baseUrl}/ok`);

            expect(response?.statusCode).to.equal(200);
            expect(await response?.body.json()).to.deep.equal({ ok: true });
            expect((api as unknown as { apiErrorCount: number }).apiErrorCount).to.equal(0);
        });

        it('liefert null und protokolliert bei Status 500', async () => {
            const { api, fake } = createApi();

            const response = await api.retrieve(`${baseUrl}/error`);

            expect(response).to.equal(null);
            expect(fake.log.error).to.have.been.calledOnce;
            expect((api as unknown as { apiErrorCount: number }).apiErrorCount).to.equal(1);
        });

        it('liefert null und protokolliert, wenn der Server nicht erreichbar ist', async () => {
            const { api, fake } = createApi();
            const port = await getClosedPort();

            const response = await api.retrieve(`http://127.0.0.1:${port}/ok`);

            expect(response).to.equal(null);
            expect(fake.log.error).to.have.been.calledOnce;
        });

        it('bricht bei Überschreitung des Timeouts ab', async () => {
            const { api, fake } = createApi();

            const response = await api.retrieve(`${baseUrl}/slow`, { method: 'GET' }, { timeout: 50 });

            expect(response).to.equal(null);
            expect(fake.log.error).to.have.been.calledOnce;
        });

        it('setzt und löscht den Timeout über den Adapter', async () => {
            const { api, fake } = createApi();

            const response = await api.retrieve(`${baseUrl}/ok`, { method: 'GET' }, { timeout: 2000 });
            await response?.body.text();

            expect(fake.setTimeout).to.have.been.calledOnceWith(sinon.match.func, 2000);
            expect(fake.clearTimeout).to.have.been.calledOnce;
        });

        it('verwendet API_TIMEOUT, wenn kein Timeout übergeben wird', async () => {
            const { api, fake } = createApi();

            const response = await api.retrieve(`${baseUrl}/ok`);
            await response?.body.text();

            expect(fake.setTimeout).to.have.been.calledOnceWith(sinon.match.func, 5000);
        });
    });

    describe('retrievData', () => {
        it('liefert das geparste JSON-Objekt', async () => {
            const { api } = createApi();

            expect(await api.retrievData(`${baseUrl}/ok`)).to.deep.equal({ ok: true });
        });

        it('wiederholt einmal bei ungültigem JSON und liefert dann undefined', async () => {
            const { api, fake } = createApi();

            expect(await api.retrievData(`${baseUrl}/invalid`)).to.equal(undefined);
            expect(hits['/invalid']).to.equal(2);
            expect(fake.log.error).to.have.been.called;
        });

        it('wiederholt einmal bei einer null-Antwort und liefert dann undefined', async () => {
            const { api } = createApi();

            expect(await api.retrievData(`${baseUrl}/null`)).to.equal(undefined);
            expect(hits['/null']).to.equal(2);
        });

        it('wiederholt einmal bei Status 500 und liefert dann undefined', async () => {
            const { api } = createApi();

            expect(await api.retrievData(`${baseUrl}/error`)).to.equal(undefined);
            expect(hits['/error']).to.equal(2);
        });

        it('wiederholt nicht, wenn retry false ist', async () => {
            const { api } = createApi();

            expect(await api.retrievData(`${baseUrl}/error`, { method: 'GET' }, false)).to.equal(undefined);
            expect(hits['/error']).to.equal(1);
        });

        it('fängt Fehler von retrieve ab und protokolliert sie', async () => {
            const { api, fake } = createApi();
            sinon.stub(api, 'retrieve').rejects(new Error('netzwerk kaputt'));

            expect(await api.retrievData(`${baseUrl}/ok`)).to.equal(undefined);
            expect(fake.log.error).to.have.been.called;
        });
    });

    describe('getForeCast', () => {
        for (const source of getForecastSources()) {
            it(`liefert die Vorhersage (${source.name}) unverändert`, async () => {
                const { api } = createApi();
                forecastBody = source.response;
                sinon.stub(api, 'getApiEndpoint').returns(`${baseUrl}/forecast`);

                const result = await api.getForeCast();

                expect(result).to.deep.equal(source.response);
            });
        }

        it('liefert undefined, wenn keine Daten kommen', async () => {
            const { api } = createApi();
            sinon.stub(api, 'getApiEndpoint').returns(`${baseUrl}/error`);

            expect(await api.getForeCast()).to.equal(undefined);
        });

        it('liefert undefined und protokolliert bei einem Fehler', async () => {
            const { api, fake } = createApi();
            sinon.stub(api, 'retrievData').rejects(new Error('fehler'));

            expect(await api.getForeCast()).to.equal(undefined);
            expect(fake.log.error).to.have.been.called;
        });
    });
});
