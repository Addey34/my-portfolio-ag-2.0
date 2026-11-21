import { expect, it } from 'vitest';
import { magnotesOrganization } from './magnotesLayout';

it('réorganise les mêmes fiches de façon bornée et réversible au scroll', () => {
  const forward = [0, 0.18, 0.44, 0.7, 1].map((p) =>
    magnotesOrganization('magnotes', p, false)
  );
  expect(forward).toEqual([0, 0, 0.5, 1, 1]);
  expect(
    [1, 0.7, 0.44, 0.18, 0].map((p) =>
      magnotesOrganization('magnotes', p, false)
    )
  ).toEqual([...forward].reverse());
});

it('ne réouvre pas les fiches quand la scène suivante remet sa progression à zéro', () => {
  expect(magnotesOrganization('ludora', 0.9, false)).toBe(0);
  expect(magnotesOrganization('studies', 0, false)).toBe(1);
  expect(magnotesOrganization('contact', 0, false)).toBe(1);
});

it('garde un registre fixe en mouvement réduit et sans scène initialisée', () => {
  expect(magnotesOrganization('magnotes', 0, true)).toBe(1);
  expect(magnotesOrganization(undefined, 0, false)).toBe(0);
});
