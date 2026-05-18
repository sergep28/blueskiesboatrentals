// Single source of truth for loyalty tier rules.
// 1 point = $1 of lifetime spend. Tiers are permanent once earned.

export type TierKey = 'crew' | 'first_mate' | 'captain';

export interface Tier {
  key: TierKey;
  name: string;
  minPoints: number;
  discount: number; // fraction off subtotal, e.g. 0.05 = 5%
}

export const TIERS: Tier[] = [
  { key: 'crew',       name: 'Crew',       minPoints: 0,    discount: 0    },
  { key: 'first_mate', name: 'First Mate', minPoints: 2500, discount: 0.05 },
  { key: 'captain',    name: 'Captain',    minPoints: 5000, discount: 0.10 },
];

export function getTier(lifetimePoints: number): Tier {
  // Walk highest-to-lowest so the top eligible tier wins.
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (lifetimePoints >= TIERS[i].minPoints) return TIERS[i];
  }
  return TIERS[0];
}

export function getDiscount(lifetimePoints: number): number {
  return getTier(lifetimePoints).discount;
}

export function pointsToNextTier(lifetimePoints: number): { tier: Tier | null; pointsNeeded: number } {
  const current = getTier(lifetimePoints);
  const currentIdx = TIERS.findIndex(t => t.key === current.key);
  const next = TIERS[currentIdx + 1];
  if (!next) return { tier: null, pointsNeeded: 0 };
  return { tier: next, pointsNeeded: next.minPoints - lifetimePoints };
}
