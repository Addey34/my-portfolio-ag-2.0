import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { URL, fileURLToPath, pathToFileURL } from 'node:url';

const severities = ['info', 'low', 'moderate', 'high', 'critical'];
const deadline = Date.parse('2026-12-18T00:00:00.000Z');
const exceptions = Object.freeze({
  'GHSA-fc5q-39xc-vjpf': { name: 'picomatch', version: '4.0.7', severity: 'high', expiresBefore: deadline },
  'GHSA-g3hv-75wg-m249': { name: 'minimatch', version: '10.2.5', severity: 'moderate', expiresBefore: deadline },
});

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function evaluateAudit({ report, status, scope, now, paths }) {
  if (!['production', 'full'].includes(scope) || !Number.isFinite(now)) throw new Error('Contexte invalide');
  if (!object(paths) || Object.keys(paths).sort().join(',') !== Object.keys(exceptions).sort().join(',')) throw new Error('Liste de chemins invalide');
  for (const [id, allowed] of Object.entries(paths)) {
    if (!Array.isArray(allowed) || allowed.length === 0 || allowed.some(p => typeof p !== 'string' || !p.startsWith('.>') || !p.endsWith(`>${exceptions[id].name}`)) || new Set(allowed).size !== allowed.length) throw new Error('Liste de chemins invalide');
  }
  if (!object(report) || report.error !== undefined || !object(report.advisories) || !object(report.metadata) || !object(report.metadata.vulnerabilities)) throw new Error('Rapport invalide');
  const metadata = report.metadata;
  for (const key of ['dependencies', 'devDependencies', 'optionalDependencies', 'totalDependencies']) {
    if (!Number.isSafeInteger(metadata[key]) || metadata[key] < 0) throw new Error('Compteurs de dependances invalides');
  }
  if (metadata.dependencies + metadata.devDependencies !== metadata.totalDependencies || metadata.optionalDependencies > metadata.totalDependencies) throw new Error('Compteurs de dependances incoherents');
  const counts = report.metadata.vulnerabilities;
  if (Object.keys(counts).sort().join(',') !== [...severities].sort().join(',') || severities.some(s => !Number.isSafeInteger(counts[s]) || counts[s] < 0)) throw new Error('Compteurs invalides');
  const entries = Object.entries(report.advisories);
  if (status !== (entries.length ? 1 : 0)) throw new Error('Code de collecte incoherent');
  const observed = Object.fromEntries(severities.map(s => [s, 0]));
  const seen = new Set();
  for (const [key, advisory] of entries) {
    if (!object(advisory) || String(advisory.id) !== key || !severities.includes(advisory.severity) || typeof advisory.github_advisory_id !== 'string') throw new Error('Avis invalide');
    observed[advisory.severity] += 1;
    if (scope === 'production') throw new Error('Avis de production interdit');
    const id = advisory.github_advisory_id;
    const rule = Object.hasOwn(exceptions, id) ? exceptions[id] : null;
    if (!rule || seen.has(id) || advisory.module_name !== rule.name || advisory.severity !== rule.severity || now >= rule.expiresBefore) throw new Error('Avis ou exception interdit');
    seen.add(id);
    if (!Array.isArray(advisory.findings) || advisory.findings.length === 0) throw new Error('Findings absents');
    for (const finding of advisory.findings) {
      if (!object(finding) || finding.dev !== true || finding.version !== rule.version || !Array.isArray(finding.paths) || finding.paths.length === 0 || finding.paths.some(p => typeof p !== 'string' || !paths[id].includes(p))) throw new Error('Version, portee ou chemin non approuve');
    }
  }
  if (severities.some(s => observed[s] !== counts[s])) throw new Error('Compteurs incoherents');
  return entries.map(([, a]) => a.github_advisory_id);
}

export function parseCollection(result) {
  if (!object(result) || result.error || result.signal || !Number.isInteger(result.status) || ![0, 1].includes(result.status) || typeof result.stdout !== 'string' || typeof result.stderr !== 'string' || result.stderr.trim() !== '') throw new Error('Collecte audit echouee');
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error('JSON audit invalide');
  }
}

function main() {
  const paths = JSON.parse(readFileSync(fileURLToPath(new URL('./audit-policy-paths.json', import.meta.url)), 'utf8'));
  for (const scope of ['production', 'full']) {
    const args = ['audit', '--json', ...(scope === 'production' ? ['--prod'] : [])];
    const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
    const result = spawnSync(command, args, { encoding: 'utf8', shell: process.platform === 'win32', timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
    const report = parseCollection(result);
    const accepted = evaluateAudit({ report, status: result.status, scope, now: Date.now(), paths });
    console.log(`${scope}: ${accepted.length ? 'PASS_WITH_EXCEPTION' : 'PASS'}${accepted.length ? ` (${accepted.join(', ')})` : ''}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(`Audit bloque: ${error instanceof Error ? error.message : 'erreur inconnue'}`);
    process.exitCode = 1;
  }
}
