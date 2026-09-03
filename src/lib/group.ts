import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { GameWithOwners, Group } from "@/lib/types";
import { GROUP_COOKIE } from "./group-constants";

export { GROUP_COOKIE };

async function verifyMembership(
  userId: string,
  groupId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();
  return !!data;
}

export async function getActiveGroupId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(GROUP_COOKIE)?.value;

  if (fromCookie && (await verifyMembership(user.id, fromCookie))) {
    return fromCookie;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_group_id")
    .eq("id", user.id)
    .single();

  if (
    profile?.active_group_id &&
    (await verifyMembership(user.id, profile.active_group_id))
  ) {
    return profile.active_group_id;
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  return membership?.group_id ?? null;
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
      "user_id, role, profile:profiles (id, display_name, real_name, avatar_url, bio, created_at)"
    )
    .eq("group_id", groupId);

  return (data ?? []).map((row) => ({
    user_id: row.user_id,
    role: row.role as string,
    profile: Array.isArray(row.profile) ? row.profile[0] : row.profile,
  }));
}

export async function isGroupMember(groupId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  return verifyMembership(user.id, groupId);
}

export async function getGroupGameIds(groupId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("games")
    .select("id")
    .eq("group_id", groupId);
  return (data ?? []).map((g) => g.id);
}

/** Games this user owns in a group, without a huge `.in(game_id, …)` filter. */
export async function getOwnedGamesInGroup(
  userId: string,
  groupId: string
): Promise<{ games: GameWithOwners[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(
      `
      id, title, description, min_players, max_players,
      play_time_minutes, image_url, bgg_id, bgg_type, base_game_id,
      upc, bgg_weight, created_by, created_at, group_id,
      ownership!inner (user_id)
    `
    )
    .eq("group_id", groupId)
    .eq("ownership.user_id", userId)
    .order("title");

  if (error) {
    return { games: [], error: error.message };
  }

  const games: GameWithOwners[] = (data ?? []).map((row) => {
    const { ownership: _ownership, ...game } = row;
    return { ...game, owners: [] };
  });

  return { games, error: null };
}

export async function getMyGroupRole(
  groupId: string
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  return data?.role ?? null;
}

export async function countGroupOwners(groupId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId)
    .eq("role", "owner");

  return count ?? 0;
}
