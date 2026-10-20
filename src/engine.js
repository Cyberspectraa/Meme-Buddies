export const COOLDOWN_MS = 120_000;
export const COMMAND = '!meme';

function person(raw) {
  const user = raw?.user || raw || {};
  const userId = String(user.userId || user.id || user.user_id || user.uniqueId || user.displayId || user.username || '').trim();
  const username = String(user.uniqueId || user.displayId || user.username || user.nickname || userId).replace(/^@/, '').trim();
  const avatarUrl = String(user.profilePictureUrl || user.avatarUrl || user.avatar_url || user.avatarThumb?.urlList?.[0] || '');
  return { userId, username, avatarUrl };
}

// This is an activity leaderboard, not TikTok's official top viewer list.
// Lower-cost participation is rewarded too, with caps/cooldowns to reduce spam.
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
      .sort((a,b) => b.points - a.points || b.diamonds - a.diamonds || a.arrival - b.arrival)
      .slice(0,3).map(({ arrival, lastChatAt, lastShareAt, lastLikeAt, followed, joined, subscribed, ...p }, i) =>
        ({ ...p, rank: i + 1 }));
  }

  remaining(now = this.now()) {
    return this.lastMemeAt === null ? 0 : Math.max(0, this.cooldownMs - (now - this.lastMemeAt));
  }

  reset() {
    this.supporters.clear(); this.arrival = 0; this.lastMemeAt = null;
  }

  ensure(raw) {
    const { userId, username, avatarUrl } = person(raw);
    if (!userId) return null;
    let p = this.supporters.get(userId);
    if (!p) {
      p = { userId, username, avatarUrl, diamonds: 0, points: 0, arrival: ++this.arrival,
        lastChatAt: null, lastLikeAt: null, lastShareAt: null, followed: false, joined: false, subscribed: false };
      this.supporters.set(userId, p);
    }
    if (username) p.username = username;
    if (avatarUrl) p.avatarUrl = avatarUrl;
    return p;
  }

  recordGift(raw) {
    const giftType = Number(raw?.giftType ?? raw?.giftDetails?.giftType ?? raw?.gift?.type ?? raw?.gift?.gift_type);
    if (giftType === 1 && !raw?.repeatEnd) return false;
    const count = Number(raw?.repeatCount ?? raw?.gift?.repeat_count ?? 1);
    const unit = Number(raw?.diamondCount ?? raw?.gift?.diamondCount ?? raw?.giftDetails?.diamondCount ?? raw?.extendedGiftInfo?.diamondCount);
    if (!Number.isFinite(count) || count < 1 || !Number.isFinite(unit) || unit <= 0) return false;
    const p = this.ensure(raw);
    if (!p) return false;
    const total = count * unit;
    if (!Number.isFinite(total)) return false;
    p.diamonds += total;
    p.points += 2 + Math.min(12, Math.floor(Math.log2(1 + total)));
    return true;
  }

  recordActivity(type, raw) {
    // Chat commands are not leaderboard points; prevent command spam earning a slot.
    if (type === 'chat' && String(raw?.comment || '').trim().startsWith('!')) return false;
    const user = raw?.user || raw || {};
    const id = person(raw).userId;
    if (!id) return false; // Aggregate roomUser messages are not identifiable viewers.
    const now = this.now();
    let points = 0;
    const prior = this.supporters.get(id);
    if (type === 'chat') {
      if (prior?.lastChatAt !== null && prior?.lastChatAt !== undefined && now - prior.lastChatAt < 15000) return false;
      points = 2;
    } else if (type === 'like') {
      if (prior?.lastLikeAt !== null && prior?.lastLikeAt !== undefined && now - prior.lastLikeAt < 3000) return false;
      const count = Number(raw?.likeCount ?? 1);
      if (!Number.isFinite(count) || count <= 0) return false;
      points = Math.min(5, Math.ceil(count / 10));
    } else if (type === 'share') {
      if (prior?.lastShareAt !== null && prior?.lastShareAt !== undefined && now - prior.lastShareAt < 120000) return false;
      points = 5;
    } else if (type === 'follow') {
      if (prior?.followed) return false;
      points = 8;
    } else if (type === 'subscribe') {
      if (prior?.subscribed) return false;
      points = 10;
    } else if (type === 'member' || type === 'roomUser') {
      if (prior?.joined) return false;
      points = 1;
    } else return false;
    const p = this.ensure(raw);
    if (!p) return false;
    p.points += points;
    if (type === 'chat') p.lastChatAt = now;
    if (type === 'like') p.lastLikeAt = now;
    if (type === 'share') p.lastShareAt = now;
    if (type === 'follow') p.followed = true;
    if (type === 'subscribe') p.subscribed = true;
    if (type === 'member' || type === 'roomUser') p.joined = true;
    return true;
  }

  handleChat(raw, pngFiles) {
    if (String(raw?.comment || '').trim().toLowerCase() !== COMMAND) return { ok: false, reason: 'not-command' };
    const { userId } = person(raw);
    const buddy = this.top3().find(p => p.userId === userId);
    if (!buddy) return { ok: false, reason: 'not-top-three' };
    const remainingMs = this.remaining();
    if (remainingMs > 0) return { ok: false, reason: 'cooldown', remainingMs };
    if (!Array.isArray(pngFiles) || pngFiles.length === 0) return { ok: false, reason: 'no-memes' };
    const filename = pngFiles[Math.max(0, Math.min(pngFiles.length - 1, Math.floor(this.random() * pngFiles.length)))];
    this.lastMemeAt = this.now();
    return { ok: true, event: { userId: buddy.userId, username: buddy.username, rank: buddy.rank, filename, timestamp: this.lastMemeAt } };
  }
}
