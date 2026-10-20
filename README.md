# Meme Buddies

A local TikTok LIVE Studio overlay that turns the **top three gifters** into wandering profile-picture buddies.

## Rules
- Up to **three** PFP characters, ranked by gifts received while connected (diamond totals).
- All three wander along the bottom and sometimes explore higher up the scene.
- Meme dragging is **command-only**: a current top-three viewer types `!meme` in TikTok LIVE chat.
- **One shared 120-second cooldown** starts only after a successful meme command. No random meme triggers.
- A random PNG from the local `memes/` folder is dragged on screen. No desktop files or windows are touched.

## Quick start (Windows, with Node.js 20+ installed)

1. Download this repository or clone it, then open a terminal in its folder.
2. Run `npm install` followed by `npm start`.
3. Open **http://127.0.0.1:3927/** for the control panel.
4. Put your own `.png` images in the `memes/` folder (at least one required). New PNGs are picked up without restarting.
5. Before going LIVE, use **Test gift** three times with different usernames. Press **Test !meme** to check the effect.
6. Enter your TikTok handle in the control panel and click **Connect** while your stream is live.
7. In TikTok LIVE Studio, add a **Link / Browser** source for **http://127.0.0.1:3927/overlay**. Match your canvas dimensions (e.g. 1080×1920) and put the source above your capture.

Keep the Node.js terminal running during your stream. The web server listens on **127.0.0.1 only**.

## Behavior and limitations

- The top-three leaderboard starts empty each time you connect/reset. It measures gifts seen by this app, not TikTok's historical top-gifter ranking.
- Only successfully received, finalised gift events add to the totals; streak progress messages are ignored.
- `!meme` is accepted only from an account currently in that top three. An invalid command or empty PNG folder does not consume cooldown.
- GIF/JPG/WEBP are *not* loaded from `memes/` in this version: use PNG files.
- The two-minute cooldown is global across all three buddies.
- The overlay itself is transparent; use the dashboard to simulate gift and chat events.
- TikTok connectivity depends on the **unofficial** `tiktok-live-connector` package. TikTok changes can disrupt it and some profiles' signed PFP URLs may expire. Test before your show.
- This app does **not** interact with actual desktop files or other windows. The tricks are rendered inside LIVE Studio only.

## Development

Run `npm test` for the ranking, command eligibility, streak, and cooldown tests.

Dependency note: this repository pins `tiktok-live-connector` to version 2.4.0 rather than newer AGPL-licensed releases.
