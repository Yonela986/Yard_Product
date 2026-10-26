import { useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { InitialsTile } from "@/components/ui/InitialsTile";
import { ListCard, ListRow } from "@/components/ui/ListRow";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusTag } from "@/components/ui/StatusTag";
import { RoomFormSheet } from "@/features/rooms/components/RoomFormSheet";
import {
  useActiveRooms,
  useInactiveRooms,
  useRoom,
  useSetRoomActive,
  useUpdateRoom,
} from "@/features/rooms/hooks";
import { usePreviousTenantsForRoom, useTenantsForRoom } from "@/features/tenants/hooks";
import { formatShortDate, ordinal } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { paths } from "@/router/paths";
import type { Room } from "@/types/domain";

export default function RoomDetail() {
  const { roomId = "" } = useParams({ strict: false });
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const roomQuery = useRoom(roomId);
  const activeRooms = useActiveRooms();
  const inactiveRooms = useInactiveRooms();
  const currentTenants = useTenantsForRoom(roomId);
  const previousTenants = usePreviousTenantsForRoom(roomId);
  const updateRoom = useUpdateRoom();
  const setRoomActive = useSetRoomActive();
  const room = roomQuery.data ?? null;
  const currentTenant =
    currentTenants.data?.find((tenant) => tenant.move_out_date === null) ?? null;
  const allRooms: Room[] = [...(activeRooms.data ?? []), ...(inactiveRooms.data ?? [])];
  const actionError = updateRoom.error ?? setRoomActive.error;

  async function saveRoom(values: { name: string; monthly_rent_cents: number; due_day: number }) {
    await updateRoom.mutateAsync({ roomId, input: values });
  }

  async function toggleActive(isActive: boolean) {
    try {
      await setRoomActive.mutateAsync({ roomId, isActive });
    } catch {
      // The message below exposes the database error to the landlord.
    }
  }

  return (
    <>
      <PageHeader title={room?.name ?? "Room details"} backTo={paths.rooms} />
      {roomQuery.isPending ? (
        <p className="py-6 text-body text-ink-muted">Loading room details...</p>
      ) : roomQuery.isError ? (
        <p role="alert" className="py-6 text-body text-ink">
          Room details did not load. Check your connection and try again.
        </p>
      ) : !room ? (
        <p className="py-6 text-body text-ink">This room could not be found.</p>
      ) : (
        <div className="space-y-6">
          <section className="rounded-md border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-secondary text-ink-muted">Monthly rent</p>
                <p className="money text-title text-ink">{formatMoney(room.monthly_rent_cents)}</p>
                <p className="mt-1 text-body text-ink">
                  Due on the {ordinal(room.due_day)} of each month
                </p>
              </div>
              {!currentTenant &&
                !currentTenants.isPending &&
                !currentTenants.isError &&
                room.is_active && <StatusTag variant="vacant" />}
              {!room.is_active && <StatusTag variant="inactive" />}
            </div>
            {currentTenant && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-secondary text-ink-muted">Current tenant</p>
                <Link
                  className="mt-1 inline-block text-body font-semibold text-ink underline"
                  to={paths.tenantDetail.replace("$tenantId", currentTenant.id)}
                >
                  {currentTenant.name}
                </Link>
              </div>
            )}
          </section>

          {actionError && (
            <p role="alert" className="text-secondary font-semibold text-ink">
              {actionError.message.includes("current tenant")
                ? "Move out the current tenant before deactivating this room."
                : actionError.message || "The room could not be updated. Please try again."}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {room.is_active && (
              <>
                <Button variant="secondary" onClick={() => setEditOpen(true)}>
                  Edit room
                </Button>
                {!currentTenants.isPending && !currentTenants.isError && !currentTenant && (
                  <Button
                    variant="secondary"
                    loading={setRoomActive.isPending}
                    onClick={() => void toggleActive(false)}
                  >
                    Deactivate room
                  </Button>
                )}
                {!currentTenants.isPending && !currentTenants.isError && !currentTenant && (
                  <Button
                    onClick={() => void navigate({ to: paths.tenantNew, search: { roomId } })}
                  >
                    Add tenant
                  </Button>
                )}
              </>
            )}
            {!room.is_active && (
              <Button loading={setRoomActive.isPending} onClick={() => void toggleActive(true)}>
                Reactivate room
              </Button>
            )}
          </div>

          {currentTenants.isError && (
            <p role="alert" className="text-secondary text-ink">
              Tenant details could not be loaded.
            </p>
          )}
          {previousTenants.isError && (
            <p role="alert" className="text-secondary text-ink">
              Previous tenants could not be loaded.
            </p>
          )}
          {previousTenants.data && previousTenants.data.length > 0 && (
            <section>
              <SectionHeader
                title="Previous tenants"
                trailing={String(previousTenants.data.length)}
              />
              <ListCard>
                {previousTenants.data.map((tenant) => (
                  <ListRow
                    key={tenant.id}
                    primary={tenant.name}
                    secondary={`${formatShortDate(tenant.move_in_date)} – ${tenant.move_out_date ? formatShortDate(tenant.move_out_date) : ""}`}
                    leading={<InitialsTile name={tenant.name} />}
                    chevron
                    onClick={() =>
                      void navigate({
                        to: paths.tenantDetail.replace("$tenantId", tenant.id),
                      })
                    }
                  />
                ))}
              </ListCard>
            </section>
          )}
        </div>
      )}
      {room && (
        <RoomFormSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          room={room}
          allRooms={allRooms}
          onSave={saveRoom}
        />
      )}
    </>
  );
}
