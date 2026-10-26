import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, UserRoundPlus } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { InitialsTile } from "@/components/ui/InitialsTile";
import { ListCard, ListRow } from "@/components/ui/ListRow";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusTag } from "@/components/ui/StatusTag";
import { deriveStatus } from "@/features/charges/balance";
import { useTenantBalances } from "@/features/charges/hooks";
import { useActiveRooms } from "@/features/rooms/hooks";
import { useCurrentTenants } from "@/features/tenants/hooks";
import { formatMoney } from "@/lib/money";
import { paths } from "@/router/paths";

export default function Tenants() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const tenants = useCurrentTenants();
  const rooms = useActiveRooms();
  const balances = useTenantBalances();

  const filteredTenants = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const roomById = new Map((rooms.data ?? []).map((room) => [room.id, room]));
    return (tenants.data ?? []).filter((tenant) => {
      if (!query) return true;
      const roomName = roomById.get(tenant.room_id)?.name ?? "";
      return `${tenant.name} ${roomName}`.toLocaleLowerCase().includes(query);
    });
  }, [search, tenants.data, rooms.data]);

  if (tenants.isPending) {
    return (
      <>
        <PageHeader title="Tenants" />
        <p className="py-8 text-body text-ink-muted">Loading tenants…</p>
      </>
    );
  }

  if (tenants.isError) {
    return (
      <>
        <PageHeader title="Tenants" />
        <div className="space-y-4 py-8">
          <p role="alert" className="text-body text-ink">
            Your tenants could not be loaded. Check your connection and try again.
          </p>
          <Button variant="secondary" onClick={() => void tenants.refetch()}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  const roomById = new Map((rooms.data ?? []).map((room) => [room.id, room]));
  const balanceByTenant = new Map((balances.data ?? []).map((balance) => [balance.tenantId, balance]));

  return (
    <>
      <PageHeader
        title="Tenants"
        action={
          <Button onClick={() => void navigate({ to: paths.tenantNew })}>
            <UserRoundPlus aria-hidden="true" className="mr-2 size-4" />
            Add tenant
          </Button>
        }
      />

      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-2">
            <label htmlFor="tenant-search" className="block text-secondary font-semibold text-ink">
              Find a tenant
            </label>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                id="tenant-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or room"
                className="min-h-12 w-full rounded-md border border-line bg-surface pl-10 pr-4 text-body text-ink placeholder:text-ink-muted focus:border-brand"
              />
            </div>
          </div>
          <p className="pb-3 text-secondary text-ink-muted">
            {filteredTenants.length} of {tenants.data.length} {tenants.data.length === 1 ? "tenant" : "tenants"}
          </p>
        </div>

        {rooms.isError && (
          <p role="alert" className="text-secondary font-semibold text-ink">
            Room details could not be loaded. Tenant names are still available.
          </p>
        )}
        {balances.isError && (
          <p role="alert" className="text-secondary font-semibold text-ink">
            Payment balances could not be loaded. Refresh to see current payment status.
          </p>
        )}

        {tenants.data.length === 0 ? (
          <EmptyState
            message="No tenants yet. Add your first tenant to connect them to a room and start tracking rent."
            actionLabel="Add your first tenant"
            onAction={() => void navigate({ to: paths.tenantNew })}
          />
        ) : filteredTenants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-surface px-5 py-10 text-center">
            <Search aria-hidden="true" className="mx-auto mb-3 size-6 text-ink-muted" />
            <p className="font-semibold text-ink">No matches found</p>
            <p className="mt-1 text-secondary text-ink-muted">Try another tenant name or room name.</p>
          </div>
        ) : (
          <section className="space-y-3">
            <SectionHeader title="Tenant directory" trailing={`${filteredTenants.length} shown`} />
            <ListCard>
              {filteredTenants.map((tenant) => {
                const room = roomById.get(tenant.room_id);
                const balance = balanceByTenant.get(tenant.id);
                return (
                  <ListRow
                    key={tenant.id}
                    primary={tenant.name}
                    secondary={room?.name ?? (rooms.isPending ? "Loading room…" : "Room unavailable")}
                    leading={<InitialsTile name={tenant.name} />}
                    trailing={
                      <>
                        {balance ? (
                          <span className="money font-semibold">{formatMoney(balance.balanceCents)}</span>
                        ) : (
                          <span className="text-secondary text-ink-muted">
                            {balances.isPending ? "Checking" : "Balance unavailable"}
                          </span>
                        )}
                        {balance && <StatusTag status={deriveStatus(balance)} />}
                      </>
                    }
                    chevron
                    onClick={() => void navigate({ to: paths.tenantDetail.replace("$tenantId", tenant.id) })}
                  />
                );
              })}
            </ListCard>
          </section>
        )}
      </div>
    </>
  );
}
