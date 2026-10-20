# Meme Buddies

A Windows desktop app and local transparent overlay for **TikTok LIVE Studio**. The **top 3 gifters** become roaming TikTok profile-picture buddies. A current top-three supporter can type **`!meme`** in chat to make their buddy drag one random image from the `memes` PNG folder.

## Fixed in v0.3.0: TikFinity instead of EulerStream

The previous direct TikTok connector attempted to use an EulerStream signing endpoint restricted to a paid Business plan. **That dependency is removed.** Meme Buddies now consumes gift and chat events from the **TikFinity Desktop Event API**, exposed at `ws://127.0.0.1:21213/` on the **same PC**. It does not need an EulerStream API key.

You **must install/run TikFinity Desktop**, connect it to your LIVE, and keep it running. TikFinity is a separate app and its service can have its own account or feature requirements. TikFinity's documented local WebSocket supports `gift` and `chat` events.

## Get started: portable Windows EXE (no Node.js required)

1. Download the latest **Meme-Buddies-Windows.exe** from [GitHub Releases](https://github.com/Cyberspectraa/Meme-Buddies/releases).
2. Put the EXE in a folder you control, such as `Documents/Meme Buddies`. Double-click it.
3. Install and open [TikFinity Desktop](https://tikfinity.com/). Sign in and connect **TikFinity** to your TikTok LIVE stream.
4. In Meme Buddies, click **Connect to TikFinity**. The status should change to **CONNECTED** once the desktop Event API responds. This only proves the local API is reachable; gifts appear when the LIVE is active and TikFinity is connected to it.
5. Click **Open memes folder** and place any PNG memes in there. The folder lives next to the portable EXE. Add/remove PNGs at any time.
6. In **TikTok LIVE Studio**, add a full-screen **Link/Browser** source at **`http://127.0.0.1:3927/overlay`**. Make its dimensions match the stream canvas, and layer it above your game or screen.
7. Test with **Test gift** and **Test !meme** first. Reset the leaderboard and cooldown before your real LIVE.

Keep both Meme Buddies and TikFinity Desktop running. If TikFinity starts late or briefly disconnects, Meme Buddies will automatically retry every four seconds. It keeps the leaderboard and cooldown across a temporary reconnect.

This EXE is portable and currently unsigned, so Windows may show a SmartScreen warning. Download it only from the project release.

## Controls & rules

- At most **3** PFP buddies are shown, ranked by diamonds **observed after the app starts receiving gift events** (not a historical leaderboard).
- They normally roam along the bottom and occasionally explore elsewhere.
- There are **no automatic meme events**. Only a viewer who is *currently in the top 3* can trigger a meme by sending an exact `!meme` chat message.
- A successful command makes their buddy drag a random local PNG around the stream overlay.
- There is **one global 120-second cooldown across all 3 buddies**. Failed commands and non-top-three viewers do not consume it.
- Gift streak progress is ignored until the final event, avoiding repeat-count double counting for giftType 1.
- The chaos is drawn within the TikTok LIVE Studio overlay; Meme Buddies does not manipulate actual desktop windows or files.

## Developer / source mode

With Node.js 22 or newer:

```bash
npm install
npm start
```

Open **http://127.0.0.1:3927/** for the control room, and **http://127.0.0.1:3927/overlay** for the transparent stream overlay.

For Electron development, run `npm run desktop`. To build Windows x64 portable: `npm run build:win` on Windows. GitHub Actions automatically builds and publishes the portable Windows release.

Run `npm test` to check gift rankings, meme cooldown, TikFinity WebSocket gift/chat forwarding and reconnect behaviour.

## Troubleshooting

**Meme Buddies says WAITING:** TikFinity Desktop is not serving its local Event API. Open TikFinity Desktop on the same PC, sign in, connect your TikTok account/stream, and make sure its Event API is available. Meme Buddies will automatically retry.

**CONNECTED but there are no buddies:** The local WebSocket is up but that doesn't guarantee TikFinity has joined an active LIVE. Start your LIVE, connect TikFinity, and send a small real gift for testing. Test gifts also work offline.

**`!meme` does nothing:** The sender must already be one of the top 3 gifters; place at least one PNG in `memes/`; check the two-minute cooldown. Test the command from the dashboard.

**TikTok LIVE Studio shows nothing:** Add the *overlay URL*, not the control page; make the source full-canvas, on top of your other sources, and keep Meme Buddies running.

**EulerStream Business plan error still appears:** You're running an older release. Install v0.3.0 or later; the new build no longer imports `tiktok-live-connector`.

**Connection limitations:** TikFinity's Event API is provided by TikFinity, not by Meme Buddies. TikTok or TikFinity updates may affect the connection or the profile-picture data.
