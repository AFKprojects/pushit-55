
-- Create enum for poll status
CREATE TYPE poll_status AS ENUM ('active', 'archived');

-- Create polls table
CREATE TABLE public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  creator_username TEXT NOT NULL,
  status poll_status DEFAULT 'active',
  total_votes INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create poll options table
CREATE TABLE public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
  option_text TEXT NOT NULL,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user votes table to track who voted for what
CREATE TABLE public.user_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES public.poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Create saved polls table (for "To Vote" functionality)
CREATE TABLE public.saved_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Create hidden polls table (for dismissed polls)
CREATE TABLE public.hidden_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  hidden_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create button holds table for real-time tracking
CREATE TABLE public.button_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  is_active BOOLEAN DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.button_holds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for polls (publicly readable, only creator can update/delete)
CREATE POLICY "Anyone can view active polls" ON public.polls
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can create polls" ON public.polls
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own polls" ON public.polls
  FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for poll options (publicly readable)
CREATE POLICY "Anyone can view poll options" ON public.poll_options
  FOR SELECT USING (true);

CREATE POLICY "Poll creators can manage options" ON public.poll_options
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.polls 
    WHERE polls.id = poll_options.poll_id 
    AND polls.created_by = auth.uid()
  ));

-- RLS Policies for user votes
CREATE POLICY "Users can view all votes" ON public.user_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can create own votes" ON public.user_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for saved polls
CREATE POLICY "Users can manage own saved polls" ON public.saved_polls
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for hidden polls
CREATE POLICY "Users can manage own hidden polls" ON public.hidden_polls
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- RLS Policies for button holds
CREATE POLICY "Users can view active holds" ON public.button_holds
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage own holds" ON public.button_holds
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update poll vote counts
CREATE OR REPLACE FUNCTION update_poll_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update option vote count
  IF TG_OP = 'INSERT' THEN
    UPDATE public.poll_options 
    SET votes = votes + 1 
    WHERE id = NEW.option_id;
    
    UPDATE public.polls 
    SET total_votes = total_votes + 1 
    WHERE id = NEW.poll_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.poll_options 
    SET votes = votes - 1 
    WHERE id = OLD.option_id;
    
    UPDATE public.polls 
    SET total_votes = total_votes - 1 
    WHERE id = OLD.poll_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for vote count updates
CREATE TRIGGER update_vote_counts_trigger
  AFTER INSERT OR DELETE ON public.user_votes
  FOR EACH ROW EXECUTE FUNCTION update_poll_vote_counts();

-- Enable realtime for button holds
ALTER TABLE public.button_holds REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.button_holds;

-- Enable realtime for polls and votes
ALTER TABLE public.polls REPLICA IDENTITY FULL;
ALTER TABLE public.user_votes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_votes;
