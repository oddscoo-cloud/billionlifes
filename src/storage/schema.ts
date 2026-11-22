import { romanceEvents } from '../sim/romance';
import { deathCauses } from '../sim/death-causes';
import { worldVariantCount } from '../data/world-event-variants';
import type { WorldEventId } from '../data/world-events';
import { turningPoints } from '../sim/turning-points';
import { griefChoices, initialParents, parentRoles } from '../sim/family';
import type { BirthConditions } from '../sim/birth';
import { countryCodes, demographics, sexes } from '../data/demographics';
import { activities, milestoneAt } from '../sim/actions';
import { crisisChoices } from '../sim/crisis';
import { plans } from '../sim/growth';
import type { LifeSnapshot } from '../sim/life';
import { eventEffects, worldEvents } from '../data/world-events';
import { diaryEntryLimit, diaryTextLimit } from '../sim/diary';
import { closePersonIds, memoryKinds } from '../sim/relationships';

export const schemaVersion = 5;

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

function validBirth(birth: unknown): birth is BirthConditions {
  if (!object(birth)) return false;
  const { name, sex, countryOfBirth, family, startingHealth } = birth;
  return typeof name === 'string' && name.trim().length > 0 && oneOf(sex, sexes)
    && oneOf(countryOfBirth, countryCodes) && oneOf(startingHealth, ['typical', 'needs-support'])
    && object(family) && oneOf(family.caregivers, ['two-parents', 'one-parent', 'other-guardians'])
    && integer(family.olderSiblings, 0, 5) && oneOf(family.means, ['limited', 'moderate', 'high']);
}

function validDevelopment(value: unknown): boolean {
  return object(value) && scores(value.skills, ['academics', 'creativity', 'communication', 'resilience', 'practical', 'empathy'])
    && scores(value.interests, plans)
    && integer(value.appearance, 0, 100) && validPlan(value.plan)
    && oneOf(value.education, ['general', 'vocational', 'higher'])
    && oneOf(value.employment, ['unemployed', 'entry-level', 'specialist', 'retired'])
    && integer(value.funds) && integer(value.nextAdmissionAge);
}

function validRelationships(value: unknown, age: number): boolean {
  return Array.isArray(value) && value.length >= 1 && value.length <= closePersonIds.length
    && value.every((entry: unknown) => object(entry) && oneOf(entry.id, closePersonIds)
      && integer(entry.trust, 0, 100) && (entry.country === undefined || oneOf(entry.country, countryCodes))
      && Array.isArray(entry.memories)
      && entry.memories.every((memory: unknown) => object(memory) && integer(memory.ageInMonths, 0, age)
        && (memory.kind === 'world' ? validWorldId(memory.event) : oneOf(memory.kind, memoryKinds))))
    && value.some((entry) => entry.id === 'caregiver')
    && new Set(value.map((entry) => entry.id)).size === value.length;
}

function validWorldId(id: unknown): id is WorldEventId {
  return typeof id === 'string' && Object.hasOwn(worldEvents, id);
}

function validDiary(value: unknown, age: number): boolean {
  if (!Array.isArray(value) || value.length > diaryEntryLimit) return false;
  let previousAge = 0;
  for (const entry of value) {
    if (!object(entry) || !integer(entry.ageInMonths, previousAge, age)
      || typeof entry.text !== 'string' || !entry.text.trim() || entry.text.length > diaryTextLimit) return false;
    previousAge = entry.ageInMonths;
  }
  return true;
}

function validTurningPoint(id: unknown): boolean {
  return typeof id === 'string' && Object.hasOwn(turningPoints, id);
}

