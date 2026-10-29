<p align="center"><img src="public/favicon.png" width="120" alt="Gamepad Bridge icon"></p>

# Gamepad Bridge

An Android app that creates a virtual **Xbox One** or **DualShock 4** gamepad using [Shizuku](https://shizuku.rikka.app/) and Android's built-in `uinput` tool, so games that only accept those controllers will switch on controller support. It can also forward your real controller's buttons and sticks to the virtual pad. No root needed.

> **Status: early prototype.** Tested by the author on one phone with one controller (OnePlus Nord 4, Android 16, GameSir X5 Lite). Expect rough edges.

This repository has two parts:

| Part | Folder | What it is |
|------|--------|------------|
| **Android app** | `app/` | The real thing. Does the bridging. |
| **Web companion** | `src/`, `public/` | A React page that visualises controller input and shows the `uinput` messages and a helper script. It runs in a browser, so **it cannot bridge anything on its own**. |

## Disclaimer — please read

**Use this software entirely at your own risk.**

- Some games and services forbid emulating or altering input devices, and some may detect it. **The author is not responsible if you get banned, suspended, restricted or otherwise penalised** in any game, service or account for using this software.
- This software is provided **"as is", without warranty of any kind**. The author is not liable for any damage, data loss, lost accounts, lost progress or any other consequence of using it.
- You are responsible for checking the terms of service of any game you use it with, and for deciding whether to use it.
- This project is **not affiliated with, endorsed by or sponsored by** Microsoft, Sony, Activision, GameSir, the Shizuku project, or any game publisher. Xbox, PlayStation, DualShock and other names are trademarks of their respective owners and are used only to describe compatibility.
- This is a personal project and is not meant to give anyone an unfair advantage. Do not use it to cheat.

This is not legal advice. This app was made using generative AI (Claude, Google AI Studio).

## Using the Android app

You need Android 11 or newer (Wireless Debugging lets Shizuku start without a computer) and [Shizuku](https://shizuku.rikka.app/).

1. Turn on Developer options and **Wireless debugging**, then open Shizuku and start it. **Start Shizuku again after every reboot.**
2. Open Gamepad Bridge and tap **Grant Shizuku permission**.
3. Choose **Xbox One Controller** or **Dualshock 4 Controller**.
4. Choose how it should work:
   - **Forward controller inputs ON** — tap *Choose controller*, pick your controller from the list, and the app passes its buttons and sticks to the virtual pad.
   - **Forward controller inputs OFF (anchor mode)** — the app only creates the virtual pad. Many games (COD Mobile, for one) only need an Xbox/DS4 device to exist and then read your own controller directly, with no added delay.
5. Tap **Start the bridging**. A green banner shows the bridge is running (with a live counter when forwarding). Open your game.

Tip: set both Shizuku and Gamepad Bridge to **Unrestricted** battery use, because some phone makers (OnePlus/OxygenOS included) stop background apps.

## Building the Android app on GitHub (no Android Studio needed)

1. Push this repository to GitHub.
2. Open the **Actions** tab. The **Build APK** workflow runs on every push to `main` (or press *Run workflow*).
3. When it shows a green tick, open the run and download **Gamepad-Bridge-APK** from *Artifacts* (it is a zip containing the APK).
4. To keep a permanent download, create a **Release** whose tag starts with `v` (for example `v0.3`). The workflow attaches the APK to that release.

Builds are debug-signed with a fresh key each time, so **uninstall the old app before installing a new build**.

You can also open the folder in Android Studio and run it on your phone.

## Running the web companion

```
npm install
npm run dev      # http://localhost:3000
npm run build
```

## Known limitations

- Button and axis mapping is tuned for controllers that already report an Xbox-style layout (like the GameSir X5 Lite). Other controllers may map wrongly; a "press a button to map it" screen is not built yet.
- When forwarding, the real controller is **not hidden** from the game. In the author's testing with COD Mobile and Alto's Odyssey this caused no double inputs, but other games may differ. Hiding it needs native code and is not implemented.
- D-pads that are reported as buttons (instead of a hat) and controllers without analog triggers are not handled.
- Shizuku has to be restarted after every reboot.

## Licence

MIT, see `LICENSE`.
