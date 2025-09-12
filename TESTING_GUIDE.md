# BloodBond App Testing Guide - Android & iOS

## Prerequisites
- Node.js and npm installed
- Expo CLI installed globally: `npm install -g @expo/cli`
- For iOS: Xcode installed (macOS only)
- For Android: Android Studio with SDK installed

## Testing Options

### 1. Expo Go App (Quick Testing - Limited Features)

**Install Expo Go:**
- Android: Download from Google Play Store
- iOS: Download from App Store

**Run the app:**
```bash
cd bloodbond
npm install
npx expo start
```

**Limitations:**
- Firebase services may not work fully
- Push notifications won't work
- Some native features may be limited

### 2. Development Build (Recommended - Full Features)

This method allows testing all features including Firebase, push notifications, and reCAPTCHA.

#### For Android:

**Option A: Build APK locally**
```bash
# Install EAS CLI
npm install -g @expo/cli eas-cli

# Login to Expo account
eas login

# Configure the build
eas build:configure

# Build for Android (development)
eas build --platform android --profile development
```

**Option B: Connect Android device via USB**
```bash
# Enable USB debugging on your Android device
# Connect device via USB
adb devices  # Verify device is connected

# Install development build
npx expo install --dev-client
npx expo run:android
```

#### For iOS:

**Build for iOS (requires macOS):**
```bash
# Build for iOS simulator
npx expo run:ios

# Or build for physical device
eas build --platform ios --profile development
```

### 3. Testing the reCAPTCHA System

Once your app is running on device:

1. **Navigate to Create Request:**
   - Go to the "Create" tab
   - Fill out the blood donation request form
   - Submit the form

2. **Expected Behavior:**
   - **On Web**: Invisible reCAPTCHA verification
   - **On Android/iOS**: Math problem verification (e.g., "5 + 3 = ?")

3. **Test Anti-Spam Features:**
   - Try creating multiple requests quickly
   - Should be blocked after 5 requests per day
   - Should have 30-minute cooldown between requests

4. **Test Response Creation:**
   - Navigate to any blood request
   - Tap "Respond" button
   - Fill out response form
   - Same verification should apply

## Environment Setup for Testing

### Android Setup:

1. **Install Android Studio**
2. **Setup Android SDK**
3. **Enable Developer Options on device:**
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings → Developer Options
   - Enable "USB Debugging"

### iOS Setup (macOS only):

1. **Install Xcode from App Store**
2. **Install Xcode Command Line Tools:**
   ```bash
   xcode-select --install
   ```
3. **For physical device testing:**
   - Connect iPhone via USB
   - Trust the computer when prompted
   - Enable Developer Mode in Settings

## Firebase Configuration

Ensure Firebase is properly configured:

**Android:**
- Verify `android/app/google-services.json` is present
- Check Firebase project settings match your bundle ID

**iOS:**
- Verify `ios/GoogleService-Info.plist` is present  
- Check Firebase project settings match your bundle ID

## Debugging Tips

### View Logs:
```bash
# Android logs
adb logcat

# iOS logs (in Xcode)
# Or use device console in Xcode → Window → Devices and Simulators
```

### Common Issues:

1. **reCAPTCHA not working:**
   - Check internet connection
   - Verify keys are correctly configured
   - Check console for errors

2. **Firebase not connecting:**
   - Verify configuration files are present
   - Check Firebase project settings
   - Ensure app bundle ID matches Firebase project

3. **Build errors:**
   - Clear cache: `npx expo install --fix`
   - Clean build: `cd android && ./gradlew clean`

## Testing Checklist

- [ ] App launches successfully
- [ ] User registration/login works
- [ ] Blood request creation shows verification
- [ ] Response creation shows verification
- [ ] Anti-spam limits are enforced
- [ ] Push notifications work (development build only)
- [ ] Location services work
- [ ] Settings functionality works
- [ ] Data export works
- [ ] Bug reporting works

## Production Testing

For production testing:

```bash
# Build production APK/IPA
eas build --platform android --profile production
eas build --platform ios --profile production
```

## Helpful Commands

```bash
# Check Expo CLI version
expo --version

# Check project status
npx expo doctor

# Clear cache
npx expo install --fix

# View project in browser
npx expo start --web
```

## Support

If you encounter issues:
1. Check the logs for specific error messages
2. Verify all configuration files are present
3. Ensure your Firebase project is properly set up
4. Test on multiple devices if possible
