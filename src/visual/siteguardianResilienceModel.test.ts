import { describe, expect, it } from 'vitest';
import {
  HISTORY_LIMIT,
  SCENARIOS,
  SiteguardianResilienceModel,
} from './siteguardianResilienceModel';

describe('supervision pédagogique SiteGuardian', () => {
  it.each([2, 3, 4])(
    'applique le seuil configurable %i dans les deux directions',
    (threshold) => {
      const model = new SiteguardianResilienceModel();
      model.configure({ failure: threshold, recovery: threshold });
      for (let i = 1; i < threshold; i++) {
        model.probe('failure');
        expect(model.snapshot().state).toBe('suspected');
      }
      model.probe('failure');
      expect(model.snapshot().state).toBe('incident');
      for (let i = 1; i < threshold; i++) {
        model.probe('success');
        expect(model.snapshot().state).toBe('recovering');
      }
      model.probe('success');
      expect(model.snapshot()).toMatchObject({
        state: 'operational',
        opened: 1,
        resolved: 1,
      });
    }
  );
  it('ignore une anomalie isolée et revient opérationnel', () => {
    const model = new SiteguardianResilienceModel();
    model.probe('failure');
    expect(model.snapshot().state).toBe('suspected');
    model.probe('success');
    expect(model.snapshot()).toMatchObject({
      state: 'operational',
      opened: 0,
      active: null,
    });
  });
  it('confirme exactement au seuil et ne duplique pas une alerte', () => {
    const model = new SiteguardianResilienceModel();
    for (let i = 0; i < 2; i++) model.probe('failure');
    expect(model.snapshot().opened).toBe(0);
    for (let i = 0; i < 12; i++) model.probe('failure');
    expect(model.snapshot()).toMatchObject({
      opened: 1,
      active: 'I01',
      state: 'incident',
    });
    expect(
      model.snapshot().history.filter((row) => row.event === 'opened')
    ).toHaveLength(1);
  });
  it('une rechute conserve le même incident et remet la récupération à zéro', () => {
    const model = new SiteguardianResilienceModel();
    for (let i = 0; i < 3; i++) model.probe('failure');
    model.probe('success');
    model.probe('failure');
    expect(model.snapshot()).toMatchObject({
      active: 'I01',
      opened: 1,
      successes: 0,
      state: 'incident',
    });
    expect(model.snapshot().history[4]?.event).toBe('relapse');
    model.probe('success');
    model.probe('success');
    expect(model.snapshot().state).toBe('recovering');
    model.probe('success');
    expect(model.snapshot()).toMatchObject({
      active: null,
      state: 'operational',
      resolved: 1,
    });
    expect(model.snapshot().history[7]).toMatchObject({
      incident: 'I01',
      event: 'resolved',
    });
    for (let i = 0; i < 3; i++) model.probe('failure');
    expect(model.snapshot().active).toBe('I02');
  });
  it('change les seuils sans effet rétroactif et conserve un incident actif', () => {
    const model = new SiteguardianResilienceModel();
    model.probe('failure');
    model.probe('failure');
    const past = model.snapshot().history;
    expect(model.configure({ failure: 2, recovery: 4 })).toBe(true);
    expect(model.snapshot()).toMatchObject({
      state: 'operational',
      failures: 0,
      opened: 0,
    });
    expect(model.snapshot().history).toEqual(past);
    model.probe('failure');
    model.probe('failure');
    model.probe('success');
    model.configure({ failure: 4, recovery: 2 });
    expect(model.snapshot()).toMatchObject({
      active: 'I01',
      state: 'incident',
      successes: 0,
    });
    model.probe('success');
    expect(model.snapshot().state).toBe('recovering');
    model.probe('success');
    expect(model.snapshot().resolved).toBe(1);
  });
  it('refuse des seuils invalides sans mutation et protège les instantanés', () => {
    const model = new SiteguardianResilienceModel();
    model.probe('failure');
    const before = model.snapshot();
    for (const value of [0, 1, 5, NaN, Infinity, 2.5])
      expect(model.configure({ failure: value, recovery: 3 })).toBe(false);
    expect(model.snapshot()).toEqual(before);
    before.thresholds.failure = 4;
    before.history[0].thresholds.failure = 4;
    expect(model.snapshot().thresholds.failure).toBe(3);
    expect(model.snapshot().history[0].thresholds.failure).toBe(3);
  });
  it.each(Object.keys(SCENARIOS) as (keyof typeof SCENARIOS)[])(
    'rejoue %s de façon déterministe après reset',
    (name) => {
      const model = new SiteguardianResilienceModel();
      SCENARIOS[name].forEach((probe) => model.probe(probe));
      const first = model.snapshot();
      expect(first.state).toBe('operational');
      expect(first.opened).toBe(name === 'isolated' ? 0 : 1);
      expect(first.resolved).toBe(first.opened);
      model.reset();
      SCENARIOS[name].forEach((probe) => model.probe(probe));
      expect(model.snapshot()).toEqual(first);
    }
  );
  it('borne les ressources et garde des séquences uniques croissantes', () => {
    const model = new SiteguardianResilienceModel();
    for (let i = 0; i < 200; i++) model.probe('success');
    const rows = model.snapshot().history;
    expect(rows).toHaveLength(HISTORY_LIMIT);
    expect(new Set(rows.map((row) => row.sequence)).size).toBe(HISTORY_LIMIT);
    expect(rows[rows.length - 1]?.sequence).toBe(200);
    model.reset();
    expect(model.snapshot()).toMatchObject({
      history: [],
      opened: 0,
      resolved: 0,
      thresholds: { failure: 3, recovery: 3 },
    });
  });
});
