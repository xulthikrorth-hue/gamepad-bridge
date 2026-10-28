# Virtual Gamepad (Shizuku)

An Android app that creates a virtual **Xbox One** or **DualShock 4** gamepad using [Shizuku](https://shizuku.rikka.app/) and Android's built-in `uinput` tool. It can optionally forward a real controller's input to the virtual one. No root needed.

> **Status: early prototype.** The code is untested in places, and features may be missing or broken.

## Disclaimer — please read

**Use this software entirely at your own risk.**

- Some games and services forbid altering or emulating input devices, and some may detect it. **I am not responsible if you get banned, suspended, restricted or otherwise penalised** in any game, service or account for using this software.
- This software is provided **"as is", without warranty of any kind**. I am not liable for any damage, data loss, lost accounts, lost progress or any other consequence of using it.
- You are responsible for checking the terms of service of any game you use it with, and for deciding whether to use it.
- This project is **not affiliated with, endorsed by or sponsored by** Microsoft, Sony, Activision, GameSir, the Shizuku project, or any game publisher. Xbox, PlayStation, DualShock and other names are trademarks of their respective owners and are used here only to describe compatibility.
- This is a personal project, not a way to gain an unfair advantage. Do not use it to cheat.

(This is not legal advice.)

## What it does

- Registers a virtual gamepad that Android sees as an Xbox One S (Bluetooth) or DualShock 4 controller.
- Optionally reads a connected real controller and forwards its buttons and sticks to the virtual one.
- Runs through Shizuku, so there is no root and no modification of the system.

## Requirements

- Android 11 or newer recommended (Wireless Debugging lets Shizuku start without a PC).
- [Shizuku](https://shizuku.rikka.app/) installed and running. It must be started again after every reboot.
- Developer options and Wireless Debugging turned on.

## Usage

1. Start Shizuku (Wireless Debugging) and open this app.
2. Tap **Grant Shizuku permission**.
3. Connect your controller and tap **Refresh controller list**.
4. Choose Xbox One or DS4, then tap **Start virtual pad**.
5. Open your game.

Try it first without "Forward this controller": some games simply switch on controller support once any Xbox/DS4 device exists, and then use your real controller directly.

## Building

Open the folder in Android Studio, or push it to GitHub and let the included GitHub Actions workflow build a debug APK (download it from the run's Artifacts).

## Known limitations

- Controller mapping is tuned for pads that already report an Xbox-style layout (tested idea: GameSir X5 Lite). Other controllers may map incorrectly.
- The real controller is not hidden from the game while forwarding, so the game may see both.
- Needs Shizuku restarted after a reboot; background behaviour depends on the phone maker's battery settings.

## Licence

Add a licence of your choice (for example MIT) before sharing the code.
