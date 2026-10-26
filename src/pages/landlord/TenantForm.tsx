import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useActiveRooms } from "@/features/rooms/hooks";
import { useLandlord } from "@/features/auth/hooks";
import {
  useCreateTenant,
  useCurrentTenants,
  useTenant,
  useUpdateTenant,
} from "@/features/tenants/hooks";
import {
  emptyTenantForm,
  parseDepositInput,
  tenantSchema,
  type TenantFormValues,
} from "@/features/tenants/schema";
import { parseSAPhone } from "@/lib/phone";
import { formatMoney } from "@/lib/money";
import { LANGUAGE_LABELS } from "@/types/domain";
import { paths } from "@/router/paths";

const languageOptions = Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function TenantForm() {
  const { tenantId } = useParams({ strict: false });
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const [values, setValues] = useState<TenantFormValues>(() =>
    emptyTenantForm(typeof search.roomId === "string" ? search.roomId : ""),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const landlord = useLandlord();
  const initializedLanguage = useRef(false);
  const tenantQuery = useTenant(tenantId ?? "");
  const roomsQuery = useActiveRooms();
  const currentTenants = useCurrentTenants();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const tenant = tenantQuery.data ?? null;
  const isEditing = Boolean(tenantId);

  useEffect(() => {
    if (!isEditing && landlord.data && !initializedLanguage.current) {
      initializedLanguage.current = true;
      setValues((current) => ({ ...current, language: landlord.data?.language ?? "en" }));
    }
  }, [isEditing, landlord.data]);

  useEffect(() => {
    if (tenant) {
      setValues({
        name: tenant.name,
        phone: tenant.phone,
        roomId: tenant.room_id,
        moveInDate: tenant.move_in_date,
        deposit: formatMoney(tenant.deposit_cents).replace(/^R/, ""),
        language: tenant.language,
      });
    }
  }, [tenant]);

  const currentRoomIds = new Set((currentTenants.data ?? []).map((current) => current.room_id));
  const availableRooms = (roomsQuery.data ?? []).filter(
    (room) => !currentRoomIds.has(room.id) || room.id === tenant?.room_id,
  );
  const roomOptions = availableRooms.map((room) => ({
    value: room.id,
    label: `${room.name} — ${formatMoney(room.monthly_rent_cents)}`,
  }));

  function updateField<K extends keyof TenantFormValues>(field: K, value: TenantFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setSubmitError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = tenantSchema.safeParse(values);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && nextErrors[field] === undefined) {
          nextErrors[field] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    if (!availableRooms.some((room) => room.id === result.data.roomId)) {
      setErrors({ roomId: "Choose a vacant room" });
      return;
    }
    const parsedPhone = parseSAPhone(result.data.phone);
    if (!parsedPhone.ok) {
      setErrors({ phone: parsedPhone.error });
      return;
    }

    try {
      const fields = {
        name: result.data.name,
        phone: parsedPhone.phone.e164,
        room_id: result.data.roomId,
        move_in_date: result.data.moveInDate,
        deposit_cents: parseDepositInput(result.data.deposit),
        language: result.data.language,
      };
      const saved = tenant
        ? await updateTenant.mutateAsync({ tenantId: tenant.id, input: fields })
        : await createTenant.mutateAsync({
            ...fields,
            access_token: crypto.randomUUID().replaceAll("-", ""),
          });
      await navigate({
        to: paths.tenantDetail.replace("$tenantId", saved.id),
        ...(tenant ? {} : { search: { added: true } }),
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Tenant details could not be saved. Please try again.",
      );
    }
  }

  if (tenantQuery.isPending && isEditing) {
    return (
      <>
        <PageHeader title="Tenant details" backTo={paths.rooms} />
        <p className="py-6 text-body text-ink-muted">Loading tenant details...</p>
      </>
    );
  }

  if (isEditing && (tenantQuery.isError || !tenant)) {
    return (
      <>
        <PageHeader title="Tenant details" backTo={paths.rooms} />
        <p role="alert" className="py-6 text-body text-ink">
          Tenant details could not be loaded.
        </p>
      </>
    );
  }

  if (tenant?.move_out_date) {
    return (
      <>
        <PageHeader title="Tenant details" backTo={paths.rooms} />
        <p className="py-6 text-body text-ink">
          This tenant has moved out and can no longer be edited.
        </p>
      </>
    );
  }

  if (roomsQuery.isError || currentTenants.isError) {
    return (
      <>
        <PageHeader title={isEditing ? "Edit tenant" : "Add tenant"} backTo={paths.rooms} />
        <p role="alert" className="py-6 text-body text-ink">
          Room availability could not be loaded. Check your connection and try again.
        </p>
      </>
    );
  }

  if (roomsQuery.isPending || currentTenants.isPending) {
    return (
      <>
        <PageHeader title={isEditing ? "Edit tenant" : "Add tenant"} backTo={paths.rooms} />
        <p className="py-6 text-body text-ink-muted">Checking room availability...</p>
      </>
    );
  }

  const saving = createTenant.isPending || updateTenant.isPending;

  return (
    <>
      <PageHeader title={isEditing ? "Edit tenant" : "Add tenant"} backTo={paths.rooms} />
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <Input
          label="Tenant name"
          autoComplete="name"
          value={values.name}
          onChange={(event) => updateField("name", event.target.value)}
          error={errors["name"]}
        />
        <Input
          label="WhatsApp number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="082 123 4567"
          value={values.phone}
          onChange={(event) => updateField("phone", event.target.value)}
          error={errors["phone"]}
        />
        <Select
          label="Room"
          value={values.roomId}
          onChange={(event) => updateField("roomId", event.target.value)}
          options={roomOptions}
          placeholder="Choose a vacant room"
          error={errors["roomId"]}
        />
        <Input
          label="Move-in date"
          type="date"
          value={values.moveInDate}
          onChange={(event) => updateField("moveInDate", event.target.value)}
          error={errors["moveInDate"]}
        />
        <Input
          label="Deposit"
          inputMode="decimal"
          prefix="R"
          value={values.deposit}
          onChange={(event) => updateField("deposit", event.target.value)}
          error={errors["deposit"]}
        />
        <Select
          label="Language for messages"
          value={values.language}
          onChange={(event) =>
            updateField("language", event.target.value as TenantFormValues["language"])
          }
          options={languageOptions}
        />
        {submitError && (
          <p role="alert" className="text-secondary font-semibold text-ink">
            {submitError}
          </p>
        )}
        <Button fullWidth type="submit" loading={saving} loadingLabel="Saving">
          {isEditing ? "Save changes" : "Save tenant"}
        </Button>
      </form>
    </>
  );
}
