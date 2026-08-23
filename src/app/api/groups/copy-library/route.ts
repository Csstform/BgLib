import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId, isGroupMember } from "@/lib/group";
import { relinkOrphanExpansions } from "@/lib/link-expansions";
import {
  classifyCopyableGames,
  copyLibraryToGroup,
  loadCopyableGames,
  loadTargetGameIndex,
  type CopyLibraryMode,
} from "@/lib/copy-library";

function parseMode(value: unknown): CopyLibraryMode | null {
  if (value === "my_collection" || value === "full_catalogue") return value;
  return null;
}

async function loadGroupName(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", groupId)
    .single();
  return data;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const action = body.action as string | undefined;
  const sourceGroupId = body.source_group_id as string | undefined;
  const requestedTargetId = body.target_group_id as string | undefined;
  const mode = parseMode(body.mode ?? "my_collection");

  const targetGroupId = requestedTargetId ?? (await getActiveGroupId());
  if (!targetGroupId) {
    return NextResponse.json({ error: "No active group" }, { status: 400 });
  }

  if (!sourceGroupId) {
    return NextResponse.json(
      { error: "Source group is required" },
      { status: 400 }
    );
  }
  if (!mode) {
    return NextResponse.json({ error: "Invalid copy mode" }, { status: 400 });
  }
  if (sourceGroupId === targetGroupId) {
    return NextResponse.json(
      { error: "Choose a different group to copy from" },
      { status: 400 }
    );
  }

  const [sourceMember, targetMember] = await Promise.all([
    isGroupMember(sourceGroupId),
    isGroupMember(targetGroupId),
  ]);

  if (!sourceMember || !targetMember) {
    return NextResponse.json(
      { error: "You must be a member of both groups" },
      { status: 403 }
    );
  }

  let games;
  try {
    games = await loadCopyableGames(supabase, sourceGroupId, user.id, mode);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load source library";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const [sourceGroup, targetGroup] = await Promise.all([
    loadGroupName(sourceGroupId),
    loadGroupName(targetGroupId),
  ]);

  if (action === "preview") {
    const index = await loadTargetGameIndex(supabase, targetGroupId);
    const classified = classifyCopyableGames(games, index);
    const toCopy = classified.filter((item) => item.action === "copy");
    const toLink = classified.filter((item) => item.action === "link");

    return NextResponse.json({
      source: sourceGroup,
      target: targetGroup,
      mode,
      total: classified.length,
      extraBases: classified.filter((item) => item.includedAsBase).length,
      toCopy: toCopy.map((item) => ({ id: item.sourceId, title: item.title })),
      toLink: toLink.map((item) => ({
        id: item.sourceId,
        title: item.title,
        reason: item.reason,
      })),
    });
  }

  if (action === "copy") {
    const result = await copyLibraryToGroup({
      supabase,
      userId: user.id,
      targetGroupId,
      games,
    });

    try {
      await relinkOrphanExpansions(supabase, targetGroupId);
    } catch {
      // Expansion relink is best-effort; the catalogue copy already succeeded.
    }

    return NextResponse.json({
      source: sourceGroup,
      target: targetGroup,
      mode,
      ...result,
    });
  }

  return NextResponse.json(
    { error: "Use action preview or copy" },
    { status: 400 }
  );
}
