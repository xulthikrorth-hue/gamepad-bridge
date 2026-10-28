# Gamepad Bridge (React Web Edition)

A web-based recreation and companion for **Gamepad Bridge**, simulating and forwarding physical gamepad inputs to virtual **Xbox One** (Bluetooth) or **Sony DualShock 4** gamepads using the browser Gamepad API, evdev keycode mapping, and Android/Linux `/system/bin/uinput` stream emulation.

## Features

- **Gamepad API Integration**: Reads connected USB, Bluetooth, and 2.4GHz physical controllers natively in modern browsers.
- **Xbox One & DualShock 4 Emulation**:
  - **Xbox One S (Bluetooth)**: VID `0x045E` (1118), PID `0x02FD` (765), thumbstick axes scaled `-32768..32767`, triggers `0..1023`, View/Back key remapped to `KEY_BACK (158)`.
  - **Sony DualShock 4 v2**: VID `0x054C` (1356), PID `0x09CC` (2508), thumbstick axes and triggers scaled `0..255` (center `128`), DS4 face and bumper button mapping.
- **Live Input & Output Visualizer**: Inspect analog stick positions, analog triggers, D-Pad hat positions, and evdev button states in real time.
- **Interactive Testing Mode**: Simulate button presses and stick inputs without needing a physical controller plugged in.
- **uinput Protocol Monitor**: View the exact registration and delta injection JSON packets sent to Android's `uinput` daemon.
- **Shizuku & ADB Companion Helper**: View step-by-step Wireless Debugging instructions and export shell scripts for direct execution on Android devices.
- **Faithful UI**: Preserves the original Android status banner color coding (Green `#2E7D32` for active bridge, Orange `#E65100` for permissions, Grey `#455A64` for stopped, Red `#C62828` for errors) and layout.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Build for production
npm run build
```

## Disclaimer

Use this software entirely at your own risk. This project is not affiliated with, endorsed by, or sponsored by Microsoft, Sony, GameSir, or the Shizuku project. Xbox, PlayStation, DualShock, and other names are trademarks of their respective owners and are used here only to describe compatibility.

This app was made using generative AI (Claude, Google AI Studio)
