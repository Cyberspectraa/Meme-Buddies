export const COOLDOWN_MS = 120_000;
export const COMMAND = '!meme';

function person(raw) {
  const user = raw?.user || raw || {};
  const userId = String(user.userId || user.id || user.user_id || user.uniqueId || user.displayId || user.username || '').trim();
  const username = String(user.uniqueId || user.displayId || user.username || user.nickname || userId).replace(/^@/, '').trim();
  const avatarUrl = String(user.profilePictureUrl || user.avatarUrl || user.avatar_url || user.avatarThumb?.urlList?.[0] || '');
  return { userId, username, avatarUrl };
}

export class MemeEngine {
  constructor({ now = Date.now, random = Math.random, cooldownMs = COOLDOWN_MS } = {}) {
    this.now = now;
    this.random = random;
    this.cooldownMs = cooldownMs;
    this.supporters = new Map();
    this.lastMemeAt = null;
    this.arrival = 0;
  }

  top3() {
    return [...this.supporters.values()]
      .sort((a, b) => b.diamonds - a.diamonds || a.arrival - b.arrival)
      .slice(0, 3)
      .map(({ arrival, ...p }, i) => ({ ...p, rank: i + 1 }));
  }

  remaining(now = this.now()) {
    if (this.lastMemeAt === null) return 0;
    return Math.max(0, this.cooldownMs - (now - this.lastMemeAt));
  }

  reset() {
    this.supporters.clear();
    this.arrival = 0;
    this.lastMemeAt = null;
  }

  recordGift(raw) {
    const giftType = Number(raw?.giftType ?? raw?.giftDetails?.giftType ?? raw?.gift?.type ?? raw?.gift?.gift_type);
    if (giftType === 1 && !raw?.repeatEnd) {
      return false; // Streak progress; count only final cumulative quantity.
    }
    const { userId, username, avatarUrl } = person(raw);
    const count = Number(raw?.repeatCount ?? raw?.gift?.repeat_count ?? 1);
    const unit = Number(raw?.diamondCount ?? raw?.gift?.diamondCount ?? raw?.giftDetails?.diamondCount ?? raw?.extendedGiftInfo?.diamondCount);
    if (!userId || !Number.isFinite(count) || count < 1 || !Number.isFinite(unit) || unit <= 0) return false;
    const previous = this.supporters.get(userId);
    const supporter = previous || { userId, username, avatarUrl, diamonds: 0, arrival: ++this.arrival };
    supporter.username = username || supporter.username;
    supporter.avatarUrl = avatarUrl || supporter.avatarUrl;
    supporter.diamonds += unit * count;
    this.supporters.set(userId, supporter);
    return true;
  }

  handleChat(raw, pngFiles) {
    if (String(raw?.comment || '').trim().toLowerCase() !== COMMAND) {
      return { ok: false, reason: 'not-command' };
    }
    const { userId } = person(raw);
    const buddy = this.top3().find(p => p.userId === userId);
    if (!buddy) return { ok: false, reason: 'not-top-three' };
    const remainingMs = this.remaining();
    if (remainingMs > 0) return { ok: false, reason: 'cooldown', remainingMs };
    if (!Array.isArray(pngFiles) || pngFiles.length === 0) return { ok: false, reason: 'no-memes' };

    const index = Math.min(pngFiles.length - 1, Math.floor(this.random() * pngFiles.length));
    const filename = pngFiles[Math.max(0, index)];
    this.lastMemeAt = this.now();
    return {
      ok: true,
      event: {
        userId: buddy.userId,
        username: buddy.username,
        rank: buddy.rank,
        filename,
        timestamp: this.lastMemeAt
      }
    };
  }
}
