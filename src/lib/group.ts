import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Group } from "@/lib/types";

export const GROUP_COOKIE = "bglib_group_id";

export async function getActiveGroupId(): Promise<string | null> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(GROUP_COOKIE)?.value;
  if (fromCookie) return fromCookie;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_group_id")
    .eq("id", user.id)
    .single();

  return profile?.active_group_id ?? null;
}

export async function getUserGroups(): Promise<Group[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("group_members")
    .select(
      "group:groups (id, name, description, invite_code, created_by, created_at)"
    )
    .eq("user_id", user.id);

  return (data ?? [])
    .map((row) => {
      const g = Array.isArray(row.group) ? row.group[0] : row.group;
      return g as Group;
    })
    .filter(Boolean);
}

export async function requireGroupId(): Promise<string> {
  const groupId = await getActiveGroupId();
  if (!groupId) throw new Error("No active group");
  return groupId;
}

export async function getGroupMembers(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select(
      "user_id, role, profile:profiles (id, display_name, avatar_url, bio, created_at)"
    )
    .eq("group_id", groupId);

  return (data ?? []).map((row) => ({
    user_id: row.user_id,
    role: row.role as string,
    profile: Array.isArray(row.profile) ? row.profile[0] : row.profile,
  }));
}
