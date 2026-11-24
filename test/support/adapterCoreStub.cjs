'use strict';

// Test-only replacement for @iobroker/adapter-core.
// The real package calls process.exit(10) at import time when no js-controller is installed.
// Only the members used by src/main.ts and the unit test helpers are provided.
// I18n loads the real admin/i18n translations, so translated names stay identical to the adapter.
const fs = require('node:fs');
const path = require('node:path');

/** Translation table: key -> { [language]: text }. Filled by I18n.init. */
let words = null;
let language = 'en';

function assertInitialized() {
    if (!words) {
        throw new Error("i18n not initialized. Please call 'init(__dirname, language)' before");
    }
}

/**
 * Replaces `%s` placeholders with the given arguments.
 *
 * @param text
 * @param args
 */
function applyArgs(text, args) {
    let result = text;
    for (const arg of args) {
        result = result.replace('%s', arg === null ? 'null' : arg.toString());
    }
    return result;
}

async function init(rootDir, lang = 'en') {
    language = lang;
    const i18nDir = path.join(rootDir, 'i18n');
    words = {};

    for (const file of fs.readdirSync(i18nDir)) {
        if (!file.endsWith('.json')) {
            continue;
        }
        const wordsOfLanguage = JSON.parse(fs.readFileSync(path.join(i18nDir, file), 'utf8'));
        const lang = file.split('.')[0];

        for (const [key, text] of Object.entries(wordsOfLanguage)) {
            words[key] ??= {};
            words[key][lang] = text;
        }
    }
}

function translate(key, ...args) {
    assertInitialized();
    const entry = words[key];
    const text = entry ? entry[language] || entry.en || key : key;

    return applyArgs(text, args);
}

function getTranslatedObject(key, ...args) {
    assertInitialized();
    const entry = words[key];

    if (!entry) {
        return { en: key };
    }

    const result = {};
    for (const lang of Object.keys(entry)) {
        result[lang] = applyArgs(entry[lang], args);
    }

    return result;
}

/** Same minimal base class as the real Adapter for `class X extends utils.Adapter`. Methods are stubbed per test. */
class Adapter {
    constructor(options) {
        this.options = options;
        this.handlers = {};
    }

    /**
     * Stores the handler per event so tests can call it.
     *
     * @param event
     * @param handler
     */
    on(event, handler) {
        this.handlers[event] = handler;
        return this;
    }
}

const I18n = { init, translate, t: translate, getTranslatedObject };

function getAbsoluteDefaultDataDir() {
    return '';
}

module.exports = { Adapter, I18n, getAbsoluteDefaultDataDir };
