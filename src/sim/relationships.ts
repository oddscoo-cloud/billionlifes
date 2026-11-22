import type { CountryCode } from '../data/demographics';
import type { WorldEventId } from '../data/world-events';

export const closePersonIds = ['caregiver', 'friend', 'colleague', 'neighbor'] as const;
export type ClosePersonId = (typeof closePersonIds)[number];

export const memoryKinds = ['shared-reading', 'shared-play', 'club', 'volunteering', 'asked-for-help', 'shared-hardship', 'took-distance'] as const;

export type Memory = { readonly ageInMonths: number } & (
  | { readonly kind: (typeof memoryKinds)[number] }
  | { readonly kind: 'world'; readonly event: WorldEventId }
);

export interface Relationship {
  readonly id: ClosePersonId;
  readonly trust: number;
  readonly country?: CountryCode;
  readonly memories: readonly Memory[];
}

export function initialRelationships(): readonly Relationship[] {
  return [{ id: 'caregiver', trust: 50, memories: [] }];
}

export function remember(
  relationships: readonly Relationship[], id: ClosePersonId, memory: Memory, trust: number, country?: CountryCode,
): readonly Relationship[] {
  const person = relationships.find((entry) => entry.id === id);
  const place = person?.country ?? country;
  const next = {
    id,
    ...(place ? { country: place } : {}),
    trust: Math.max(0, Math.min(100, (person?.trust ?? 35) + trust)),
    memories: [...(person?.memories ?? []), memory],
  };
  return person ? relationships.map((entry) => entry.id === id ? next : entry) : [...relationships, next];
}
