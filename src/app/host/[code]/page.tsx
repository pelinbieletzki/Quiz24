'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, GameSession, Question, Player } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import { QRCodeSVG } from 'qrcode.react'

interface PlayerWithRank extends Player {
  previousRank?: number
}

export default function HostGame() {
  const params = useParams()
  const code = params.code as string

  const [session, setSession] = useState<GameSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [players, setPlayers] = useState<PlayerWithRank[]>([])
  const [answeredCount, setAnsweredCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(15)
  const [scoreboardCountdown, setScoreboardCountdown] = useState(5)
  const [previousRanks, setPreviousRanks] = useState<Record<string, number>>({})

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

    // Track previous ranks for animation
    const newPlayers = (playersData || []).map((player, index) => ({
      ...player,
      previousRank: previousRanks[player.id] ?? index
    }))
    
    // Update previous ranks for next render
    const newRanks: Record<string, number> = {}
    newPlayers.forEach((player, index) => {
      newRanks[player.id] = index
    })
    setPreviousRanks(newRanks)
    setPlayers(newPlayers)

    // Count answered players for current question
    if (sessionData.status === 'playing' && questionsData) {
      const currentQ = questionsData[sessionData.current_question]
      if (currentQ) {
        const { count } = await supabase
          .from('player_answers')
          .select('*', { count: 'exact', head: true })
          .eq('question_id', currentQ.id)
        setAnsweredCount(count || 0)
      }
    }

    setLoading(false)
  }, [code, previousRanks])

  useEffect(() => {
    loadGameData()
    const interval = setInterval(loadGameData, 1000) // Faster polling for better responsiveness
    return () => clearInterval(interval)
  }, [loadGameData])

  useEffect(() => {
    if (session?.status === 'playing' && session?.question_start_time && !session?.answer_revealed) {
      const startTime = new Date(session.question_start_time).getTime()
      
      const timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        const remaining = Math.max(0, 15 - elapsed)
        setTimeLeft(remaining)
      }, 100)

      return () => clearInterval(timerInterval)
    }
  }, [session?.status, session?.question_start_time, session?.answer_revealed])

  // Auto-reveal ONLY when ALL players have answered (not on timeout)
  useEffect(() => {
    const allAnswered = answeredCount >= players.length && players.length > 0
    
    if (session?.status === 'playing' && !session?.answer_revealed && allAnswered) {
      // Auto-reveal after a short delay when all have answered
      const timeout = setTimeout(async () => {
        await supabase
          .from('game_sessions')
          .update({ answer_revealed: true })
          .eq('id', session?.id)
        setScoreboardCountdown(5)
      }, 500)
      
      return () => clearTimeout(timeout)
    }
  }, [answeredCount, players.length, session?.status, session?.answer_revealed, session?.id])

  // Auto-advance to next question after 5 seconds of showing scoreboard
  useEffect(() => {
    if (session?.status === 'playing' && session?.answer_revealed === true) {
      setScoreboardCountdown(5)
      
      const countdownInterval = setInterval(() => {
        setScoreboardCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      const advanceTimeout = setTimeout(async () => {
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
              question_start_time: new Date().toISOString(),
              answer_revealed: false
            })
            .eq('id', session.id)
          setAnsweredCount(0)
        }
      }, 5000)

      return () => {
        clearInterval(countdownInterval)
        clearTimeout(advanceTimeout)
      }
    }
  }, [session?.answer_revealed, session?.status, session?.id, session?.current_question, questions.length])

  const startGame = async () => {
    await supabase
      .from('game_sessions')
      .update({ 
        status: 'playing', 
        current_question: 0,
        question_start_time: new Date().toISOString(),
        answer_revealed: false
      })
      .eq('id', session?.id)
  }

  const revealAnswer = async () => {
    await supabase
      .from('game_sessions')
      .update({ answer_revealed: true })
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
          question_start_time: new Date().toISOString(),
          answer_revealed: false
        })
        .eq('id', session.id)
      setAnsweredCount(0)
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
  const allAnswered = answeredCount >= players.length && players.length > 0

  // LOBBY VIEW
  if (session?.status === 'lobby') {
    const joinUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/play/${code}` 
      : `/play/${code}`

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#022d94] to-[#0364c1]">
        <Header showProfile />
        
        <main className="max-w-2xl mx-auto px-4 py-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-6">Warte auf Spieler...</h1>
          
          <div className="card p-8 mb-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              {/* QR Code */}
              <div className="flex flex-col items-center">
                <p className="text-gray-600 mb-3">QR-Code scannen:</p>
                <div className="bg-white p-4 rounded-xl shadow-inner">
                  <QRCodeSVG 
                    value={joinUrl} 
                    size={160}
                    level="M"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#022d94"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="hidden md:flex flex-col items-center">
                <div className="h-32 w-px bg-gray-300"></div>
                <span className="text-gray-400 text-sm py-2">oder</span>
                <div className="h-32 w-px bg-gray-300"></div>
              </div>
              <div className="md:hidden flex items-center w-full">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-gray-400 text-sm px-4">oder</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>

              {/* Code */}
              <div className="flex flex-col items-center">
                <p className="text-gray-600 mb-3">Code eingeben:</p>
                <div className="text-5xl font-mono font-bold text-[#022d94] tracking-widest bg-[#ffbb1e] rounded-xl py-4 px-6">
                  {code}
                </div>
                <p className="text-gray-500 mt-3 text-sm">
                  auf <span className="text-[#0364c1] font-semibold">/join</span>
                </p>
              </div>
            </div>
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
                  className={`flex justify-between items-center p-4 rounded-xl transition-all duration-500 ${
                    index === 0 ? 'bg-[#ffbb1e] border-2 border-[#022d94]' :
                    index === 1 ? 'bg-gray-200' :
                    index === 2 ? 'bg-orange-100' :
                    'bg-gray-50'
                  }`}
                  style={{
                    animation: 'slideIn 0.5s ease-out forwards',
                    animationDelay: `${index * 0.1}s`
                  }}
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
  const isRevealed = session?.answer_revealed

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
          
          {!isRevealed && (
            <div className={`text-4xl font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-[#022d94]'}`}>
              {timeLeft}s
            </div>
          )}
          
          <div className="text-[#022d94]">
            <span className="text-gray-500">Antworten:</span>{' '}
            <span className="text-xl font-bold">{answeredCount}/{players.length}</span>
          </div>
        </div>

        {/* Question */}
        <div className="card p-8 mb-6">
          <h2 className="text-2xl font-bold text-[#022d94] text-center">
            {currentQuestion?.question_text}
          </h2>
        </div>

        {/* Answers - Show correct answer only when revealed */}
        {currentQuestion?.question_type === 'estimate' ? (
          <div className="card p-6 mb-6">
            <div className="text-center mb-4">
              <span className="text-lg text-gray-500">Bereich:</span>
              <div className="text-2xl font-bold text-[#022d94] mt-1">
                {currentQuestion.answers[0]} — {currentQuestion.answers[1]}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 relative">
              {isRevealed && (
                <div 
                  className="absolute h-6 w-6 bg-green-500 rounded-full top-1/2 -translate-y-1/2 transform -translate-x-1/2 ring-4 ring-green-200 animate-bounce"
                  style={{ 
                    left: `${((parseFloat(currentQuestion.answers[2]) - parseFloat(currentQuestion.answers[0])) / (parseFloat(currentQuestion.answers[1]) - parseFloat(currentQuestion.answers[0]))) * 100}%` 
                  }}
                />
              )}
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>{currentQuestion.answers[0]}</span>
              {isRevealed && (
                <span className="text-green-600 font-semibold text-lg animate-pulse">
                  ✓ Richtig: {currentQuestion.answers[2]}
                </span>
              )}
              <span>{currentQuestion.answers[1]}</span>
            </div>
          </div>
        ) : currentQuestion?.question_type === 'true_false' ? (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`p-6 rounded-xl text-xl font-bold text-white text-center shadow-lg transition-all duration-500 ${
              isRevealed 
                ? currentQuestion?.correct_index === 0 
                  ? 'bg-green-500 ring-4 ring-green-300 scale-105' 
                  : 'bg-gray-400 opacity-50 scale-95'
                : 'bg-green-500'
            }`}>
              ✓ Wahr
            </div>
            <div className={`p-6 rounded-xl text-xl font-bold text-white text-center shadow-lg transition-all duration-500 ${
              isRevealed 
                ? currentQuestion?.correct_index === 1 
                  ? 'bg-red-500 ring-4 ring-red-300 scale-105' 
                  : 'bg-gray-400 opacity-50 scale-95'
                : 'bg-red-500'
            }`}>
              ✗ Falsch
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {currentQuestion?.answers.map((answer, index) => (
              <div
                key={index}
                className={`p-6 rounded-xl text-xl font-semibold text-white text-center shadow-lg transition-all duration-500 ${
                  isRevealed
                    ? currentQuestion?.correct_index === index
                      ? `${answerColors[index]} ring-4 ring-white scale-105`
                      : 'bg-gray-400 opacity-50 scale-95'
                    : answerColors[index]
                }`}
              >
                {answer}
              </div>
            ))}
          </div>
        )}

        {/* Animated Leaderboard */}
        <div className="card p-6 mb-6 overflow-hidden">
          <h3 className="text-xl font-semibold text-[#022d94] mb-4">Punktestand</h3>
          <div className="relative">
            {players.slice(0, 5).map((player, index) => {
              const moved = player.previousRank !== undefined && player.previousRank !== index
              const movedUp = player.previousRank !== undefined && player.previousRank > index
              
              return (
                <div 
                  key={player.id} 
                  className={`flex justify-between items-center p-3 rounded-lg mb-2 transition-all duration-700 ease-out ${
                    index === 0 ? 'bg-[#ffbb1e]' : 'bg-gray-100'
                  } ${moved ? 'animate-pulse' : ''}`}
                  style={{
                    transform: moved ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-[#022d94] w-6">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <span className="text-[#022d94] font-medium">{player.nickname}</span>
                    {moved && movedUp && (
                      <span className="text-green-500 text-sm font-bold animate-bounce">▲</span>
                    )}
                  </div>
                  <span className="text-[#022d94] font-bold">{player.score}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Button / Countdown */}
        {!isRevealed ? (
          <button
            onClick={revealAnswer}
            disabled={!allAnswered && timeLeft > 0}
            className={`w-full text-xl py-4 rounded-xl font-semibold transition-all ${
              allAnswered || timeLeft === 0
                ? 'btn-secondary animate-pulse'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {allAnswered 
              ? '✨ Alle haben geantwortet! Antwort zeigen' 
              : timeLeft === 0 
                ? '⏱️ Zeit abgelaufen! Antwort zeigen'
                : `⏳ Warte auf Antworten... (${answeredCount}/${players.length})`
            }
          </button>
        ) : (
          <div className="text-center">
            <div className="inline-flex items-center gap-3 bg-[#022d94] text-white px-6 py-3 rounded-xl">
              <span className="text-lg">
                {(session?.current_question || 0) + 1 >= questions.length 
                  ? '🏆 Ergebnisse in' 
                  : '➡️ Nächste Frage in'}
              </span>
              <span className="text-3xl font-bold text-[#ffbb1e] animate-pulse">{scoreboardCountdown}</span>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
