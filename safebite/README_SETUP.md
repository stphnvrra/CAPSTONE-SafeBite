# Firebase Setup Instructions

## google-services.json Setup

The `google-services.json` file is required for the Android app to connect to Firebase, but it contains sensitive API keys and is excluded from version control.

### How to Set It Up:

1. **Get the file from Firebase Console**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project (or create a new one)
   - Go to Project Settings → Your apps → Android app
   - If you haven't added an Android app yet:
     - Click "Add app" → Android
     - Package name: `com.safebite` (must match exactly)
     - App nickname: "SafeBite Android" (optional)
   - Click "Download google-services.json"

2. **Place the file in the correct location**:
   ```bash
   # Copy the downloaded file to:
   safebite/android/app/google-services.json
   ```

3. **Verify the file**:
   - Make sure the file exists at `safebite/android/app/google-services.json`
   - The package name in the file should be `com.safebite`
   - See `safebite/android/app/google-services.json.example` for structure reference

### Important Notes:

- **Never commit** `google-services.json` to git (it's in `.gitignore`)
- **Keep it secure** - this file contains Firebase API keys
- Each developer needs to download their own copy from Firebase Console
- The file is required for the Android build to work

### Troubleshooting:

If you get build errors related to Firebase:
- Verify `google-services.json` exists at `safebite/android/app/google-services.json`
- Check that the package name matches `com.safebite`
- Try cleaning the build: `cd safebite/android && ./gradlew clean`
- Re-download the file from Firebase Console if needed
