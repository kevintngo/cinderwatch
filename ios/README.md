# Cinderwatch for iOS

A small iPhone and iPad app that plays the web build of Cinderwatch full screen and offline. Like the Android app, it is a thin shell around a web view: the game is the same `index.html` as the web version, copied into the app when it is built, so the app always matches the web build and nothing in `src/` changes.

## Install

Apple only lets signed apps onto a device, so there are three ways in:

- **From Xcode, on your own device.** Open `Cinderwatch.xcodeproj`, choose your team under *Signing & Capabilities* (a free Apple ID works; the app then has to be reinstalled every 7 days), connect the device and press Run. If Xcode says the bundle identifier is taken, change it to one of your own, for example `com.yourname.cinderwatch`.
- **Sideloading.** The GitHub workflow builds `cinderwatch-unsigned.ipa`. Tools such as AltStore or Sideloadly sign it with your Apple ID and install it.
- **TestFlight or the App Store** need a paid Apple Developer account, and an archive made in Xcode with that account's team.

It needs iOS 15 or newer.

To try it without a device, unzip `cinderwatch-simulator.zip` from the workflow and drag `Cinderwatch.app` onto a running iOS Simulator, or run the scheme on a simulator from Xcode.

## What the app adds

| | |
| --- | --- |
| Full screen | The status bar is hidden and the home indicator fades out. A swipe at a screen edge goes to the game first; a second swipe reaches the system. |
| Screen stays on | While the app is in front. |
| Background | The page is hidden, so the game's loop and sound stop, and pick up where they were. If iOS clears the page while the app is in the background, it starts again. |
| Notch and Dynamic Island | The game lays itself out around them, as it does in Safari. |
| Haptics | The short vibration taps the game uses on touch screens become light haptic taps (Safari has no vibration). |
| Saved settings | Best wave and the mute setting are kept. The page is served from the app on its own fixed origin, so they survive restarts. |
| Offline | The page is served from inside the app, which makes no network requests. Links out of the game open in Safari. |

Game controllers and keyboards connected to the device work as they do in Safari.

## Build

You need a Mac with Xcode 15 or newer.

```bash
python3 tools/build.py     # only if you changed src/; the app takes index.html as it is
open ios/Cinderwatch.xcodeproj
```

From the command line, without signing:

```bash
xcodebuild -project ios/Cinderwatch.xcodeproj -scheme Cinderwatch -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

The workflow in `.github/workflows/ios.yml` runs the same simulator build and an unsigned device build on every push that touches the game or the app, and keeps the `.ipa` and the simulator app as downloads on the run. Publishing a GitHub release also attaches the `.ipa` to it.

### Debugging

Debug builds show the game's frame rate counter (the `fps=1` flag) and, on iOS 16.4 or newer, can be inspected from Safari on a Mac: *Develop* menu, the device, then the Cinderwatch page. The console works as in the browser (`__cw.G.lives` and so on).

## Layout

| Path | Contents |
| --- | --- |
| `Cinderwatch/GameViewController.swift` | The web view: serving the page, full screen, haptics, links |
| `Cinderwatch/AppDelegate.swift` | App and scene setup, keeping the screen on |
| `Cinderwatch/Info.plist` | App settings: orientations, launch screen, status bar |
| `Cinderwatch/Assets.xcassets` | The app icon (the favicon's pixel flame) and the launch screen color |
| `Cinderwatch.xcodeproj` | The Xcode project; `../index.html` is one of its resources |
