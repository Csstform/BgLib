import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";
import { getBggCollection } from "@/lib/bgg";
import {
  classifyCollection,
  importBggBatch,
  linkSkippedDuplicates,
  loadExistingGameIndex,
} from "@/lib/bgg-import";

const MAX_BATCH_SIZE = 10;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groupId = await getActiveGroupId();
  if (!groupId) {
    return NextResponse.json({ error: "No active group" }, { status: 400 });
  }

  const body = await request.json();
  const action = body.action as string | undefined;

  if (action === "preview") {
    const username = body.username as string | undefined;
    if (!username?.trim()) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    let collection;
    try {
      collection = await getBggCollection(username.trim());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "BGG collection fetch failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const index = await loadExistingGameIndex(supabase, groupId);
    const classified = classifyCollection(collection, index);
    const toImport = classified.filter((item) => item.action === "import");
    const skipped = classified.filter((item) => item.action === "skip");

    const linkedFromPreview = await linkSkippedDuplicates({
      supabase,
      userId: user.id,
      items: skipped,
      index,
    });

    return NextResponse.json({
      total: collection.length,
      toImport: toImport.map((item) => ({
        id: item.id,
        name: item.name,
        subtype: item.subtype,
      })),
      skipped: skipped.map((item) => ({
        id: item.id,
        name: item.name,
        reason: item.reason,
      })),
      skippedByBggId: skipped.filter((item) => item.reason === "bgg_id").length,
      skippedByTitle: skipped.filter((item) => item.reason === "title").length,
      linkedFromPreview,
    });
  }

  if (action === "batch") {
    const bggIds = body.bggIds as number[] | undefined;
    if (!Array.isArray(bggIds) || bggIds.length === 0) {
      return NextResponse.json({ error: "bggIds required" }, { status: 400 });
    }
    if (bggIds.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_SIZE} games per batch` },
        { status: 400 }
      );
    }

    const index = await loadExistingGameIndex(supabase, groupId);
    const result = await importBggBatch({
      supabase,
      groupId,
      userId: user.id,
      bggIds,
      index,
    });

    return NextResponse.json(result);
  }

  // Legacy single-request import (username only) — preview + first batch hint
  const username = body.username as string | undefined;
  if (!username?.trim()) {
    return NextResponse.json(
      { error: "Use action preview or batch" },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      error:
        "Import now uses preview and batch actions. Update the client to use the new flow.",
    },
    { status: 400 }
  );
}
