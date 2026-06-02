import { describe, it, expect } from 'vitest';
import {
  createClockGenerator,
  formatTime,
  angleFor,
  type ClockTime,
} from '../problems';

describe('clock-builder generator', () => {
  it('targets are always valid clock times within the configured 5-minute set', () => {
    const g = createClockGenerator();
    for (let i = 0; i < 500; i++) {
      const p = g.next();
      // hour 1..12
      expect(p.hour).toBeGreaterThanOrEqual(1);
      expect(p.hour).toBeLessThanOrEqual(12);
      expect(Number.isInteger(p.hour)).toBe(true);
      // minute is a multiple of 5
      expect(p.minute % 5).toBe(0);
      // minute within 0..55
      expect(p.minute).toBeGreaterThanOrEqual(0);
      expect(p.minute).toBeLessThanOrEqual(55);
      expect(Number.isInteger(p.minute)).toBe(true);
    }
  });

  it('easy generator only produces o\'clock and half-past (minutes 0 or 30)', () => {
    const g = createClockGenerator({ minuteStep: 30 });
    for (let i = 0; i < 300; i++) {
      const p = g.next();
      expect([0, 30]).toContain(p.minute);
      expect(p.hour).toBeGreaterThanOrEqual(1);
      expect(p.hour).toBeLessThanOrEqual(12);
    }
  });

  it('grade-3 generator produces every 5-minute mark', () => {
    const g = createClockGenerator({ minuteStep: 5 });
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(g.next().minute);
    // all minutes are multiples of 5 in 0..55
    for (const m of seen) {
      expect(m % 5).toBe(0);
      expect(m).toBeLessThanOrEqual(55);
    }
    // realistically hits more than just {0,30}
    expect(seen.size).toBeGreaterThan(2);
  });

  it('check() is strict: true only when BOTH hour and minute match the target', () => {
    const g = createClockGenerator();
    const target: ClockTime = { hour: 3, minute: 30 };

    expect(g.check(target, { hour: 3, minute: 30 })).toBe(true);

    // off-by-5-minutes → false
    expect(g.check(target, { hour: 3, minute: 25 })).toBe(false);
    expect(g.check(target, { hour: 3, minute: 35 })).toBe(false);
    // wrong hour → false
    expect(g.check(target, { hour: 4, minute: 30 })).toBe(false);
    expect(g.check(target, { hour: 2, minute: 30 })).toBe(false);
    // both wrong → false
    expect(g.check(target, { hour: 9, minute: 15 })).toBe(false);
  });

  it('check() rejects malformed answers (types, NaN, null, objects)', () => {
    const g = createClockGenerator();
    const target: ClockTime = { hour: 7, minute: 5 };
    expect(g.check(target, null)).toBe(false);
    expect(g.check(target, undefined)).toBe(false);
    expect(g.check(target, 705)).toBe(false);
    expect(g.check(target, '7:05')).toBe(false);
    expect(g.check(target, {})).toBe(false);
    expect(g.check(target, { hour: 7 })).toBe(false);
    expect(g.check(target, { minute: 5 })).toBe(false);
    expect(g.check(target, { hour: NaN, minute: 5 })).toBe(false);
    expect(g.check(target, { hour: 7, minute: NaN })).toBe(false);
    expect(g.check(target, { hour: '7', minute: '5' })).toBe(false);
    expect(g.check(target, { hour: 7, minute: 5, extra: 1 })).toBe(true);
  });
});

describe('formatTime', () => {
  it('zero-pads minutes and keeps the hour bare', () => {
    expect(formatTime(7, 5)).toBe('7:05');
    expect(formatTime(3, 30)).toBe('3:30');
    expect(formatTime(12, 0)).toBe('12:00');
    expect(formatTime(1, 0)).toBe('1:00');
    expect(formatTime(10, 55)).toBe('10:55');
  });
});

describe('angleFor (clockwise from +Y top)', () => {
  const T = 1e-6;

  it('12 o\'clock (value 0) points UP (+Y): tip ≈ (0, len)', () => {
    const theta = angleFor(0, 12); // hour at 12
    expect(Math.sin(theta)).toBeCloseTo(0, 6);
    expect(Math.cos(theta)).toBeCloseTo(1, 6);
  });

  it('3 o\'clock points RIGHT (+X): tip ≈ (len, 0)', () => {
    const theta = angleFor(3, 12);
    expect(Math.sin(theta)).toBeCloseTo(1, 6); // x = sin θ
    expect(Math.cos(theta)).toBeCloseTo(0, 6); // y = cos θ
  });

  it('6 o\'clock points DOWN (−Y): tip ≈ (0, -len)', () => {
    const theta = angleFor(6, 12);
    expect(Math.sin(theta)).toBeCloseTo(0, 6);
    expect(Math.cos(theta)).toBeCloseTo(-1, 6);
  });

  it('9 o\'clock points LEFT (−X): tip ≈ (-len, 0)', () => {
    const theta = angleFor(9, 12);
    expect(Math.sin(theta)).toBeCloseTo(-1, 6);
    expect(Math.cos(theta)).toBeCloseTo(0, 6);
  });

  it('minute hand at 15 minutes (value 15 of 60) points RIGHT (+X)', () => {
    const theta = angleFor(15, 60);
    expect(Math.sin(theta)).toBeCloseTo(1, 6);
    expect(Math.cos(theta)).toBeCloseTo(0, 6);
  });

  it('hour hand is proportional: 3:30 sits halfway between 3 and 4', () => {
    const at330 = angleFor(3 + 30 / 60, 12);
    const at3 = angleFor(3, 12);
    const at4 = angleFor(4, 12);
    expect(at330).toBeCloseTo((at3 + at4) / 2, 6);
    // and it is NOT pinned on the hour
    expect(Math.abs(at330 - at3)).toBeGreaterThan(T);
  });
});
