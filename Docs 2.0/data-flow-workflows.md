# Data Flow Workflows

## User Registration & Authentication

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant S as Supabase Auth
    participant DB as Database
    participant T as Trigger

    U->>C: Sign up with email
    C->>S: Create user account
    S->>T: Trigger handle_new_user()
    T->>DB: Insert into profiles table
    DB->>T: Profile created
    T->>S: Return success
    S->>C: Auth session established
    C->>U: Registration complete
```

## Poll Creation Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant V as Validation
    participant DB as Database
    participant RT as Real-time

    U->>C: Submit poll form
    C->>V: Validate input (client-side)
    V->>C: Validation passed
    C->>DB: Insert poll record
    DB->>DB: Auto-generate poll options
    DB->>RT: Broadcast new poll event
    RT->>C: Update poll list
    C->>U: Show success & redirect
```

## Voting Process

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant HL as Hold Logic
    participant DB as Database
    participant RT as Real-time

    U->>C: Start holding vote button
    C->>HL: Create vote hold session
    HL->>DB: Insert poll_vote_holds record
    C->>DB: Send heartbeat every 3s
    
    Note over U,DB: User holds for 3+ seconds
    
    U->>C: Release button after 3s
    C->>HL: End hold session
    HL->>DB: Insert/Update user_votes
    DB->>DB: Update vote counts (trigger)
    DB->>RT: Broadcast vote update
    RT->>C: Update poll results
    HL->>DB: Clean up hold session
```

## Button Hold Session Management

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant SM as Session Manager
    participant DB as Database
    participant CF as Cleanup Function

    U->>C: Press main button
    C->>SM: Start session
    SM->>DB: Insert button_holds record
    
    loop Every 3 seconds
        C->>SM: Send heartbeat
        SM->>DB: Update last_heartbeat
    end
    
    Note over U,DB: User releases button
    
    U->>C: Release button
    C->>SM: End session
    SM->>DB: Update session (ended_at, duration)
    
    Note over DB,CF: Background cleanup
    
    CF->>DB: Find stale sessions (>15s)
    CF->>DB: Mark as inactive
```

## Poll Boost System

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant RL as Rate Limiter
    participant DB as Database

    U->>C: Boost poll request
    C->>RL: Check daily limits
    RL->>DB: Query daily_boost_limits
    DB->>RL: Return current count
    
    alt Limit not exceeded
        RL->>C: Allow boost
        C->>DB: Insert user_boosts record
        DB->>DB: Update poll boost_count_cache
        DB->>RL: Update daily limits
        C->>U: Boost successful
    else Limit exceeded
        RL->>C: Reject boost
        C->>U: Show limit message
    end
```

## Real-time Data Synchronization

```mermaid
graph TB
    A[Database Change] --> B[Postgres Trigger]
    B --> C[Supabase Realtime]
    C --> D[WebSocket Connection]
    D --> E[Client Subscription]
    E --> F[UI Update]
    
    G[User Action] --> H[Database Write]
    H --> A
    
    I[Background Job] --> J[Cleanup Function]
    J --> H
```

## Archive and Cleanup Processes

```mermaid
sequenceDiagram
    participant S as Scheduler
    participant EF as Edge Function
    participant DB as Database

    Note over S,DB: Automated cleanup every hour
    
    S->>EF: Trigger manage-polls function
    EF->>DB: Call archive_expired_polls()
    DB->>DB: Update polls status to 'archived'
    EF->>DB: Call cleanup_button_hold_sessions()
    DB->>DB: Mark stale sessions as inactive
    EF->>DB: Call cleanup_poll_vote_sessions()
    DB->>DB: Clean up old vote holds
    EF->>S: Return cleanup results
```