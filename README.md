# Meme Buddies

**Meme Buddies v0.5.0** is a Windows desktop app for TikTok LIVE Studio. It shows up to three TikTok profile-picture buddies and lets the current top-three active viewers trigger a random PNG drag with `!meme`.

## What's new — general LIVE and 9:16 portrait

**Portrait mode is now the default.** Instead of walking across a widescreen gaming monitor, your buddies appear in a centred **9:16 transparent vertical strip** on the chosen display. They normally wander around the middle/lower part of the TikTok-safe content area, *above* the main chat/caption region and away from the far right action icons. If you need the original widescreen style, choose **Whole monitor (gaming layout)** in the dashboard.

**General top-three activity leaderboard:** Not limited to gifters! The app's own participation score tracks TikFinity events. It is **not** TikTok's official audience/top-viewers ranking; the local Event API doesn't reliably provide a complete ranked list of all people simply watching silently.

Scores:
| Activity | Points |
|---|---:|
| Chat (non-command) | +2, max once per viewer every 15 seconds |
| Likes | +1 per 10 likes, max +5 per event; at most once every 3 seconds |
| Share | +5, max once every 2 minutes per viewer |
| Follow | +8 once per viewer per app session |
| Subscribe | +10 once per viewer per app session |
| Join / identified room user | +1 once per viewer per app session |
| Gift | +2 + floor(log2(1 + diamonds sent in the finished gift event)), capped at +14 per event |

If TikFinity only supplies an **aggregate** viewer count with no viewer identity, we cannot turn it into an individual buddy. Only identified interactions count. Reconnecting preserves scores; **Reset** starts fresh. Use **Test activity** to preview non-gifter buddies before you go live.

Only the current top-three active viewers can type **`!meme`**. That triggers one random PNG from the local `memes/` folder with a **global 120-second cooldown** shared across all three. Meme events **never** happen randomly, although buddies still walk and occasionally explore.

## Download / setup (Windows)

1. Download **Meme-Buddies-Windows.exe** from the [GitHub Releases](https://github.com/Cyberspectraa/Meme-Buddies/releases) page. Save it in its own folder and double-click. No Node.js installation required.
2. Launch [TikFinity Desktop](https://tikfinity.com/) on the **same PC**, connect TikFinity to your active TikTok LIVE, and click **Connect to TikFinity** in Meme Buddies. The local WebSocket URL is `ws://127.0.0.1:21213/`. There is **no EulerStream Business subscription requirement**.
3. In Meme Buddies, choose the monitor to be captured, select **Portrait 9:16**, then click **Show buddies**. This is a transparent, always-on-top, click-through rectangle **centred on that display**.
4. In TikTok LIVE Studio, use a **Portrait 9:16** scene and add **Display Capture** of the same monitor. **Crop left and right so just the central 9:16 strip fills the portrait scene.** You can adjust the source in LIVE Studio's scene editor. Confirm in the **General mobile preview**; TikTok's chat and interface can conceal objects near the bottom/right.
5. Test with **Test activity** or **Test gift** to create three participants and confirm they move in the preview. Use **Test !meme** after adding PNGs.
6. Click **Open memes folder** and put your own PNG images into the folder next to the EXE. New PNGs are detected automatically.
7. Keep TikFinity Desktop and Meme Buddies running during your stream. Keep private windows and notifications off the captured display.

**Important limitation of Display Capture:** the **desktop behind the buddies is also captured**; this is not a separate alpha-layer browser source. If you need the buddies over a webcam or other LIVE Studio source without capturing the desktop, the transparent local browser overlay is still at `http://127.0.0.1:3927/overlay`, but some LIVE Studio versions reject local HTTP links. Don't assume Window Capture will preserve alpha. Test your own source layout before streaming.

## Test mode and behavior

- **Test activity:** Add an identified viewer's chat/likes/share/follow/join/subscription. Unlike gifting, these can create buddies without spending money.
- **Test gift:** Add diamonds to a viewer and earn activity points with diminishing returns.
- **Test !meme:** Send the command as a top-three viewer and drag a random PNG. The cooldown is 2 minutes across everyone.
- **Reset leaderboard:** Clears all points, test users, gift totals and the cooldown.
- PFPs come from TikFinity event data when available; viewers whose profile pictures aren't supplied display an initial.
- This overlay never touches actual desktop files or windows.

## Development

With Node.js 22+:

```bash
npm install
npm test
npm start
```

Run `npm run desktop` for the local Electron app. On Windows, `npm run build:win` packages the portable EXE.

GitHub Actions runs test suites for scoring, cooldowns, TikFinity events, portrait geometry, browser JavaScript, and Windows packaging on pushes.

**Notes:** TikFinity is an independent third-party integration. A successful local connection to TikFinity doesn't by itself prove an active TikTok LIVE. The EXE is unsigned, so Windows SmartScreen may warn. Download from this project's official release page only.
