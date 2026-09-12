import {
  ENERGY_REGEN_MINUTES,
  LESSON_ENERGY_COST,
  MAX_ENERGY,
  canStartLesson,
  currentEnergy,
  minutesToLesson,
  minutesToNextEnergy,
  modeCostsEnergy,
  refillEnergy,
  refundEnergy,
  settleEnergy,
  spendEnergy,
} from '../energy';
import type { EnergyState } from '../types';

const T0 = new Date('2026-09-09T10:00:00.000Z');
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60000);
const state = (value: number, updatedAt: string | null = T0.toISOString()): EnergyState => ({ value, updatedAt });

describe('modeCostsEnergy', () => {
  it('ne fait payer que les leçons et les sessions libres', () => {
    expect(modeCostsEnergy('unit')).toBe(true);
    expect(modeCostsEnergy('free')).toBe(true);
    expect(modeCostsEnergy('review')).toBe(false);
    expect(modeCostsEnergy('deck')).toBe(false);
  });
});

describe('currentEnergy', () => {
  it('est pleine sans historique', () => {
    expect(currentEnergy(state(0, null), T0)).toBe(MAX_ENERGY);
  });

  it('régénère un point toutes les 12 minutes, sans dépasser le plein', () => {
    expect(currentEnergy(state(10), at(11))).toBe(10);
    expect(currentEnergy(state(10), at(12))).toBe(11);
    expect(currentEnergy(state(10), at(12 * 20))).toBe(MAX_ENERGY);
  });

  it('ignore une horloge qui recule et un état déjà plein', () => {
    expect(currentEnergy(state(10), at(-60))).toBe(10);
    expect(currentEnergy(state(MAX_ENERGY), at(-60))).toBe(MAX_ENERGY);
  });
});

describe('settleEnergy', () => {
  it('matérialise la régénération en gardant le reste de période', () => {
    const s = settleEnergy(state(10), at(30));
    expect(s.value).toBe(12);
    // 2 points = 24 min : le compteur repart de T0 + 24 min, pas de T0 + 30.
    expect(s.updatedAt).toBe(at(24).toISOString());
  });

  it('cale le compteur sur maintenant quand c’est plein', () => {
    expect(settleEnergy(state(0, null), T0)).toEqual({ value: MAX_ENERGY, updatedAt: T0.toISOString() });
    expect(settleEnergy(state(24), at(12))).toEqual({ value: MAX_ENERGY, updatedAt: at(12).toISOString() });
  });
});

describe('spendEnergy / refundEnergy / refillEnergy', () => {
  it('dépense sans passer sous zéro', () => {
    expect(spendEnergy(state(3), 5, T0).value).toBe(0);
  });

  it('démarre le compteur à la première dépense depuis le plein', () => {
    const s = spendEnergy(state(0, null), LESSON_ENERGY_COST, at(5));
    expect(s).toEqual({ value: MAX_ENERGY - LESSON_ENERGY_COST, updatedAt: at(5).toISOString() });
  });

  it('conserve le compteur quand on dépense depuis un état partiel', () => {
    const s = spendEnergy(state(10), 1, at(30));
    expect(s).toEqual({ value: 11, updatedAt: at(24).toISOString() });
  });

  it('rembourse sans dépasser le plein', () => {
    expect(refundEnergy(state(24), 2, T0)).toEqual({ value: MAX_ENERGY, updatedAt: T0.toISOString() });
    expect(refundEnergy(state(10), 2, T0).value).toBe(12);
  });

  it('recharge complètement', () => {
    expect(refillEnergy(T0)).toEqual({ value: MAX_ENERGY, updatedAt: T0.toISOString() });
  });
});

describe('attentes', () => {
  it('canStartLesson exige 5 points', () => {
    expect(canStartLesson(state(5), T0)).toBe(true);
    expect(canStartLesson(state(4), T0)).toBe(false);
    expect(canStartLesson(state(4), at(12))).toBe(true);
  });

  it('minutesToNextEnergy compte depuis le reste de période', () => {
    expect(minutesToNextEnergy(state(MAX_ENERGY), T0)).toBe(0);
    expect(minutesToNextEnergy(state(10), at(5))).toBe(7);
    expect(minutesToNextEnergy(state(10), T0)).toBe(ENERGY_REGEN_MINUTES);
  });

  it('minutesToLesson additionne les points manquants', () => {
    expect(minutesToLesson(state(5), T0)).toBe(0);
    expect(minutesToLesson(state(0), T0)).toBe(5 * ENERGY_REGEN_MINUTES);
    expect(minutesToLesson(state(3), at(5))).toBe(7 + ENERGY_REGEN_MINUTES);
  });
});
