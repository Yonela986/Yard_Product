import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { House } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { IconTile } from "@/components/ui/IconTile";
import { ListCard, ListRow } from "@/components/ui/ListRow";
import { RowAmount } from "@/components/ui/RowAmount";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusTag } from "@/components/ui/StatusTag";
import { deriveStatus } from "@/features/charges/balance";
import { useTenantBalances } from "@/features/charges/hooks";
import { RoomFormSheet } from "@/features/rooms/components/RoomFormSheet";
import { useCreateRoom, useInactiveRooms, useProperty } from "@/features/rooms/hooks";
import { useCurrentTenants } from "@/features/tenants/hooks";
import { ordinal } from "@/lib/dates";
import { naturalRoomSort } from "@/features/rooms/schema";
import { paths } from "@/router/paths";
import type { Room } from "@/types/domain";

import { useActiveRooms } from "../hooks";

export function RoomsList() {
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();
  const rooms = useActiveRooms();
  const inactiveRooms = useInactiveRooms();
  const tenants = useCurrentTenants();
  const balances = useTenantBalances();
  const property = useProperty();
  const createRoom = useCreateRoom();

  if (rooms.isPending) return <p className="text-body text-ink-muted">Loading</p>;
  if (rooms.isError) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-body text-ink">Your rooms did not load. Check your connection.</p>
        <Button variant="secondary" onClick={() => void rooms.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const ordered = naturalRoomSort(rooms.data ?? []);
  const inactiveOrdered = naturalRoomSort(inactiveRooms.data ?? []);
  const allRooms: Room[] = [...ordered, ...inactiveOrdered];
  const tenantByRoom = new Map((tenants.data ?? []).map((tenant) => [tenant.room_id, tenant]));
  const balanceByTenant = new Map(
    (balances.data ?? []).map((balance) => [balance.tenantId, balance]),
  );

  async function saveRoom(values: { name: string; monthly_rent_cents: number; due_day: number }) {
    if (property.isError) throw property.error;
    if (!property.data) throw new Error("Property details are not available. Try again.");
    await createRoom.mutateAsync({ property_id: property.data.id, ...values });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setAddOpen(true)}>Add room</Button>
      </div>
      {tenants.isError && (
        <p role="alert" className="mb-4 text-secondary font-semibold text-ink">
          Current tenants did not load. Refresh and try again.
        </p>
      )}
      {balances.isError && (
        <p role="alert" className="mb-4 text-secondary font-semibold text-ink">
          Tenant payment statuses did not load. Refresh and try again.
        </p>
      )}
      {ordered.length === 0 ? (
        <p className="py-8 text-body text-ink">No active rooms yet. Add your first room.</p>
      ) : (
        <ListCard>
          {ordered.map((room) => {
            const tenant = tenantByRoom.get(room.id);
            const tenantBalance = tenant ? balanceByTenant.get(tenant.id) : undefined;
            return (
              <ListRow
                key={room.id}
                primary={room.name}
                secondary={
                  tenant
                    ? `${tenant.name} · Due on the ${ordinal(room.due_day)}`
                    : `Due on the ${ordinal(room.due_day)}`
                }
                leading={<IconTile icon={House} />}
                trailing={
                  <>
                    <RowAmount cents={room.monthly_rent_cents} />
                    {tenant ? (
                      balances.isPending ? (
                        <span className="text-secondary text-ink-muted">Checking</span>
                      ) : balances.isError ? (
                        <span className="text-secondary text-ink-muted">Unavailable</span>
                      ) : tenantBalance ? (
                        <StatusTag status={deriveStatus(tenantBalance)} />
                      ) : (
                        <span className="text-secondary text-ink-muted">Unavailable</span>
                      )
                    ) : tenants.isPending || tenants.isError ? (
                      <span className="text-secondary text-ink-muted">
                        {tenants.isPending ? "Checking" : "Unavailable"}
                      </span>
                    ) : (
                      <StatusTag variant="vacant" />
                    )}
                  </>
                }
                chevron
                onClick={() => void navigate({ to: paths.roomDetail.replace("$roomId", room.id) })}
              />
            );
          })}
        </ListCard>
      )}
      {inactiveRooms.isError && (
        <p role="alert" className="mt-4 text-secondary font-semibold text-ink">
          Inactive rooms did not load. Refresh and try again.
        </p>
      )}
      {inactiveOrdered.length > 0 && (
        <section className="mt-8">
          <SectionHeader title="Inactive rooms" />
          <ListCard>
            {inactiveOrdered.map((room) => (
              <ListRow
                key={room.id}
                primary={room.name}
                secondary={`Due on the ${ordinal(room.due_day)}`}
                leading={<IconTile icon={House} />}
                trailing={<StatusTag variant="inactive" />}
                chevron
                onClick={() => void navigate({ to: paths.roomDetail.replace("$roomId", room.id) })}
              />
            ))}
          </ListCard>
        </section>
      )}
      <RoomFormSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        allRooms={allRooms}
        onSave={saveRoom}
      />
    </>
  );
}
