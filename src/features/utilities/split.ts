import { formatMonthLabel, todayInSA } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { SplitMethod, UtilityType } from "@/types/domain";

export interface UtilityRoomInput {
  roomId: string;
  roomName: string;
  tenantId: string;
  tenantName: string;
}

export interface UtilityRoomReading {
  roomId: string;
  previousMilli: number;
  currentMilli: number;
}

export interface UtilitySharePreview {
  room: UtilityRoomInput;
  amountCents: number;
  unitsMilli: number | null;
  previousReadingMilli: number | null;
  currentReadingMilli: number | null;
}

export interface UtilitySplitResult {
  totalCents: number;
  shares: UtilitySharePreview[];
  mainHouseCents: number;
  totalUnitsMilli: number | null;
  includesMainHouse: boolean;
}

export interface UtilitySplitInput {
  totalCents: number;
  rooms: UtilityRoomInput[];
  includeMainHouse: boolean;
}

export interface UtilityUsageSplitInput extends UtilitySplitInput {
  readings: UtilityRoomReading[];
  mainHouseUnitsMilli: number | null;
}

export interface UtilityCustomSplitInput extends UtilitySplitInput {
  amountsByRoom: Record<string, number>;
}

export interface UtilityBillDraft {
  propertyId: string;
  type: UtilityType;
  period: string;
  totalCents: number;
  splitMethod: SplitMethod;
  dueDate: string;
  includesMainHouse: boolean;
  note: string | null;
}

export interface UtilityBillPayload extends Record<string, unknown> {
  p_property_id: string;
  p_type: UtilityType;
  p_period: string;
  p_total_cents: number;
  p_split_method: SplitMethod;
  p_due_date: string;
  p_includes_main_house: boolean;
  p_main_house_cents: number;
  p_shares: Array<Record<string, string | number | null>>;
  p_readings: Array<{ room_id: string; reading: string }>;
  p_note: string | null;
}

export const MAX_UTILITY_CENTS = 2_147_483_647;
const MAX_READING_MILLI = 999_999_999_999n;

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export function compareUtilityRoomNames(left: string, right: string): number {
  return collator.compare(left, right);
}

export function sortUtilityRooms<T extends Pick<UtilityRoomInput, "roomName">>(rooms: T[]): T[] {
  return [...rooms].sort((left, right) => compareUtilityRoomNames(left.roomName, right.roomName));
}

function validateTotal(totalCents: number): void {
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0 || totalCents > MAX_UTILITY_CENTS) {
    throw new Error("Enter a bill total within the supported amount.");
  }
}

function validateRooms(rooms: UtilityRoomInput[]): void {
  if (rooms.length === 0) throw new Error("Select at least one occupied room.");
  if (new Set(rooms.map((room) => room.roomId)).size !== rooms.length) {
    throw new Error("A room can only be included once.");
  }
}

