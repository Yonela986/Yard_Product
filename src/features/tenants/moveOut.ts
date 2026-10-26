/** Returns an error message for a move-out date, or null when it is valid. Dates are YYYY-MM-DD.
 * Future dates are allowed (notice periods, cancelled future move-ins). */
export function moveOutDateError(date: string, moveInDate: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Choose the move-out date.";
  if (date < moveInDate) return "The move-out date cannot be before the move-in date.";
  return null;
}

/** Default move-out date: today, or the move-in date when the tenant has not moved in yet. */
export function defaultMoveOutDate(moveInDate: string, today: string): string {
  return moveInDate > today ? moveInDate : today;
}
