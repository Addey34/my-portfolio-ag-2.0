import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { evaluateAudit, parseCollection } from './audit-policy.mjs';

const paths = JSON.parse(readFileSync(new URL('./audit-policy-paths.json', import.meta.url), 'utf8'));
const now = Date.parse('2026-11-18T12:00:00.000Z');
const expiry = Date.parse('2026-12-18T00:00:00.000Z');
const make = () => ({
  advisories: {
    1244623: { id: 1244623, github_advisory_id: 'GHSA-g3hv-75wg-m249', module_name: 'minimatch', severity: 'moderate', findings: [{ version: '10.2.5', dev: true, paths: [paths['GHSA-g3hv-75wg-m249'][0]] }] },
    1247710: { id: 1247710, github_advisory_id: 'GHSA-fc5q-39xc-vjpf', module_name: 'picomatch', severity: 'high', findings: [{ version: '4.0.7', dev: true, paths: [paths['GHSA-fc5q-39xc-vjpf'][0]] }] },
  },
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 1, high: 1, critical: 0 }, dependencies: 3, devDependencies: 192, optionalDependencies: 55, totalDependencies: 195 },
});
const validate = (report = make(), overrides = {}) => evaluateAudit({ report, status: 1, scope: 'full', now, paths, ...overrides });
const rejects = (name, mutate, overrides = {}) => test(name, () => {
  const report = make();
  mutate(report);
  assert.throws(() => validate(report, overrides));
});

test('accepte exactement les deux avis autorises et les chemins approuves', () => assert.equal(validate().length, 2));
test('accepte un rapport de production vide et coherent', () => {
  const r = make(); r.advisories = {}; r.metadata.vulnerabilities.high = 0; r.metadata.vulnerabilities.moderate = 0;
  assert.deepEqual(validate(r, { scope: 'production', status: 0 }), []);
});
test('accepte la derniere milliseconde avant expiration', () => assert.equal(validate(make(), { now: expiry - 1 }).length, 2));
test('refuse les exceptions a leur expiration UTC', () => assert.throws(() => validate(make(), { now: expiry })));
test('refuse un contexte temporel invalide', () => assert.throws(() => validate(make(), { now: NaN })));
test('refuse un avis en production', () => assert.throws(() => validate(make(), { scope: 'production' })));
rejects('refuse findings absents', r => { delete r.advisories[1244623].findings; });
rejects('refuse findings vides', r => { r.advisories[1244623].findings = []; });
rejects('refuse paths absents', r => { delete r.advisories[1247710].findings[0].paths; });
rejects('refuse paths vides', r => { r.advisories[1247710].findings[0].paths = []; });
rejects('refuse un chemin non approuve', r => { r.advisories[1247710].findings[0].paths.push('.>attacker>picomatch'); });
rejects('refuse une dependance de production', r => { r.advisories[1247710].findings[0].dev = false; });
rejects('refuse une portee dev approximative', r => { r.advisories[1247710].findings[0].dev = 'true'; });
rejects('refuse une version differente', r => { r.advisories[1247710].findings[0].version = '4.0.6'; });
rejects('refuse une severite alteree', r => { r.advisories[1247710].severity = 'moderate'; });
rejects('refuse un autre paquet', r => { r.advisories[1247710].module_name = 'autre'; });
rejects('refuse un avis inconnu', r => { r.advisories[1247710].github_advisory_id = 'GHSA-xxxx-xxxx-xxxx'; });
rejects('refuse une cle incoherente', r => { r.advisories[1247710].id = 1; });
rejects('refuse les compteurs de severite incoherents', r => { r.metadata.vulnerabilities.high = 0; });
rejects('refuse des avis masques derriere des compteurs nuls', r => { r.advisories = {}; });
rejects('refuse les compteurs non entiers', r => { r.metadata.vulnerabilities.high = '1'; });
rejects('refuse une severite de compteur inconnue', r => { r.metadata.vulnerabilities.extra = 0; });
rejects('refuse les totaux de dependances incoherents', r => { r.metadata.totalDependencies = 1; });
rejects('refuse les metadonnees incompletes', r => { delete r.metadata.dependencies; });
rejects('refuse une erreur rapportee par le collecteur', r => { r.error = { code: 'failure' }; });
test('refuse un code de sortie nul avec des avis', () => assert.throws(() => validate(make(), { status: 0 })));
test('refuse un code de sortie inconnu', () => assert.throws(() => validate(make(), { status: 2 })));
test('refuse une liste de chemins manquante', () => assert.throws(() => validate(make(), { paths: {} })));
test('refuse une liste de chemins vide', () => assert.throws(() => validate(make(), { paths: { ...paths, 'GHSA-fc5q-39xc-vjpf': [] } })));
test('refuse un rapport absent', () => assert.throws(() => validate(null)));
test('refuse un JSON tronque', () => assert.throws(() => parseCollection({ status: 0, stdout: '{', stderr: '' })));
test('refuse une erreur de processus', () => assert.throws(() => parseCollection({ status: null, stdout: '', stderr: '', error: new Error('spawn') })));
test('refuse un processus interrompu', () => assert.throws(() => parseCollection({ status: null, stdout: '{}', stderr: '', signal: 'SIGTERM' })));
test('refuse une erreur de collecte', () => assert.throws(() => parseCollection({ status: 2, stdout: '{}', stderr: '' })));
test('accepte un JSON de collecte valide', () => assert.deepEqual(parseCollection({ status: 1, stdout: '{"ok":true}', stderr: '' }), { ok: true }));

rejects('REGRESSION 1 - compteur high non nul avec advisories vide', r => { r.advisories = {}; });
rejects('REGRESSION 2 - minimatch autorise sans findings', r => { delete r.advisories[1244623].findings; });
rejects('REGRESSION 3 - dev est la chaine false', r => { r.advisories[1244623].findings[0].dev = 'false'; });
rejects('REGRESSION 4 - chemin approuve et chemin inconnu ensemble', r => { r.advisories[1247710].findings[0].paths.push('.>inconnu>picomatch'); });
rejects('refuse findings null', r => { r.advisories[1244623].findings = null; });
rejects('refuse findings de type objet', r => { r.advisories[1244623].findings = {}; });
rejects('refuse dev null', r => { r.advisories[1244623].findings[0].dev = null; });
rejects('refuse dev numerique', r => { r.advisories[1244623].findings[0].dev = 1; });
rejects('refuse dev absent', r => { delete r.advisories[1244623].findings[0].dev; });
rejects('refuse findings de type texte', r => { r.advisories[1244623].findings = 'invalid'; });
rejects('refuse dev false explicite pour minimatch', r => { r.advisories[1244623].findings[0].dev = false; });
rejects('refuse un chemin ressemblant mais distinct', r => { r.advisories[1247710].findings[0].paths = [paths['GHSA-fc5q-39xc-vjpf'][0] + '>unexpected']; });
test('minimatch seul expire au seuil UTC', () => {
  const r = make(); delete r.advisories[1247710]; r.metadata.vulnerabilities.high = 0;
  assert.equal(validate(r, { now: expiry - 1 }).length, 1);
  assert.throws(() => validate(r, { now: expiry }));
});
test('picomatch seul expire au seuil UTC', () => {
  const r = make(); delete r.advisories[1244623]; r.metadata.vulnerabilities.moderate = 0;
  assert.equal(validate(r, { now: expiry - 1 }).length, 1);
  assert.throws(() => validate(r, { now: expiry }));
});

test('refuse un message de collecte en erreur', () => assert.throws(() => parseCollection({ status: 1, stdout: '{}', stderr: 'network error' })));
