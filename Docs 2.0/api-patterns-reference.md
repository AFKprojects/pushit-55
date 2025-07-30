# API Patterns & Reference

## Database Query Patterns

### Standard CRUD Operations

#### Create Pattern
```typescript
// Example: Creating a poll
const { data, error } = await supabase
  .from('polls')
  .insert({
    question: sanitizedQuestion,
    created_by: user.id,
    creator_username: user.username,
    expires_at: expirationDate
  })
  .select()
  .single();
```

#### Read Pattern with Joins
```typescript
// Example: Fetching polls with options
const { data, error } = await supabase
  .from('polls')
  .select(`
    id,
    question,
    creator_username,
    status,
    total_votes,
    boost_count,
    expires_at,
    created_at,
    poll_options (
      id,
      option_text,
      votes
    )
  `)
  .eq('status', 'active')
  .order('created_at', { ascending: false });
```

#### Update Pattern
```typescript
// Example: Updating vote
const { error } = await supabase
  .from('user_votes')
  .update({ option_id: newOptionId })
  .eq('id', existingVoteId);
```

### Complex Query Patterns

#### Conditional Queries Based on Auth
```typescript
// Different queries for authenticated vs anonymous users
let query = supabase.from('polls').select(baseFields);

if (user) {
  // Add user-specific data for authenticated users
  const { data: userVotes } = await supabase
    .from('user_votes')
    .select('poll_id, option_id')
    .eq('user_id', user.id);
}
```

#### Aggregation with RPC Functions
```typescript
// Using database functions for complex calculations
const { data, error } = await supabase
  .rpc('get_user_stats', { user_uuid: user.id });
```

## Real-time Subscription Patterns

### Basic Subscription
```typescript
const channel = supabase
  .channel('polls-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'polls'
  }, (payload) => {
    // Handle changes
    fetchPolls();
  })
  .subscribe();
```

### Multi-table Subscription
```typescript
const channel = supabase
  .channel('voting-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'user_votes'
  }, handleVoteChange)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'polls'
  }, handleNewPoll)
  .subscribe();
```

### Presence Tracking
```typescript
// For real-time user presence (button holds)
const presenceChannel = supabase.channel('button-presence')
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState();
    updateActiveUserCount(Object.keys(state).length);
  })
  .subscribe();
```

## Error Handling Patterns

### Secure Error Handling
```typescript
try {
  const result = await databaseOperation();
} catch (error: any) {
  const safeMessage = handleSecureError(error, 'operationName');
  toast({
    title: "Error",
    description: safeMessage,
    variant: "destructive",
  });
}
```

### Rate Limiting Integration
```typescript
// Check rate limit before operation
if (!rateLimiter.canPerform(user.id)) {
  toast({
    title: "Rate limit exceeded",
    description: "Please slow down.",
    variant: "destructive",
  });
  return;
}
```

## Data Transformation Patterns

### Poll Processing Pipeline
```typescript
const processPolls = (rawPolls: any[]) => {
  return rawPolls.map(poll => {
    // Calculate actual totals from options
    const actualTotal = poll.poll_options.reduce((sum, opt) => sum + opt.votes, 0);
    
    // Transform options with percentages
    const options = poll.poll_options.map(opt => ({
      id: opt.id,
      option_text: opt.option_text,
      votes: opt.votes,
      percentage: actualTotal > 0 ? Math.round((opt.votes / actualTotal) * 100) : 0
    }));

    // Calculate hot score
    const ageInHours = (Date.now() - new Date(poll.created_at).getTime()) / (1000 * 60 * 60);
    const timeFactor = Math.max(0.1, 1 / (1 + ageInHours * 0.1));
    const hotScore = (actualTotal + (poll.boost_count || 0) * 3) * timeFactor;

    return {
      ...poll,
      total_votes: actualTotal,
      options,
      hotScore,
      timeLeft: calculateTimeLeft(poll.expires_at)
    };
  });
};
```

## Edge Function Patterns

### Database Function Invocation
```typescript
// From edge function
const { data, error } = await supabase
  .rpc('cleanup_button_hold_sessions');

if (error) {
  return new Response(
    JSON.stringify({ error: error.message }),
    { status: 500 }
  );
}
```

### Scheduled Cleanup Pattern
```typescript
// Edge function for periodic cleanup
serve(async (req) => {
  try {
    // Archive expired polls
    await supabase.rpc('archive_expired_polls');
    
    // Cleanup stale sessions
    await supabase.rpc('cleanup_button_hold_sessions');
    
    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Cleanup failed' }),
      { status: 500 }
    );
  }
});
```

## Security Implementation Patterns

### Input Validation
```typescript
// Server-side validation pattern
const validatePollInput = (question: string, options: string[]) => {
  if (!question || question.length < 10 || question.length > 200) {
    throw new Error('Question must be 10-200 characters');
  }
  
  if (!options || options.length < 2 || options.length > 10) {
    throw new Error('Must have 2-10 options');
  }
  
  options.forEach(option => {
    if (!option || option.length < 1 || option.length > 100) {
      throw new Error('Options must be 1-100 characters');
    }
  });
};
```

### RLS Policy Patterns
```sql
-- User can only access their own data
CREATE POLICY "Users manage own data" ON table_name
FOR ALL USING (auth.uid() = user_id);

-- Public read access
CREATE POLICY "Public read access" ON table_name
FOR SELECT USING (true);

-- Creator can manage their content
CREATE POLICY "Creators manage content" ON poll_options
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM polls 
    WHERE polls.id = poll_options.poll_id 
    AND polls.created_by = auth.uid()
  )
);
```