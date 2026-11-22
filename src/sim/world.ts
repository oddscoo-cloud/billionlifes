import { worldVariantCount } from '../data/world-event-variants';
import { yearlyPrecipitation } from '../data/households';
import type { CountryCode } from '../data/demographics';
import { countryCodes } from '../data/demographics';
import type { EventEffect, WorldEventId } from '../data/world-events';
import type { LifeEvent, LifeSnapshot } from './life';
import { drawRandom } from './random';
import { remember } from './relationships';
import type { ClosePersonId } from './relationships';

export type WorldEvent = {
  readonly type: 'world';
  readonly id: WorldEventId;
  readonly ageInMonths: number;
  readonly variant?: number;
  readonly effects: Readonly<Partial<Record<EventEffect, number>>>;
  readonly country?: CountryCode;
  readonly person?: ClosePersonId;
};

type EventChoice = {
  readonly id: WorldEventId;
  readonly mood?: number;
  readonly funds?: number;
  readonly skill?: readonly [keyof LifeSnapshot['development']['skills'], number];
  readonly contact?: readonly [ClosePersonId, number];
};

const everyday: readonly EventChoice[] = [
  { id: 'market', mood: 1 }, { id: 'power-outage', mood: -2 },
  { id: 'evening-out', mood: 2 }, { id: 'unplanned-visit', mood: 2 }, { id: 'shared-ride', mood: 1 }, { id: 'quiet-routine', mood: 1 },
];

function recentEvents(life: LifeSnapshot, months: number): readonly LifeEvent[] {
  const cutoff = life.ageInMonths - months;
  const events: LifeEvent[] = [];
  for (let index = life.chronicle.length - 1; index >= 0; index -= 1) {
    const event = life.chronicle[index]!;
    if (event.ageInMonths < cutoff) break;
    events.push(event);
  }
  return events;
}

function connected(life: LifeSnapshot, recent: readonly LifeEvent[]): EventChoice | undefined {
  const { ageInMonths, development, relationships } = life;
  const previous = recent.find((event) => event.type === 'world');
  const after = (id: WorldEventId) => previous?.type === 'world' && previous.id === id
    && previous.ageInMonths === ageInMonths - 1;
  const move = recent.find((event) => event.type === 'action' && event.succeeded && event.action.id === 'move');
  if (move?.ageInMonths === ageInMonths - 1) return { id: 'move-paperwork', mood: -4 };
  if (after('move-paperwork')) {
    const neighbor = relationships.find(({ id }) => id === 'neighbor');
    return neighbor && neighbor.country !== life.countryOfResidence
      ? { id: 'move-welcome', mood: 4 }
      : { id: 'move-welcome', mood: 4, contact: ['neighbor', 5] };
  }
  if (ageInMonths === 15 * 12 - 1) return { id: 'school-rumor', mood: -3 };
  if (after('health-check')) return { id: 'health-followup', mood: 2, contact: ['caregiver', 1] };
  if (after('library-closed')) {
    const sharedReading = relationships.some((person) => person.id === 'caregiver'
      && person.memories.some((memory) => memory.kind === 'shared-reading'));
    return sharedReading
      ? { id: 'library-return', mood: 3, skill: ['academics', 3], contact: ['caregiver', 2] }
      : { id: 'library-open', mood: 2, skill: ['academics', 1] };
  }
  if (after('community-repair')) return { id: 'community-reopen', mood: 3, skill: ['communication', 1] };
  if (after('shift-cut') && employed(life)) {
    const colleague = relationships.find(({ id }) => id === 'colleague');
    const local = colleague?.country === life.countryOfResidence;
    if (development.skills.communication < 20 && !(local && colleague && colleague.trust >= 45)) {
      return { id: 'shift-search', mood: -3 };
    }
    return colleague && !local
      ? { id: 'shift-cover', funds: 1, mood: 3 }
      : { id: 'shift-cover', funds: 1, mood: 3, contact: ['colleague', 3] };
  }
}

function employed(life: LifeSnapshot): boolean {
  return life.development.employment === 'entry-level' || life.development.employment === 'specialist';
}

