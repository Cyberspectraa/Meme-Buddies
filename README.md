# Meme Buddies — Mod Mode (v0.6.1)

A Windows desktop overlay for TikTok LIVE Studio: your **active TikTok moderators** become wandering profile-picture pets, and moderators can type **`!meme`** to trigger a **Desktop Goose-inspired prank**.

## Fixed in v0.6.1: meme dragging

- The meme window is now sized and **placed independently** inside a portrait-aware safe area. The entire PNG window remains visible once it's delivered and while it sits on the scene, including in narrow 9:16 layouts.
- Smoothly animated off-screen retrieval, return with a tether, slight wobble, soft landing, and a clean escape. The popup looks like a small desktop window and stays fully in-frame for **2.5 seconds** before a gentle fade.
- The character deliberately goes offscreen to retrieve the meme; the **dropped meme never gets dragged out of the scene**. Resizing the scene recalculates the delivery location.
- This does not change moderator-only access, the `!meme` chat command, the global **10-second cooldown**, TikFinity connectivity or the PNG folder.

## Key features

- **No top 3, rankings, points, or viewer gift requirements.** Only moderator accounts get a buddy.
- **Automatic mod detection** checks moderator fields (`isModerator` / `isMod`) and known TikTok moderator badges when those appear in TikFinity event data. Mods usually appear after they comment or another supported activity event arrives; the app cannot request the entire TikTok moderator list at start.
- **Manual backup mod list** in the control panel, saved as `mods.txt` next to the portable EXE. Use real TikTok usernames, one per line. The user still needs to interact at least once to get a PFP.
- **10-second GLOBAL `!meme` cooldown** shared by all mods. Commands from normal viewers are ignored; invalid commands and missing PNGs do not consume cooldown.
- **Goose-style meme prank:** a mod's PFP dashes off-screen, comes back towing a faux desktop meme window, drops it with a wobble, escapes, and wanders back. The dropped image lingers and fades. These are **visual effects drawn inside the overlay**, not real OS window manipulation.
- **One PNG folder** (click **Open memes folder**) can be changed without restarting.
- **Portrait 9:16 is the default**, with optional full-monitor desktop mode.
- **TikFinity Desktop Event API**, local WebSocket `ws://127.0.0.1:21213/`; **no EulerStream Business subscription**.

## Install / run

1. Download **Meme-Buddies-Windows.exe** from [GitHub Releases](https://github.com/Cyberspectraa/Meme-Buddies/releases). Put it in a folder you control such as `Documents/Meme Buddies`; double-click.
2. Open [TikFinity Desktop](https://tikfinity.com/), connect your TikTok LIVE, and then click **Connect to TikFinity** in Meme Buddies. Keep both apps open.
3. In Meme Buddies, open **Moderator list** and add any mods TikFinity doesn't identify automatically. Click **Save mod list**. The names are persisted to `mods.txt` beside the portable EXE. Manual-list usernames are matched against the TikTok account handle, not the display nickname.
4. Set your display and choose **Portrait 9:16**, then click **Show buddies**. On a widescreen monitor it opens a transparent, mouse-click-through window in the middle, 9:16 tall.
5. In TikTok LIVE Studio, create a **Portrait** scene and use **Display Capture** for the same monitor. Crop the centre vertical strip to fill the scene. Display Capture also captures any windows/notifications behind the overlay; keep sensitive material off that display.
6. Add PNGs to the `memes` folder using **Open memes folder**.
7. Use **Add test mod** in the dashboard (you do not need to go live) and **Test !meme** to inspect animations; click **Clear active mods + cooldown** before the real stream.
8. After you go live, identified moderators become buddies as they interact. The `!meme` command triggers a new prank no more often than once per 10 seconds globally.

If LIVE Studio supports local browser sources, `http://127.0.0.1:3927/overlay` is also an option. If it rejects localhost links, use the built-in desktop overlay + Display Capture method.

## Mod identity and limitations

TikFinity's local Event API payload isn't guaranteed to include an accurate moderator role on every event. The app accepts positively marked moderator events (including known badge types), or explicit usernames on **your** saved local `mods.txt` allowlist. It never considers gifts, likes, chat frequency, or fake user display nicknames sufficient moderator proof. Users detected in the current app session remain visible until you reset; this is **not** a verified live attendance list. Removing a manual mod from the list removes their manual authorization immediately (unless TikFinity separately marked them a moderator).

Manual list:
```
# mods.txt in the same directory as Meme-Buddies-Windows.exe
friendly_mod
second.mod
```

The app can show multiple mods, not just three, though many simultaneous active mods can crowd the screen. Without PFP information from TikFinity, a buddy uses the account's initial. Transparent windows/Display Capture behavior may vary across game and display-capture modes.

## From source

Node.js 22+:

```bash
npm install
npm test
npm run desktop
```

For the headless web control + browser overlay, use `npm start`. A portable Windows release is built by `npm run build:win` or GitHub Actions.

The app does not touch the actual mouse, OS windows, or desktop files; this avoids disrupting a LIVE stream. TikFinity is an unofficial external integration; validate live event payloads with your own stream. The EXE is unsigned and Windows may warn before running it.
