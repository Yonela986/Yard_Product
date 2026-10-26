import { supabase } from "@/lib/supabase";
import type { Property, Room } from "@/types/domain";

/** Active rooms the signed-in landlord owns. RLS limits rows to their own properties. */
export async function listActiveRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listInactiveRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("is_active", false)
    .order("created_at", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const { data, error } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProperty(): Promise<Property | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function updatePropertyBankDetails(
  propertyId: string,
  bankDetails: string | null,
): Promise<Property> {
  const { data, error } = await supabase
    .from("properties")
    .update({ bank_details: bankDetails })
    .eq("id", propertyId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createRoom(input: {
  property_id: string;
  name: string;
  monthly_rent_cents: number;
  due_day: number;
}): Promise<Room> {
  const { data, error } = await supabase.from("rooms").insert(input).select().single();
  if (error) throw error;
  return data as Room;
}

export async function updateRoom(
  roomId: string,
  input: Pick<Room, "name" | "monthly_rent_cents" | "due_day">,
): Promise<Room> {
  const { data, error } = await supabase
    .from("rooms")
    .update(input)
    .eq("id", roomId)
    .select()
    .single();
  if (error) throw error;
  return data as Room;
}

export async function setRoomActive(roomId: string, isActive: boolean): Promise<Room> {
  const { data, error } = await supabase
    .from("rooms")
    .update({ is_active: isActive })
    .eq("id", roomId)
    .select()
    .single();

  if (error) throw error;
  return data as Room;
}
