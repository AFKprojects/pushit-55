import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🕒 Starting automatic poll archiving...')

    // Call the archive function
    const { data, error } = await supabase.rpc('archive_expired_polls')

    if (error) {
      console.error('❌ Error archiving polls:', error)
      throw error
    }

    // Get count of archived polls for logging
    const { data: archivedPolls, error: countError } = await supabase
      .from('polls')
      .select('id', { count: 'exact' })
      .eq('status', 'archived')

    if (countError) {
      console.error('❌ Error counting archived polls:', countError)
    }

    const totalArchived = archivedPolls?.length || 0
    console.log(`✅ Poll archiving completed. Total archived polls: ${totalArchived}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Polls archived successfully',
        totalArchived 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Archive polls function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})