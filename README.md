# 🩸 BloodBond - Save Lives Through Blood Donation

[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev)
[![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)](https://firebase.google.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

**BloodBond** is a revolutionary mobile application that connects blood donors with those in need, making the life-saving process of blood donation seamless and efficient. Built with React Native and Expo, this app empowers communities to save lives through technology.

## 🌟 Features

### 🔍 **Smart Blood Request System**
- **Create Requests**: Post blood donation requests with detailed information
- **Advanced Filtering**: Filter by blood type, location, urgency, and more
- **Real-time Updates**: Get instant notifications about new requests
- **Response Tracking**: Monitor responses to your requests

### 👥 **Donor-Recipient Matching**
- **Blood Type Compatibility**: Automatic matching based on blood type compatibility
- **Location-Based**: Find donors and recipients in your area
- **Urgency Levels**: Prioritize urgent blood donation needs
- **Contact Integration**: Seamless communication between donors and recipients

### 📊 **Comprehensive Dashboard**
- **Personal Stats**: Track your donation history and impact
- **Request Management**: View and manage all your blood requests
- **Response History**: Keep track of your donation responses
- **Admin Panel**: Advanced moderation tools for administrators

### 🔐 **Security & Privacy**
- **Firebase Authentication**: Secure user authentication
- **Data Encryption**: All personal data is encrypted
- **Role-Based Access**: Different permissions for users and admins
- **Privacy Controls**: Granular privacy settings

### 🎨 **Modern UI/UX**
- **Intuitive Design**: Clean, modern interface following Material Design principles
- **Dark Mode Support**: Automatic dark/light theme switching
- **Responsive Layout**: Optimized for all screen sizes
- **Smooth Animations**: Fluid transitions and interactions

### 🛠️ **Advanced Features**
- **Push Notifications**: Real-time alerts for urgent requests
- **Offline Support**: Basic functionality works offline
- **Multi-language**: Support for multiple languages
- **Emergency Contacts**: Quick access to emergency services

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Firebase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/KarimAntar/bloodbond.git
   cd bloodbond
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication and Firestore
   - Copy your Firebase config to `firebase/firebaseConfig.ts`

4. **Configure environment variables**
   - Update `firebase/firebaseConfig.ts` with your Firebase credentials
   - Configure push notifications if needed

5. **Start the development server**
   ```bash
   npx expo start
   ```

6. **Run on your device**
   - Install Expo Go app on your phone
   - Scan the QR code or use the development build

## 📱 Screenshots

### Main Features
- **Home Dashboard**: Overview of requests and quick actions
- **Blood Requests**: Browse and filter donation requests
- **Create Request**: Post new blood donation needs
- **Profile Management**: Personal settings and history
- **Admin Panel**: Moderation and user management

### Key Screens
- **Authentication**: Secure login and registration
- **Request Details**: Comprehensive request information
- **Response System**: Donor-recipient communication
- **Settings**: Privacy and app preferences
- **Support**: Help and FAQ section

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React Native with Expo
- **Backend**: Firebase (Authentication, Firestore, Cloud Functions)
- **State Management**: React Context API
- **Navigation**: Expo Router (file-based routing)
- **Styling**: StyleSheet with custom themes
- **Icons**: Ionicons and custom SVG icons

### Project Structure
```
bloodbond/
├── app/                    # Main application code
│   ├── (app)/             # Authenticated app screens
│   │   ├── (tabs)/        # Tab navigation screens
│   │   ├── admin/         # Admin panel
│   │   ├── profile/       # User profile screens
│   │   └── requests/      # Request management
│   ├── (auth)/            # Authentication screens
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
├── contexts/              # React contexts
├── firebase/              # Firebase configuration
├── constants/             # App constants
├── hooks/                 # Custom hooks
└── assets/                # Images and fonts
```

### Key Components
- **Authentication Context**: User authentication state management
- **User Stats Context**: Donation statistics and tracking
- **Notification Context**: Push notification handling
- **Custom Components**: Reusable UI components
- **Firebase Integration**: Database and authentication services

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project
2. Enable Authentication (Email/Password)
3. Enable Firestore Database
4. Configure security rules in `firestore.rules`
5. Set up Firebase config in `firebase/firebaseConfig.ts`

### Environment Variables
```typescript
// firebase/firebaseConfig.ts
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## 📋 Available Scripts

```bash
# Start development server
npm start
# or
npx expo start

# Start web development
npm run web
# or
npx expo start --web

# Build for production
npx expo build:android
npx expo build:ios

# Run tests
npm test

# Reset project (moves current app to app-example)
npm run reset-project
```

## 🔒 Security Features

- **Data Encryption**: All sensitive data is encrypted
- **Secure Authentication**: Firebase Authentication with email verification
- **Input Validation**: Comprehensive form validation
- **Rate Limiting**: API rate limiting to prevent abuse
- **Audit Logs**: Admin logging for security monitoring

## 🌍 Impact & Mission

BloodBond is more than just an app—it's a movement to save lives. By connecting donors with recipients efficiently, we aim to:

- **Reduce response time** for urgent blood needs
- **Increase donation rates** through better matching
- **Build communities** around life-saving initiatives
- **Provide transparency** in the blood donation process
- **Support healthcare systems** with technology

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style
- Follow TypeScript best practices
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Follow the existing code structure

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Expo Team** for the amazing development platform
- **Firebase** for robust backend services
- **React Native Community** for excellent documentation
- **Open Source Contributors** for their valuable contributions

## 📞 Support

- **Email**: support@bloodbond.com
- **Website**: [bloodbond.com](https://bloodbond.com)
- **Issues**: [GitHub Issues](https://github.com/KarimAntar/bloodbond/issues)

## 🔄 Version History

### v1.0.0 (Current)
- Complete blood donation request system
- User authentication and profiles
- Admin panel with moderation tools
- Push notifications
- Comprehensive settings and support
- Cross-platform compatibility

---

**Made with ❤️ to save lives through technology**

*BloodBond - Connecting donors, saving lives* 🩸✨
