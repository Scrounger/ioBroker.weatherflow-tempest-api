'use strict';

const path = require('node:path');
const { register } = require('node:module');
const { pathToFileURL } = require('node:url');

// Replace @iobroker/adapter-core with a stub, so the unit tests run without a js-controller
register(pathToFileURL(path.join(__dirname, 'support', 'adapterCoreHook.mjs')).href);

// Makes ts-node ignore warnings, so mocha --watch does work
process.env.TS_NODE_IGNORE_WARNINGS = 'TRUE';
// Sets the correct tsconfig for testing
process.env.TS_NODE_PROJECT = 'tsconfig.json';
// Make ts-node respect the "include" key in tsconfig.json
process.env.TS_NODE_FILES = 'TRUE';

// Don't silently swallow unhandled rejections
process.on('unhandledRejection', (e) => {
	throw e;
});

// enable the should interface with sinon
// and load chai-as-promised and sinon-chai by default
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const { should, use } = require('chai');

should();
use(sinonChai);
use(chaiAsPromised);