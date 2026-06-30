import { getActiveGroupId } from "@/lib/group";
import { RealtimeRefresh } from "./RealtimeRefresh";

export async function RealtimeProvider() {
  const groupId = await getActiveGroupId();
  return <RealtimeRefresh groupId={groupId} />;
}
