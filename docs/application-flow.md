# Application Flow & Architecture

## User Flow Diagram

```mermaid
flowchart TD
    A[User Authentication] --> B{Authenticated?}
    B -->|No| C[Guest Mode]
    B -->|Yes| D[Full Features]
    
    D --> E[Create Poll]
    D --> F[Vote on Poll]
    D --> G[Manage Polls]
    
    E --> E1[Fill Question]
    E1 --> E2[Add Options]
    E2 --> E3[Set Creator Visibility]
    E3 --> E4[Submit Poll]
    E4 --> E5[Poll Active]
    
    F --> F1{Already Voted?}
    F1 -->|No| F2[Cast Vote]
    F1 -->|Yes| F3{Can Edit Vote?}
    F3 -->|Yes| F4[Edit Vote Once]
    F3 -->|No| F5[View Results]
    F4 --> F6[Vote Edited - No More Changes]
    
    G --> G1[Save Poll]
    G --> G2[Hide Poll]
    G --> G3[Push Poll]
    
    G3 --> G4{Push Limits?}
    G4 -->|Available| G5[Increment Push Count]
    G4 -->|Exceeded| G6[Cannot Push]
    
    E5 --> H[Poll Lifecycle]
    H --> H1{Expired?}
    H1 -->|No| H2[Active State]
    H1 -->|Yes| H3[Archived State]
    
    H2 --> I[Real-time Updates]
    I --> I1[Vote Count Updates]
    I --> I2[New Polls Appear]
    I --> I3[Status Changes]
    
    C --> J[Limited Features]
    J --> J1[View Polls Only]
    J --> J2[Cannot Vote/Create]
    
    K[Session Management] --> K1[Device Tracking]
    K1 --> K2[Heartbeat System]
    K2 --> K3[Activity Statistics]
```

## API Interaction Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant S as Supabase
    participant E as Edge Functions
    
    Note over U,E: Poll Creation Flow
    U->>F: Create Poll
    F->>S: Check Authentication
    S-->>F: User Session
    F->>S: Insert Poll + Options
    S-->>F: Poll Created
    F->>U: Redirect to Polls
    
    Note over U,E: Voting Flow
    U->>F: Vote on Poll
    F->>S: Check Existing Vote
    S-->>F: Vote Status
    alt No Previous Vote
        F->>S: Insert New Vote
        F->>S: Update Option Count
    else Has Previous Vote & Can Edit
        F->>S: Update Existing Vote
        F->>S: Update Option Counts
    end
    S-->>F: Vote Registered
    F->>U: Update UI
    
    Note over U,E: Real-time Updates
    S->>F: Poll Changes (Subscription)
    S->>F: Vote Changes (Subscription)
    F->>U: Live UI Updates
    
    Note over U,E: Poll Management
    F->>E: Trigger manage-polls
    E->>S: Cleanup Expired Polls
    E->>S: Update Poll Status
    E-->>F: Management Complete
    
    Note over U,E: Session Tracking
    F->>S: Start Session
    loop Every 30s
        F->>S: Send Heartbeat
    end
    F->>S: End Session
```

## State Management

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    
    Unauthenticated --> Authenticated: Login/Register
    Authenticated --> Unauthenticated: Logout
    
    state Authenticated {
        [*] --> Browsing
        
        Browsing --> Creating: Click Create
        Creating --> Browsing: Submit Poll
        
        Browsing --> Voting: Click Vote Option
        Voting --> Voted: Submit Vote
        Voted --> EditingVote: Click Edit (once only)
        EditingVote --> VoteEdited: Submit New Vote
        VoteEdited --> Voted: Cannot Edit Again
        
        Browsing --> Managing: Save/Hide/Push
        Managing --> Browsing: Action Complete
        
        state PollLifecycle {
            [*] --> Active
            Active --> Expired: Time Elapsed
            Expired --> Archived: Cleanup Process
        }
        
        state PushSystem {
            [*] --> CanPush
            CanPush --> PushUsed: Push Poll
            PushUsed --> CanPush: Reset Daily
            PushUsed --> PushLimitReached: Max Reached
        }
    }
    
    state SessionManagement {
        [*] --> Inactive
        Inactive --> Active: User Activity
        Active --> Heartbeat: Every 30s
        Heartbeat --> Active: Continue
        Active --> Inactive: No Activity
        Inactive --> Cleanup: After Timeout
    }
```

## Key Components & Behavior

### Authentication System
- **Guest Mode**: Read-only access to polls
- **Authenticated Mode**: Full CRUD operations
- **Session Persistence**: Local storage with auto-refresh

### Voting System
- **Single Vote**: One vote per user per poll
- **Vote Editing**: One-time edit capability after initial vote
- **Real-time Updates**: Live vote count synchronization

### Poll Management
- **Creation**: Question + multiple options with creator visibility option
- **Lifecycle**: Active (24h) → Expired → Archived
- **Push System**: User-driven promotion with daily limits

### Real-time Features
- **Supabase Subscriptions**: Live updates for polls and votes
- **Session Tracking**: Heartbeat system for activity statistics
- **Statistics**: Real-time user count and activity metrics

### Edge Functions
- **manage-polls**: Automated cleanup of expired polls
- **Triggers**: Time-based and manual poll management