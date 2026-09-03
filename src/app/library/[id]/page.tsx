import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History, Users, Heart, Puzzle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  isSupabaseConfigured,
  formatPlayTime,
  formatPlayers,
  formatBggWeight,
} from "@/lib/utils";
import { getActiveGroupId } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { OwnerRow } from "@/components/OwnerRow";
import { EditGameForm } from "@/components/EditGameForm";
import { MergeGamesPanel } from "@/components/MergeGamesPanel";
import { DeleteGameButton } from "@/components/DeleteGameButton";
import { AddExpansionLink } from "@/components/AddExpansionLink";
import { DetachExpansionButton } from "@/components/DetachExpansionButton";
import { ManageExpansionLink } from "@/components/ManageExpansionLink";
import { GameCard } from "@/components/GameCard";
import { GameCover } from "@/components/ui/GameCover";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GameDetailActions } from "@/components/GameDetailActions";
import { PlayHistoryCard } from "@/components/PlayHistoryCard";
import type { DuplicateMatch, GameWithOwners } from "@/lib/types";
import { profileName } from "@/lib/profile-name";
import { playParticipantDisplays } from "@/lib/play-participant";

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
        profiles (id, display_name, real_name, avatar_url)
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
          profiles (id, display_name, real_name, avatar_url)
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
          display_name: profileName(o.profiles),
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
      .select("user_id, profiles (display_name, real_name)")
      .eq("game_id", id)
      .eq("group_id", groupId);

    wantToPlayUsers = (wants ?? []).map((w) => ({
      display_name: profileName(
        Array.isArray(w.profiles) ? w.profiles[0] : w.profiles
      ),
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
      display_name: profileName(o.profiles),
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

  let recentPlays: {
    id: string;
    played_at: string;
    duration_minutes: number | null;
    notes: string | null;
    logged_by: string;
    game: { id: string; title: string; image_url: string | null } | null;
    logger: { display_name: string } | null;
    winnerNames: string[];
    otherParticipants: string[];
    expansionTitles: string[];
  }[] = [];

  if (groupId) {
    const playSelect = `
      id, played_at, duration_minutes, notes, logged_by,
      game:games!plays_game_id_fkey (id, title, image_url),
      logger:profiles!plays_logged_by_fkey (display_name, real_name),
      play_participants (
        user_id,
        guest_name,
        is_winner,
        score,
        profile:profiles!play_participants_user_id_fkey (display_name, real_name)
      ),
      play_expansions (
        game:games!play_expansions_game_id_fkey (title)
      )
    `;

    const playsQuery = game.base_game_id
      ? supabase
          .from("plays")
          .select(`${playSelect}, play_expansions!inner (game_id)`)
          .eq("group_id", groupId)
          .eq("play_expansions.game_id", id)
      : supabase
          .from("plays")
          .select(playSelect)
          .eq("group_id", groupId)
          .eq("game_id", id);

    const { data: plays } = await playsQuery
      .order("played_at", { ascending: false })
      .limit(10);

    recentPlays = (plays ?? []).map((play) => {
        const playGame = Array.isArray(play.game) ? play.game[0] : play.game;
        const logger = Array.isArray(play.logger) ? play.logger[0] : play.logger;

        const { winnerNames, otherParticipants } = playParticipantDisplays(
          play.play_participants ?? []
        );

        const expansionTitles = (play.play_expansions ?? [])
          .map((pe) => {
            const g = Array.isArray(pe.game) ? pe.game[0] : pe.game;
            return g?.title as string | undefined;
          })
          .filter(Boolean) as string[];

        return {
          id: play.id,
          played_at: play.played_at,
          duration_minutes: play.duration_minutes,
          notes: play.notes,
          logged_by: play.logged_by,
          game: playGame
            ? {
                id: playGame.id,
                title: playGame.title,
                image_url: playGame.image_url,
              }
            : null,
          logger: logger ? { display_name: profileName(logger) } : null,
          winnerNames,
          otherParticipants,
          expansionTitles,
        };
      });
  }

  const isExpansion =
    game.bgg_type === "boardgameexpansion" || !!game.base_game_id;
  const isOrphanExpansion = isExpansion && !baseGame;

  let baseGameOptions: { id: string; title: string }[] = [];
  if (isExpansion && groupId) {
    const { data: catalogueGames } = await supabase
      .from("games")
      .select("id, title, bgg_type, base_game_id")
      .eq("group_id", groupId)
      .order("title");

    baseGameOptions = (catalogueGames ?? []).filter(
      (g) =>
        g.id !== game.id &&
        g.bgg_type !== "boardgameexpansion" &&
        !g.base_game_id
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
            {formatBggWeight(game.bgg_weight)
              ? ` · Weight ${formatBggWeight(game.bgg_weight)}`
              : ""}
          </p>
          {game.description && (
            <p className="mt-3 text-sm leading-relaxed">{game.description}</p>
          )}
        </div>
      </div>

      {user && isOrphanExpansion && (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-200">
            This expansion isn&apos;t linked to a base game yet.
          </p>
          <p className="mt-1 text-sm text-muted">
            Link it from the expansions page so it appears under the right title
            in your library.
          </p>
          <Link
            href={`/library/link-expansions?focus=${game.id}`}
            className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover"
          >
            Link to base game
          </Link>
        </div>
      )}

      {user && groupId && (
        <GameDetailActions
          gameId={game.id}
          groupId={groupId}
          userId={user.id}
          userOwns={userOwns}
          ownershipId={userOwnership?.ownership_id}
          wantsToPlay={userWantsToPlay}
          playGameId={baseGame?.id ?? game.id}
          expansionId={baseGame ? game.id : undefined}
          isFirstPlay={recentPlays.length === 0}
          canMarkAsPlayed={!isOrphanExpansion}
        />
      )}

      <div className="mt-6">
        <SectionHeading
          icon={History}
          title="Recent plays"
          action={
            <Link href={`/plays/new?game=${game.id}`} className="text-sm text-primary hover:underline">
              Log play
            </Link>
          }
        />
        {recentPlays.length === 0 ? (
          <p className="py-2 text-sm text-muted">No plays logged yet for this game.</p>
        ) : (
          <div className="space-y-2">
            {recentPlays.map((play) => (
              <PlayHistoryCard
                key={play.id}
                currentUserId={user?.id}
                play={play}
              />
            ))}
          </div>
        )}
      </div>

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
                <div key={exp.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <GameCard game={exp} badge="Expansion" compact />
                  </div>
                  {user && (
                    <DetachExpansionButton
                      expansionId={exp.id}
                      expansionTitle={exp.title}
                      baseGameTitle={game.title}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <SectionHeading icon={Users} title={`Owners (${owners.length})`} />
        {user && owners.some((o: { user_id: string }) => o.user_id !== user.id) && (
          <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            <p className="font-medium">Need a copy?</p>
            <p className="mt-1 text-muted">
              Ask an owner below to borrow this game, or{" "}
              <Link href="/loans" className="text-primary hover:underline">
                view your loans
              </Link>
              .
            </p>
          </div>
        )}
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
            {user && isExpansion && (
              <ManageExpansionLink
                expansionId={game.id}
                expansionTitle={game.title}
                baseGameId={baseGame?.id ?? null}
                baseGameTitle={baseGame?.title ?? null}
                baseGames={baseGameOptions}
              />
            )}
            {duplicates.length > 1 && (
              <MergeGamesPanel gameId={game.id} duplicates={duplicates} />
            )}
            <DeleteGameButton
              gameId={game.id}
              title={game.title}
              expansionCount={expansions.length}
            />
          </div>
        </details>
      )}
    </div>
  );
}
