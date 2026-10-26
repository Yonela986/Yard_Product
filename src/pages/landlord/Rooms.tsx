import { PageHeader } from "@/components/layout/PageHeader";
import { RoomsList } from "@/features/rooms/components/RoomsList";

export default function Rooms() {
  return (
    <>
      <PageHeader title="Rooms" />
      <RoomsList />
    </>
  );
}
