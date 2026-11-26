# Cinderwatch for Android

A small Android app that plays the web build of Cinderwatch full screen, offline, with no Google Play needed. It is a thin shell around a WebView: the game is the same `index.html` as the web version, copied into the APK when it is built, so the app always matches the web build and nothing in `src/` changes.

## Install

1. Get `cinderwatch-release.apk` (build it as below, or download it from the repository's Actions or Releases page if one is published).
2. Copy it to the phone and open it. Android asks you to allow installs from that app (your file manager or browser) the first time.

Or, with the phone connected over USB and USB debugging on:

```bash
adb install -r app/build/outputs/apk/release/cinderwatch-release.apk
```

It needs Android 8.0 or newer and a WebView with WebGL 2, which every current Android System WebView has.

## What the app adds

The game already plays well on touch screens. The app does what a browser would otherwise do for it:

| | |
| --- | --- |
| Full screen | The system bars are hidden; swipe from an edge to show them for a moment. The game's own full screen button is hidden, since it is not needed. |
| Screen stays on | While the app is in front. |
| Back button | Closes the open build or tower menu, otherwise sends the app to the background (the battle keeps its place). |
| Background | The game, its music and its timers stop while the app is not on screen, and pick up where they were. |
| Notch and camera hole | The game is kept out from under them. |
| Saved settings | Best wave and the mute setting are kept, as in the browser. |
| Offline | The page is served from inside the APK. The app asks for no internet permission; the only permission is vibration, for the short taps on touch. |

Gamepads, keyboards and mice connected to the phone work as they do in the browser.

## Build

You need JDK 17 and the Android SDK (Android Studio brings both; or the command line tools with `platforms;android-35` and `build-tools;35.0.0`). Point Gradle at the SDK with `ANDROID_HOME` or a `local.properties` file holding `sdk.dir=/path/to/Android/Sdk`.

```bash
cd android
./gradlew assembleRelease     # app/build/outputs/apk/release/cinderwatch-release.apk
./gradlew assembleDebug       # app/build/outputs/apk/debug/cinderwatch-debug.apk
```

Run `python3 tools/build.py` first if you changed anything in `src/`; the app takes `index.html` as it is.

### Signing

An APK has to be signed to install. Without a key of your own, release builds are signed with the debug key of the machine that built them. That is fine for trying it out, but Android only installs an update over an existing copy if both were signed with the same key, so for builds you hand out, make one key and keep it:

```bash
keytool -genkeypair -v -keystore android/release.jks -alias cinderwatch -keyalg RSA -keysize 4096 -validity 10000
```

Then either write `android/keystore.properties` (it is ignored by git):

```properties
storeFile=release.jks
storePassword=...
keyAlias=cinderwatch
keyPassword=...
```

or set `CW_KEYSTORE`, `CW_KEYSTORE_PASSWORD`, `CW_KEY_ALIAS` and `CW_KEY_PASSWORD`. The `storeFile` path is relative to `android/`.

The GitHub workflow in `.github/workflows/android.yml` builds the APK on every push and keeps it as a download on the run. It signs with your key if the repository has the secrets `ANDROID_KEYSTORE_BASE64` (the output of `base64 -w0 release.jks`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`, and with a throwaway debug key otherwise. Publishing a GitHub release also attaches the APK to it.

### Debugging

Debug builds show the game's frame rate counter (the `fps=1` flag) at the bottom left, and allow remote debugging of the WebView: with the phone connected, open `chrome://inspect` in desktop Chrome and pick the Cinderwatch page, then use the console as in the browser (`__cw.G.lives` and so on).

## Layout

| Path | Contents |
| --- | --- |
| `app/src/main/java/.../MainActivity.java` | The activity: WebView setup, full screen, back button, pause and resume |
| `app/src/main/AndroidManifest.xml` | App and activity settings |
| `app/src/main/res/` | Theme colors and the launcher icon (the favicon's pixel flame) |
| `app/build.gradle.kts` | Build settings, signing, and the step that copies `../index.html` into the app |
