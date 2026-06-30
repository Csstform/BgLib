export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  email_notifications?: boolean;
  created_at: string;
  onboarding_completed?: boolean;
  active_group_id?: string | null;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string | null;
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
  group_id?: string | null;
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

export type GameNight = {
  id: string;
  group_id?: string | null;
  title: string;
  description: string | null;
  host_id: string;
  scheduled_at: string;
  location: string | null;
  cancelled_at?: string | null;
  created_at: string;
};

export type GameNightRsvp = {
  id: string;
  game_night_id: string;
  user_id: string;
  status: "going" | "maybe" | "declined";
  created_at: string;
};

export type GameNightWithDetails = GameNight & {
  host: Profile;
  rsvps: (GameNightRsvp & { profile: Profile })[];
  games: Game[];
};

export type Loan = {
  id: string;
  game_id: string;
  lender_id: string;
  borrower_id: string;
  status: "pending" | "active" | "returned" | "declined" | "cancelled";
  due_date: string | null;
  notes: string | null;
  borrowed_at: string | null;
  returned_at: string | null;
  created_at: string;
};

export type LoanWithDetails = Loan & {
  game: Game;
  lender: Profile;
  borrower: Profile;
};

export type BggSearchResult = {
  id: number;
  name: string;
  yearPublished?: number;
};

export type Play = {
  id: string;
  group_id: string;
  game_id: string;
  played_at: string;
  duration_minutes: number | null;
  notes: string | null;
  logged_by: string;
  created_at: string;
};

export type PlayWithDetails = Play & {
  game: Game;
  participants: Profile[];
  logger: Profile;
};

export type PickerGame = GameWithOwners & {
  last_played_at: string | null;
  owner_names: string[];
};

export type DuplicateMatch = {
  id: string;
  title: string;
  bgg_id: number | null;
  match_type: "bgg_id" | "title";
};

export type WantToPlay = {
  id: string;
  user_id: string;
  game_id: string;
  group_id: string;
  created_at: string;
};
