-- DEBUG & FIX: player_answers Tabelle
-- Führe diese Queries im Supabase SQL Editor aus

-- ============================================
-- SCHRITT 1: Lösche alle Testdaten (EMPFOHLEN)
-- ============================================
TRUNCATE TABLE player_answers CASCADE;
TRUNCATE TABLE players CASCADE;
TRUNCATE TABLE game_sessions CASCADE;

-- ============================================
-- SCHRITT 2: Füge UNIQUE Constraint hinzu
-- (verhindert doppelte Antworten)
-- ============================================
ALTER TABLE player_answers 
ADD CONSTRAINT unique_player_question 
UNIQUE (player_id, question_id);

-- ============================================
-- SCHRITT 3: Füge created_at Spalte hinzu
-- ============================================
ALTER TABLE player_answers 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- SCHRITT 4: Füge answer_revealed Spalte hinzu
-- (falls noch nicht vorhanden)
-- ============================================
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS answer_revealed BOOLEAN DEFAULT false;

-- ============================================
-- SCHRITT 5: Füge gamification Spalte hinzu
-- (für den Gamification-Modus)
-- ============================================
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS gamification BOOLEAN DEFAULT true;

-- ============================================
-- DEBUG QUERIES (optional)
-- ============================================

-- Zeige alle Antworten mit Details
SELECT 
  pa.id,
  pa.created_at,
  pa.answer_index,
  pa.points_earned,
  p.nickname as player_nickname,
  q.question_text,
  gs.join_code as game_code,
  gs.status as game_status
FROM player_answers pa
LEFT JOIN players p ON pa.player_id = p.id
LEFT JOIN questions q ON pa.question_id = q.id
LEFT JOIN game_sessions gs ON p.session_id = gs.id
ORDER BY pa.created_at DESC
LIMIT 20;

-- Zeige aktive Game Sessions
SELECT * FROM game_sessions WHERE status != 'finished' ORDER BY created_at DESC;
