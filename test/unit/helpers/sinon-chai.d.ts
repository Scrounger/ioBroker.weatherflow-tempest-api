/**
 * Typen für die sinon-chai-Assertions (`to.have.been.calledOnce` usw.).
 *
 * Die Root-`tsconfig.json` begrenzt `types` auf `node` und `mocha`, daher lädt der
 * Compiler `@types/sinon-chai` nicht automatisch. Diese Datei ist Teil von `test/**`
 * und damit im Projekt-Include; sie wirkt für alle Testdateien.
 */
/// <reference types="sinon-chai" />
