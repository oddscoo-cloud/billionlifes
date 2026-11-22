import { describe, expect, it } from 'vitest';
import { availableActions, resolveAction } from './actions';
import { createLife } from './birth';
import { advanceMonth, advanceYear, resolveChildhoodChoice, setPlan, startLife } from './life';
import { drawRandom } from './random';

const newborn = () => startLife(createLife({ name: 'Алекс', sex: 'female', seed: 42 }));

function randomStateFor(min: number, max: number): number {
  for (let state = 0; state < 100_000; state += 1) {
    const { value } = drawRandom(state);
    if (value >= min && value < max) return state;
  }
  throw new Error('Expected a random state in the test interval');
}

const safeState = randomStateFor(0.9, 1);
const adult = () => ({ ...newborn(), ageInMonths: 18 * 12, randomState: safeState });
const admission = (life: ReturnType<typeof newborn>) =>
  availableActions(life).find(({ action }) => action.id === 'apply-university');

describe('development and actions', () => {
  it('develops different skills from the first choice and grows a plan by simulation month', () => {
    const baby = newborn();
    expect(setPlan(baby, 'study')).toBe(baby);
    const child = advanceMonth({ ...baby, ageInMonths: 47, randomState: safeState });
    const reader = resolveChildhoodChoice(child, 'read-with-caregiver');
    const player = resolveChildhoodChoice(child, 'play-with-peers');
    expect(reader.development.skills.academics).toBeGreaterThan(player.development.skills.academics);
    expect(player.development.skills.communication).toBeGreaterThan(reader.development.skills.communication);
    const active = setPlan(reader, 'study');
    expect(active.randomState).toBe(reader.randomState);
    let monthly = active;
    for (let index = 0; index < 12; index += 1) monthly = advanceMonth(monthly);
    expect(advanceYear(active)).toEqual(monthly);
    const extraStudy = monthly.chronicle.slice(active.chronicle.length).reduce(
      (total, event) => total + (event.type === 'world' ? event.effects.academics ?? 0 : 0), 0,
    );
    expect(monthly.development.skills.academics).toBe(active.development.skills.academics + 12 + extraStudy);
    expect(monthly.development.interests.study).toBe(active.development.interests.study + 12);
    expect(monthly.development.character.discipline).toBe(active.development.character.discipline + 12);

    const care = resolveAction(reader, { id: 'personal-care' });
    expect(advanceMonth(care).development.appearance).toBe(reader.development.appearance + 1);
  });

  it.each([
    [14, 'teen-activity', 'school-club'],
    [18, 'adult-path', 'vocational-training'],
    [65, 'later-life', 'mentor'],
  ] as const)('pauses at age %i and resumes after an age-specific decision', (age, decision, id) => {
    const before = { ...newborn(), ageInMonths: age * 12 - 1, randomState: safeState };
    const paused = advanceYear(before);
    expect(paused).toEqual(advanceMonth(before));
    expect(paused.ageInMonths).toBe(age * 12);
    expect(paused.status).toEqual({ type: 'decision', decision });
    expect(advanceYear(paused)).toBe(paused);
    expect(resolveChildhoodChoice(paused, 'play-with-peers')).toBe(paused);
    expect(availableActions(paused).some(({ action }) => action.id === id)).toBe(true);
    expect(resolveAction(paused, { id }).status.type).toBe('active');
  });

  it('previews deterministically and resolves using the same chance after preparation', () => {
    const start = adult();
    const originalState = start.randomState;
    expect(availableActions(start)).toEqual(availableActions(start));
    expect(start.randomState).toBe(originalState);
    const prepared = advanceMonth(setPlan(start, 'study'));
    const before = admission(start)!;
    const after = admission(prepared)!;
    expect(after.chance).toBeGreaterThan(before.chance);
    expect(after.factors.find(({ label }) => label === 'Дисциплина')?.contribution).toBeGreaterThan(0);

    const randomState = randomStateFor(before.chance, after.chance);
    const failure = resolveAction({ ...start, randomState }, before.action);
    const success = resolveAction({ ...prepared, randomState }, after.action);
    expect(failure.development.education).toBe('general');
    expect(success.development.education).toBe('higher');
    for (const [life, selected, succeeded] of [[failure, before, false], [success, after, true]] as const) {
      expect(life.randomState).toBe(drawRandom(randomState).state);
      expect(life.chronicle.at(-1)).toMatchObject({ type: 'action', succeeded, chance: selected.chance });
    }

    expect(admission(failure)).toBeUndefined();
    expect(availableActions(failure).map(({ action }) => action.id))
      .toEqual(expect.arrayContaining(['vocational-training', 'entry-level-job']));
    const later = advanceMonth(advanceMonth(advanceMonth({ ...failure, randomState: safeState })));
    expect(admission(later)).toBeDefined();
  });

  it('uses education to unlock skilled work and earnings to pay for relocation', () => {
    const start = adult();
    expect(resolveAction(start, { id: 'specialist-job' })).toBe(start);
    const trained = resolveAction(start, { id: 'vocational-training' });
    expect(availableActions(trained).some(({ action }) => action.id === 'specialist-job')).toBe(true);
    const employed = resolveAction(trained, { id: 'entry-level-job' });
    const earned = advanceMonth(employed);
    expect(earned.development.funds).toBe(employed.development.funds + 1);
    const move = availableActions(earned).find(({ action }) => action.id === 'move')!;
    expect(move.action.id).toBe('move');
    const moved = resolveAction(earned, move.action);
    expect(moved.countryOfResidence).not.toBe(earned.countryOfResidence);
    expect(moved.development.funds).toBe(earned.development.funds - move.cost);
    expect(moved.randomState).toBe(earned.randomState);
    expect(resolveAction(moved, move.action)).toBe(moved);
    const dead = { ...moved, status: { type: 'dead' } as const };
    expect(availableActions(dead)).toEqual([]);
    expect(setPlan(dead, 'study')).toBe(dead);
  });
});
