-- =============================================
-- FIX EXISTING DATABASE
-- Run this in Supabase SQL Editor if quizzes aren't saving
-- =============================================

-- 1. Add question_type column if missing
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'multiple_choice';

-- 2. Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Users can view their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can create quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can update their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can delete their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can view questions of their quizzes" ON questions;
DROP POLICY IF EXISTS "Users can create questions for their quizzes" ON questions;
DROP POLICY IF EXISTS "Users can update questions of their quizzes" ON questions;
DROP POLICY IF EXISTS "Users can delete questions from their quizzes" ON questions;
DROP POLICY IF EXISTS "Anyone can view game sessions by join code" ON game_sessions;
DROP POLICY IF EXISTS "Users can create game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Hosts can update their sessions" ON game_sessions;
DROP POLICY IF EXISTS "Hosts can delete their sessions" ON game_sessions;
DROP POLICY IF EXISTS "Anyone can view players in a session" ON players;
DROP POLICY IF EXISTS "Anyone can join as a player" ON players;
DROP POLICY IF EXISTS "Players can update their own score" ON players;
DROP POLICY IF EXISTS "Players can delete themselves" ON players;
DROP POLICY IF EXISTS "Anyone can view answers" ON player_answers;
DROP POLICY IF EXISTS "Players can submit answers" ON player_answers;
DROP POLICY IF EXISTS "Players can update their answers" ON player_answers;

-- 3. Make sure RLS is enabled
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_answers ENABLE ROW LEVEL SECURITY;

-- 4. Create CORRECT policies

-- QUIZZES: Users can manage their own quizzes
CREATE POLICY "Users can view their own quizzes" ON quizzes
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can create quizzes" ON quizzes
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own quizzes" ON quizzes
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own quizzes" ON quizzes
  FOR DELETE USING (auth.uid() = creator_id);

-- QUESTIONS: Anyone can view (for game play), only quiz owner can modify
CREATE POLICY "Anyone can view questions" ON questions
  FOR SELECT USING (true);

CREATE POLICY "Quiz owners can create questions" ON questions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.creator_id = auth.uid())
  );

CREATE POLICY "Quiz owners can update questions" ON questions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.creator_id = auth.uid())
  );

CREATE POLICY "Quiz owners can delete questions" ON questions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.creator_id = auth.uid())
  );

-- GAME SESSIONS: Anyone can view, only host can modify
CREATE POLICY "Anyone can view game sessions" ON game_sessions
  FOR SELECT USING (true);

CREATE POLICY "Users can create game sessions" ON game_sessions
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their sessions" ON game_sessions
  FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their sessions" ON game_sessions
  FOR DELETE USING (auth.uid() = host_id);

-- PLAYERS: Anyone can view and join
CREATE POLICY "Anyone can view players" ON players
  FOR SELECT USING (true);

CREATE POLICY "Anyone can join as player" ON players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update player scores" ON players
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete players" ON players
  FOR DELETE USING (true);

-- PLAYER ANSWERS: Open for game play
CREATE POLICY "Anyone can view answers" ON player_answers
  FOR SELECT USING (true);

CREATE POLICY "Anyone can submit answers" ON player_answers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update answers" ON player_answers
  FOR UPDATE USING (true);

-- 5. Verify tables exist with correct structure
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('quizzes', 'questions', 'game_sessions', 'players', 'player_answers')
ORDER BY table_name, ordinal_position;
