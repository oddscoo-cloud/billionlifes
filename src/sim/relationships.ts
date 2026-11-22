export const closePersonIds = ['caregiver', 'friend'] as const;
export type ClosePersonId = (typeof closePersonIds)[number];

export interface Memory {
  readonly ageInMonths: number;
  readonly kind: 'shared-reading' | 'shared-play' | 'club' | 'volunteering' | 'asked-for-help';
}

export interface Relationship {
  readonly id: ClosePersonId;
  readonly trust: number;
  readonly memories: readonly Memory[];
}

export function initialRelationships(): readonly Relationship[] {
  return [{ id: 'caregiver', trust: 50, memories: [] }];
}

export function remember(
  relationships: readonly Relationship[], id: ClosePersonId, memory: Memory, trust: number,
): readonly Relationship[] {
  const person = relationships.find((entry) => entry.id === id);
  const next = {
    id,
    trust: Math.min(100, (person?.trust ?? 35) + trust),
    memories: [...(person?.memories ?? []), memory],
  };
  return person ? relationships.map((entry) => entry.id === id ? next : entry) : [...relationships, next];
}
