import { formatMoney } from "@/lib/money";

import { summariseRooms, type RoomFormValues } from "../schema";

export function ReviewLine({ rooms }: { rooms: RoomFormValues[] }) {
  const { count, totalCents } = summariseRooms(rooms);
  return (
    <p className="text-body text-ink">
      {count} {count === 1 ? "room" : "rooms"},{" "}
      <span className="money">{formatMoney(totalCents)}</span> expected each month
    </p>
  );
}
