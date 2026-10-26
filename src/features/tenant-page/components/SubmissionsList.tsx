import { formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { TenantPaymentInfo } from "@/types/domain";

export function SubmissionsList({ info }: { info: TenantPaymentInfo }) {
  if (info.submissions.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-body font-semibold text-ink">Payment notices</h2>
      <ul className="divide-y divide-line border-y border-line">
        {info.submissions.map((submission) => (
          <li
            key={`${submission.createdAt}:${submission.status}`}
            className="space-y-1 py-3 text-secondary text-ink"
          >
            <p className="font-semibold">
              {submission.status === "pending_confirmation"
                ? "Waiting for your landlord to confirm"
                : "Not accepted"}
              : {formatMoney(submission.amountCents)}, paid {formatShortDate(submission.paidOn)}
            </p>
            {submission.status === "declined" && (
              <>
                {submission.declineReason && <p>Reason: {submission.declineReason}</p>}
                <p>Contact your landlord if you think this is wrong.</p>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
