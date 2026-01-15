-- Quiz24 Database Schema
-- Run this in Supabase SQL Editor
-- If tables already exist, run the "UPDATE EXISTING DATABASE" section at the bottom

-- =============================================
-- FRESH INSTALL (New Database)
-- =============================================

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice',
  answers TEXT[] NOT NULL,
  correct_index INT NOT NULL,
  order_index INT NOT NULL
);

-- Game Sessions
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  join_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'lobby',
  current_question INT DEFAULT 0,
  question_start_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  score INT DEFAULT 0
);

-- Player Answers
CREATE TABLE IF NOT EXISTS player_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  answer_index INT,
  response_time_ms INT,
  points_earned INT DEFAULT 0
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_answers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Users can view their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can create quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can delete their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can view questions of their quizzes" ON questions;
DROP POLICY IF EXISTS "Users can create questions for their quizzes" ON questions;
DROP POLICY IF EXISTS "Users can delete questions from their quizzes" ON questions;
DROP POLICY IF EXISTS "Anyone can view game sessions by join code" ON game_sessions;
DROP POLICY IF EXISTS "Users can create game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Hosts can update their sessions" ON game_sessions;
DROP POLICY IF EXISTS "Hosts can delete their sessions" ON game_sessions;
DROP POLICY IF EXISTS "Anyone can view players in a session" ON players;
DROP POLICY IF EXISTS "Anyone can join as a player" ON players;
DROP POLICY IF EXISTS "Players can update their own score" ON players;
DROP POLICY IF EXISTS "Anyone can view answers" ON player_answers;
DROP POLICY IF EXISTS "Players can submit answers" ON player_answers;
DROP POLICY IF EXISTS "Players can update their answers" ON player_answers;

-- QUIZZES Policies
CREATE POLICY "Users can view their own quizzes" ON quizzes
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can create quizzes" ON quizzes
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own quizzes" ON quizzes
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own quizzes" ON quizzes
  FOR DELETE USING (auth.uid() = creator_id);

-- QUESTIONS Policies (more permissive for game play)
CREATE POLICY "Users can view questions of their quizzes" ON questions
  FOR SELECT USING (true);

CREATE POLICY "Users can create questions for their quizzes" ON questions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.creator_id = auth.uid())
  );

CREATE POLICY "Users can update questions of their quizzes" ON questions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.creator_id = auth.uid())
  );

CREATE POLICY "Users can delete questions from their quizzes" ON questions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.creator_id = auth.uid())
  );

-- GAME SESSIONS Policies
CREATE POLICY "Anyone can view game sessions by join code" ON game_sessions
  FOR SELECT USING (true);

CREATE POLICY "Users can create game sessions" ON game_sessions
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their sessions" ON game_sessions
  FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their sessions" ON game_sessions
  FOR DELETE USING (auth.uid() = host_id);

-- PLAYERS Policies
CREATE POLICY "Anyone can view players in a session" ON players
  FOR SELECT USING (true);

CREATE POLICY "Anyone can join as a player" ON players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Players can update their own score" ON players
  FOR UPDATE USING (true);

CREATE POLICY "Players can delete themselves" ON players
  FOR DELETE USING (true);

-- PLAYER ANSWERS Policies
CREATE POLICY "Anyone can view answers" ON player_answers
  FOR SELECT USING (true);

CREATE POLICY "Players can submit answers" ON player_answers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Players can update their answers" ON player_answers
  FOR UPDATE USING (true);

-- =============================================
-- UPDATE EXISTING DATABASE
-- Run this if you already have tables but need to add question_type
-- =============================================

-- Add question_type column if it doesn't exist
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'multiple_choice';
