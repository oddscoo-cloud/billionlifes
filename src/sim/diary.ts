import type { LifeSnapshot } from './life';

export const diaryEntryLimit = 120;
export const diaryTextLimit = 600;

export interface DiaryEntry {
  readonly ageInMonths: number;
  readonly text: string;
}

export function addDiaryEntry(life: LifeSnapshot, draft: string): LifeSnapshot {
  const text = draft.trim();
  if (!text || text.length > diaryTextLimit || life.diary.length >= diaryEntryLimit) return life;
  return { ...life, diary: [...life.diary, { ageInMonths: life.ageInMonths, text }] };
}
