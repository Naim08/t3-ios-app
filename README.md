# Pocket T3 🚀

A premium AI-powered mobile chat application built with React Native and Expo, featuring multi-model AI support, advanced tools, and a sophisticated user experience.

## ✨ Features

### 🤖 AI Chat Interface
- **Multi-model support**: OpenAI GPT, Anthropic Claude, Google Gemini
- **Real-time streaming** responses
- **Multimodal capabilities**: Text, audio, and image inputs
- **Conversation management** and persistence

### 🎭 Persona System
- Custom AI personas with unique characteristics
- Persona-specific system prompts and default models
- Easy persona creation and management

### 🔐 Authentication & Security
- Supabase-based authentication
- Magic link and email OTP sign-in
- Secure token storage with Expo SecureStore
- User profiles with avatar support

### 💎 Premium Features
- **In-App Purchases** for premium access
- **Credits system** for pay-per-use model
- **Subscription management**
- **Paywall** implementation
- **Entitlements system** for feature access control

### 🛠️ Integrated Tools
- **Trip Planner** - Travel planning and itinerary creation
- **Weather** - Weather information and forecasts
- **Flight Search** - Flight booking and search
- **Nutrition** - Food and nutrition analysis
- **Music Mood** - Music recommendations
- **Wikipedia** - Knowledge lookup
- **Markdown to Slides** - Presentation creation
- **Summarization** - Content summarization
- **Currency Conversion** - Exchange rates

### 🗺️ Maps & Location
- React Native Maps integration
- Trip planning with directions
- Location-based services
- Map visualization for travel planning

## 🏗️ Tech Stack

### Core Technologies
- **React Native** (0.79.3) with **Expo** (53.0.11)
- **TypeScript** for type safety
- **Supabase** as the backend
- **NativeWind** (Tailwind CSS for React Native)
- **React Navigation** for navigation
- **Sentry** for error tracking

### Key Dependencies
- `@supabase/supabase-js` - Backend integration
- `@react-navigation/native` - Navigation system
- `expo-auth-session` - Authentication flows
- `react-native-iap` - In-app purchases
- `react-native-maps` - Maps integration
- `lucide-react-native` - Icon system
- `react-native-toast-message` - Toast notifications
- `react-native-markdown-display` - Markdown rendering

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Yarn package manager
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pocket-t3
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in your environment variables:
   - Supabase URL and API key
   - OpenAI API key
   - Anthropic API key
   - Google API key
   - Sentry DSN
   - Other service credentials

4. **Start the development server**
   ```bash
   yarn start
   ```

### Development Scripts

- `yarn start` - Start the Expo development server
- `yarn android` - Run on Android device/emulator
- `yarn ios` - Run on iOS device/simulator
- `yarn web` - Run on web browser
- `yarn build` - Build for production
- `yarn test` - Run tests
- `yarn lint` - Run ESLint
- `yarn typecheck` - Run TypeScript checks

## 📱 Supported Models

### Free Models
- OpenAI GPT-3.5 Turbo
- Anthropic Claude 3 Haiku
- Google Gemini Flash models
- Various specialized models

### Premium Models
- OpenAI GPT-4, GPT-4o, GPT-4 Turbo
- Anthropic Claude 3 Sonnet, Claude 3 Opus
- Google Gemini Pro, Gemini Ultra
- Advanced multimodal models

### Audio Capabilities
- Speech-to-text processing
- Text-to-speech generation
- Multimodal audio processing
- Voice conversation support

## 🏛️ Architecture

```
src/
├── auth/           # Authentication screens and components
├── chat/           # Chat interface and messaging
├── components/     # Shared components
├── config/         # Configuration (models, etc.)
├── context/        # React contexts
├── hooks/          # Custom hooks
├── lib/            # Third-party integrations
├── navigation/     # Navigation configuration
├── providers/      # State providers
├── screens/        # Main screens
├── services/       # Business logic services
├── types/          # TypeScript type definitions
├── ui/             # Design system components
└── utils/          # Utility functions
```

## 🗄️ Database Schema

The app uses Supabase with the following main tables:
- `users` - User profiles and authentication
- `conversations` - Chat conversations
- `messages` - Individual chat messages
- `personas` - AI personas
- `subscriptions` - Premium subscriptions
- `credits` - User credits system

## 🔧 Configuration

### Model Configuration
Models are configured in `src/config/models.ts` with:
- Model metadata (name, provider, capabilities)
- Pricing information
- Feature availability
- Premium/free tier classification

### Environment Variables
Required environment variables:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_OPENAI_API_KEY`
- `EXPO_PUBLIC_ANTHROPIC_API_KEY`
- `EXPO_PUBLIC_GOOGLE_API_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`

## 🧪 Testing

The project includes:
- Unit tests with Jest
- Component testing with React Native Testing Library
- Integration tests for key flows
- Storybook for component development

Run tests:
```bash
yarn test
yarn test:watch
yarn test:coverage
```

## 📦 Building & Deployment

### Building for Production
```bash
# Build for all platforms
yarn build

# Build for specific platform
yarn build:android
yarn build:ios
yarn build:web
```

### Deployment
The app can be deployed to:
- App Store (iOS)
- Google Play Store (Android)
- Web hosting (PWA)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and tests
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the troubleshooting guide

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/)
- Powered by [Supabase](https://supabase.com/)
- UI components inspired by modern design systems
- AI models from OpenAI, Anthropic, and Google