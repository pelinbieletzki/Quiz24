import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface Quiz {
  id: string
  creator_id: string
  title: string
  created_at: string
}

export interface Question {
  id: string
  quiz_id: string
  question_text: string
  answers: string[]
  correct_index: number
  order_index: number
}

export interface GameSession {
  id: string
  quiz_id: string
  host_id: string
  join_code: string
  status: 'lobby' | 'playing' | 'finished'
  current_question: number
  question_start_time: string | null
  created_at: string
}

export interface Player {
  id: string
  session_id: string
  nickname: string
  score: number
}

export interface PlayerAnswer {
  id: string
  player_id: string
  question_id: string
  answer_index: number | null
  response_time_ms: number | null
  points_earned: number
}
