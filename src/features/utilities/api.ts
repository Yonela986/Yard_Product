import { supabase } from "@/lib/supabase";
import { compareUtilityRoomNames, toMilliUnits } from "./split";
import type { SplitMethod, UtilityBill, UtilityShare, UtilityType } from "@/types/domain";
import type { Json } from "@/types/database";
import type { UtilityBillPayload } from "./split";

export interface UtilityRoom {
  id: string;
  name: string;
  tenantId: string | null;
  tenantName: string | null;
}

export interface UtilityBillShareDetail extends UtilityShare {
  roomName: string;
  tenantName: string;
  currentAmountCents: number | null;
}

export interface UtilityBillDetail {
  bill: UtilityBill;
  shares: UtilityBillShareDetail[];
}

function isRecord(value: Json | unknown): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUtilityType(value: unknown): value is UtilityType {
  return value === "electricity" || value === "water";
}

function isSplitMethod(value: unknown): value is SplitMethod {
  return value === "equal" || value === "by_room" || value === "custom";
}

function parseShares(value: Json): UtilityShare[] {
  if (!Array.isArray(value)) throw new Error("Utility bill shares were invalid.");
  return value.map((item) => {
    if (!isRecord(item)) throw new Error("Utility bill share was invalid.");
    const roomId = item["room_id"];
    const tenantId = item["tenant_id"];
    const amountCents = item["amount_cents"];
    const unitsMilli = item["units_milli"];
    const previousReading = item["previous_reading"];
    const currentReading = item["current_reading"];
    const note = item["note"];
    if (
      typeof roomId !== "string" ||
      typeof tenantId !== "string" ||
      typeof amountCents !== "number" ||
      (unitsMilli !== null && typeof unitsMilli !== "number") ||
      (previousReading !== null && typeof previousReading !== "number") ||
      (currentReading !== null && typeof currentReading !== "number") ||
      typeof note !== "string"
    ) {
      throw new Error("Utility bill share was invalid.");
    }
    return {
      roomId,
      tenantId,
      amountCents,
      unitsMilli,
      previousReading,
      currentReading,
      note,
    };
  });
}

function parseBill(row: {
  id: string;
  property_id: string;
  type: string;
  period: string;
  total_cents: number;
  split_method: string;
  due_date: string;
  includes_main_house: boolean;
  main_house_cents: number;
  shares: Json;
  note: string | null;
  voided_at: string | null;
  created_at: string;
}): UtilityBill {
  if (!isUtilityType(row.type) || !isSplitMethod(row.split_method)) {
    throw new Error("Utility bill type or split method was invalid.");
  }
  return {
    ...row,
    type: row.type,
    split_method: row.split_method,
    shares: parseShares(row.shares),
  };
}

export async function listUtilityRooms(propertyId: string): Promise<UtilityRoom[]> {
  const [roomsResult, tenantsResult] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name")
      .eq("property_id", propertyId)
      .eq("is_active", true)
      .order("name"),
    supabase.from("tenants").select("id, name, room_id").is("move_out_date", null),
  ]);
  if (roomsResult.error) throw roomsResult.error;
  if (tenantsResult.error) throw tenantsResult.error;
  const tenantByRoom = new Map(tenantsResult.data.map((tenant) => [tenant.room_id, tenant]));
  return (roomsResult.data ?? [])
    .map((room) => {
      const tenant = tenantByRoom.get(room.id);
      return {
        id: room.id,
        name: room.name,
        tenantId: tenant?.id ?? null,
        tenantName: tenant?.name ?? null,
      };
    })
    .sort((left, right) => compareUtilityRoomNames(left.name, right.name));
}

export async function listUtilityBills(propertyId: string): Promise<UtilityBill[]> {
  const { data, error } = await supabase
    .from("utility_bills")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(parseBill);
}

export async function getUtilityBill(billId: string): Promise<UtilityBillDetail | null> {
  const { data, error } = await supabase
    .from("utility_bills")
    .select("*")
    .eq("id", billId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const bill = parseBill(data);
  const { data: charges, error: chargesError } = await supabase
    .from("charges")
    .select("tenant_id, amount_cents")
    .eq("utility_bill_id", billId);
  if (chargesError) throw chargesError;

  const tenantIds = [...new Set(bill.shares.map((share) => share.tenantId))];
  const roomIds = [...new Set(bill.shares.map((share) => share.roomId))];
  const [tenantResult, roomResult] = await Promise.all([
    tenantIds.length
      ? supabase.from("tenants").select("id, name").in("id", tenantIds)
      : Promise.resolve({ data: [], error: null }),
    roomIds.length
      ? supabase.from("rooms").select("id, name").in("id", roomIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (tenantResult.error) throw tenantResult.error;
  if (roomResult.error) throw roomResult.error;
  const tenantNames = new Map((tenantResult.data ?? []).map((tenant) => [tenant.id, tenant.name]));
  const roomNames = new Map((roomResult.data ?? []).map((room) => [room.id, room.name]));
  const currentAmounts = new Map(
    (charges ?? []).map((charge) => [charge.tenant_id, charge.amount_cents]),
  );
  return {
    bill,
    shares: bill.shares.map((share) => ({
      ...share,
      roomName: roomNames.get(share.roomId) ?? "Room unavailable",
      tenantName: tenantNames.get(share.tenantId) ?? "Tenant unavailable",
      currentAmountCents: currentAmounts.get(share.tenantId) ?? null,
    })),
  };
}

export async function getLatestMeterReadings(
  roomIds: string[],
  type: UtilityType,
): Promise<Record<string, number>> {
  if (roomIds.length === 0) return {};
  const { data, error } = await supabase
    .from("meter_readings")
    .select("room_id, reading, read_on, created_at")
    .eq("type", type)
    .in("room_id", roomIds)
    .order("read_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const latest: Record<string, number> = {};
  for (const reading of data ?? []) {
    if (latest[reading.room_id] === undefined) {
      latest[reading.room_id] = toMilliUnits(String(reading.reading));
    }
  }
  return latest;
}

export async function createUtilityBill(payload: UtilityBillPayload): Promise<string> {
  const { data, error } = await supabase.rpc("create_utility_bill", payload);
  if (error) throw error;
  if (typeof data !== "string" || data.length === 0) {
    throw new Error("Utility bill creation returned an invalid ID.");
  }
  return data;
}

export async function undoUtilityBill(billId: string): Promise<void> {
  const { error } = await supabase.rpc("void_utility_bill", { p_bill_id: billId });
  if (error) throw error;
}
