export type PointsAdjustment = {
  userId: string;
  delta: number;
  note: string;
  adminId: string;
};

/**
 * Hook for the points ledger. Stage 8 adds the `points_ledger` table and writes
 * the row here (reason "admin_adjust"). Until then the balance changes but the
 * adjustment leaves no history. When Stage 8 fills this in, the balance update
 * and the ledger row should become one statement, as in writeOrderTransition.
 */
export async function recordPointsAdjustment(
  adjustment: PointsAdjustment,
): Promise<void> {
  void adjustment;
}
