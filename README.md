# Aniket AI — Web & Android App

Personal AI assistant supporting **English**, **Hindi (हिन्दी)**, and **Hinglish**, with voice input, local chat history, Dark Navy / Light themes, and secure server-side Google Gemini integration.

## Project Structure

- `server.ts` + `src/`: Full-stack React, TypeScript, and Express web app (powered by `@google/genai`).
- `app/`: Native Android Studio Kotlin + Gradle project (`com.aniketai.app`) with custom 3D launcher icons, splash screen, network connectivity monitor, WebView persistence, and native Android speech recognition bridge.
- `.github/workflows/build-apk.yml`: GitHub Actions workflow that compiles the debug APK and uploads `APK/Aniket-AI.apk` as a downloadable artifact.

## Building the Android APK

### Option 1: GitHub Actions (Recommended, Zero Local Setup)
1. Push this repository to GitHub (`main` or `master` branch).
2. Open the **Actions** tab and select **Build Aniket AI Android APK** (runs automatically on push, or click **Run workflow**).
3. Download the **`Aniket-AI-APK`** artifact containing `APK/Aniket-AI.apk` and `app/build/outputs/apk/debug/app-debug.apk`.
4. Transfer `Aniket-AI.apk` to your Android phone and install it (enable *Install unknown apps* if prompted).

### Option 2: Local Android Studio / Gradle Build
Requires **Android Studio** (or **JDK 17** + **Android SDK Platform 35** + **Gradle 8.10.2**).

```bash
gradle assembleDebug --no-daemon
mkdir -p APK
cp app/build/outputs/apk/debug/app-debug.apk APK/Aniket-AI.apk
```

Output locations:
- `app/build/outputs/apk/debug/app-debug.apk`
- `APK/Aniket-AI.apk`

> **Note on Backend URL:** `app/build.gradle.kts` sets `BuildConfig.APP_URL` to the deployed Aniket AI HTTPS endpoint so `GEMINI_API_KEY` stays strictly on the server. Update `APP_URL` if you deploy the backend to a custom domain.
