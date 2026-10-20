# Meme Buddies

Meme Buddies shows the **top 3 TikTok LIVE gifters** as animated TikTok profile-picture pets. They normally wander at the bottom of your screen and occasionally explore the screen. A **current top-three supporter** can type `!meme` to make their pet drag one random PNG from your `memes/` folder. The command has a **global two-minute cooldown**; there are **no random meme triggers**.

## Windows portable EXE — v0.4.0

Download the newest `Meme-Buddies-Windows.exe` from **[GitHub Releases](https://github.com/Cyberspectraa/Meme-Buddies/releases)**. It's a portable Windows x64 program, not an installer. Move it into a folder you control and double-click to start. It doesn't need Node.js or terminal commands.

### TikTok LIVE Studio: Desktop overlay (recommended)

If LIVE Studio rejects the `http://127.0.0.1:3927/overlay` Link source, **don't use the link at all**.

1. Launch Meme Buddies v0.4.0.
2. In the dashboard's **Desktop overlay** card, choose the monitor you will show on stream.
3. Click **Show buddies**. The app displays a borderless, transparent, always-on-top, **mouse-click-through** scene over that monitor. The app won't block mouse clicks or actually manipulate files and windows.
4. In **TikTok LIVE Studio**, select **Add source → Display Capture** (may be called screen capture) and choose the **same monitor**.
5. Test with **Test gift** using three different usernames in Meme Buddies. The PFP characters should become visible on your actual display and in LIVE Studio's preview. Add a PNG to the `memes/` folder and use **Test !meme** to check the drag animation.
6. Minimize your control panel and keep Meme Buddies running while live. Click **Hide buddies** to hide them.

**Important trade-off:** Display Capture shares the entire selected monitor, including your open windows and notifications. If you were previously using Game Capture or Window Capture exclusively, this method requires switching to Display Capture, because separately drawn desktop pets usually aren't included in captures of an individual app. Test first; some fullscreen games and capture configurations may behave differently. A borderless/windowed game is often more predictable. If capturing the same monitor as LIVE Studio, avoid placing LIVE Studio within its own captured view (recursive mirror effect). Prefer a separate monitor if available.

### Alternate: browser/link overlay

For versions of LIVE Studio that support local browser sources, the original transparent URL is still available:

```
http://127.0.0.1:3927/overlay
```

Some setups reject local `http://` links or require `https://`, so **use the desktop overlay option above if the URL won't add**. No public tunnel is necessary for desktop capture.

## TikFinity connection (no EulerStream subscription)

Meme Buddies receives gift and chat events from **TikFinity Desktop's local Event API** on `ws://127.0.0.1:21213/`. The old EulerStream signing dependency is removed.

1. Open [TikFinity Desktop](https://tikfinity.com/) on the **same PC**, and connect it to your TikTok LIVE.
2. Open Meme Buddies and click **Connect to TikFinity**. If TikFinity is not ready, Meme Buddies automatically retries connecting.
3. When live, gifts update the ranking and current top-three users can type `!meme`.
4. Keep **both programs** open for your whole stream.

The **CONNECTED** status confirms that TikFinity's *local* WebSocket API is reachable; it doesn't by itself prove that TikFinity is linked to your active TikTok LIVE. Test using actual gift/chat events during a LIVE.

## Memes and rules

- Click **Open memes folder** in Meme Buddies and drop any **PNG** images in that folder. New PNGs are detected without restart.
- Only the current top 3 supporters have buddies or may use `!meme`.
- Ranking is based on gifts observed since the app started or was reset; it is **not** the historical TikTok leaderboard.
- One successful `!meme` means **one random PNG drag** and starts a shared **120-second cooldown** for all three viewers.
- Invalid commands, viewers outside the top 3, or an empty folder do not use the cooldown.
- GIF/JPEG files are not supported in the memes folder.
- The pets and meme props are *visual only*; the app doesn't modify desktop objects.

## Development

With Node.js 22+:

```bash
npm install
npm start
```

Use `npm run desktop` for the desktop app, or `npm run build:win` to build the portable Windows executable from a Windows PC. Run `npm test` for ranking, cooldown, TikFinity event, and reconnect tests. The GitHub Windows build also performs syntax checking.

## Troubleshooting

- **LIVE Studio rejects local URL:** use **Desktop overlay → Show buddies** and **Display Capture**, not a Link source.
- **Buddies visible on desktop but not LIVE:** confirm you're capturing the **same monitor** and using **Display Capture**, not Game Capture or Window Capture. Check the preview and try running the game borderless.
- **Nothing shown:** use **Test gift** to create the top-three supporters. Without a gifter, there are no avatars. Test after choosing the monitor and enabling desktop overlay.
- **TikFinity status says WAITING:** start TikFinity Desktop on the same PC and allow its local Event API; Meme Buddies retries automatically.
- **TikFinity says CONNECTED but gifts don't appear:** verify TikFinity is actively linked to your running LIVE. The local connection alone isn't proof of TikTok connectivity.
- **`!meme` doesn't work:** put at least one PNG in `memes`, ensure the sender is in the current top three, and check the two-minute cooldown.
- **Old EulerStream Business plan error:** download **v0.3.0 or newer** (v0.4.0 is recommended); old 0.2.x builds still used that signing service.

The EXE is currently unsigned and Windows may display a SmartScreen warning. Download it only from this repository. TikFinity and TikTok updates can affect profile-photo and event data.
