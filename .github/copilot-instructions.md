# FieldBook - Labor Management System

## Project Overview

FieldBook is a mobile-first labor management application designed for electrical wiring contractors to track employees, wages, advances, site assignments, and payments. This React Native app (with future web support) follows a minimal, intuitive design philosophy prioritizing efficiency and ease of use on mobile devices.

### Core Business Logic
- **Weekly wage settlements** occur every Tuesday
- **Daily attendance tracking** with wage multipliers (0.5× to 2× base rate)
- **Advance payment system** with automatic deductions spread over multiple weeks
- **Site tracking** including start dates, assigned employees, and project withdrawals
- **Extra expense handling** per employee for miscellaneous costs

### Architecture
- **Frontend**: React Native with Expo Router for file-based navigation
- **Backend**: Node.js/Express API (to be implemented)
- **Database**: PostgreSQL (to be implemented)
- **Platform Targets**: Primary mobile (Android/iOS), secondary web support

## Development Setup

### Prerequisites
- Node.js LTS (v18+)
- Expo CLI: `npm install -g @expo/cli`
- PostgreSQL (local or Docker) - for backend development
- Android Studio (for Android emulator) or Xcode (for iOS simulator)

### Quick Start
```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Platform-specific development
npx expo start --android    # Android emulator
npx expo start --ios        # iOS simulator
npx expo start --web        # Web browser
```

### Project Scripts
- `npm start` - Start Expo development server
- `npm run android` - Launch on Android
- `npm run ios` - Launch on iOS
- `npm run web` - Launch web version
- `npm run lint` - Run ESLint checks

## Project Structure

### Current Structure (Expo App)
```
/app/                    # File-based routing screens
  - _layout.tsx         # Root layout component
  - index.tsx           # Home/landing screen
/assets/                # Images, fonts, static resources
/components/            # Reusable UI components (to be created)
/services/              # API calls and business logic (to be created)
/utils/                 # Helper functions and utilities (to be created)
```

### Planned Backend Structure
```
/backend/
  /src/
    /controllers/       # Route handlers for API endpoints
    /services/          # Core business logic (wage calculations, settlements)
    /models/            # Database models and schemas
    /routes/            # API route definitions
    /middleware/        # Authentication, validation middleware
/database/              # SQL migrations and seed data
```

## Development Guidelines

### Mobile-First Design Principles
- **Minimal page count**: Aim for 3-7 main screens maximum
- **Intuitive navigation**: Use tab navigation for primary features
- **Touch-friendly**: Ensure all interactive elements are ≥44px
- **Offline considerations**: Cache critical data for offline access
- **Performance**: Optimize for slower mobile connections

### Key Screens (Planned)
1. **Dashboard** - Today's attendance, quick actions
2. **Employees** - Staff management, wage settings
3. **Sites** - Project tracking, assignments
4. **Settlements** - Weekly payroll, advance tracking

### Critical Business Logic Areas

When implementing or modifying wage/payment logic, pay special attention to:

1. **Wage Calculation Service** (`/backend/src/services/wageService.js`)
   - Daily rate calculations with multipliers
   - Overtime and bonus handling
   - Weekly settlement totals

2. **Advance Payment Service** (`/backend/src/services/advanceService.js`)
   - Multi-week deduction scheduling
   - Balance tracking and validation
   - Settlement integration

3. **Site Management Service** (`/backend/src/services/siteService.js`)
   - Employee assignment tracking
   - Project withdrawal calculations
   - Time tracking validation

### Build & Deployment

#### Development Build
```bash
# Ensure clean install
npm install

# Start development
npx expo start

# Run on specific platform
npx expo run:android    # Android build
npx expo run:ios        # iOS build
```

#### Production Build
```bash
# Build for production
npx expo build:android
npx expo build:ios
npx expo export         # Web export
```

#### Backend Development (when implemented)
```bash
# Backend setup
cd backend && npm install
npm run dev             # Start with nodemon

# Database setup
npm run migrate         # Run migrations
npm run seed           # Seed test data
```

### Testing & Quality

- **Linting**: `npm run lint` must pass before commits
- **Type Safety**: Use TypeScript throughout the application
- **Testing**: Implement unit tests for all business logic services
- **Code Review**: All wage calculation changes require review

### Environment Configuration

Required environment variables (create `.env` file):
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fieldbook
DB_USER=your_user
DB_PASSWORD=your_password

# API
API_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret

# Expo
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Common Tasks

### Adding New Screens
1. Create new file in `/app/` directory (file-based routing)
2. Follow naming convention: `(tabs)/employees.tsx` for tab screens
3. Implement consistent navigation patterns
4. Ensure responsive design for various screen sizes

### Implementing Business Logic
1. Create service functions in `/services/` directory
2. Implement proper error handling and validation
3. Add TypeScript interfaces for data structures
4. Write unit tests for critical calculations

### UI Components
1. Create reusable components in `/components/` directory
2. Follow consistent styling patterns
3. Implement accessibility features (screen reader support)
4. Test on both platforms (Android/iOS)

## Troubleshooting

### Common Issues
- **Metro bundler cache**: Clear with `npx expo start --clear`
- **Node modules**: Delete `node_modules` and run `npm install`
- **Platform-specific builds**: Ensure proper SDK versions in `app.json`
- **Development builds**: Use `npx expo install` for Expo-compatible packages

### Build Failures
- Verify all dependencies are compatible with current Expo SDK
- Check that TypeScript compilation passes
- Ensure all required environment variables are set
- Test on clean simulator/emulator environment

Remember: This application handles sensitive financial data. Always validate wage calculations thoroughly and test settlement logic extensively before deployment.
