/** Full years lived, derived from the simulation clock in whole months. */
export function completedYears(ageInMonths: number): number {
  return Math.floor(ageInMonths / 12);
}
