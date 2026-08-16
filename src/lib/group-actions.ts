"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { GROUP_COOKIE } from "@/lib/group-constants";

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

  const { data, error } = await supabase.rpc("create_group", {
    group_name: name.trim(),
    group_description: description?.trim() || null,
  });

  if (error) return { error: error.message };

  const group = data as {
    id: string;
    name: string;
    description: string | null;
    invite_code: string;
    created_by: string;
    created_at: string;
  };

  const cookieStore = await cookies();
  cookieStore.set(GROUP_COOKIE, group.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
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

export async function renameGroup(
  groupId: string,
  updates: { name?: string; description?: string | null }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (membership?.role !== "owner") {
    return { error: "Only group owners can rename the group" };
  }

  const payload: Record<string, string | null> = {};
  if (updates.name !== undefined) {
    const trimmed = updates.name.trim();
    if (!trimmed) return { error: "Group name is required" };
    payload.name = trimmed;
  }
  if (updates.description !== undefined) {
    payload.description = updates.description?.trim() || null;
  }

  if (Object.keys(payload).length === 0) {
    return { error: "Nothing to update" };
  }

  const { error } = await supabase
    .from("groups")
    .update(payload)
    .eq("id", groupId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function leaveGroup(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return { error: "You are not a member of this group" };

  if (membership.role === "owner") {
    const { count } = await supabase
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId)
      .eq("role", "owner");

    if ((count ?? 0) <= 1) {
      return {
        error:
          "You're the only owner. Create another group or ask another member to take over before leaving.",
      };
    }
  }

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_group_id")
    .eq("id", user.id)
    .single();

  const cookieStore = await cookies();
  let leftLastGroup = false;

  if (profile?.active_group_id === groupId) {
    const { data: remaining } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const nextGroupId = remaining?.group_id ?? null;
    leftLastGroup = !nextGroupId;

    await supabase
      .from("profiles")
      .update({ active_group_id: nextGroupId })
      .eq("id", user.id);

    if (nextGroupId) {
      cookieStore.set(GROUP_COOKIE, nextGroupId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    } else {
      cookieStore.delete(GROUP_COOKIE);
    }
  }

  revalidatePath("/", "layout");
  return { ok: true, leftLastGroup };
}

export async function removeGroupMember(groupId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (userId === user.id) {
    return { error: "Use leave group to remove yourself" };
  }

  const { data: myMembership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (myMembership?.role !== "owner") {
    return { error: "Only group owners can remove members" };
  }

  const { data: target } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();

  if (!target) return { error: "Member not found" };
  if (target.role === "owner") {
    return { error: "Cannot remove another owner" };
  }

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("active_group_id")
    .eq("id", userId)
    .single();

  if (targetProfile?.active_group_id === groupId) {
    const { data: remaining } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    await supabase
      .from("profiles")
      .update({ active_group_id: remaining?.group_id ?? null })
      .eq("id", userId);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
