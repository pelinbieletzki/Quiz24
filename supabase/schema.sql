-- Quiz24 Database Schema
-- Run this in Supabase SQL Editor

-- Quizzes
CREATE TABLE quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice',
  answers TEXT[] NOT NULL,
  correct_index INT NOT NULL,
  order_index INT NOT NULL
);

-- Game Sessions
CREATE TABLE game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  join_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'lobby',
  current_question INT DEFAULT 0,
  question_start_time TIMESTAMP WITH TIME ZONE,
  answer_revealed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  score INT DEFAULT 0
);

-- Player Answers
CREATE TABLE player_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  answer_index INT,
  response_time_ms INT,
  points_earned INT DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_answers ENABLE ROW LEVEL SECURITY;

-- Policies for quizzes
CREATE POLICY "Users can view their own quizzes" ON quizzes
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can create quizzes" ON quizzes
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own quizzes" ON quizzes
  FOR DELETE USING (auth.uid() = creator_id);

-- Policies for questions (linked to quiz ownership)
CREATE POLICY "Users can view questions of their quizzes" ON questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.creator_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM game_sessions WHERE game_sessions.quiz_id = questions.quiz_id)
  );

CREATE POLICY "Users can create questions for their quizzes" ON questions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_id AND quizzes.creator_id = auth.uid())
  );

CREATE POLICY "Users can delete questions from their quizzes" ON questions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.creator_id = auth.uid())
  );

-- Policies for game_sessions
CREATE POLICY "Anyone can view game sessions by join code" ON game_sessions
  FOR SELECT USING (true);

CREATE POLICY "Users can create game sessions" ON game_sessions
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their sessions" ON game_sessions
  FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their sessions" ON game_sessions
  FOR DELETE USING (auth.uid() = host_id);

-- Policies for players
CREATE POLICY "Anyone can view players in a session" ON players
  FOR SELECT USING (true);

CREATE POLICY "Anyone can join as a player" ON players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Players can update their own score" ON players
  FOR UPDATE USING (true);

-- Policies for player_answers
CREATE POLICY "Anyone can view answers" ON player_answers
  FOR SELECT USING (true);

CREATE POLICY "Players can submit answers" ON player_answers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Players can update their answers" ON player_answers
  FOR UPDATE USING (true);
