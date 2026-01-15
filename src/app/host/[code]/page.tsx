'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, GameSession, Question, Player } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'

export default function HostGame() {
  const params = useParams()
  const code = params.code as string

  const [session, setSession] = useState<GameSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(15)

  const loadGameData = useCallback(async () => {
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

    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', sessionData.quiz_id)
      .order('order_index')

    setQuestions(questionsData || [])

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
    const interval = setInterval(loadGameData, 2000)
    return () => clearInterval(interval)
  }, [loadGameData])

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
      <div className="min-h-screen bg-[#f5f7fa]">
        <Header showProfile />
        <div className="flex items-center justify-center py-20">
          <div className="text-[#022d94] text-xl">Laden...</div>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[session?.current_question || 0]

  // LOBBY VIEW
  if (session?.status === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#022d94] to-[#0364c1]">
        <Header showProfile />
        
        <main className="max-w-2xl mx-auto px-4 py-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-6">Warte auf Spieler...</h1>
          
          <div className="card p-8 mb-6">
            <p className="text-gray-600 mb-3">Teile diesen Code:</p>
            <div className="text-5xl font-mono font-bold text-[#022d94] tracking-widest bg-[#ffbb1e] rounded-xl py-4 px-6 inline-block">
              {code}
            </div>
            <p className="text-gray-500 mt-4 text-sm">
              Spieler gehen zu <span className="text-[#0364c1] font-semibold">/join</span> und geben den Code ein
            </p>
          </div>

          <div className="card p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#022d94] mb-4">
              Spieler ({players.length})
            </h2>
            {players.length === 0 ? (
              <p className="text-gray-500">Noch keine Spieler beigetreten...</p>
            ) : (
              <div className="flex flex-wrap justify-center gap-3">
                {players.map((player) => (
                  <span
                    key={player.id}
                    className="px-4 py-2 bg-[#022d94] text-white rounded-full font-medium"
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
            className="btn-secondary text-xl px-10 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚀 Spiel starten
          </button>
        </main>
      </div>
    )
  }

  // GAME FINISHED VIEW
  if (session?.status === 'finished') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#022d94] to-[#0364c1]">
        <Header showProfile />
        
        <main className="max-w-2xl mx-auto px-4 py-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-8">🎉 Spiel beendet!</h1>
          
          <div className="card p-8">
            <h2 className="text-2xl font-semibold text-[#022d94] mb-6">Endergebnis</h2>
            <div className="space-y-3">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex justify-between items-center p-4 rounded-xl ${
                    index === 0 ? 'bg-[#ffbb1e] border-2 border-[#022d94]' :
                    index === 1 ? 'bg-gray-200' :
                    index === 2 ? 'bg-orange-100' :
                    'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <span className="text-[#022d94] font-semibold">{player.nickname}</span>
                  </div>
                  <span className="text-[#022d94] font-bold">{player.score} Punkte</span>
                </div>
              ))}
            </div>
          </div>

          <a
            href="/dashboard"
            className="inline-block mt-8 px-6 py-3 bg-white text-[#022d94] font-semibold rounded-xl hover:bg-gray-100 transition"
          >
            Zurück zum Dashboard
          </a>
        </main>
      </div>
    )
  }

  // PLAYING VIEW
  const answerColors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500']

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Header 
        showProfile
        rightContent={
          <button
            onClick={endGame}
            className="px-4 py-2 bg-red-500/20 text-red-200 rounded-lg hover:bg-red-500/30 transition text-sm"
          >
            Spiel beenden
          </button>
        }
      />
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Progress Bar */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-[#022d94]">
            <span className="text-gray-500">Frage</span>{' '}
            <span className="text-2xl font-bold">{(session?.current_question || 0) + 1}</span>
            <span className="text-gray-500"> / {questions.length}</span>
          </div>
          <div className={`text-4xl font-bold ${timeLeft <= 5 ? 'text-red-500' : 'text-[#022d94]'}`}>
            {timeLeft}s
          </div>
        </div>

        {/* Question */}
        <div className="card p-8 mb-6">
          <h2 className="text-2xl font-bold text-[#022d94] text-center">
            {currentQuestion?.question_text}
          </h2>
        </div>

        {/* Answers */}
        {currentQuestion?.question_type === 'estimate' ? (
          <div className="card p-6 mb-6">
            <div className="text-center mb-4">
              <span className="text-lg text-gray-500">Bereich:</span>
              <div className="text-2xl font-bold text-[#022d94] mt-1">
                {currentQuestion.answers[0]} — {currentQuestion.answers[1]}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 relative">
              <div 
                className="absolute h-4 w-4 bg-green-500 rounded-full top-0 transform -translate-x-1/2"
                style={{ 
                  left: `${((parseFloat(currentQuestion.answers[2]) - parseFloat(currentQuestion.answers[0])) / (parseFloat(currentQuestion.answers[1]) - parseFloat(currentQuestion.answers[0]))) * 100}%` 
                }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>{currentQuestion.answers[0]}</span>
              <span className="text-green-600 font-semibold">Richtig: {currentQuestion.answers[2]}</span>
              <span>{currentQuestion.answers[1]}</span>
            </div>
          </div>
        ) : currentQuestion?.question_type === 'true_false' ? (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`p-6 rounded-xl text-xl font-bold text-white text-center shadow-lg ${currentQuestion?.correct_index === 0 ? 'bg-green-500 ring-4 ring-green-300' : 'bg-green-500/60'}`}>
              ✓ Wahr
            </div>
            <div className={`p-6 rounded-xl text-xl font-bold text-white text-center shadow-lg ${currentQuestion?.correct_index === 1 ? 'bg-red-500 ring-4 ring-red-300' : 'bg-red-500/60'}`}>
              ✗ Falsch
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {currentQuestion?.answers.map((answer, index) => (
              <div
                key={index}
                className={`${answerColors[index]} p-6 rounded-xl text-xl font-semibold text-white text-center shadow-lg ${currentQuestion?.correct_index === index ? 'ring-4 ring-white' : 'opacity-80'}`}
              >
                {answer}
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard */}
        <div className="card p-6 mb-6">
          <h3 className="text-xl font-semibold text-[#022d94] mb-4">Punktestand</h3>
          <div className="space-y-2">
            {players.slice(0, 5).map((player, index) => (
              <div key={player.id} className="flex justify-between text-[#022d94]">
                <span>{index + 1}. {player.nickname}</span>
                <span className="font-bold">{player.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Next Button */}
        <button
          onClick={nextQuestion}
          className="w-full btn-secondary text-xl py-4"
        >
          {(session?.current_question || 0) + 1 >= questions.length ? '🏆 Ergebnisse zeigen' : 'Nächste Frage →'}
        </button>
      </main>
    </div>
  )
}
