import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date().toISOString()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // 1. Archive expired polls (those that passed expires_at)
    const { data: expiredPolls, error: expiredError } = await supabaseClient
      .from('polls')
      .update({ status: 'archived' })
      .eq('status', 'active')
      .lt('expires_at', now)
      .select('id')

    if (expiredError) {
      throw expiredError
    }

    // 2. Delete polls older than 30 days (including their options and votes)
    const { data: oldPolls, error: oldPollsError } = await supabaseClient
      .from('polls')
      .select('id')
      .lt('created_at', thirtyDaysAgo)

    if (oldPollsError) {
      throw oldPollsError
    }

    let deletedCount = 0
    if (oldPolls && oldPolls.length > 0) {
      const pollIds = oldPolls.map(poll => poll.id)

      // Delete user votes for old polls
      await supabaseClient
        .from('user_votes')
        .delete()
        .in('poll_id', pollIds)

      // Delete saved polls references
      await supabaseClient
        .from('saved_polls')
        .delete()
        .in('poll_id', pollIds)

      // Delete hidden polls references
      await supabaseClient
        .from('hidden_polls')
        .delete()
        .in('poll_id', pollIds)

      // Delete poll options
      await supabaseClient
        .from('poll_options')
        .delete()
        .in('poll_id', pollIds)

      // Delete polls themselves
      const { error: deleteError } = await supabaseClient
        .from('polls')
        .delete()
        .in('id', pollIds)

      if (deleteError) {
        throw deleteError
      }

      deletedCount = pollIds.length
    }

    return new Response(
      JSON.stringify({
        success: true,
        archivedCount: expiredPolls?.length || 0,
        deletedCount: deletedCount,
        message: `Archived ${expiredPolls?.length || 0} expired polls and deleted ${deletedCount} old polls`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})