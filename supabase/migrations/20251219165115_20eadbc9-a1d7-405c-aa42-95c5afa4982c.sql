-- Fix boost: Drop broken trigger and function that reference non-existent user_pushes table

-- First, drop any triggers using update_push_cache on user_boosts
DROP TRIGGER IF EXISTS update_push_cache_trigger ON public.user_boosts;
DROP TRIGGER IF EXISTS on_user_boost_change ON public.user_boosts;
DROP TRIGGER IF EXISTS trigger_update_push_cache ON public.user_boosts;

-- Drop the broken function
DROP FUNCTION IF EXISTS public.update_push_cache();

-- Ensure sync_boost_counts trigger exists on user_boosts
DROP TRIGGER IF EXISTS sync_boost_counts_trigger ON public.user_boosts;
CREATE TRIGGER sync_boost_counts_trigger
AFTER INSERT OR DELETE ON public.user_boosts
FOR EACH ROW
EXECUTE FUNCTION public.sync_boost_counts();