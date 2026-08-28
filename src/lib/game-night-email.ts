import { formatDateTimeUtc } from "@/lib/utils";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type GameNightInviteContent = {
  title: string;
  scheduledAtIso: string;
  location?: string | null;
  hostName: string;
  description?: string | null;
  gameTitles?: string[];
  eventUrl: string;
};

export function buildGameNightInviteEmail(input: GameNightInviteContent): {
  subject: string;
  html: string;
} {
  const when = formatDateTimeUtc(input.scheduledAtIso);
  const rows: string[] = [
    `<p><strong>${escapeHtml(input.hostName)}</strong> planned a game night for your group.</p>`,
    `<h1 style="font-size:20px;margin:16px 0 8px">${escapeHtml(input.title)}</h1>`,
    `<p style="margin:4px 0"><strong>When:</strong> ${escapeHtml(when)}</p>`,
  ];

  if (input.location?.trim()) {
    rows.push(
      `<p style="margin:4px 0"><strong>Where:</strong> ${escapeHtml(input.location.trim())}</p>`
    );
  }

  if (input.gameTitles && input.gameTitles.length > 0) {
    rows.push(
      `<p style="margin:4px 0"><strong>Planned games:</strong> ${escapeHtml(
        input.gameTitles.join(", ")
      )}</p>`
    );
  }

  if (input.description?.trim()) {
    rows.push(
      `<p style="margin:12px 0;white-space:pre-wrap">${escapeHtml(
        input.description.trim()
      )}</p>`
    );
  }

  rows.push(
    `<p style="margin:20px 0"><a href="${escapeHtml(
      input.eventUrl
    )}" style="display:inline-block;background:#6d4aff;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600">RSVP in BgLib</a></p>`
  );
  rows.push(
    `<p style="color:#667;font-size:12px">Times are shown in UTC. Open the event to see your local time. A calendar file is attached if your client supports it.</p>`
  );

  return {
    subject: `Game night: ${input.title}`,
    html: `<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111">${rows.join(
      ""
    )}</div>`,
  };
}
