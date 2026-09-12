import { addDays, daysBetween, isBefore, isDayKey, localHour, toDayKey } from '../dates';

describe('toDayKey', () => {
  it('rend le jour LOCAL, avec zéros de tête', () => {
    expect(toDayKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    expect(toDayKey(new Date(2026, 8, 9, 0, 1))).toBe('2026-09-09');
  });

  it('ne bascule pas de jour à cause d’UTC', () => {
    // 23 h 30 locale un 5 janvier reste le 5, même si UTC est déjà au 6.
    expect(toDayKey(new Date(2026, 0, 5, 23, 59, 59))).toBe('2026-01-05');
  });
});

describe('addDays', () => {
  it('avance et recule d’un jour', () => {
    expect(addDays('2026-09-09', 1)).toBe('2026-09-10');
    expect(addDays('2026-09-09', -1)).toBe('2026-09-08');
    expect(addDays('2026-09-09', 0)).toBe('2026-09-09');
  });

  it('traverse les fins de mois et d’année', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('connaît les années bissextiles', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('n’est pas troublé par le changement d’heure', () => {
    // Nuit de 23 h en France (heure d'été), fin mars.
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    // Nuit de 25 h, fin octobre.
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
  });
});

describe('daysBetween', () => {
  it('compte les jours calendaires', () => {
    expect(daysBetween('2026-09-08', '2026-09-09')).toBe(1);
    expect(daysBetween('2026-09-09', '2026-09-09')).toBe(0);
    expect(daysBetween('2026-09-09', '2026-09-07')).toBe(-2);
    expect(daysBetween('2026-10-25', '2026-10-26')).toBe(1);
  });
});

describe('isBefore', () => {
  it('compare des étiquettes de jour lexicographiquement', () => {
    expect(isBefore('2026-09-08', '2026-09-09')).toBe(true);
    expect(isBefore('2026-09-09', '2026-09-08')).toBe(false);
  });
});

describe('isDayKey', () => {
  it('accepte le format et rejette le reste', () => {
    expect(isDayKey('2026-09-09')).toBe(true);
    expect(isDayKey('2026-9-9')).toBe(false);
    expect(isDayKey('2026-09-09T10:00:00Z')).toBe(false);
    expect(isDayKey(20260909)).toBe(false);
    expect(isDayKey(null)).toBe(false);
  });
});

describe('localHour', () => {
  it('rend l’heure locale', () => {
    expect(localHour(new Date(2026, 8, 9, 6, 15))).toBe(6);
    expect(localHour(new Date(2026, 8, 9, 23, 59))).toBe(23);
  });
});
