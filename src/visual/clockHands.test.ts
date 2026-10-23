import { describe, expect, it } from 'vitest';
import { clockHandAngles } from './clockHands';

const turns = (angle: number) => -angle / (Math.PI * 2);

describe('aiguilles de l’horloge', () => {
  it('aligne les trois aiguilles sur leurs graduations à midi', () => {
    const angles = clockHandAngles(new Date(2026, 9, 19, 12, 0, 0, 0));
    expect(turns(angles.hour)).toBe(0);
    expect(turns(angles.minute)).toBe(0);
    expect(turns(angles.second)).toBe(0);
  });

  it('place la petite aiguille entre deux chiffres selon les minutes et secondes', () => {
    const angles = clockHandAngles(new Date(2026, 9, 19, 3, 15, 30, 500));
    const secondTurn = 30.5 / 60;
    const minuteTurn = (15 + secondTurn) / 60;
    expect(turns(angles.second)).toBeCloseTo(secondTurn, 8);
    expect(turns(angles.minute)).toBeCloseTo(minuteTurn, 8);
    expect(turns(angles.hour)).toBeCloseTo((3 + minuteTurn) / 12, 8);
  });

  it('avance sans palier entre deux secondes et rejoint exactement le repère suivant', () => {
    const before = clockHandAngles(new Date(2026, 9, 19, 6, 29, 59, 500));
    const after = clockHandAngles(new Date(2026, 9, 19, 6, 30, 0, 0));
    expect(turns(after.second)).toBe(0);
    expect(turns(after.minute) - turns(before.minute)).toBeCloseTo(
      0.5 / 3600,
      8
    );
    expect(turns(after.hour) - turns(before.hour)).toBeCloseTo(0.5 / 43200, 8);
    expect(turns(after.hour)).toBeCloseTo(6.5 / 12, 8);
  });

  it('fait avancer chaque aiguille à sa vitesse mécanique continue', () => {
    const before = clockHandAngles(new Date(2026, 9, 19, 10, 20, 20, 250));
    const after = clockHandAngles(new Date(2026, 9, 19, 10, 20, 21, 250));
    expect(turns(after.second) - turns(before.second)).toBeCloseTo(1 / 60, 10);
    expect(turns(after.minute) - turns(before.minute)).toBeCloseTo(
      1 / 3600,
      10
    );
    expect(turns(after.hour) - turns(before.hour)).toBeCloseTo(1 / 43200, 10);
  });

  it('répartit le passage au repère minute suivant sur les 60 secondes', () => {
    const samples = [0, 20, 40].map((second) =>
      turns(clockHandAngles(new Date(2026, 9, 19, 10, 20, second)).minute)
    );
    samples.push(
      turns(clockHandAngles(new Date(2026, 9, 19, 10, 21, 0)).minute)
    );
    const step = 1 / 60 / 3;
    for (let index = 1; index < samples.length; index++) {
      expect(samples[index] - samples[index - 1]).toBeCloseTo(step, 10);
    }
  });
});
