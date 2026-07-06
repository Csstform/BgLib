import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, Heart, Puzzle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, formatPlayTime, formatPlayers } from "@/lib/utils";
import { getActiveGroupId } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { OwnerRow } from "@/components/OwnerRow";
import { EditGameForm } from "@/components/EditGameForm";
import { MergeGamesPanel } from "@/components/MergeGamesPanel";
import { AddExpansionLink } from "@/components/AddExpansionLink";
import { GameCard } from "@/components/GameCard";
import { GameCover } from "@/components/ui/GameCover";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GameDetailActions } from "@/components/GameDetailActions";
import type { DuplicateMatch, GameWithOwners } from "@/lib/types";

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="page-shell">
        <SetupBanner />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: game } = await supabase
    .from("games")
    .select(
      `
      *,
      ownership (
        id,
        condition,
        notes,
        acquired_date,
        user_id,
        profiles (id, display_name, avatar_url)
      )
    `
    )
    .eq("id", id)
    .single();

  if (!game) notFound();

  const groupId = game.group_id ?? (await getActiveGroupId());

  let baseGame: { id: string; title: string } | null = null;
  if (game.base_game_id) {
    const { data } = await supabase
      .from("games")
      .select("id, title")
      .eq("id", game.base_game_id)
      .single();
    baseGame = data;
  }

  let expansions: GameWithOwners[] = [];
  if (!game.base_game_id && groupId) {
    const { data: expansionRows } = await supabase
      .from("games")
      .select(
        `
        *,
        ownership (
          condition,
          notes,
          acquired_date,
          profiles (id, display_name, avatar_url)
        )
      `
      )
      .eq("group_id", groupId)
      .eq("base_game_id", id)
      .order("title");

    expansions = (expansionRows ?? []).map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      min_players: g.min_players,
      max_players: g.max_players,
      play_time_minutes: g.play_time_minutes,
      image_url: g.image_url,
      bgg_id: g.bgg_id,
      bgg_type: g.bgg_type,
      base_game_id: g.base_game_id,
      created_by: g.created_by,
      created_at: g.created_at,
      owners: (g.ownership ?? []).map(
        (o: {
          condition: string;
          notes: string | null;
          acquired_date: string | null;
          profiles: {
            id: string;
            display_name: string;
            avatar_url: string | null;
          };
        }) => ({
          user_id: o.profiles.id,
          display_name: o.profiles.display_name,
          avatar_url: o.profiles.avatar_url,
          condition: o.condition,
          notes: o.notes,
          acquired_date: o.acquired_date,
        })
      ),
    }));
  }

  const duplicates: DuplicateMatch[] = [];
  if (groupId) {
    const { data: byBgg } = game.bgg_id
      ? await supabase
          .from("games")
          .select("id, title, bgg_id")
          .eq("group_id", groupId)
          .eq("bgg_id", game.bgg_id)
      : { data: [] };
    const { data: byTitle } = await supabase
      .from("games")
      .select("id, title, bgg_id")
      .eq("group_id", groupId)
      .ilike("title", game.title);

    const seen = new Set<string>();
    [...(byBgg ?? []), ...(byTitle ?? [])].forEach((d) => {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        duplicates.push({
          ...d,
          match_type: d.bgg_id === game.bgg_id && game.bgg_id ? "bgg_id" : "title",
        });
      }
    });
  }

  let userWantsToPlay = false;
  let wantToPlayUsers: { display_name: string }[] = [];
  if (groupId) {
    const { data: wants } = await supabase
      .from("want_to_play")
      .select("user_id, profiles (display_name)")
      .eq("game_id", id)
      .eq("group_id", groupId);

    wantToPlayUsers = (wants ?? []).map((w) => ({
      display_name: (Array.isArray(w.profiles) ? w.profiles[0] : w.profiles)?.display_name ?? "Someone",
    }));

    if (user) {
      userWantsToPlay = (wants ?? []).some((w) => w.user_id === user.id);
    }
  }

  const owners = (game.ownership ?? []).map(
    (o: {
      id: string;
      condition: string;
      notes: string | null;
      acquired_date: string | null;
      user_id: string;
      profiles: { id: string; display_name: string; avatar_url: string | null };
    }) => ({
      user_id: o.profiles.id,
      display_name: o.profiles.display_name,
      avatar_url: o.profiles.avatar_url,
      condition: o.condition,
      notes: o.notes,
      acquired_date: o.acquired_date,
      ownership_id: o.id,
    })
  );

  const userOwns = user
    ? owners.some((o: { user_id: string }) => o.user_id === user.id)
    : false;
  const userOwnership = user
    ? owners.find((o: { user_id: string }) => o.user_id === user.id)
    : null;

  let activeLoanLenderIds = new Set<string>();
  if (user) {
    const { data: activeLoans } = await supabase
      .from("loans")
      .select("lender_id, status")
      .eq("game_id", id)
      .eq("borrower_id", user.id)
      .in("status", ["pending", "active"]);
    activeLoanLenderIds = new Set(
      (activeLoans ?? []).map((l: { lender_id: string }) => l.lender_id)
    );
  }

  return (
    <div className="page-shell pb-48">
      <Link
        href="/library"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to library
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <GameCover
          src={game.image_url}
          alt={game.title}
          size="lg"
          className="!h-44 w-full !rounded-none"
        />
        <div className="p-4">
          <div className="flex items-start gap-2">
            <h1 className="text-2xl font-bold">{game.title}</h1>
            {(game.bgg_type === "boardgameexpansion" || game.base_game_id) && (
              <span className="mt-1 shrink-0 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-amber-400">
                Expansion
              </span>
            )}
          </div>
          {baseGame && (
            <Link
              href={`/library/${baseGame.id}`}
              className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Puzzle className="h-3.5 w-3.5" />
              Expansion for {baseGame.title}
            </Link>
          )}
          <p className="mt-1 text-sm text-muted">
            {formatPlayers(game.min_players, game.max_players)} players
            {game.play_time_minutes
              ? ` · ${formatPlayTime(game.play_time_minutes)}`
              : ""}
          </p>
          {game.description && (
            <p className="mt-3 text-sm leading-relaxed">{game.description}</p>
          )}
        </div>
      </div>

      {user && groupId && (
        <GameDetailActions
          gameId={game.id}
          groupId={groupId}
          userId={user.id}
          userOwns={userOwns}
          ownershipId={userOwnership?.ownership_id}
          wantsToPlay={userWantsToPlay}
        />
      )}

      {wantToPlayUsers.length > 0 && (
        <div className="section-card mt-6 p-3">
          <SectionHeading icon={Heart} title={`Want to play (${wantToPlayUsers.length})`} />
          <p className="text-sm text-muted">
            {wantToPlayUsers.map((u) => u.display_name).join(", ")}
          </p>
        </div>
      )}

      {!game.base_game_id && (
        <div className="mt-6">
          <SectionHeading
            icon={Puzzle}
            title={`Expansions (${expansions.length})`}
            action={<AddExpansionLink baseGameId={game.id} />}
          />
          {expansions.length === 0 ? (
            <p className="py-2 text-sm text-muted">No expansions linked yet.</p>
          ) : (
            <div className="space-y-2">
              {expansions.map((exp) => (
                <GameCard key={exp.id} game={exp} badge="Expansion" compact />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <SectionHeading icon={Users} title={`Owners (${owners.length})`} />
        {owners.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">
            Nobody owns this game yet. Be the first!
          </p>
        ) : (
          <div className="section-card divide-y divide-border">
            {owners.map(
              (owner: {
                user_id: string;
                display_name: string;
                avatar_url: string | null;
                condition: string;
                notes: string | null;
                acquired_date: string | null;
              }) => (
                <OwnerRow
                  key={owner.user_id}
                  owner={owner}
                  gameId={game.id}
                  currentUserId={user?.id}
                  hasActiveLoan={activeLoanLenderIds.has(owner.user_id)}
                />
              )
            )}
          </div>
        )}
      </div>

      {user && (
        <details className="section-card mt-6 group">
          <summary className="cursor-pointer list-none p-4 font-medium marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="text-sm text-muted group-open:mb-0">
              Manage game details
            </span>
          </summary>
          <div className="border-t border-border p-4 space-y-4">
            <EditGameForm game={game} />
            {duplicates.length > 1 && (
              <MergeGamesPanel gameId={game.id} duplicates={duplicates} />
            )}
          </div>
        </details>
      )}
    </div>
  );
}
