# Application Flow Documentation

## Overview
This document describes the complete user flow and technical architecture of the Push It! application.

## Main Navigation Structure

The application uses a bottom navigation with 5 main sections:

### 1. The Button (Main) - `/`
**Purpose**: Global button interaction experience
**Flow**:
```
Landing → [Optional] Login → Button Interaction → Real-time Feedback
```

**Components**:
- `HoldButton`: Main interactive component
- Session management via `useSessionManager`
- Geolocation tracking via `useGeolocation`
- Real-time counter display

**Technical Flow**:
1. User lands on main page
2. Geolocation is detected for country statistics
3. User holds button for 3 seconds
4. Session is created in `button_holds` table with country data
5. Real-time heartbeat system maintains active session
6. Global counter shows current active users
7. Session ends when user releases button

### 2. Vote (Polls) - Navigation Tab
**Purpose**: Poll browsing and voting interface
**Flow**:
```
Browse Polls → Filter/Search → Vote → [Optional] Edit Vote → View Results
```

**Components**:
- `Polls`: Main polling interface
- `PollCard`: Individual poll display
- `SortingTabs`: Hot/Popular/New filtering
- `ArchiveSearch`: Search functionality

**Technical Flow**:
1. Fetch polls with real-time subscriptions
2. Display with voting options and current results
3. Handle vote submission/editing
4. Update statistics in real-time
5. Archive expired polls automatically

### 3. Create - Navigation Tab
**Purpose**: Poll creation interface
**Flow**:
```
Create Form → Add Options → Set Duration → [Login Required] → Submit → Redirect to Polls
```

**Components**:
- `Create`: Main creation wrapper
- `CreatePollForm`: Form interface
- `OptionsManager`: Dynamic option management
- `QuestionInput`: Question input with validation
- `PollDurationInfo`: Time limit settings

**Technical Flow**:
1. User fills poll form (question + options)
2. Sets poll duration
3. Authentication check (redirect if needed)
4. Poll submission to database
5. Automatic redirect to polls view

### 4. Stats (Statistics) - Navigation Tab
**Purpose**: Community analytics and metrics
**Flow**:
```
View Dashboard → Switch Time Periods → Browse Country Rankings → View Records
```

**Components**:
- `Statistics`: Main analytics dashboard
- Time-based tabs (Daily/Monthly/Hall of Fame)
- Country ranking components
- Real-time metrics

**Data Sources**:
- `button_holds`: Geographic and session data
- `polls`: Poll creation metrics
- `user_votes`: Voting statistics
- `profiles`: User counts

**Time Periods**:
- **Daily**: Last 24 hours
- **Monthly**: Last 30 days  
- **Hall of Fame**: All-time records

### 5. My App - Navigation Tab
**Purpose**: User profile and personal data management
**Flow**:
```
[Login Required] → Profile Tabs → Manage Polls → View Statistics → Settings
```

**Sub-sections**:
- **My Polls**: Created/Voted/Saved polls management
- **Community**: User search and social features
- **Profile**: Account settings and personal statistics

## Authentication Flow

### Registration/Login Process
```
Guest → Auth Page → [Email/Google] → Profile Creation → Dashboard Access
```

**Components**:
- `Auth`: Authentication interface
- `AuthProvider`: Context for auth state
- Integration with Supabase Auth

### Profile Management
```
Login → Profile Setup → Avatar Upload → Username/Bio → Privacy Settings
```

## Real-time Systems

### Button Session Management
**Hook**: `useSessionManager`
**Flow**:
1. Session creation with device fingerprinting
2. Heartbeat system (every 3 seconds)
3. Cleanup of inactive sessions (15+ seconds)
4. Real-time session counting
5. Geographic data tracking

### Poll Real-time Updates
**Subscriptions**:
- Vote updates
- New poll notifications  
- Statistics refresh
- Comment systems (future)

### Statistics Real-time Refresh
**Triggers**:
- New button sessions
- Poll votes
- User registrations
- Geographic data changes

## Data Models and Relationships

### Core Entities
```
User (profiles)
├── Button Sessions (button_holds)
├── Created Polls (polls)
├── Votes (user_votes)
├── Saved Polls (saved_polls)
└── Push Actions (user_pushes)

Poll (polls)
├── Options (poll_options)  
├── Votes (user_votes)
└── Push History (user_pushes)
```

### Key Relationships
- Users can create multiple polls
- Users can vote on multiple polls (one vote per poll)
- Users can save polls for later
- Users can boost/push polls (daily limits)
- Button sessions track geographic data

## State Management

### Global State (Context)
- Authentication state (`AuthProvider`)
- Real-time session data (`useSessionManager`)

### Local State (Hooks)
- Poll data (`usePolls`)
- User statistics (`useUserStats`)  
- Modal state (`usePollModal`, `useUserModal`)
- Poll management (`usePollManagement`)

## Error Handling

### Network Errors
- Retry mechanisms for failed requests
- Offline state handling
- User feedback via toast notifications

### Authentication Errors  
- Automatic redirect to login
- Session expiry handling
- Permission-based access control

### Data Validation
- Form validation for poll creation
- Input sanitization
- Rate limiting enforcement

## Mobile Responsiveness

### Layout Adaptations
- Bottom navigation for mobile
- Touch-optimized interactions
- Responsive typography and spacing
- Mobile-first design approach

### Performance Optimizations
- Component lazy loading
- Optimized re-renders
- Efficient real-time subscriptions
- Image optimization for avatars

## Future Enhancements

### Planned Features
- Comment system for polls
- Push notifications
- Advanced analytics dashboard
- Social features (following/followers)
- Poll templates and categories
- Advanced geographic analytics

### Technical Improvements
- Service worker for offline support
- Progressive Web App features
- Advanced caching strategies
- Performance monitoring