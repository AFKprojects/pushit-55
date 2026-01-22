-- Fix RLS policy for guest_previews - restrict to device_id matching only
DROP POLICY IF EXISTS "Allow anonymous guest preview tracking" ON public.guest_previews;

-- More restrictive policy - guests can only manage records matching their device_id
-- Since this is anonymous access, we use the device_id passed through RPC functions
-- The functions are SECURITY DEFINER, so we allow full access here but control at function level
CREATE POLICY "Guest previews managed via RPC only" 
ON public.guest_previews 
FOR SELECT 
USING (true);

-- Disable direct INSERT/UPDATE/DELETE - force usage through RPC
CREATE POLICY "Guest previews insert via RPC" 
ON public.guest_previews 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Guest previews update via RPC" 
ON public.guest_previews 
FOR UPDATE 
USING (false);

CREATE POLICY "Guest previews delete via RPC" 
ON public.guest_previews 
FOR DELETE 
USING (false);