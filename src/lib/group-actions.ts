"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { GROUP_COOKIE } from "@/lib/group";

export async function setActiveGroup(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return { error: "Not a member of this group" };

  await supabase
    .from("profiles")
    .update({ active_group_id: groupId })
    .eq("id", user.id);

  const cookieStore = await cookies();
  cookieStore.set(GROUP_COOKIE, groupId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createGroup(name: string, description?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();

  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      invite_code: code,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: user.id,
    role: "owner",
  });

  await setActiveGroup(group.id);
  return { group };
}

export async function joinGroupByInvite(inviteCode: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase.rpc("join_group_by_invite", {
    invite: inviteCode.trim().toUpperCase(),
  });

  if (error) return { error: error.message };

  if (data) await setActiveGroup(data as string);
  revalidatePath("/", "layout");
  return { groupId: data };
}

export async function completeOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  return { ok: true };
}
