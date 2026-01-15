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
  const [previousRanks, setPreviousRanks] = useState<Record<string, number>>({})
  const [gamification, setGamification] = useState(true)

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

    // Load gamification setting from quiz
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('gamification')
      .eq('id', sessionData.quiz_id)
      .single()
    
    if (quizData) {
      setGamification(quizData.gamification ?? true)
    }

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

    // Count answered players for current question (only from current session)
    if (sessionData.status === 'playing' && questionsData && playersData) {
      const currentQ = questionsData[sessionData.current_question]
      if (currentQ) {
        // Get player IDs from current session
        const playerIds = playersData.map(p => p.id)
        
        if (playerIds.length > 0) {
          const { count } = await supabase
            .from('player_answers')
            .select('*', { count: 'exact', head: true })
            .eq('question_id', currentQ.id)
            .in('player_id', playerIds)
          setAnsweredCount(count || 0)
        } else {
          setAnsweredCount(0)
        }
      }
    }

    setLoading(false)
  }, [code, previousRanks])

  useEffect(() => {
    loadGameData()
    const interval = setInterval(loadGameData, 1000) // Faster polling for better responsiveness
    return () => clearInterval(interval)
  }, [loadGameData])

  // Timer and auto-reveal logic combined
  useEffect(() => {
    if (session?.status === 'playing' && session?.question_start_time && !session?.answer_revealed) {
      const startTime = new Date(session.question_start_time).getTime()
      let hasAutoRevealed = false
      
      const timerInterval = setInterval(async () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        const remaining = Math.max(0, 15 - elapsed)
        setTimeLeft(remaining)
        
        // Auto-reveal when time is up
        if (remaining === 0 && !hasAutoRevealed) {
          hasAutoRevealed = true
          await supabase
            .from('game_sessions')
            .update({ answer_revealed: true })
            .eq('id', session?.id)
        }
      }, 100)

      return () => clearInterval(timerInterval)
    }
  }, [session?.status, session?.question_start_time, session?.answer_revealed, session?.id])

  // Auto-reveal when all players have answered
  useEffect(() => {
    if (session?.status === 'playing' && !session?.answer_revealed && players.length > 0) {
      if (answeredCount >= players.length) {
        // All players answered - reveal immediately
        supabase
          .from('game_sessions')
          .update({ answer_revealed: true })
          .eq('id', session?.id)
      }
    }
  }, [session?.status, session?.answer_revealed, session?.id, answeredCount, players.length])

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
              {gamification ? '🎮 ' : ''}Spieler ({players.length}){gamification ? ' 🎮' : ''}
            </h2>
            {players.length === 0 ? (
              <p className="text-gray-500">{gamification ? '👀 ' : ''}Noch keine Spieler beigetreten...</p>
            ) : (
              <div className="flex flex-wrap justify-center gap-3">
                {players.map((player, index) => (
                  <span
                    key={player.id}
                    className={`px-4 py-2 text-white rounded-full font-medium ${
                      gamification 
                        ? 'animate-bounce bg-gradient-to-r from-[#022d94] to-[#0364c1]' 
                        : 'bg-[#022d94]'
                    }`}
                    style={gamification ? { animationDelay: `${index * 0.1}s` } : {}}
                  >
                    {gamification && ['🦸', '🧙', '🦹', '🤖', '👾', '🎯', '⭐', '🔥'][index % 8]} {player.nickname}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={startGame}
            disabled={players.length === 0}
            className={`text-xl px-10 py-4 disabled:opacity-50 disabled:cursor-not-allowed ${
              gamification 
                ? 'btn-secondary animate-pulse hover:animate-none' 
                : 'btn-secondary'
            }`}
          >
            {gamification ? '🚀✨ ' : '🚀 '}Spiel starten{gamification ? ' ✨🚀' : ''}
          </button>
        </main>
      </div>
    )
  }

  // GAME FINISHED VIEW
  if (session?.status === 'finished') {
    const winner = players[0]
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#022d94] to-[#0364c1] overflow-hidden relative">
        {/* Rocket Animations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="rocket rocket-1">🚀</div>
          <div className="rocket rocket-2">🚀</div>
          <div className="rocket rocket-3">🚀</div>
          <div className="rocket rocket-4">🚀</div>
          <div className="rocket rocket-5">🚀</div>
        </div>
        
        <Header showProfile />
        
        <main className="max-w-2xl mx-auto px-4 py-8 text-center relative z-10">
          <h1 className="text-4xl font-bold text-white mb-4">🎉 Spiel beendet!</h1>
          
          {/* Winner Highlight */}
          {winner && (
            <div className="mb-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-6xl animate-bounce">
                👑
              </div>
              <div className="bg-[#ffbb1e] rounded-2xl p-6 pt-10 shadow-2xl transform hover:scale-105 transition-transform">
                <p className="text-[#022d94] text-sm font-medium mb-1">GEWINNER</p>
                <p className="text-4xl font-bold text-[#022d94] mb-2">{winner.nickname}</p>
                <p className="text-2xl text-[#022d94]">🏆 {winner.score} Punkte</p>
                <div className="flex justify-center gap-2 mt-3">
                  <span className="text-2xl animate-pulse">⭐</span>
                  <span className="text-2xl animate-pulse" style={{ animationDelay: '0.2s' }}>⭐</span>
                  <span className="text-2xl animate-pulse" style={{ animationDelay: '0.4s' }}>⭐</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-[#022d94] mb-4">Endergebnis</h2>
            <div className="space-y-2">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex justify-between items-center p-3 rounded-xl transition-all duration-500 ${
                    index === 0 ? 'bg-[#ffbb1e] border-2 border-[#022d94]' :
                    index === 1 ? 'bg-gray-200' :
                    index === 2 ? 'bg-orange-100' :
                    'bg-gray-50'
                  }`}
                  style={{
                    animation: 'slideIn 0.5s ease-out forwards',
                    animationDelay: `${index * 0.1}s`,
                    opacity: 0
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <span className="text-[#022d94] font-semibold">{player.nickname}</span>
                  </div>
                  <span className="text-[#022d94] font-bold">{player.score}</span>
                </div>
              ))}
            </div>
          </div>

          <a
            href="/dashboard"
            className="inline-block mt-6 px-6 py-3 bg-white text-[#022d94] font-semibold rounded-xl hover:bg-gray-100 transition"
          >
            Zurück zum Dashboard
          </a>
        </main>

        <style jsx>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-30px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          @keyframes rocketFly {
            0% {
              transform: translateY(100vh) rotate(45deg);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            90% {
              opacity: 1;
            }
            100% {
              transform: translateY(-100vh) rotate(45deg);
              opacity: 0;
            }
          }
          
          .rocket {
            position: absolute;
            font-size: 2rem;
            animation: rocketFly 3s ease-in-out infinite;
          }
          
          .rocket-1 {
            left: 10%;
            animation-delay: 0s;
          }
          
          .rocket-2 {
            left: 30%;
            animation-delay: 0.6s;
          }
          
          .rocket-3 {
            left: 50%;
            animation-delay: 1.2s;
          }
          
          .rocket-4 {
            left: 70%;
            animation-delay: 1.8s;
          }
          
          .rocket-5 {
            left: 90%;
            animation-delay: 2.4s;
          }
        `}</style>
      </div>
    )
  }

  // PLAYING VIEW
  const answerColors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500']
  const isRevealed = session?.answer_revealed

  // SCOREBOARD VIEW - After answer is revealed
  if (isRevealed) {
    return (
      <div className={`min-h-screen ${gamification ? 'bg-gradient-to-b from-[#022d94] via-[#0364c1] to-purple-600' : 'bg-gradient-to-b from-[#022d94] to-[#0364c1]'}`}>
        {gamification && (
          <>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-2xl animate-float"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${3 + Math.random() * 2}s`
                  }}
                >
                  {['⭐', '✨', '💫', '🌟', '🎯', '🔥'][i % 6]}
                </div>
              ))}
            </div>
          </>
        )}
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
        
        <main className="max-w-2xl mx-auto px-4 py-6 relative z-10">
          {/* Question Result Summary */}
          <div className="text-center mb-6">
            <p className="text-white/70 text-lg">
              {gamification ? '🎯 ' : ''}Frage {(session?.current_question || 0) + 1} von {questions.length}{gamification ? ' 🎯' : ''}
            </p>
            <h2 className="text-xl font-semibold text-white mt-2 mb-4">
              {currentQuestion?.question_text}
            </h2>
            <div className={`inline-block bg-green-500 text-white px-6 py-3 rounded-xl font-bold text-lg ${gamification ? 'animate-pulse' : ''}`}>
              {gamification ? '🎉 ' : ''}✓ Richtig: {currentQuestion?.question_type === 'estimate' 
                ? currentQuestion.answers[2]
                : currentQuestion?.question_type === 'true_false'
                  ? currentQuestion?.correct_index === 0 ? 'Wahr' : 'Falsch'
                  : currentQuestion?.answers[currentQuestion?.correct_index || 0]
              }{gamification ? ' 🎉' : ''}
            </div>
          </div>

          {/* Animated Leaderboard */}
          <div className="card p-6 mb-6">
            <h3 className="text-2xl font-bold text-[#022d94] mb-6 text-center">
              {gamification ? '🏆🔥 ' : '📊 '}Zwischenstand{gamification ? ' 🔥🏆' : ''}
            </h3>
            <div className="space-y-3">
              {players.map((player, index) => {
                const moved = player.previousRank !== undefined && player.previousRank !== index
                const movedUp = player.previousRank !== undefined && player.previousRank > index
                
                return (
                  <div 
                    key={player.id} 
                    className={`flex justify-between items-center p-4 rounded-xl transition-all duration-700 ease-out ${
                      index === 0 ? (gamification ? 'bg-gradient-to-r from-[#ffbb1e] to-orange-400 scale-105' : 'bg-[#ffbb1e] scale-105') : 
                      index === 1 ? 'bg-gray-200' :
                      index === 2 ? 'bg-orange-100' :
                      'bg-gray-100'
                    }`}
                    style={{
                      animation: gamification ? 'bounceIn 0.5s ease-out forwards' : 'slideIn 0.5s ease-out forwards',
                      animationDelay: `${index * 0.1}s`,
                      opacity: 0
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {index === 0 ? (gamification ? '👑🥇' : '🥇') : 
                         index === 1 ? '🥈' : 
                         index === 2 ? '🥉' : 
                         `${index + 1}.`}
                      </span>
                      <span className="text-[#022d94] font-semibold text-lg">{player.nickname}</span>
                      {moved && movedUp && (
                        <span className={`text-green-500 font-bold ${gamification ? 'animate-bounce' : ''}`}>▲{gamification ? '🚀' : ''}</span>
                      )}
                    </div>
                    <span className="text-[#022d94] font-bold text-xl">
                      {gamification && index === 0 ? '💰 ' : ''}{player.score}{gamification ? ' Pkt' : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Next Question Button */}
          <button
            onClick={nextQuestion}
            className="w-full bg-[#ffbb1e] text-[#022d94] text-xl py-4 rounded-xl font-bold hover:bg-[#ffcc4d] transition"
          >
            {(session?.current_question || 0) + 1 >= questions.length ? '🏆 Ergebnisse zeigen' : 'Nächste Frage →'}
          </button>
        </main>

        <style jsx>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-30px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes bounceIn {
            0% {
              opacity: 0;
              transform: scale(0.3) translateY(-20px);
            }
            50% {
              opacity: 1;
              transform: scale(1.05) translateY(5px);
            }
            70% {
              transform: scale(0.95) translateY(-3px);
            }
            100% {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          @keyframes float {
            0%, 100% {
              transform: translateY(0) rotate(0deg);
            }
            50% {
              transform: translateY(-20px) rotate(5deg);
            }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `}</style>
      </div>
    )
  }

  // QUESTION VIEW - During answering (no scoreboard)
  return (
    <div className={`min-h-screen ${gamification ? 'bg-gradient-to-br from-[#f5f7fa] via-blue-50 to-purple-50' : 'bg-[#f5f7fa]'}`}>
      {gamification && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute text-4xl opacity-20 animate-pulse"
              style={{
                left: `${10 + i * 12}%`,
                top: `${20 + (i % 3) * 30}%`,
                animationDelay: `${i * 0.3}s`
              }}
            >
              {['🎯', '⚡', '🔥', '💫', '🌟', '✨', '🎮', '🏆'][i]}
            </div>
          ))}
        </div>
      )}
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
      
      <main className="max-w-4xl mx-auto px-4 py-6 relative z-10">
        {/* Progress Bar */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-[#022d94]">
            <span className="text-gray-500">{gamification ? '🎯 ' : ''}Frage</span>{' '}
            <span className="text-2xl font-bold">{(session?.current_question || 0) + 1}</span>
            <span className="text-gray-500"> / {questions.length}</span>
          </div>
          
          <div className={`text-4xl font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-[#022d94]'} ${gamification && timeLeft <= 5 ? 'scale-110 animate-bounce' : ''}`}>
            {gamification && timeLeft <= 5 ? '⏰ ' : ''}{timeLeft}s
          </div>
          
          <div className="text-[#022d94]">
            <span className="text-gray-500">{gamification ? '👥 ' : ''}Antworten:</span>{' '}
            <span className="text-xl font-bold">{answeredCount}/{players.length}</span>
            {gamification && answeredCount > 0 && <span className="ml-1">✅</span>}
          </div>
        </div>

        {/* Question */}
        <div className={`card p-8 mb-6 ${gamification ? 'border-2 border-[#ffbb1e] shadow-lg shadow-yellow-200/30' : ''}`}>
          <h2 className="text-2xl font-bold text-[#022d94] text-center">
            {gamification ? '❓ ' : ''}{currentQuestion?.question_text}{gamification ? ' ❓' : ''}
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
            <div className="w-full bg-gray-200 rounded-full h-4"></div>
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>{currentQuestion.answers[0]}</span>
              <span>{currentQuestion.answers[1]}</span>
            </div>
          </div>
        ) : currentQuestion?.question_type === 'true_false' ? (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-500 p-6 rounded-xl text-xl font-bold text-white text-center shadow-lg">
              ✓ Wahr
            </div>
            <div className="bg-red-500 p-6 rounded-xl text-xl font-bold text-white text-center shadow-lg">
              ✗ Falsch
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {currentQuestion?.answers.map((answer, index) => (
              <div
                key={index}
                className={`${answerColors[index]} p-6 rounded-xl text-xl font-semibold text-white text-center shadow-lg`}
              >
                {answer}
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
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
      </main>
    </div>
  )
}