function assertMilliUnits(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative reading.`);
  }
}

/** Largest-remainder allocation; weights must already be in display order. */
export function allocate(totalCents: number, weights: readonly bigint[]): number[] {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0) {
    throw new Error("Total cents must be a non-negative integer.");
  }
  if (weights.length === 0 || weights.some((weight) => weight < 0n)) {
    throw new Error("At least one non-negative allocation weight is required.");
  }
  const weightTotal = weights.reduce((total, weight) => total + weight, 0n);
  if (weightTotal === 0n) throw new Error("Enter units for at least one room.");

  const cents = BigInt(totalCents);
  const allocated = weights.map((weight) => Number((cents * weight) / weightTotal));
  const remainders = weights.map((weight, index) => ({
    index,
    remainder: (cents * weight) % weightTotal,
  }));
  let remaining = totalCents - allocated.reduce((sum, amount) => sum + amount, 0);
  remainders.sort((left, right) =>
    left.remainder === right.remainder
      ? left.index - right.index
      : left.remainder > right.remainder
        ? -1
        : 1,
  );
  for (const item of remainders) {
    if (remaining === 0) break;
    if (weights[item.index] !== 0n) {
      allocated[item.index] = (allocated[item.index] ?? 0) + 1;
      remaining -= 1;
    }
  }
  if (remaining !== 0) throw new Error("The bill could not be allocated exactly.");
  return allocated;
}

export function splitEqual(input: UtilitySplitInput): UtilitySplitResult {
  validateTotal(input.totalCents);
  const rooms = sortUtilityRooms(input.rooms);
  validateRooms(rooms);
  const weights = [...rooms.map(() => 1n), ...(input.includeMainHouse ? [1n] : [])];
  const amounts = allocate(input.totalCents, weights);
  const shares = rooms.map((room, index) => ({
    room,
    amountCents: amounts[index] ?? 0,
    unitsMilli: null,
    previousReadingMilli: null,
    currentReadingMilli: null,
  }));
  return {
    totalCents: input.totalCents,
    shares,
    mainHouseCents: input.includeMainHouse ? (amounts[rooms.length] ?? 0) : 0,
    totalUnitsMilli: null,
    includesMainHouse: input.includeMainHouse,
  };
}

export function toMilliUnits(value: string): number {
  const trimmed = value.trim();
  const match = /^(\d+)(?:[.,](\d{1,3}))?$/.exec(trimmed);
  if (!match) throw new Error("Enter a reading with up to three decimal places.");
  const whole = BigInt(match[1] ?? "0");
  const fraction = BigInt((match[2] ?? "").padEnd(3, "0"));
  const milli = whole * 1000n + fraction;
  if (milli > MAX_READING_MILLI) throw new Error("Reading is too large.");
  return Number(milli);
}

export function fromMilliUnits(value: number): string {
  assertMilliUnits(value, "Reading");
  const whole = Math.floor(value / 1000);
  const fraction = String(value % 1000)
    .padStart(3, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

export function unitsFromReadings(previousMilli: number, currentMilli: number): number {
  assertMilliUnits(previousMilli, "Previous reading");
  assertMilliUnits(currentMilli, "Current reading");
  if (currentMilli < previousMilli) {
    throw new Error("Current reading cannot be lower than the previous reading.");
  }
  return currentMilli - previousMilli;
}

export function splitByUsage(input: UtilityUsageSplitInput): UtilitySplitResult {
  validateTotal(input.totalCents);
  const rooms = sortUtilityRooms(input.rooms);
  validateRooms(rooms);
  const readingsByRoom = new Map(input.readings.map((reading) => [reading.roomId, reading]));
  const roomWeights = rooms.map((room) => {
    const reading = readingsByRoom.get(room.roomId);
    if (!reading) throw new Error(`Enter both readings for ${room.roomName}.`);
    return unitsFromReadings(reading.previousMilli, reading.currentMilli);
  });
  const houseUnits = input.includeMainHouse ? input.mainHouseUnitsMilli : null;
  if (input.includeMainHouse && houseUnits === null) {
    throw new Error("Enter the main house units.");
  }
  if (houseUnits !== null) assertMilliUnits(houseUnits, "Main house units");
  const weights = [
    ...roomWeights.map(BigInt),
    ...(input.includeMainHouse ? [BigInt(houseUnits ?? 0)] : []),
  ];
  if (!weights.some((weight) => weight > 0n)) {
    throw new Error("Enter units for at least one room or the main house.");
  }
  const amounts = allocate(input.totalCents, weights);
  const shares = rooms.map((room, index) => {
    const reading = readingsByRoom.get(room.roomId);
    return {
      room,
      amountCents: amounts[index] ?? 0,
      unitsMilli: roomWeights[index] ?? 0,
      previousReadingMilli: reading?.previousMilli ?? null,
      currentReadingMilli: reading?.currentMilli ?? null,
    };
  });
  if (!shares.some((share) => share.amountCents > 0)) {
    throw new Error("At least one room must receive a share.");
  }
  return {
    totalCents: input.totalCents,
    shares,
    mainHouseCents: input.includeMainHouse ? (amounts[rooms.length] ?? 0) : 0,
    totalUnitsMilli: weights.reduce((sum, weight) => sum + Number(weight), 0),
    includesMainHouse: input.includeMainHouse,
  };
}

export function splitCustom(input: UtilityCustomSplitInput): UtilitySplitResult {
  validateTotal(input.totalCents);
  const rooms = sortUtilityRooms(input.rooms);
  validateRooms(rooms);
  let roomCents = 0;
  const shares = rooms.map((room) => {
    const amountCents = input.amountsByRoom[room.roomId];
    if (typeof amountCents !== "number" || !Number.isSafeInteger(amountCents) || amountCents <= 0) {
      throw new Error(`Enter an amount above R0 for ${room.roomName}.`);
    }
    roomCents += amountCents;
    if (roomCents > input.totalCents) throw new Error("Room amounts cannot exceed the bill total.");
    return {
      room,
      amountCents,
      unitsMilli: null,
      previousReadingMilli: null,
      currentReadingMilli: null,
    };
  });
  return {
    totalCents: input.totalCents,
    shares,
    mainHouseCents: input.totalCents - roomCents,
    totalUnitsMilli: null,
    includesMainHouse: input.includeMainHouse,
  };
}

export function buildChargeNote(input: {
  type: UtilityType;
  period: string;
  totalCents: number;
  splitMethod: SplitMethod;
  roomCount: number;
  includesMainHouse: boolean;
  unitsMilli?: number;
  totalUnitsMilli?: number;
}): string {
  const bill = `${formatMoney(input.totalCents)} ${input.type} bill for ${formatMonthLabel(input.period)}`;
  if (input.splitMethod === "equal") {
    const participants = `${input.roomCount} ${input.roomCount === 1 ? "room" : "rooms"}${
      input.includesMainHouse ? " and the main house" : ""
    }`;
    return `Your share of the ${bill}, split equally between ${participants}.`;
  }
  if (input.splitMethod === "by_room") {
    if (input.unitsMilli === undefined || input.totalUnitsMilli === undefined) {
      throw new Error("Usage units are required to explain this share.");
    }
    const units = input.type === "electricity" ? "kWh" : "kL";
    return `Your share of the ${bill}, based on units used: ${fromMilliUnits(input.unitsMilli)} of ${fromMilliUnits(input.totalUnitsMilli)} ${units}.`;
  }
  return `Your share of the ${bill}, set by your landlord.`;
}

export function buildBillPayload(input: {
  bill: UtilityBillDraft;
  split: UtilitySplitResult;
  splitMethod: SplitMethod;
  readings?: UtilityRoomReading[];
}): UtilityBillPayload {
  const { bill, split, splitMethod } = input;
  if (split.totalCents !== bill.totalCents) {
    throw new Error("The split total does not match the bill total.");
  }
  const allUnitsMilli = splitMethod === "by_room" ? (split.totalUnitsMilli ?? 0) : undefined;
  const persistedShares = split.shares
    .filter((share) => share.amountCents > 0)
    .map((share) => ({
      room_id: share.room.roomId,
      tenant_id: share.room.tenantId,
      amount_cents: share.amountCents,
      units_milli: share.unitsMilli,
      previous_reading:
        share.previousReadingMilli === null
          ? null
          : Number(fromMilliUnits(share.previousReadingMilli)),
      current_reading:
        share.currentReadingMilli === null
          ? null
          : Number(fromMilliUnits(share.currentReadingMilli)),
      note: buildChargeNote({
        type: bill.type,
        period: bill.period,
        totalCents: bill.totalCents,
        splitMethod,
        roomCount: split.shares.length,
        includesMainHouse: bill.includesMainHouse,
        ...(share.unitsMilli !== null ? { unitsMilli: share.unitsMilli } : {}),
        ...(allUnitsMilli !== undefined ? { totalUnitsMilli: allUnitsMilli } : {}),
      }),
    }));
  if (persistedShares.length === 0) throw new Error("At least one room must receive a charge.");
  const totalCents =
    persistedShares.reduce((sum, share) => sum + Number(share.amount_cents), 0) +
    split.mainHouseCents;
  if (totalCents !== bill.totalCents)
    throw new Error("The shares do not add up to the bill total.");

  return {
    p_property_id: bill.propertyId,
    p_type: bill.type,
    p_period: bill.period,
    p_total_cents: bill.totalCents,
    p_split_method: splitMethod,
    p_due_date: bill.dueDate,
    p_includes_main_house: bill.includesMainHouse,
    p_main_house_cents: split.mainHouseCents,
    p_shares: persistedShares,
    p_readings: (input.readings ?? []).map((reading) => ({
      room_id: reading.roomId,
      reading: fromMilliUnits(reading.currentMilli),
    })),
    p_note: bill.note,
  };
}

export function defaultDueDate(today: string = todayInSA()): string {
  const date = new Date(`${today}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) throw new Error(`Invalid date: ${today}`);
  date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString().slice(0, 10);
}

export function canUndo(createdAt: string, now: Date | number = Date.now()): boolean {
  const created = Date.parse(createdAt);
  const current = typeof now === "number" ? now : now.getTime();
  const windowMs = 14 * 24 * 60 * 60 * 1000;
  return Number.isFinite(created) && created <= current && current - created <= windowMs;
}
