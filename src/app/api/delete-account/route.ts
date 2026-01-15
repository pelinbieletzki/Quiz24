import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Get the user ID from the request
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'DEIN_SERVICE_ROLE_KEY_HIER') {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured')
      return NextResponse.json({ 
        error: 'Server nicht korrekt konfiguriert. Bitte SUPABASE_SERVICE_ROLE_KEY in .env.local setzen.' 
      }, { status: 500 })
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Delete user's data first
    const { error: quizError } = await supabaseAdmin.from('quizzes').delete().eq('creator_id', userId)
    if (quizError) {
      console.error('Error deleting quizzes:', quizError)
    }

    const { error: sessionError } = await supabaseAdmin.from('game_sessions').delete().eq('host_id', userId)
    if (sessionError) {
      console.error('Error deleting game sessions:', sessionError)
    }

    // Delete the auth user completely
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error('Error deleting user:', error)
      return NextResponse.json({ error: 'Fehler beim Löschen: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete-account:', error)
    return NextResponse.json({ error: 'Interner Server-Fehler: ' + (error as Error).message }, { status: 500 })
  }
}