function candidates(life: LifeSnapshot): EventChoice[] {
  const { ageInMonths, development, relationships, birth } = life;
  const plan = development.plan;
  const caregiver = relationships.find(({ id }) => id === 'caregiver');
  const friend = relationships.find(({ id }) => id === 'friend');
  const neighbor = relationships.some(({ id, country }) => id === 'neighbor' && country === life.countryOfResidence);
  if (ageInMonths < 48) {
    const family: EventChoice[] = [
      { id: 'family-walk', mood: 2 }, { id: 'rough-night', mood: -2 }, { id: 'visiting-family', mood: 1 },
      { id: 'family-routine', mood: 1 }, { id: 'photo-for-family', mood: 1 },
      { id: 'shared-breakfast', mood: 2 }, { id: 'borrowed-toy', mood: 1 },
    ];
    if (ageInMonths >= 12) family.push({ id: 'new-words', mood: 1 }, { id: 'child-fever', mood: -3 });
    if (birth.family.olderSiblings > 0) family.push({ id: 'sibling-game', mood: 2 });
    if (birth.startingHealth === 'needs-support' && ageInMonths <= 9) {
      family.push({ id: 'health-check', mood: 1 });
    }
    return family;
  }
  const pool = [...everyday];
  if (ageInMonths < 12 * 12) pool.push({ id: 'child-fever', mood: -3 });
  if (friend && friend.trust >= 45) pool.push({ id: 'friend-note', mood: 3, contact: ['friend', 1] });
  if (neighbor) pool.push({ id: 'neighbor-help', mood: 2, contact: ['neighbor', 1] });
  if (ageInMonths < 6 * 12) {
    pool.push({ id: 'playground', mood: 2, skill: ['communication', 1] },
      { id: 'paint-together', skill: ['creativity', 1] });
  } else if (ageInMonths < 18 * 12) {
    pool.push(
      { id: 'library-closed', mood: -2 },
      { id: 'school-project', skill: ['communication', 1] },
      { id: 'missed-bus', mood: -2 }, { id: 'quiet-school', mood: 1 },
      { id: 'science-day', skill: ['academics', 1] }, { id: 'lost-notebook', mood: -2 },
      { id: 'team-practice', skill: ['communication', 1] },
    );
    if (plan === 'practice-art') pool.push({ id: 'drawing-display', skill: ['creativity', 2], mood: 2 });
  } else {
    pool.push({ id: 'local-swap', mood: 2 }, { id: 'community-repair', mood: -2 }, development.funds > 0
      ? { id: 'cost-rise', funds: -1 } : { id: 'tight-budget', mood: -2 });
    if (employed(life)) {
      pool.push({ id: 'quiet-shift', mood: 1 }, { id: 'shift-cut', funds: -1, mood: -2 }, { id: 'work-feedback', skill: ['communication', 1] });
      if (!relationships.some(({ id }) => id === 'colleague')) {
        pool.push({ id: 'new-colleague', mood: 2, contact: ['colleague', 5] });
      }
    } else if (development.employment === 'unemployed') {
      pool.push({ id: 'job-fair', skill: ['communication', 2] });
    }
    if (ageInMonths >= 65 * 12) pool.push({ id: 'older-health', mood: -3 }, { id: 'old-recording', mood: 2 }, { id: 'old-photos', mood: 2 }, { id: 'garden', mood: 2 });
  }
  if (caregiver && caregiver.trust >= 60 && ageInMonths < 55 * 12) {
    pool.push({ id: 'phone-call', mood: 3, contact: ['caregiver', 1] });
  }
  if (plan === 'study') pool.push({ id: 'study-group', skill: ['academics', 2] });
  if (plan === 'practice-art') pool.push({ id: 'club-rehearsal', skill: ['creativity', 2] });
  if (plan === 'community') pool.push({ id: 'community-meal', mood: 2, skill: ['communication', 2] });
  return pool;
}

function rainEvent(life: LifeSnapshot): EventChoice {
  if (life.development.plan === 'study') return { id: 'rain-study', mood: -1, skill: ['academics', 1] };
  if (employed(life)) return { id: 'rain-commute', mood: -4 };
  return { id: 'rain', mood: -3 };
}

