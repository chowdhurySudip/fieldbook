# Collapsible Attendance Cards Feature

## Overview
Enhanced the mark attendance page to make employee cards collapsible when they are present and working in multiple locations, preventing cards from becoming excessively long.

## Features Implemented

### 1. **Collapsible Employee Cards**
- **Toggle Button**: Added chevron up/down icon next to the Present/Absent toggle
- **Collapsed State**: Shows employee name with summary information
- **Expanded State**: Shows full work session details, advance payments, and bike expenses

### 2. **Smart Auto-Expansion**
- **Automatic Expansion**: When an employee is marked as present for the first time, their card automatically expands
- **User Control**: Users can manually collapse/expand cards as needed

### 3. **Enhanced Summary Information**
When collapsed, employee cards show:
- **Session Count**: Number of work sessions (e.g., "2 sessions")
- **Total Hours**: Sum of hours across all sessions (e.g., "8h total")
- **Net Pay**: Final calculated pay after advances and bike payments (e.g., "Net: ₹1,200")

### 4. **Visual Status Indicators**
Small colored dots indicate what's configured for each employee:
- **Green Dot**: Work sessions are configured
- **Orange Dot**: Advance payment is set
- **Blue Dot**: Bike expenses are added

### 5. **Bulk Actions**
- **Summary Card**: Shows count of present employees
- **Expand All / Collapse All**: Toggle button to expand or collapse all present employee cards at once

## UI Improvements

### **Header Layout**
```
Employee Name                   [↑] [Present]
2 sessions • 8h total • Net: ₹1,200  ●●●
```

### **Collapsed vs Expanded States**
- **Collapsed**: Shows only essential summary information
- **Expanded**: Shows full work session details, payments, and calculations

### **Status Indicators**
- **Green**: Work sessions configured
- **Orange**: Advance payment set  
- **Blue**: Bike expenses added

## Benefits

1. **Reduced Scroll**: Cards are much shorter when collapsed, reducing page length
2. **Quick Overview**: Summary information provides key details at a glance
3. **Efficient Navigation**: Users can focus on specific employees by expanding only relevant cards
4. **Bulk Management**: Expand/Collapse All buttons for managing multiple employees
5. **Smart Defaults**: Auto-expansion when marking employees present for smooth workflow

## Technical Implementation

### **State Management**
- `expandedCards`: Track which employee cards are expanded
- `toggleCardExpansion()`: Function to toggle individual card state
- Auto-expansion logic when `isPresent` changes to `true`

### **Components Updated**
- Enhanced employee header with info section and controls
- Added status indicators with colored dots
- Implemented summary card for bulk actions
- Responsive layout for collapsed/expanded states

### **Styling**
- Proper spacing and alignment for new layout
- Status indicator dots with meaningful colors
- Toggle buttons with consistent styling
- Summary card with distinct background

## Usage Flow

1. **Mark Employee Present**: Card automatically expands to show work session form
2. **Configure Work Sessions**: Add multiple sessions, set multipliers, hours
3. **Collapse When Done**: Click chevron to collapse card and see summary
4. **Review Summary**: Quickly scan collapsed cards for overview
5. **Bulk Actions**: Use "Expand All" / "Collapse All" for multiple employees

This enhancement significantly improves the user experience when managing attendance for employees working at multiple locations, making the interface more manageable and efficient.
