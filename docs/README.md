# Push It! - Interactive Global Community App

## Overview

Push It! is a real-time interactive web application that allows users worldwide to press and hold a button simultaneously, creating a global shared experience. The app tracks users in real-time, displays statistics, and includes a comprehensive polling system.

## Core Features

### 1. The Button Experience
- **Real-time Global Button**: Users hold a button for 3 seconds to see how many people worldwide are doing the same
- **Live Session Tracking**: Shows current number of active users holding the button
- **Geolocation Integration**: Tracks user countries for global statistics
- **Visual Feedback**: Animated progress indicators and real-time counters

### 2. Polling System
- **Create Polls**: Users can create polls with multiple options and time limits
- **Vote & Edit**: Vote on polls with ability to change votes
- **Boost System**: Boost polls for increased visibility
- **Real-time Updates**: Live voting results and statistics
- **Archive Management**: Automatic archiving of expired polls

### 3. User Management
- **Authentication**: Email/password and Google OAuth integration
- **User Profiles**: Profile management with avatars and usernames
- **Statistics Tracking**: Personal voting statistics and poll creation history
- **Social Features**: User search and profile viewing

### 4. Analytics & Statistics
- **Global Statistics**: Real-time community metrics (daily, monthly, all-time)
- **Country Rankings**: Geographic breakdown of user activity
- **Performance Metrics**: Button press statistics, poll popularity, voting trends
- **Time-based Analytics**: Historical data with different time ranges

## Technical Architecture

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling with custom design system
- **React Router** for navigation
- **Real-time Updates** via Supabase subscriptions
- **State Management** with custom hooks
- **Responsive Design** optimized for mobile and desktop

### Backend (Supabase)
- **PostgreSQL Database** with Row Level Security (RLS)
- **Real-time Subscriptions** for live updates
- **Authentication** with multiple providers
- **Edge Functions** for server-side logic
- **File Storage** for user avatars and assets

### Key Components

1. **HoldButton**: Main interactive button with progress tracking
2. **Navigation**: Bottom navigation with 5 main sections
3. **PollCard**: Reusable poll display with voting interface
4. **Statistics**: Comprehensive analytics dashboard
5. **UserModal**: User profile viewing and interaction
6. **PollModal**: Detailed poll viewing and voting

### Database Schema

#### Core Tables
- `profiles`: User information and settings
- `button_holds`: Real-time button press sessions with geolocation
- `polls`: Poll questions and metadata
- `poll_options`: Multiple choice options for polls
- `user_votes`: Voting records with change tracking
- `saved_polls`: User bookmarks for polls
- `daily_boost_limits`: Rate limiting for poll boosting
- `user_boosts`: Tracking of poll boost actions

### Real-time Features
- Live session counting for button presses
- Real-time poll vote updates
- Instant statistics refresh
- Live user activity tracking
- Geographic data processing

## User Journey

1. **Landing**: Users see the main button and current global activity
2. **Registration**: Optional account creation for full features
3. **Button Interaction**: Hold button to join global community activity
4. **Poll Participation**: Browse, vote, and create polls
5. **Community Engagement**: View statistics, search users, track personal metrics
6. **Profile Management**: Customize profile and review activity history

## Development Setup

The application uses modern web development practices with:
- Component-based architecture
- Custom React hooks for state management
- TypeScript for type safety
- Responsive design patterns
- Real-time data synchronization
- Error handling and user feedback systems

## Key Integrations

- **Supabase**: Backend-as-a-Service for database, auth, and real-time features
- **Geolocation APIs**: For country detection and geographic statistics
- **Flag APIs**: Country flag display in statistics
- **Real-time Subscriptions**: Live updates across all features