function chooseVariant(life: LifeSnapshot, id: WorldEventId): number {
  const count = worldVariantCount(id);
  if (count === 1) return 0;
  const unused = new Set(Array.from({ length: count }, (_, index) => index));
  const recent: number[] = [];
  for (let index = life.chronicle.length - 1; index >= 0 && unused.size; index -= 1) {
    const event = life.chronicle[index]!;
    if (event.type === 'world' && event.id === id && unused.delete(event.variant ?? 0)) {
      recent.push(event.variant ?? 0);
    }
  }
  if (!unused.size) return recent.at(-1)!;
  const { value } = drawRandom((life.seed ^ Math.imul(life.ageInMonths, 0x5bd1e995)) >>> 0);
  return [...unused][Math.floor(value * unused.size)]!;
}

export function advanceWorld(life: LifeSnapshot): LifeSnapshot {
  const { ageInMonths, wellbeing, development, relationships } = life;
  const recent = recentEvents(life, 3);
  const residence = countryCodes.indexOf(life.countryOfResidence);
  // Ambient events have a separate deterministic draw so they never consume a mortality or action roll.
  const { value } = drawRandom((life.seed ^ Math.imul(ageInMonths, 0x9e3779b9) ^ (residence << 24)) >>> 0);
  const followup = connected(life, recent);
  const rhythm = (ageInMonths + life.seed % 4) % 4;
  if (!followup && rhythm === 3) return life;
  // Annual precipitation is a weighting proxy, not an observed probability of rainy days.
  const rainChance = yearlyPrecipitation[life.countryOfResidence] / 6500;
  const wet = ageInMonths >= 48 && value < rainChance ? rainEvent(life) : undefined;
  const draw = ageInMonths >= 48 && !wet ? (value - rainChance) / (1 - rainChance) : value;
  const blocked = new Set(recent.flatMap((event) => event.type === 'world' ? [event.id] : []));
  const eligible = candidates(life).filter(({ id }) => !blocked.has(id));
  const seenRecently = new Set(recentEvents(life, 10).flatMap((event) => event.type === 'world' ? [event.id] : []));
  const fresh = eligible.filter(({ id }) => !seenRecently.has(id));
  const pool = fresh.length ? fresh : eligible;
  const event = followup ?? wet ?? pool[Math.floor(draw * pool.length)];
  if (!event) return life;

  const variant = chooseVariant(life, event.id);
  const effects: Partial<Record<EventEffect, number>> = {};
  const mood = wellbeing.phase === 'none' || wellbeing.phase === 'resolved'
    ? Math.max(0, Math.min(100, wellbeing.mood + (event.mood ?? 0))) : wellbeing.mood;
  const funds = Math.max(0, development.funds + (event.funds ?? 0));
  if (mood !== wellbeing.mood) effects.mood = mood - wellbeing.mood;
  if (funds !== development.funds) effects.funds = funds - development.funds;
  let skills = development.skills;
  if (event.skill) {
    const [skill, points] = event.skill;
    const gain = Math.min(points, 100 - skills[skill]);
    if (gain > 0) {
      effects[skill] = gain;
      skills = { ...skills, [skill]: skills[skill] + gain };
    }
  }
  let contacts = relationships;
  const person = event.contact?.[0];
  if (event.contact && person) {
    const before = relationships.find(({ id }) => id === person);
    const country = person === 'neighbor' || person === 'colleague' ? life.countryOfResidence : undefined;
    contacts = remember(relationships, person, { kind: 'world', ageInMonths, event: event.id }, event.contact[1], country);
    const gained = contacts.find(({ id }) => id === person)!.trust - (before?.trust ?? 35);
    if (gained) effects.trust = gained;
  }
  return {
    ...life,
    development: { ...development, funds, skills },
    wellbeing: { ...wellbeing, mood },
    relationships: contacts,
    chronicle: [...life.chronicle, {
      type: 'world', id: event.id, ageInMonths, effects, ...(variant ? { variant } : {}), country: life.countryOfResidence, ...(person ? { person } : {}),
    }],
  };
}
