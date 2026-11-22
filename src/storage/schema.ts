import { countryCodes, demographics, sexes } from '../data/demographics';
import { activities, milestoneAt } from '../sim/actions';
import { crisisChoices } from '../sim/crisis';
import { plans } from '../sim/growth';
import type { LifeSnapshot } from '../sim/life';
import { closePersonIds } from '../sim/relationships';

export const schemaVersion = 1;

export interface SaveRecord {
  readonly schemaVersion: typeof schemaVersion;
  readonly revision: number;
  readonly life: LifeSnapshot;
}

export class InvalidSaveError extends Error {
  constructor(readonly reason: 'corrupt' | 'version' | 'data', readonly raw: unknown) {
    super(reason);
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}

function oneOf(value: unknown, allowed: readonly string[]): boolean {
  return typeof value === 'string' && allowed.includes(value);
}

function scores(value: unknown, keys: readonly string[]): boolean {
  return object(value) && keys.every((key) => integer(value[key], 0, 100));
}

function validPlan(value: unknown): boolean {
  return value === null || oneOf(value, plans);
}

function validBirth(birth: unknown): boolean {
  if (!object(birth)) return false;
  const { name, sex, countryOfBirth, family, startingHealth } = birth;
  return typeof name === 'string' && name.trim().length > 0 && oneOf(sex, sexes)
    && oneOf(countryOfBirth, countryCodes) && oneOf(startingHealth, ['typical', 'needs-support'])
    && object(family) && oneOf(family.caregivers, ['two-parents', 'one-parent', 'other-guardians'])
    && integer(family.olderSiblings, 0, 3) && oneOf(family.means, ['limited', 'moderate', 'high']);
}

function validDevelopment(value: unknown): boolean {
  return object(value) && scores(value.skills, ['academics', 'creativity', 'communication'])
    && scores(value.interests, plans) && scores(value.character, ['discipline', 'openness'])
    && integer(value.appearance, 0, 100) && validPlan(value.plan)
    && oneOf(value.education, ['general', 'vocational', 'higher'])
    && oneOf(value.employment, ['unemployed', 'entry-level', 'specialist', 'retired'])
    && integer(value.funds) && integer(value.nextAdmissionAge);
}

function validRelationships(value: unknown, age: number): boolean {
  return Array.isArray(value) && value.length >= 1 && value.length <= closePersonIds.length
    && value.every((entry: unknown) => object(entry) && oneOf(entry.id, closePersonIds)
      && integer(entry.trust, 0, 100) && Array.isArray(entry.memories)
      && entry.memories.every((memory: unknown) => object(memory) && integer(memory.ageInMonths, 0, age)
        && oneOf(memory.kind, ['shared-reading', 'shared-play', 'club', 'volunteering', 'asked-for-help'])))
    && value.some((entry) => entry.id === 'caregiver')
    && new Set(value.map((entry) => entry.id)).size === value.length;
}

function validEvent(event: Record<string, unknown>): boolean {
  switch (event.type) {
    case 'birth': return event.ageInMonths === 0;
    case 'childhood-year': return [12, 24, 36, 48].includes(Number(event.ageInMonths));
    case 'death': return true;
    case 'plan': return validPlan(event.plan);
    case 'childhood-choice':
      return event.ageInMonths === 48 && oneOf(event.choice, ['read-with-caregiver', 'play-with-peers']);
    case 'crisis':
      return typeof event.message === 'string'
        && (event.choice === undefined || oneOf(event.choice, crisisChoices));
    case 'action':
      return object(event.action)
        && (event.action.id === 'move' ? oneOf(event.action.destination, countryCodes)
          : oneOf(event.action.id, Object.keys(activities)))
        && typeof event.succeeded === 'boolean'
        && typeof event.chance === 'number' && event.chance > 0 && event.chance <= 1;
    default: return false;
  }
}

function validChronicle(value: unknown, age: number, status: unknown): boolean {
  if (!Array.isArray(value) || value[0]?.type !== 'birth') return false;
  let previousAge = 0;
  for (const [index, event] of value.entries()) {
    if (!object(event) || !integer(event.ageInMonths, previousAge, age) || !validEvent(event)) return false;
    if (event.type === 'birth' && index > 0) return false;
    if (event.type === 'death'
      && (status !== 'dead' || index !== value.length - 1 || event.ageInMonths !== age)) return false;
    previousAge = event.ageInMonths;
  }
  return status !== 'dead' || value.at(-1)?.type === 'death';
}

function validLife(value: unknown): value is LifeSnapshot {
  if (!object(value)) return false;
  const { ageInMonths, status, wellbeing } = value;
  if (!integer(ageInMonths) || !object(status) || !object(wellbeing)) return false;
  if (!oneOf(status.type, ['active', 'decision', 'dead'])) return false;
  if (status.type === 'decision') {
    const decision = status.decision;
    const milestone = milestoneAt(ageInMonths);
    if (!(decision === 'first-childhood-activity' && ageInMonths === 48)
      && !(milestone && decision === milestone)
      && !(decision === 'school-crisis'
        && ((wellbeing.phase === 'strain' && ageInMonths === 180)
          || (wellbeing.phase === 'withdrawn' && ageInMonths === 183)))) return false;
  }
  return validBirth(value.birth) && oneOf(value.countryOfResidence, countryCodes)
    && integer(value.seed, 0, 0xffff_ffff) && integer(value.randomState, 0, 0xffff_ffff)
    && validDevelopment(value.development) && validRelationships(value.relationships, ageInMonths)
    && integer(wellbeing.mood, 0, 100) && integer(wellbeing.monthsInPhase, 0, ageInMonths)
    && oneOf(wellbeing.phase, ['none', 'strain', 'withdrawn', 'recovering', 'resolved'])
    && typeof wellbeing.support === 'boolean' && validChronicle(value.chronicle, ageInMonths, status.type);
}

export function decodeSave(raw: unknown): SaveRecord {
  if (!object(raw) || !integer(raw.schemaVersion, 1)) throw new InvalidSaveError('corrupt', raw);

  // Each future version adds an explicit migration from its predecessor here.
  if (raw.schemaVersion !== schemaVersion) throw new InvalidSaveError('version', raw);
  if (!integer(raw.revision, 1) || !validLife(raw.life)) throw new InvalidSaveError('corrupt', raw);
  if (raw.life.demographicsVersion !== demographics.version) throw new InvalidSaveError('data', raw);
  return { schemaVersion, revision: raw.revision, life: raw.life };
}
