-- Update RLS policies for button_holds to allow viewing all sessions for statistics
DROP POLICY IF EXISTS "Users can view active holds" ON public.button_holds;

-- Allow viewing all button_holds for statistics (not just active ones)
CREATE POLICY "Users can view all holds for statistics" 
ON public.button_holds 
FOR SELECT 
USING (true);

-- Keep the management policy as is
-- This allows users to manage their own holds and anonymous holds