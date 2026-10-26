import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/layout/PageHeader";
import { Select } from "@/components/ui/Select";
import { SplitStep } from "@/features/utilities/components/SplitStep";
import { PreviewList } from "@/features/utilities/components/PreviewList";
import { useProperty } from "@/features/rooms/hooks";
import {
  useLatestMeterReadings,
  useUtilityBills,
  useUtilityRooms,
  useCreateUtilityBill,
} from "@/features/utilities/hooks";
import {
  buildBillPayload,
  buildChargeNote,
  defaultDueDate,
  fromMilliUnits,
  splitByUsage,
  splitCustom,
  splitEqual,
  toMilliUnits,
  type UtilityRoomInput,
  type UtilityRoomReading,
  type UtilitySplitResult,
} from "@/features/utilities/split";
import {
  emptyUtilityBill,
  utilityBillDraftSchema,
  utilityBillSchema,
  type UtilityBillFormValues,
} from "@/features/utilities/schema";
import { formatMonthLabel, todayInSA, toPeriod } from "@/lib/dates";
import { formatMoney, toCents } from "@/lib/money";
import { paths } from "@/router/paths";

const DRAFT_KEY = "yard.utilities.draft";
type Draft = { step: 1 | 2 | 3; values: UtilityBillFormValues };

function lastMonth(period: string): string {
  const date = new Date(`${period}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}

function periodsFrom(period: string): string[] {
  const date = new Date(`${period}-01T00:00:00Z`);
  return Array.from({ length: 12 }, () => {
    const value = date.toISOString().slice(0, 7);
    date.setUTCMonth(date.getUTCMonth() - 1);
    return value;
  });
}

function loadDraft(base: UtilityBillFormValues): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const parsed = utilityBillDraftSchema.safeParse(record["values"]);
    if (!parsed.success) return null;
    const step = record["step"] === 2 || record["step"] === 3 ? record["step"] : 1;
    const saved = parsed.data;
    return {
      step,
      values: {
        type: saved.type ?? base.type,
        period: saved.period ?? base.period,
        total: saved.total ?? base.total,
        dueDate: saved.dueDate ?? base.dueDate,
        splitMethod: saved.splitMethod ?? base.splitMethod,
        includedRoomIds: saved.includedRoomIds ?? base.includedRoomIds,
        includeMainHouse: saved.includeMainHouse ?? base.includeMainHouse,
        previousReadings: saved.previousReadings ?? base.previousReadings,
        currentReadings: saved.currentReadings ?? base.currentReadings,
        mainHouseUnits: saved.mainHouseUnits ?? base.mainHouseUnits,
        customAmounts: saved.customAmounts ?? base.customAmounts,
        note: saved.note ?? base.note,
      },
    };
  } catch {
    return null;
  }
}

function saveDraft(draft: Draft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // The form remains usable when browser storage is unavailable.
  }
}

function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // The successful bill has already been saved.
  }
}

function calculateSplit(
  values: UtilityBillFormValues,
  roomInputs: UtilityRoomInput[],
): { split: UtilitySplitResult; readings: UtilityRoomReading[] } {
  const total = toCents(values.total);
  if (!total.ok) throw new Error(total.error);
  const selected = new Set(values.includedRoomIds);
  const rooms = roomInputs.filter((room) => selected.has(room.roomId));
  if (values.splitMethod === "equal") {
    return {
      split: splitEqual({
        totalCents: total.cents,
        rooms,
        includeMainHouse: values.includeMainHouse,
      }),
      readings: [],
    };
  }
  if (values.splitMethod === "by_room") {
    const readings = rooms.map((room) => ({
      roomId: room.roomId,
      previousMilli: toMilliUnits(values.previousReadings[room.roomId] ?? ""),
      currentMilli: toMilliUnits(values.currentReadings[room.roomId] ?? ""),
    }));
    const mainHouseUnitsMilli = values.includeMainHouse
      ? toMilliUnits(values.mainHouseUnits)
      : null;
    return {
      split: splitByUsage({
        totalCents: total.cents,
        rooms,
        includeMainHouse: values.includeMainHouse,
        readings,
        mainHouseUnitsMilli,
      }),
      readings,
    };
  }
  const amountsByRoom: Record<string, number> = {};
  for (const room of rooms) {
    const amount = toCents(values.customAmounts[room.roomId] ?? "");
    amountsByRoom[room.roomId] = amount.ok ? amount.cents : 0;
  }
  return {
    split: splitCustom({
      totalCents: total.cents,
      rooms,
      includeMainHouse: values.includeMainHouse,
      amountsByRoom,
    }),
    readings: [],
  };
}

export default function UtilityNew() {
  const navigate = useNavigate();
  const today = todayInSA();
  const currentPeriod = toPeriod(today);
  const baseValues = useMemo(
    () => emptyUtilityBill(defaultDueDate(today), lastMonth(currentPeriod)),
    [currentPeriod, today],
  );
  const initialDraft = useRef<Draft | null>(null);
  const didLoadDraft = useRef(false);
  if (!didLoadDraft.current) {
    initialDraft.current = loadDraft(baseValues);
    didLoadDraft.current = true;
  }
  const form = useForm<UtilityBillFormValues>({
    resolver: zodResolver(utilityBillSchema),
    defaultValues: initialDraft.current?.values ?? baseValues,
    mode: "onSubmit",
  });
  const [step, setStep] = useState<1 | 2 | 3>(initialDraft.current?.step ?? 1);
  const [pageError, setPageError] = useState("");
  const didInitialiseRooms = useRef(false);
  const values = useWatch({ control: form.control });
  const property = useProperty();
  const propertyId = property.data?.id ?? "";
  const roomsQuery = useUtilityRooms(propertyId);
  const billsQuery = useUtilityBills(propertyId);
  const createBill = useCreateUtilityBill(propertyId);
  const selectedRoomIds = useMemo(() => values.includedRoomIds ?? [], [values.includedRoomIds]);
  const readingsQuery = useLatestMeterReadings(selectedRoomIds, values.type ?? "electricity");

  useEffect(() => {
    if (!roomsQuery.data || didInitialiseRooms.current) return;
    didInitialiseRooms.current = true;
    if (!initialDraft.current && form.getValues("includedRoomIds").length === 0) {
      form.setValue(
        "includedRoomIds",
        roomsQuery.data.flatMap((room) => (room.tenantId ? [room.id] : [])),
      );
    }
  }, [form, roomsQuery.data]);

  useEffect(() => {
    if (values.type !== "electricity" && values.type !== "water") return;
    if (!readingsQuery.data) return;
    for (const roomId of selectedRoomIds) {
      const reading = readingsQuery.data[roomId];
      if (reading !== undefined && form.getValues(`previousReadings.${roomId}`) === "") {
        form.setValue(`previousReadings.${roomId}`, fromMilliUnits(reading));
      }
    }
  }, [form, readingsQuery.data, selectedRoomIds, values.type]);

  useEffect(() => {
    if (values.type && values.period && values.total !== undefined && values.dueDate) {
      saveDraft({ step, values: values as UtilityBillFormValues });
    }
  }, [step, values]);

  const roomInputs: UtilityRoomInput[] = (roomsQuery.data ?? []).flatMap((room) =>
    room.tenantId && room.tenantName
      ? [
          {
            roomId: room.id,
            roomName: room.name,
            tenantId: room.tenantId,
            tenantName: room.tenantName,
          },
        ]
      : [],
  );
  let calculated: ReturnType<typeof calculateSplit> | null = null;
  let calculationError = "";
  try {
    if (
      values.type &&
      values.period &&
      values.total &&
      values.dueDate &&
      values.splitMethod &&
      selectedRoomIds.length > 0
    ) {
      calculated = calculateSplit(values as UtilityBillFormValues, roomInputs);
    }
  } catch (error) {
    calculationError = error instanceof Error ? error.message : "Check the split details.";
  }
  const totalResult = toCents(values.total ?? "");
  const duplicateBill = (billsQuery.data ?? []).find(
    (bill) => bill.type === values.type && bill.period === values.period && bill.voided_at === null,
  );
  const periods = periodsFrom(currentPeriod);
  const note =
    calculated && totalResult.ok
      ? buildChargeNote({
          type: values.type ?? "electricity",
          period: values.period ?? currentPeriod,
          totalCents: totalResult.cents,
          splitMethod: values.splitMethod ?? "equal",
          roomCount: calculated.split.shares.length,
          includesMainHouse: values.includeMainHouse ?? false,
          ...(calculated.split.shares[0]?.unitsMilli !== null &&
          calculated.split.shares[0]?.unitsMilli !== undefined
            ? { unitsMilli: calculated.split.shares[0].unitsMilli }
            : {}),
          ...(calculated.split.totalUnitsMilli !== null
            ? { totalUnitsMilli: calculated.split.totalUnitsMilli }
            : {}),
        })
      : "";

  async function nextStep() {
    const fields =
      step === 1
        ? (["type", "period", "total", "dueDate"] as const)
        : ([
            "splitMethod",
            "includedRoomIds",
            "includeMainHouse",
            "previousReadings",
            "currentReadings",
            "mainHouseUnits",
            "customAmounts",
          ] as const);
    if (!(await form.trigger(fields))) return;
    setPageError("");
    setStep(step === 1 ? 2 : 3);
  }

  async function submitBill() {
    if (!(await form.trigger())) return;
    if (!propertyId || !calculated) {
      setPageError(calculationError || "Check the bill details and try again.");
      return;
    }
    try {
      const total = toCents(form.getValues("total"));
      if (!total.ok) throw new Error(total.error);
      const payload = buildBillPayload({
        bill: {
          propertyId,
          type: form.getValues("type"),
          period: form.getValues("period"),
          totalCents: total.cents,
          splitMethod: form.getValues("splitMethod"),
          dueDate: form.getValues("dueDate"),
          includesMainHouse: form.getValues("includeMainHouse"),
          note: form.getValues("note").trim() || null,
        },
        split: calculated.split,
        splitMethod: form.getValues("splitMethod"),
        readings: calculated.readings,
      });
      const billId = await createBill.mutateAsync(payload);
      clearDraft();
      await navigate({ to: paths.utilityDetail.replace("$billId", billId) });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "The bill could not be saved.");
    }
  }

  if (property.isPending || (propertyId !== "" && (roomsQuery.isPending || billsQuery.isPending))) {
    return (
      <>
        <PageHeader title="Add a bill" backTo={paths.utilityList} />
        <p className="py-6 text-body text-ink-muted">Loading rooms...</p>
      </>
    );
  }
  if (property.isError || roomsQuery.isError || billsQuery.isError || !property.data) {
    return (
      <>
        <PageHeader title="Add a bill" backTo={paths.utilityList} />
        <p role="alert" className="py-6 text-body text-ink">
          Utility bill setup could not be loaded. Check your connection and try again.
        </p>
        <Button
          variant="secondary"
          onClick={() =>
            void Promise.all([property.refetch(), roomsQuery.refetch(), billsQuery.refetch()])
          }
        >
          Try again
        </Button>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Add a bill" backTo={paths.utilityList} />
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (step < 3) void nextStep();
          else void submitBill();
        }}
      >
        <p className="text-secondary text-ink-muted">Step {step} of 3</p>
        {step === 1 && (
          <section className="space-y-4">
            <Select
              label="Bill type"
              options={[
                { value: "electricity", label: "Electricity" },
                { value: "water", label: "Water" },
              ]}
              {...form.register("type")}
            />
            <Select
              label="Month covered"
              options={periods.map((period) => ({
                value: period,
                label: formatMonthLabel(period),
              }))}
              {...form.register("period")}
            />
            <Input
              label="Total amount"
              prefix="R"
              inputMode="decimal"
              {...form.register("total")}
              error={form.formState.errors.total?.message}
            />
            <Input
              label="Charges due on"
              type="date"
              {...form.register("dueDate")}
              error={form.formState.errors.dueDate?.message}
            />
            {duplicateBill && (
              <p className="text-secondary text-ink">
                An {duplicateBill.type} bill for {formatMonthLabel(duplicateBill.period)} (
                {formatMoney(duplicateBill.total_cents)}) is already recorded. You can still add
                another, for example for a prepaid top-up.
              </p>
            )}
          </section>
        )}
        {step === 2 && roomsQuery.data && (
          <>
            {readingsQuery.isError && (
              <div className="space-y-2">
                <p role="alert" className="text-secondary text-ink">
                  Previous readings could not be loaded. Check your connection and try again.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void readingsQuery.refetch()}
                >
                  Try again
                </Button>
              </div>
            )}
            <SplitStep
              rooms={roomsQuery.data}
              values={values as UtilityBillFormValues}
              form={form}
            />
          </>
        )}
        {step === 3 &&
          (calculated ? (
            <PreviewList split={calculated.split} type={values.type ?? "electricity"} note={note} />
          ) : (
            <p role="alert" className="text-body text-ink">
              {calculationError || "Complete the split details to preview this bill."}
            </p>
          ))}
        {pageError && (
          <p role="alert" className="text-secondary font-semibold text-ink">
            {pageError}
          </p>
        )}
        <div className="flex gap-3">
          {step > 1 && (
            <Button type="button" variant="secondary" onClick={() => setStep(step === 3 ? 2 : 1)}>
              Back
            </Button>
          )}
          <Button
            type={step === 3 ? "submit" : "button"}
            fullWidth
            loading={step === 3 && createBill.isPending}
            loadingLabel="Saving"
            onClick={step < 3 ? () => void nextStep() : undefined}
          >
            {step === 3 ? "Add charges" : "Continue"}
          </Button>
        </div>
      </form>
    </>
  );
}
