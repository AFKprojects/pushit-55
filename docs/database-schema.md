# Database Schema & Information Flow

## Entity Relationship Diagram

```mermaid
erDiagram
    profiles {
        uuid id PK
        text username
        text email
        text country
        timestamp created_at
        timestamp updated_at
    }
    
    polls {
        uuid id PK
        text question
        uuid creator_id FK
        timestamp created_at
        timestamp expires_at
        poll_status status
        int push_count
        text creator_name
        boolean show_creator_name
    }
    
    poll_options {
        uuid id PK
        uuid poll_id FK
        text option_text
        int votes
        int order_index
    }
    
    user_votes {
        uuid id PK
        uuid user_id FK
        uuid poll_id FK
        uuid option_id FK
        timestamp created_at
    }
    
    saved_polls {
        uuid id PK
        uuid user_id FK
        uuid poll_id FK
        timestamp created_at
    }
    
    hidden_polls {
        uuid id PK
        uuid user_id FK
        uuid poll_id FK
        timestamp created_at
    }
    
    button_holds {
        uuid id PK
        uuid session_id
        text device_id
        text country
        timestamp created_at
        timestamp last_heartbeat
    }
    
    profiles ||--o{ polls : "creates"
    profiles ||--o{ user_votes : "votes"
    profiles ||--o{ saved_polls : "saves"
    profiles ||--o{ hidden_polls : "hides"
    profiles ||--o{ button_holds : "sessions"
    
    polls ||--o{ poll_options : "has options"
    polls ||--o{ user_votes : "receives votes"
    polls ||--o{ saved_polls : "can be saved"
    polls ||--o{ hidden_polls : "can be hidden"
    
    poll_options ||--o{ user_votes : "gets voted"
```

## Tables Description

### Core Tables

#### `profiles`
- User management table
- Stores basic user information including country for statistics
- Primary key for all user-related operations

#### `polls`
- Main polls table
- Contains poll question, creator info, timing, and push statistics
- Links to creator via `creator_id` foreign key
- Status field manages poll lifecycle (active/expired/archived)

#### `poll_options`
- Individual options for each poll
- Tracks vote count per option
- Order index for consistent display

#### `user_votes`
- Tracks user voting behavior
- One vote per user per poll (enforced by business logic)
- Links user, poll, and specific option chosen

### Management Tables

#### `saved_polls`
- User's saved/bookmarked polls
- Simple many-to-many relationship between users and polls

#### `hidden_polls`
- Polls hidden by users from their view
- Filters out unwanted content per user

#### `button_holds`
- Session tracking for statistics
- Heartbeat system for real-time activity monitoring
- Device and country tracking for analytics

## Key Business Rules

1. **One Vote Per Poll**: Users can vote once per poll, with one-time edit capability
2. **Push System**: Daily limits on poll promotion with tracking
3. **Poll Lifecycle**: Active → Expired → Archived based on time
4. **Session Management**: 30-second heartbeat system for activity tracking
5. **Real-time Updates**: Live synchronization of votes and poll changes