export const COOLDOWN_MS = 10_000;
export const COMMAND = '!meme';

export function normalizeUsername(value) {
  const name = String(value ?? '').trim().replace(/^@/, '').toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(name) ? name : '';
}

function userInfo(raw) {
  const user = raw?.user && typeof raw.user === 'object' ? raw.user : raw || {};
  // uniqueId is the username, nickname is just a display label and must NEVER authenticate manual mods.
  const uniqueId = normalizeUsername(user.uniqueId ?? user.displayId ?? user.username ??
    raw?.uniqueId ?? raw?.displayId ?? raw?.username);
  const userId = String(user.userId ?? user.id ?? user.user_id ?? raw?.userId ?? uniqueId ?? '').trim();
  const avatarUrl = String(user.profilePictureUrl ?? raw?.profilePictureUrl ?? user.avatarUrl ??
    user.avatar_url ?? user.avatarThumb?.urlList?.[0] ?? '');
  return { userId, uniqueId, username: uniqueId, avatarUrl };
}

export function isVerifiedModerator(raw) {
  const user = raw?.user && typeof raw.user === 'object' ? raw.user : raw || {};
  if (raw?.isModerator === true || user?.isModerator === true ||
      raw?.isMod === true || user?.isMod === true) return true;
  const badges = [raw?.userBadges, user?.userBadges, raw?.badges, user?.badges].filter(Array.isArray).flat();
  return badges.some(badge =>
    typeof badge === 'object' && badge !== null &&
    (badge.type === 'pm_mt_moderator_im' || badge.type === 'moderator' ||
     badge.badgeType === 'pm_mt_moderator_im'));
}

export class MemeEngine {
  constructor({ now = Date.now, random = Math.random, cooldownMs = COOLDOWN_MS, manualMods = [] } = {}) {
    this.now = now;
    this.random = random;
    this.cooldownMs = cooldownMs;
    this.manualMods = new Set(manualMods.map(normalizeUsername).filter(Boolean));
    this.mods = new Map();
    this.lastMemeAt = null;
    this.arrival = 0;
  }

  // Active mods discovered in the current run. A manual allowlist does NOT invent an avatar:
  // that user must actually appear in an observed event (or test event).
  activeMods() {
    return [...this.mods.values()]
      .filter(p => p.autoMod || this.manualMods.has(p.uniqueId))
      .sort((a, b) => a.arrival - b.arrival)
      .map(({ autoMod, arrival, uniqueId, ...data }) => ({
        ...data, username: uniqueId, manual: this.manualMods.has(uniqueId)
      }));
  }

  remaining(now = this.now()) {
    return this.lastMemeAt === null ? 0 : Math.max(0, this.cooldownMs - (now - this.lastMemeAt));
  }

  setManualMods(names) {
    if (!Array.isArray(names) || names.length > 500) throw new Error('Too many moderator usernames');
    const values = names.map(value => String(value ?? '').trim()).filter(Boolean);
    const parsed = values.map(normalizeUsername);
    if (parsed.some(name => !name)) throw new Error('Use TikTok usernames only (letters, numbers, dots, underscores)');
    this.manualMods = new Set(parsed);
    return [...this.manualMods].sort();
  }

  // Clear the on-screen mods and command cooldown, preserving the saved manual mod list.
  reset() {
    this.mods.clear();
    this.arrival = 0;
    this.lastMemeAt = null;
  }

  observe(raw) {
    const info = userInfo(raw);
    if (!info.userId || !info.uniqueId) return false;
    const recognized = isVerifiedModerator(raw) || this.manualMods.has(info.uniqueId);
    const existing = this.mods.get(info.userId);
    if (!recognized && !existing) return false;
    const mod = existing || {
      userId: info.userId, uniqueId: info.uniqueId, avatarUrl: '', autoMod: false, arrival: ++this.arrival
    };
    const oldAvatar = mod.avatarUrl;
    mod.uniqueId = info.uniqueId;
    mod.avatarUrl = info.avatarUrl || mod.avatarUrl;
    mod.autoMod ||= isVerifiedModerator(raw);
    this.mods.set(info.userId, mod);
    return !existing || oldAvatar !== mod.avatarUrl;
  }

  handleChat(raw, pngFiles) {
    if (String(raw?.comment ?? '').trim().toLowerCase() !== COMMAND) {
      return { ok: false, reason: 'not-command' };
    }
    this.observe(raw);
    const { userId, uniqueId } = userInfo(raw);
    const buddy = this.activeMods().find(p =>
      (userId && p.userId === userId) || (uniqueId && p.username === uniqueId));
    if (!buddy) return { ok: false, reason: 'not-moderator' };
    const remainingMs = this.remaining();
    if (remainingMs > 0) return { ok: false, reason: 'cooldown', remainingMs };
    if (!Array.isArray(pngFiles) || !pngFiles.length) return { ok: false, reason: 'no-memes' };
    const index = Math.max(0, Math.min(pngFiles.length - 1, Math.floor(this.random() * pngFiles.length)));
    this.lastMemeAt = this.now();
    return { ok: true, event: {
      userId: buddy.userId, username: buddy.username,
      filename: pngFiles[index], timestamp: this.lastMemeAt
    }};
  }
}
