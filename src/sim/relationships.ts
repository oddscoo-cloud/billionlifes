import type { CountryCode } from '../data/demographics';
import type { WorldEventId } from '../data/world-events';

export const closePersonIds = ['caregiver', 'friend', 'colleague', 'neighbor'] as const;
export type ClosePersonId = (typeof closePersonIds)[number];
export const friendRoles = ['friend', 'confidant', 'mentor', 'rival', 'distant'] as const;
export type FriendRole = (typeof friendRoles)[number];

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
  readonly role?: FriendRole;
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
    ...(id === 'friend' ? { role: roleForTrust(Math.max(0, Math.min(100, (person?.trust ?? 35) + trust)), person?.role) } : {}),
  };
  return person ? relationships.map((entry) => entry.id === id ? next : entry) : [...relationships, next];
}

function roleForTrust(trust: number, previous?: FriendRole): FriendRole {
  if (trust >= 80) return 'confidant';
  if (trust <= 20) return 'distant';
  if (previous === 'confidant' || previous === 'distant') return 'friend';
  return previous ?? 'friend';
}