function validEvent(event: Record<string, unknown>): boolean {
  switch (event.type) {
    case 'birth': return event.ageInMonths === 0;
    case 'childhood-year': return [12, 24, 36, 48].includes(Number(event.ageInMonths));
    case 'turning-point': return validTurningPoint(event.id);
    case 'turning-choice':
    case 'turning-consequence': return validTurningPoint(event.id) && (event.response === 0 || event.response === 1);
    case 'romance': return integer(event.ageInMonths, 18 * 12) && oneOf(event.step, romanceEvents)
      && typeof event.name === 'string' && event.name.trim().length > 0 && event.name.length <= 40;
    case 'sibling-death':
    case 'sibling-visit': return integer(event.index, 0, 4) && oneOf(event.role, ['Брат', 'Сестра']);
    case 'parent-death': return oneOf(event.role, parentRoles);
    case 'family-response': return oneOf(event.choice, griefChoices);
    case 'death': return event.cause === undefined || (typeof event.cause === 'string' && Object.hasOwn(deathCauses, event.cause));
    case 'world': return validWorldId(event.id)
      && (event.variant === undefined || integer(event.variant, 0, worldVariantCount(event.id) - 1))
      && object(event.effects)
      && Object.entries(event.effects).every(([key, value]) => oneOf(key, eventEffects) && integer(value, -100, 100))
      && (event.country === undefined || oneOf(event.country, countryCodes))
      && (event.sibling === undefined || integer(event.sibling, 0, 4))
      && (event.person === undefined || oneOf(event.person, closePersonIds));
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

function validChronicle(value: unknown, age: number, status: unknown, siblingCount: number): boolean {
  if (!Array.isArray(value) || value[0]?.type !== 'birth') return false;
  let previousAge = 0;
  for (const [index, event] of value.entries()) {
    if (!object(event) || !integer(event.ageInMonths, previousAge, age) || !validEvent(event)) return false;
    if ((event.type === 'sibling-death' || event.type === 'sibling-visit') && !integer(event.index, 0, siblingCount - 1)) return false;
    if (event.type === 'world' && event.sibling !== undefined && !integer(event.sibling, 0, siblingCount - 1)) return false;
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
  if (!Array.isArray(value.parents) || value.parents.length > 2 || !value.parents.every((parent) =>
    object(parent) && oneOf(parent.role, parentRoles) && integer(parent.ageAtBirth, 216, 720)
    && (parent.diedAt === undefined || integer(parent.diedAt, 1, ageInMonths)))
    || new Set(value.parents.map((parent) => parent.role)).size !== value.parents.length) return false;
  if (status.type === 'decision') {
    const ordinary = (decision: unknown) =>
      (decision === 'first-childhood-activity' && ageInMonths === 48)
      || Boolean(milestoneAt(ageInMonths) && decision === milestoneAt(ageInMonths))
      || (decision === 'school-crisis'
        && ((wellbeing.phase === 'strain' && ageInMonths === 180)
          || (wellbeing.phase === 'withdrawn' && ageInMonths === 183)))
      || (decision === 'mental-health' && Array.isArray(value.chronicle)
        && value.chronicle.some((event) => object(event) && event.type === 'crisis' && event.ageInMonths === ageInMonths));
    if (status.decision === 'family-loss') {
      const siblingDied = Array.isArray(value.chronicle) && value.chronicle.some((event) =>
        object(event) && event.type === 'sibling-death' && event.ageInMonths === ageInMonths);
      if ((!siblingDied && !value.parents.some((parent) => parent.diedAt === ageInMonths))
        || (status.resume !== undefined && !ordinary(status.resume))) return false;
    } else if (status.decision === 'turning-point') {
      const last = Array.isArray(value.chronicle) ? value.chronicle.at(-1) : null;
      if (!validTurningPoint(status.id) || last?.type !== 'turning-point'
        || last.id !== status.id || last.ageInMonths !== ageInMonths) return false;
    } else if (!ordinary(status.decision)) return false;
  }
  return validBirth(value.birth) && oneOf(value.countryOfResidence, countryCodes)
    && integer(value.seed, 0, 0xffff_ffff) && integer(value.randomState, 0, 0xffff_ffff)
    && validDevelopment(value.development) && validRelationships(value.relationships, ageInMonths)
    && integer(wellbeing.mood, 0, 100) && integer(wellbeing.monthsInPhase, 0, ageInMonths)
    && oneOf(wellbeing.phase, ['none', 'strain', 'withdrawn', 'recovering', 'resolved'])
    && typeof wellbeing.support === 'boolean'
    && (wellbeing.mentalHealth === undefined || (object(wellbeing.mentalHealth)
      && oneOf(wellbeing.mentalHealth.condition, ['none', 'anxiety', 'depression', 'burnout', 'recovering'])
      && integer(wellbeing.mentalHealth.severity, 0, 3)
      && integer(wellbeing.mentalHealth.months, 0, ageInMonths)
      && typeof wellbeing.mentalHealth.supported === 'boolean'))
    && validDiary(value.diary, ageInMonths) && validChronicle(value.chronicle, ageInMonths, status.type, value.birth.family.olderSiblings);
}

export function decodeSave(raw: unknown): SaveRecord {
  if (!object(raw) || !integer(raw.schemaVersion, 1)) throw new InvalidSaveError('corrupt', raw);

  if (raw.schemaVersion > schemaVersion) throw new InvalidSaveError('version', raw);
  let life = raw.life;
  if (raw.schemaVersion < 3 && object(life) && validBirth(life.birth) && integer(life.seed, 0, 0xffff_ffff)) {
    life = { ...life, parents: initialParents(life.birth.family, life.seed), ...(raw.schemaVersion === 1 ? { diary: [] } : {}) };
  }
  if (raw.schemaVersion < schemaVersion && object(life) && object(life.development)) {
    const { character: _obsolete, ...development } = life.development;
    life = { ...life, development };
  }
  if (object(life) && object(life.wellbeing) && life.wellbeing.mentalHealth === undefined) {
    life = {
      ...life,
      wellbeing: { ...life.wellbeing, mentalHealth: { condition: 'none', severity: 0, months: 0, supported: false } },
    };
  }
  if (object(life) && object(life.development) && object(life.development.skills)) {
    life = {
      ...life,
      development: {
        ...life.development,
        skills: {
          ...life.development.skills,
          resilience: life.development.skills.resilience ?? 0,
          practical: life.development.skills.practical ?? 0,
          empathy: life.development.skills.empathy ?? 0,
        },
      },
    };
  }
  if (!integer(raw.revision, 1) || !validLife(life)) throw new InvalidSaveError('corrupt', raw);
  if (life.demographicsVersion !== demographics.version) throw new InvalidSaveError('data', raw);
  return { schemaVersion, revision: raw.revision, life };
}
