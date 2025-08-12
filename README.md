# FieldBook - Construction Workforce Management

FieldBook is a mobile-first labor management application designed for electrical wiring contractors to efficiently track employees, wages, advances, site assignments, and weekly payments.

## Features

### 🏗️ Core Functionality
- **Weekly Wage Settlements** - Automated calculations every Tuesday
- **Daily Attendance Tracking** - With multipliers (0.5× to 2×) and site assignments
- **Advance Payment Management** - Automatic deductions over multiple weeks
- **Construction Site Tracking** - Project assignments and financial monitoring
- **Extra Expense Handling** - Transportation, materials, and miscellaneous costs

### 📱 Mobile-First Design
- Optimized for mobile devices and job site use
- Offline data storage with local persistence
- Touch-friendly interface with intuitive navigation
- Minimal page count for efficient workflow

### 💼 Business Logic
- Automatic wage calculations with work multipliers
- Weekly settlement reports (Tuesday to Monday)
- Advance payment tracking and deduction scheduling
- Site-wise financial summaries and employee assignments
- Payment history and dispute resolution support

## Getting Started

### Prerequisites
- Node.js LTS (v18+)
- Expo CLI: `npm install -g @expo/cli`

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd FieldBook

# Install dependencies
npm install

# Start the development server
npx expo start
```

## Usage Guide

### 1. Initial Setup
1. Launch the app and register or log in with your account
2. Navigate through the tabs to explore features

### 2. Daily Workflow
1. **Mark Attendance** - Record daily attendance with site assignments
2. **Manage Employees** - Add/edit employee information and wage rates
3. **Track Sites** - Create and monitor construction site progress
4. **Review Settlements** - Check weekly payment calculations

### 3. Key Screens

#### Dashboard
- Overview of active employees and pending wages
- Quick actions for common tasks
- Next settlement date and amount
- Recent activity summary

#### Employees
- List of all employees with status filters
- Add new employees with wage rates
- Toggle active/inactive status
- Search and filter capabilities

#### Sites
- Active and completed construction sites
- Site start dates and financial tracking
- Employee assignment monitoring
- Project timeline visualization

#### Settlements
- Weekly payment calculations (Tuesday to Monday)
- Employee-wise wage breakdowns
- Advance deductions and extra payments
- Settlement status tracking

### 4. Attendance Entry
- Select date for attendance recording
- Mark present/absent for each employee
- Assign employees to specific sites
- Set work multipliers (0.5× to 2× base wage)
- Record advance payments and extra expenses
- Automatic wage calculations

## Business Rules

### Wage Calculations
- **Base Wage:** Daily rate set per employee
- **Work Multiplier:** 0.5× to 2× based on work complexity
- **Daily Wage:** Base Wage × Multiplier × Hours Worked
- **Net Pay:** Daily Wage + Extra Payments - Advances

### Settlement Schedule
- **Settlement Week:** Tuesday to Monday
- **Payment Date:** Every Tuesday
- **Advance Deductions:** Spread over multiple weeks as configured

### Site Management
- Track total money withdrawn per site
- Assign employees to sites during attendance
- Monitor project costs and labor distribution
- Historical assignment tracking

## Technical Details

### Architecture
- **Frontend:** React Native with Expo Router
- **State Management:** React Context with useReducer
- **Data Persistence:** AsyncStorage for offline support
- **Navigation:** File-based routing with Expo Router
- **UI Components:** Custom component library

### Data Storage
- Local SQLite-like storage via AsyncStorage
- Automatic data persistence and retrieval
- Offline-first design with sync capabilities
- Data backup and recovery support

### Platform Support
- **Primary:** Mobile (Android/iOS) via Expo
- **Secondary:** Web browser support
- **Development:** Expo Go for rapid testing

## Development

### Project Structure
```
/app/                   # File-based routing screens
  /(tabs)/             # Main tab navigation screens
  /attendance/         # Attendance entry screens
  /employees/          # Employee management screens
  /sites/              # Site management screens
/components/           # Reusable UI components
/context/              # Global state management
/services/             # Data services and API calls
/types/                # TypeScript type definitions
/utils/                # Helper functions and calculations
```

### Key Components
- **Button:** Customizable button with variants
- **InputField:** Form input with validation
- **Card:** Content container with styling
- **StatCard:** Dashboard statistics display

### Build Commands
```bash
# Development
npm start                    # Start Expo dev server
npm run android             # Android emulator
npm run ios                 # iOS simulator
npm run web                 # Web browser

# Quality Assurance
npm run lint                # ESLint checks
npm run reset-project       # Reset to clean slate
```

## Future Enhancements

### Backend Integration
- RESTful API with Node.js/Express
- PostgreSQL database for production data
- User authentication and authorization
- Multi-contractor support

### Advanced Features
- Payment integration and processing
- Photo documentation for attendance
- GPS tracking for site verification
- Report generation and export
- Push notifications for settlements

### Analytics & Reporting
- Labor cost analysis and trends
- Site profitability calculations
- Employee performance metrics
- Custom report generation

## License

This project is proprietary software designed for electrical contracting businesses.

## Support

For technical support or feature requests, please contact the development team.