'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, GameSession, Question, Player } from '@/lib/supabase'
import { useParams } from 'next/navigation'

export default function HostGame() {
  const params = useParams()
  const code = params.code as string

  const [session, setSession] = useState<GameSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(15)

  const loadGameData = useCallback(async () => {
    // Load session
    const { data: sessionData } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('join_code', code)
      .single()

    if (!sessionData) {
      alert('Spiel nicht gefunden')
      window.location.href = '/dashboard'
      return
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
    setLoading(false)
  }, [code])

  useEffect(() => {
    loadGameData()

    // Poll for updates
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

  const startGame = async () => {
    await supabase
      .from('game_sessions')
      .update({ 
        status: 'playing', 
        current_question: 0,
        question_start_time: new Date().toISOString()
      })
      .eq('id', session?.id)
  }

  const nextQuestion = async () => {
    if (!session) return
    
    const nextIndex = session.current_question + 1
    
    if (nextIndex >= questions.length) {
      // Game finished
      await supabase
        .from('game_sessions')
        .update({ status: 'finished' })
        .eq('id', session.id)
    } else {
      await supabase
        .from('game_sessions')
        .update({ 
          current_question: nextIndex,
          question_start_time: new Date().toISOString()
        })
        .eq('id', session.id)
    }
  }

  const endGame = async () => {
    await supabase
      .from('game_sessions')
      .update({ status: 'finished' })
      .eq('id', session?.id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Laden...</div>
      </div>
    )
  }

  const currentQuestion = questions[session?.current_question || 0]

  // LOBBY VIEW
  if (session?.status === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Warte auf Spieler...</h1>
          
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 mb-8 border border-white/20">
            <p className="text-gray-300 mb-4">Teile diesen Code:</p>
            <div className="text-6xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 tracking-widest">
              {code}
            </div>
            <p className="text-gray-400 mt-4">
              Spieler gehen zu <span className="text-purple-300">quiz24.vercel.app/join</span>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-8 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">
              Spieler ({players.length})
            </h2>
            {players.length === 0 ? (
              <p className="text-gray-400">Noch keine Spieler beigetreten...</p>
            ) : (
              <div className="flex flex-wrap justify-center gap-3">
                {players.map((player) => (
                  <span
                    key={player.id}
                    className="px-4 py-2 bg-purple-500/30 rounded-full text-white"
                  >
                    {player.nickname}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={startGame}
            disabled={players.length === 0}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-xl rounded-xl hover:from-green-600 hover:to-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚀 Spiel starten
          </button>
        </div>
      </div>
    )
  }

  // GAME FINISHED VIEW
  if (session?.status === 'finished') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-8">🎉 Spiel beendet!</h1>
          
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-6">Endergebnis</h2>
            <div className="space-y-3">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex justify-between items-center p-4 rounded-xl ${
                    index === 0 ? 'bg-yellow-500/30 border-2 border-yellow-500/50' :
                    index === 1 ? 'bg-gray-400/30' :
                    index === 2 ? 'bg-orange-600/30' :
                    'bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <span className="text-white font-semibold">{player.nickname}</span>
                  </div>
                  <span className="text-white font-bold">{player.score} Punkte</span>
                </div>
              ))}
            </div>
          </div>

          <a
            href="/dashboard"
            className="inline-block mt-8 px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition"
          >
            Zurück zum Dashboard
          </a>
        </div>
      </div>
    )
  }

  // PLAYING VIEW
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-white">
            <span className="text-gray-400">Frage</span>{' '}
            <span className="text-2xl font-bold">{(session?.current_question || 0) + 1}</span>
            <span className="text-gray-400"> / {questions.length}</span>
          </div>
          <div className={`text-4xl font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>
            {timeLeft}s
          </div>
          <button
            onClick={endGame}
            className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition"
          >
            Spiel beenden
          </button>
        </div>

        {/* Question */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-8 mb-6 border border-white/20">
          <h2 className="text-3xl font-bold text-white text-center">
            {currentQuestion?.question_text}
          </h2>
        </div>

        {/* Answers */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {currentQuestion?.answers.map((answer, index) => (
            <div
              key={index}
              className={`p-6 rounded-xl text-xl font-semibold text-white text-center ${
                index === 0 ? 'bg-red-500' :
                index === 1 ? 'bg-blue-500' :
                index === 2 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
            >
              {answer}
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20 mb-6">
          <h3 className="text-xl font-semibold text-white mb-4">Punktestand</h3>
          <div className="space-y-2">
            {players.slice(0, 5).map((player, index) => (
              <div key={player.id} className="flex justify-between text-white">
                <span>{index + 1}. {player.nickname}</span>
                <span className="font-bold">{player.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Next Button */}
        <button
          onClick={nextQuestion}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xl rounded-xl hover:from-purple-700 hover:to-pink-700 transition"
        >
          {(session?.current_question || 0) + 1 >= questions.length ? 'Ergebnisse zeigen' : 'Nächste Frage →'}
        </button>
      </div>
    </div>
  )
}
