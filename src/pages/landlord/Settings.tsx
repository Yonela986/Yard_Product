import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ListRow } from "@/components/ui/ListRow";
import { Select } from "@/components/ui/Select";
import { useLandlord, useUpdateLandlordPreferences } from "@/features/auth/hooks";
import { useProperty, useUpdatePropertyBankDetails } from "@/features/rooms/hooks";
import { bankDetailsSchema } from "@/features/rooms/schema";
import { useAuth } from "@/features/auth/useAuth";
import { parseSAPhone } from "@/lib/phone";
import {
  DEFAULT_UPCOMING_REMINDER_DAYS,
  UPCOMING_REMINDER_OPTIONS,
} from "@/features/messaging/reminders";
import { LANGUAGE_LABELS, type Language, type ReminderTone } from "@/types/domain";

export default function Settings() {
  const landlord = useLandlord();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [saved, setSaved] = useState<"language" | "wording" | "upcoming" | null>(null);
  const [preferenceError, setPreferenceError] = useState("");
  const updatePreferences = useUpdateLandlordPreferences();
  const property = useProperty();
  const updateBankDetails = useUpdatePropertyBankDetails();
  const [bankDetails, setBankDetails] = useState("");
  const [bankSaved, setBankSaved] = useState(false);
  const [bankError, setBankError] = useState("");

  const phone = landlord.data?.phone ?? "";
  const parsed = parseSAPhone(phone);
  const propertyId = property.data?.id;
  const propertyBankDetails = property.data?.bank_details;

  useEffect(() => {
    if (propertyId) setBankDetails(propertyBankDetails ?? "");
  }, [propertyId, propertyBankDetails]);

  async function savePreference(key: "language" | "reminder_tone", value: Language | ReminderTone) {
    setSaved(null);
    setPreferenceError("");
    try {
      await updatePreferences.mutateAsync({ [key]: value });
      setSaved(key === "language" ? "language" : "wording");
    } catch {
      setPreferenceError("Your message preference could not be saved. Try again.");
    }
  }

  async function saveUpcomingDays(days: number) {
    setSaved(null);
    setPreferenceError("");
    try {
      await updatePreferences.mutateAsync({ upcoming_reminder_days: days });
      setSaved("upcoming");
    } catch {
      setPreferenceError(
        "Your reminder setting could not be saved. Check that the latest database update was run in Supabase.",
      );
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      void navigate({ to: "/sign-in", replace: true });
    }
  }

  async function saveBankDetails() {
    const parsedBankDetails = bankDetailsSchema.safeParse(bankDetails);
    if (!parsedBankDetails.success) {
      setBankError(
        parsedBankDetails.error.issues[0]?.message ??
          "Keep payment instructions to 500 characters or fewer.",
      );
      return;
    }
    if (!property.data) {
      setBankError("Payment details could not be loaded. Try again.");
      return;
    }
    setBankSaved(false);
    setBankError("");
    try {
      await updateBankDetails.mutateAsync({
        propertyId: property.data.id,
        bankDetails: parsedBankDetails.data.trim() || null,
      });
      setBankSaved(true);
    } catch {
      setBankError("Payment details could not be saved. Try again.");
    }
  }

  return (
    <>
      <PageHeader title="Settings" />
      <ul className="divide-y divide-line border-y border-line">
        <ListRow
          primary="Name"
          trailing={<span className="text-ink">{landlord.data?.name}</span>}
        />
        <ListRow
          primary="Mobile number"
          trailing={<span className="text-ink">{parsed.ok ? parsed.phone.display : phone}</span>}
        />
      </ul>
      {landlord.data && (
        <section className="mt-6 space-y-4">
          <Select
            label="Reminder wording"
            helper="Used when you remind a tenant who is late."
            value={landlord.data.reminder_tone}
            onChange={(event) =>
              void savePreference("reminder_tone", event.target.value as ReminderTone)
            }
            options={[
              { value: "friendly", label: "Friendly" },
              { value: "firm", label: "Firm" },
            ]}
          />
          {saved === "wording" && (
            <p role="status" className="text-secondary text-ink">
              Saved
            </p>
          )}
          <Select
            label="Upcoming rent reminder"
            helper="Tenants who still owe are listed on Remind this many days before rent is due."
            value={String(landlord.data.upcoming_reminder_days ?? DEFAULT_UPCOMING_REMINDER_DAYS)}
            onChange={(event) => void saveUpcomingDays(Number(event.target.value))}
            options={UPCOMING_REMINDER_OPTIONS.map((days) => ({
              value: String(days),
              label:
                days === 0 ? "Off" : `${days} ${days === 1 ? "day" : "days"} before the due date`,
            }))}
          />
          {saved === "upcoming" && (
            <p role="status" className="text-secondary text-ink">
              Saved
            </p>
          )}
          <Select
            label="Language"
            helper="Used for new tenants and as the default for messages."
            value={landlord.data.language}
            onChange={(event) => void savePreference("language", event.target.value as Language)}
            options={Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          {saved === "language" && (
            <p role="status" className="text-secondary text-ink">
              Saved
            </p>
          )}
        </section>
      )}
      <section className="mt-6 space-y-3 border-t border-line pt-5">
        <h2 className="text-body font-semibold text-ink">How tenants pay</h2>
        <label htmlFor="bank-details" className="text-secondary font-semibold text-ink">
          Payment instructions
        </label>
        <textarea
          id="bank-details"
          value={bankDetails}
          maxLength={500}
          onChange={(event) => {
            setBankDetails(event.target.value);
            setBankSaved(false);
            setBankError("");
          }}
          rows={5}
          className="min-h-32 w-full rounded-sm border border-line bg-surface p-3 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          aria-describedby="bank-details-help"
        />
        <p id="bank-details-help" className="text-secondary text-ink-muted">
          Shown to your tenants on their page. For example bank, account holder, account number,
          branch code, and any cash instructions. Anyone who has a tenant’s link can see this.
        </p>
        <p className="text-secondary text-ink-muted">{bankDetails.length}/500 characters</p>
        <Button
          variant="secondary"
          loading={updateBankDetails.isPending}
          loadingLabel="Saving"
          disabled={property.isPending || property.isError || bankDetails.length > 500}
          onClick={() => void saveBankDetails()}
        >
          Save payment instructions
        </Button>
        {property.isError && (
          <p role="alert" className="text-secondary text-ink">
            Payment details could not be loaded. Check your connection and try again.
          </p>
        )}
        {bankSaved && (
          <p role="status" className="text-secondary text-ink">
            Saved
          </p>
        )}
        {bankError && (
          <p role="alert" className="text-secondary text-ink">
            {bankError}
          </p>
        )}
      </section>
      {preferenceError && (
        <p role="alert" className="mt-4 text-secondary text-ink">
          {preferenceError}
        </p>
      )}
      <div className="mt-8">
        <Button
          variant="secondary"
          onClick={() => void handleSignOut()}
          loading={signingOut}
          loadingLabel="Signing out"
        >
          Sign out
        </Button>
      </div>
    </>
  );
}
