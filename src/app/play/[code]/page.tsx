'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, GameSession, Question, Player } from '@/lib/supabase'
import { useParams } from 'next/navigation'

export default function PlayGame() {
  const params = useParams()
  const code = params.code as string

  const [session, setSession] = useState<GameSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [nickname, setNickname] = useState('')
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [timeLeft, setTimeLeft] = useState(15)
  const [lastQuestionIndex, setLastQuestionIndex] = useState(-1)

  const loadGameData = useCallback(async () => {
    // Load session
    const { data: sessionData } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('join_code', code)
      .single()

    if (!sessionData) {
      alert('Spiel nicht gefunden')
      window.location.href = '/join'
      return
    }
    
    // Reset answer state when question changes
    if (sessionData.current_question !== lastQuestionIndex) {
      setHasAnswered(false)
      setSelectedAnswer(null)
      setLastQuestionIndex(sessionData.current_question)
    }
    
    setSession(sessionData)

    // Load questions
    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', sessionData.quiz_id)
      .order('order_index')

    setQuestions(questionsData || [])

    // Load players
    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionData.id)
      .order('score', { ascending: false })

    setPlayers(playersData || [])
    
    // Update current player score
    if (currentPlayer) {
      const updated = playersData?.find(p => p.id === currentPlayer.id)
      if (updated) setCurrentPlayer(updated)
    }

    setLoading(false)
  }, [code, currentPlayer, lastQuestionIndex])

  useEffect(() => {
    loadGameData()
    const interval = setInterval(loadGameData, 2000)
    return () => clearInterval(interval)
  }, [loadGameData])

  // Timer countdown
  useEffect(() => {
    if (session?.status === 'playing' && session?.question_start_time) {
      const startTime = new Date(session.question_start_time).getTime()
      
      const timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        const remaining = Math.max(0, 15 - elapsed)
        setTimeLeft(remaining)
      }, 100)

      return () => clearInterval(timerInterval)
    }
  }, [session?.status, session?.question_start_time])

  const joinGame = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nickname.trim() || !session) return

    const { data, error } = await supabase
      .from('players')
      .insert({
        session_id: session.id,
        nickname: nickname.trim(),
        score: 0
      })
      .select()
      .single()

    if (error) {
      alert('Fehler beim Beitreten: ' + error.message)
      return
    }

    setCurrentPlayer(data)
    setJoined(true)
  }

  const submitAnswer = async (answerIndex: number) => {
    if (hasAnswered || !session || !currentPlayer) return
    
    setSelectedAnswer(answerIndex)
    setHasAnswered(true)

    const currentQuestion = questions[session.current_question]
    const isCorrect = answerIndex === currentQuestion?.correct_index
    
    // Calculate points based on time (max 1000, min 100 for correct)
    const responseTime = session.question_start_time 
      ? Date.now() - new Date(session.question_start_time).getTime()
      : 15000
    
    const points = isCorrect ? Math.max(100, Math.round(1000 - (responseTime / 15))) : 0

    // Save answer
    await supabase.from('player_answers').insert({
      player_id: currentPlayer.id,
      question_id: currentQuestion.id,
      answer_index: answerIndex,
      response_time_ms: responseTime,
      points_earned: points
    })

    // Update player score
    await supabase
      .from('players')
      .update({ score: currentPlayer.score + points })
      .eq('id', currentPlayer.id)

    setCurrentPlayer({ ...currentPlayer, score: currentPlayer.score + points })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Laden...</div>
      </div>
    )
  }

  // JOIN FORM
  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Spiel beitreten</h1>
          <p className="text-gray-300">Code: <span className="font-mono text-purple-300">{code}</span></p>
        </div>

        <form onSubmit={joinGame} className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
            <label className="block text-white font-semibold mb-2">Dein Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="z.B. QuizMaster"
              maxLength={20}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            
            <button
              type="submit"
              disabled={!nickname.trim()}
              className="w-full mt-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50"
            >
              Beitreten
            </button>
          </div>
        </form>
      </div>
    )
  }

  // LOBBY - Waiting for game to start
  if (session?.status === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-bounce">🎮</div>
          <h1 className="text-3xl font-bold text-white mb-4">Warte auf Start...</h1>
          <p className="text-gray-300 mb-8">Du bist drin, {currentPlayer?.nickname}!</p>
          
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
            <p className="text-gray-400 mb-2">Spieler in der Lobby:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {players.map((player) => (
                <span
                  key={player.id}
                  className={`px-3 py-1 rounded-full text-sm ${
                    player.id === currentPlayer?.id 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-white/20 text-gray-300'
                  }`}
                >
                  {player.nickname}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // GAME FINISHED
  if (session?.status === 'finished') {
    const rank = players.findIndex(p => p.id === currentPlayer?.id) + 1
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-4">🎉 Fertig!</h1>
          
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 mb-8 border border-white/20">
            <p className="text-gray-300 mb-2">Du bist</p>
            <p className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
              #{rank}
            </p>
            <p className="text-2xl text-white font-semibold">
              {currentPlayer?.score} Punkte
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Alle Spieler</h2>
            <div className="space-y-2">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    player.id === currentPlayer?.id ? 'bg-purple-500/30' : 'bg-white/5'
                  }`}
                >
                  <span className="text-white">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}{' '}
                    {player.nickname}
                  </span>
                  <span className="text-white font-bold">{player.score}</span>
                </div>
              ))}
            </div>
          </div>

          <a
            href="/join"
            className="inline-block mt-8 px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition"
          >
            Neues Spiel beitreten
          </a>
        </div>
      </div>
    )
  }

  // PLAYING - Show question and answers
  const currentQuestion = questions[session?.current_question || 0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-white">
          <span className="text-gray-400">Frage</span>{' '}
          <span className="text-xl font-bold">{(session?.current_question || 0) + 1}</span>
          <span className="text-gray-400">/{questions.length}</span>
        </div>
        <div className={`text-3xl font-bold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
          {timeLeft}s
        </div>
        <div className="text-white">
          <span className="text-gray-400">Punkte:</span>{' '}
          <span className="font-bold">{currentPlayer?.score}</span>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-4 border border-white/20">
        <h2 className="text-xl font-bold text-white text-center">
          {currentQuestion?.question_text}
        </h2>
      </div>

      {/* Answers */}
      {hasAnswered ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">
              {selectedAnswer === currentQuestion?.correct_index ? '✅' : '❌'}
            </div>
            <p className="text-xl text-white">
              {selectedAnswer === currentQuestion?.correct_index 
                ? 'Richtig!' 
                : 'Leider falsch'}
            </p>
            <p className="text-gray-400 mt-2">Warte auf die nächste Frage...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 flex-1">
          {currentQuestion?.answers.map((answer, index) => (
            <button
              key={index}
              onClick={() => submitAnswer(index)}
              disabled={hasAnswered}
              className={`p-4 rounded-xl text-lg font-semibold text-white transition transform hover:scale-[1.02] active:scale-95 ${
                index === 0 ? 'bg-red-500 hover:bg-red-600' :
                index === 1 ? 'bg-blue-500 hover:bg-blue-600' :
                index === 2 ? 'bg-yellow-500 hover:bg-yellow-600' :
                'bg-green-500 hover:bg-green-600'
              }`}
            >
              {answer}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
