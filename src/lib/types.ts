export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export type Game = {
  id: string;
  title: string;
  description: string | null;
  min_players: number;
  max_players: number | null;
  play_time_minutes: number | null;
  image_url: string | null;
  bgg_id: number | null;
  created_by: string | null;
  created_at: string;
};

export type Ownership = {
  id: string;
  user_id: string;
  game_id: string;
  condition: "new" | "like_new" | "good" | "fair" | "poor";
  notes: string | null;
  acquired_date: string | null;
  created_at: string;
};

export type OwnerInfo = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  condition: string;
  notes: string | null;
  acquired_date: string | null;
};

export type GameWithOwners = Game & {
  owners: OwnerInfo[];
};

export type OwnershipWithGame = Ownership & {
  game: Game;
};

export type OwnershipWithProfile = Ownership & {
  profile: Profile;
};
