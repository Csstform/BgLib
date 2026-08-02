-- Track when upcoming game night reminders have been sent (cron job).

alter table public.game_nights
  add column if not exists reminder_sent_at timestamptz;
