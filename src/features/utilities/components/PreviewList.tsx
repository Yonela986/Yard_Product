import { formatMoney } from "@/lib/money";
import { fromMilliUnits } from "../split";
import type { UtilitySplitResult } from "../split";
import { UTILITY_UNITS, type UtilityType } from "@/types/domain";

export function PreviewList({
  split,
  type,
  note,
}: {
  split: UtilitySplitResult;
  type: UtilityType;
  note: string;
}) {
  const chargedCents = split.shares.reduce((sum, share) => sum + share.amountCents, 0);
  return (
    <section className="space-y-3 rounded-md border border-line bg-surface p-4">
      <h2 className="text-body font-semibold text-ink">Preview</h2>
      <ul className="divide-y divide-line border-y border-line">
        {split.shares.map((share) => (
          <li
            key={share.room.roomId}
            className="flex items-start justify-between gap-3 py-3 text-body text-ink"
          >
            <span className="min-w-0">
              <span className="block font-semibold">{share.room.roomName}</span>
              <span className="block text-secondary text-ink-muted">{share.room.tenantName}</span>
              {share.unitsMilli !== null && (
                <span className="block text-secondary text-ink-muted">
                  {fromMilliUnits(share.unitsMilli)} {UTILITY_UNITS[type]}
                </span>
              )}
              {share.amountCents === 0 && (
                <span className="block text-secondary text-ink-muted">Not charged</span>
              )}
            </span>
            <span className="shrink-0 money">{formatMoney(share.amountCents)}</span>
          </li>
        ))}
        {(split.includesMainHouse || split.mainHouseCents > 0) && (
          <li className="flex justify-between gap-3 py-3 text-body text-ink">
            <span>Main house:</span>
            <span className="money">{formatMoney(split.mainHouseCents)} (not charged)</span>
          </li>
        )}
      </ul>
      <p className="flex flex-wrap justify-between gap-2 text-body font-semibold text-ink">
        <span>Total {formatMoney(split.totalCents)}</span>
        <span>
          = {formatMoney(chargedCents)} charged
          {(split.includesMainHouse || split.mainHouseCents > 0) &&
            ` + ${formatMoney(split.mainHouseCents)} main house`}
        </span>
      </p>
      <details className="text-secondary text-ink">
        <summary className="min-h-11 cursor-pointer py-2 underline">What tenants will see</summary>
        <p className="pb-2">{note}</p>
      </details>
    </section>
  );
}
