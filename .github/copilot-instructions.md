# AI Coding Instructions for Pocket-T3

## Architecture Overview

**Pocket-T3** is a React Native + Expo AI chat app with Supabase backend, featuring multi-model AI support, premium subscriptions, and integrated tools.

### Core Stack & Patterns
- **React Native + Expo (53.0.11)** with TypeScript and NativeWind (Tailwind CSS)
- **Supabase** for auth, database, and edge functions (see `src/lib/supabase.ts`)
- **Multi-Provider AI**: OpenAI, Anthropic, Google models via `src/config/models.ts`
- **Package Manager**: Always use `yarn` (not npm)

## Key Architectural Decisions

### 1. Supabase-Centric Backend
- Edge functions in `supabase/functions/` handle AI API calls securely
- Tools router (`supabase/functions/tools/index.ts`) routes to individual tool implementations
- Auth uses Expo SecureStore adapter for token persistence
- Database operations centralized in `src/services/conversationService.ts`

### 2. Modern React Native Patterns
- **Provider Architecture**: Nested providers in `App.tsx` (Auth → Profile → Entitlements → Purchase)
- **Context + Hooks**: See `src/context/` and `src/hooks/` for state management
- **Atomic Design**: UI components in `src/ui/atoms` with design system in `src/theme/`
- **NativeWind Integration**: Tailwind classes work alongside StyleSheet, config in `tailwind.config.js`

### 3. AI Model System
- Models defined in `src/config/models.ts` with capabilities, pricing, premium flags
- Multi-provider support with fallback logic
- Recent addition: Audio-capable models (GPT-4o-transcribe, Gemini 2.5 Pro Audio)
- Filter functions: `getAudioCapableModels()`, `getSpeechToTextModels()`, etc.

## Development Workflows

### Essential Commands
```bash
yarn start          # Start Expo dev server
yarn ios           # Run on iOS simulator
yarn android       # Run on Android emulator
yarn test          # Run Jest tests
yarn lint:fix      # Fix ESLint issues
yarn test:edge-functions  # Test Supabase functions locally
```

### Testing Patterns
- **Jest + React Native Testing Library** setup in `jest.setup.js`
- Mock React Native modules individually to avoid TurboModule issues
- Edge function tests in `supabase/functions/*/` directories
- Environment variables mocked for tests

### Debugging
- Sentry integration for error tracking
- Debug mode: `DEBUG=* expo start`
- LogBox disabled in dev (`LogBox.ignoreAllLogs(true)`)
- Global error handler overridden to prevent native alerts

## Component & Service Patterns

### UI Components
- **Modern Design System**: Glassmorphism effects, gradients, shadows in `tailwind.config.js`
- **Surface Components**: `src/ui/atoms/Surface.tsx` for cards with blur effects
- **Typography System**: Consistent font scales (SF Pro) in `src/theme/typography.ts`
- **Theme Provider**: Dark/light mode support with consistent color tokens

### Service Layer
- **ConversationService**: Centralized CRUD operations with error handling
- **Edge Function Clients**: AI service calls through Supabase functions (secure API keys)
- **Provider Pattern**: Auth, Profile, Entitlements wrap the entire app

### State Management
- **React Context** for global state (auth, theme, entitlements)
- **Custom Hooks** for data fetching (`useCredits`, `useConversations`)
- **Local State** with useState/useReducer for component-specific state

## Integration Points

### Supabase Edge Functions
- **CORS Headers**: Always include in function responses
- **Tool Router**: Central dispatcher for AI tools in `tools/index.ts`
- **Environment**: API keys stored in Supabase secrets, not client-side

### External APIs
- **AI Models**: Routed through edge functions for security
- **Maps**: React Native Maps for trip planning features  
- **Payments**: React Native IAP for premium subscriptions
- **Authentication**: Magic links and OTP via Supabase Auth

### Navigation
- **React Navigation v7**: Native stack navigator
- **Deep Linking**: Expo auth session integration
- **Modal Patterns**: Bottom sheets with `@gorhom/bottom-sheet`

## Project-Specific Conventions

### File Organization
```
src/
├── config/         # Models, constants, app configuration
├── lib/           # External service clients (Supabase)
├── services/      # Business logic layer
├── providers/     # React context providers
├── ui/            # Atomic design components
├── theme/         # Design system tokens
└── [feature]/     # Feature-based folders (auth, chat, etc.)
```

### Naming Patterns
- **Components**: PascalCase with descriptive names (`ChatSettingsModal`)
- **Services**: Suffix with `Service` (`ConversationService`)
- **Hooks**: Prefix with `use` (`useCredits`)
- **Types**: Descriptive interfaces (`ConversationWithPersona`)

### Error Handling
- **Centralized Service Errors**: Typed error objects with `type` and `message`
- **Toast Notifications**: `react-native-toast-message` for user feedback
- **Graceful Degradation**: Fallback UI states for network issues

When adding new AI models, update `src/config/models.ts` with proper typing. For new tools, create edge function in `supabase/functions/tools/` and add routing in `index.ts`. Always test both iOS and Android platforms.
