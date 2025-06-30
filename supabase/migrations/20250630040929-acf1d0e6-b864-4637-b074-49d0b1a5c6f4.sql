
-- Add RLS policies for hidden_polls table
ALTER TABLE public.hidden_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own hidden polls" 
  ON public.hidden_polls 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can hide polls" 
  ON public.hidden_polls 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unhide polls" 
  ON public.hidden_polls 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add RLS policies for saved_polls table
ALTER TABLE public.saved_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved polls" 
  ON public.saved_polls 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save polls" 
  ON public.saved_polls 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave polls" 
  ON public.saved_polls 
  FOR DELETE 
  USING (auth.uid() = user_id);
