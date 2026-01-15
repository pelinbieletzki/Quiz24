'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, GameSession, Question, Player } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'

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
  const [estimateValue, setEstimateValue] = useState<number>(50)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [timeLeft, setTimeLeft] = useState(15)
  const [lastQuestionIndex, setLastQuestionIndex] = useState(-1)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [estimateInitialized, setEstimateInitialized] = useState(false)
  const [gamification, setGamification] = useState(true)

  const loadGameData = useCallback(async () => {
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
    
    // Reset state when question changes
    if (sessionData.current_question !== lastQuestionIndex) {
      setHasAnswered(false)
      setSelectedAnswer(null)
      setPointsEarned(0)
      setEstimateInitialized(false)
      setLastQuestionIndex(sessionData.current_question)
    }
    
    // Check if current player has already answered this question (e.g., after page reload)
    if (currentPlayer && sessionData.status === 'playing') {
      const { data: questionsForCheck } = await supabase
        .from('questions')
        .select('id')
        .eq('quiz_id', sessionData.quiz_id)
        .order('order_index')
      
      if (questionsForCheck && questionsForCheck[sessionData.current_question]) {
        const currentQuestionId = questionsForCheck[sessionData.current_question].id
        const { data: existingAnswer } = await supabase
          .from('player_answers')
          .select('answer_index, points_earned')
          .eq('player_id', currentPlayer.id)
          .eq('question_id', currentQuestionId)
          .single()
        
        if (existingAnswer && !hasAnswered) {
          setHasAnswered(true)
          setSelectedAnswer(existingAnswer.answer_index)
          setPointsEarned(existingAnswer.points_earned)
        }
      }
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
    
    // Set initial estimate value ONLY ONCE when question changes
    if (questionsData && questionsData[sessionData.current_question]?.question_type === 'estimate' && !estimateInitialized && !hasAnswered) {
      const q = questionsData[sessionData.current_question]
      const min = parseFloat(q.answers[0])
      const max = parseFloat(q.answers[1])
      setEstimateValue(Math.round((min + max) / 2))
      setEstimateInitialized(true)
    }

    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionData.id)
      .order('score', { ascending: false })

    setPlayers(playersData || [])
    
    if (currentPlayer) {
      const updated = playersData?.find(p => p.id === currentPlayer.id)
      if (updated) setCurrentPlayer(updated)
    }

    setLoading(false)
  }, [code, currentPlayer, lastQuestionIndex, hasAnswered, estimateInitialized])

  useEffect(() => {
    loadGameData()
    const interval = setInterval(loadGameData, 1000) // Faster polling
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
    
    const currentQuestion = questions[session.current_question]
    if (!currentQuestion) return
    
    // Check if already answered (double-check against database)
    const { data: existingCheck } = await supabase
      .from('player_answers')
      .select('id')
      .eq('player_id', currentPlayer.id)
      .eq('question_id', currentQuestion.id)
      .single()
    
    if (existingCheck) {
      setHasAnswered(true)
      return // Already answered, don't insert again
    }
    
    setSelectedAnswer(answerIndex)
    setHasAnswered(true)

    const isCorrect = answerIndex === currentQuestion.correct_index
    
    const responseTime = session.question_start_time 
      ? Date.now() - new Date(session.question_start_time).getTime()
      : 15000
    
    const points = isCorrect ? Math.max(100, Math.round(1000 - (responseTime / 15))) : 0
    setPointsEarned(points)

    await supabase.from('player_answers').insert({
      player_id: currentPlayer.id,
      question_id: currentQuestion.id,
      answer_index: answerIndex,
      response_time_ms: responseTime,
      points_earned: points
    })

    await supabase
      .from('players')
      .update({ score: currentPlayer.score + points })
      .eq('id', currentPlayer.id)

    setCurrentPlayer({ ...currentPlayer, score: currentPlayer.score + points })
  }

  const submitEstimate = async () => {
    if (hasAnswered || !session || !currentPlayer) return
    
    const currentQuestion = questions[session.current_question]
    if (!currentQuestion) return
    
    // Check if already answered (double-check against database)
    const { data: existingCheck } = await supabase
      .from('player_answers')
      .select('id')
      .eq('player_id', currentPlayer.id)
      .eq('question_id', currentQuestion.id)
      .single()
    
    if (existingCheck) {
      setHasAnswered(true)
      return // Already answered, don't insert again
    }
    
    setSelectedAnswer(estimateValue)
    setHasAnswered(true)

    const correctValue = parseFloat(currentQuestion.answers[2])
    const min = parseFloat(currentQuestion.answers[0])
    const max = parseFloat(currentQuestion.answers[1])
    
    // Calculate points based on how close the estimate is
    const range = max - min
    const difference = Math.abs(estimateValue - correctValue)
    const accuracy = 1 - (difference / range)
    
    const responseTime = session.question_start_time 
      ? Date.now() - new Date(session.question_start_time).getTime()
      : 15000
    
    // Points: accuracy (0-1) * time bonus (100-1000)
    const points = Math.round(accuracy * Math.max(100, 1000 - (responseTime / 15)))
    setPointsEarned(points)

    await supabase.from('player_answers').insert({
      player_id: currentPlayer.id,
      question_id: currentQuestion.id,
      answer_index: estimateValue,
      response_time_ms: responseTime,
      points_earned: points
    })

    await supabase
      .from('players')
      .update({ score: currentPlayer.score + points })
      .eq('id', currentPlayer.id)

    setCurrentPlayer({ ...currentPlayer, score: currentPlayer.score + points })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa]">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-[#022d94] text-xl">Laden...</div>
        </div>
      </div>
    )
  }

  // JOIN FORM
  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#022d94] to-[#0364c1]">
        <Header />
        
        <main className="flex flex-col items-center justify-center px-4 py-16">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Spiel beitreten</h1>
            <p className="text-white/80">Code: <span className="font-mono text-[#ffbb1e] font-bold">{code}</span></p>
          </div>

          <form onSubmit={joinGame} className="w-full max-w-md">
            <div className="card p-8">
              <label className="block text-[#022d94] font-semibold mb-2">Dein Nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="z.B. QuizMaster"
                maxLength={20}
                className="input-field mb-4"
              />
              
              <button
                type="submit"
                disabled={!nickname.trim()}
                className="w-full btn-secondary disabled:opacity-50"
              >
                Beitreten
              </button>
            </div>
          </form>
        </main>
      </div>
    )
  }

  // LOBBY - Waiting for game to start
  if (session?.status === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#022d94] to-[#0364c1]">
        <Header />
        
        <main className="flex flex-col items-center justify-center px-4 py-16">
          <div className="text-center">
            <div className="text-6xl mb-6 animate-bounce">🎮</div>
            <h1 className="text-3xl font-bold text-white mb-4">Warte auf Start...</h1>
            <p className="text-white/80 mb-8">Du bist drin, <span className="text-[#ffbb1e] font-bold">{currentPlayer?.nickname}</span>!</p>
            
            <div className="card p-6">
              <p className="text-gray-500 mb-3">Spieler in der Lobby:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {players.map((player) => (
                  <span
                    key={player.id}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      player.id === currentPlayer?.id 
                        ? 'bg-[#ffbb1e] text-[#022d94]' 
                        : 'bg-[#022d94] text-white'
                    }`}
                  >
                    {player.nickname}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // GAME FINISHED
  if (session?.status === 'finished') {
    const rank = players.findIndex(p => p.id === currentPlayer?.id) + 1
    const isWinner = rank === 1
    const winner = players[0]
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#022d94] to-[#0364c1] overflow-hidden relative">
        {/* Rocket Animations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="rocket rocket-1">🚀</div>
          <div className="rocket rocket-2">🚀</div>
          <div className="rocket rocket-3">🚀</div>
          <div className="rocket rocket-4">🚀</div>
        </div>
        
        <Header />
        
        <main className="max-w-md mx-auto px-4 py-6 text-center relative z-10">
          <h1 className="text-3xl font-bold text-white mb-4">🎉 Fertig!</h1>
          
          {/* Winner Banner */}
          {winner && (
            <div className="mb-4 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-4xl animate-bounce">
                👑
              </div>
              <div className={`rounded-xl p-4 pt-8 ${isWinner ? 'bg-[#ffbb1e] shadow-2xl scale-105' : 'bg-white/20'}`}>
                <p className={`text-sm font-medium mb-1 ${isWinner ? 'text-[#022d94]' : 'text-white/80'}`}>
                  {isWinner ? '🏆 DU HAST GEWONNEN!' : 'GEWINNER'}
                </p>
                <p className={`text-2xl font-bold ${isWinner ? 'text-[#022d94]' : 'text-white'}`}>
                  {winner.nickname}
                </p>
                <p className={`text-lg ${isWinner ? 'text-[#022d94]' : 'text-white/80'}`}>
                  {winner.score} Punkte
                </p>
                {isWinner && (
                  <div className="flex justify-center gap-2 mt-2">
                    <span className="text-xl animate-pulse">⭐</span>
                    <span className="text-xl animate-pulse" style={{ animationDelay: '0.2s' }}>⭐</span>
                    <span className="text-xl animate-pulse" style={{ animationDelay: '0.4s' }}>⭐</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Your Result (if not winner) */}
          {!isWinner && (
            <div className="card p-4 mb-4">
              <p className="text-gray-500 text-sm">Dein Platz</p>
              <p className="text-4xl font-bold text-[#022d94]">
                {rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
              </p>
              <p className="text-lg text-[#022d94] font-semibold">
                {currentPlayer?.score} Punkte
              </p>
            </div>
          )}

          <div className="card p-4">
            <h2 className="text-lg font-semibold text-[#022d94] mb-3">Alle Spieler</h2>
            <div className="space-y-2">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex justify-between items-center p-2 rounded-lg transition-all duration-500 ${
                    player.id === currentPlayer?.id ? 'bg-[#ffbb1e]' : 
                    index === 0 ? 'bg-yellow-100' : 'bg-gray-100'
                  }`}
                  style={{
                    animation: 'slideIn 0.5s ease-out forwards',
                    animationDelay: `${index * 0.1}s`,
                    opacity: 0
                  }}
                >
                  <span className="text-[#022d94] font-medium text-sm">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}{' '}
                    {player.nickname}
                  </span>
                  <span className="text-[#022d94] font-bold text-sm">{player.score}</span>
                </div>
              ))}
            </div>
          </div>

          <a
            href="/join"
            className="inline-block mt-4 px-6 py-3 bg-white text-[#022d94] font-semibold rounded-xl hover:bg-gray-100 transition"
          >
            Neues Spiel beitreten
          </a>
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
          
          @keyframes float {
            0%, 100% {
              transform: translateY(0) rotate(0deg);
            }
            50% {
              transform: translateY(-15px) rotate(3deg);
            }
          }
          
          .animate-float {
            animation: float 3s ease-in-out infinite;
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
            font-size: 1.5rem;
            animation: rocketFly 2.5s ease-in-out infinite;
          }
          
          .rocket-1 {
            left: 5%;
            animation-delay: 0s;
          }
          
          .rocket-2 {
            left: 35%;
            animation-delay: 0.6s;
          }
          
          .rocket-3 {
            left: 65%;
            animation-delay: 1.2s;
          }
          
          .rocket-4 {
            left: 95%;
            animation-delay: 1.8s;
          }
        `}</style>
      </div>
    )
  }

  // PLAYING - Show question and answers
  const currentQuestion = questions[session?.current_question || 0]
  const isRevealed = session?.answer_revealed
  const answerColors = [
    'bg-red-500 hover:bg-red-600 active:bg-red-700',
    'bg-blue-500 hover:bg-blue-600 active:bg-blue-700',
    'bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700',
    'bg-green-500 hover:bg-green-600 active:bg-green-700'
  ]
  const answerBgColors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500']

  // WAITING SCREEN after answering, before reveal
  if (hasAnswered && !isRevealed) {
    return (
      <div className={`min-h-screen flex flex-col ${gamification ? 'bg-gradient-to-b from-[#022d94] via-purple-700 to-[#0364c1]' : 'bg-gradient-to-b from-[#022d94] to-[#0364c1]'}`}>
        {gamification && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute text-3xl animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              >
                {['🎯', '⭐', '💫', '✨', '🌟', '🔥', '🎮', '⚡'][i % 8]}
              </div>
            ))}
          </div>
        )}
        <Header />
        
        <main className="flex-1 flex flex-col items-center justify-center px-4 relative z-10">
          <div className={`card p-8 text-center max-w-md ${gamification ? 'border-2 border-[#ffbb1e]' : ''}`}>
            <div className={`text-6xl mb-6 ${gamification ? 'animate-bounce' : 'animate-pulse'}`}>
              {gamification ? '🎉' : '⏳'}
            </div>
            <h2 className="text-2xl font-bold text-[#022d94] mb-4">
              {gamification ? '✅ Super! ' : ''}Antwort abgegeben!{gamification ? ' ✅' : ''}
            </h2>
            {currentQuestion?.question_type === 'estimate' ? (
              <p className="text-gray-600 mb-4">
                {gamification ? '🔢 ' : ''}Deine Schätzung: <span className="font-bold text-[#022d94]">{selectedAnswer}</span>
              </p>
            ) : (
              <p className="text-gray-600 mb-4">
                {gamification ? '👆 ' : ''}Du hast gewählt: <span className="font-bold text-[#022d94]">
                  {currentQuestion?.question_type === 'true_false'
                    ? selectedAnswer === 0 ? 'Wahr' : 'Falsch'
                    : currentQuestion?.answers[selectedAnswer || 0]
                  }
                </span>
              </p>
            )}
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <div className="w-2 h-2 bg-[#022d94] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-[#022d94] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-[#022d94] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="text-gray-500 mt-4 text-sm">Warte auf andere Spieler...</p>
          </div>
        </main>
      </div>
    )
  }

  // REVEAL SCREEN - Show correct answer and scoreboard
  if (hasAnswered && isRevealed) {
    const isCorrect = currentQuestion?.question_type === 'estimate'
      ? false // For estimates, we show points earned instead
      : selectedAnswer === currentQuestion?.correct_index
    const currentRank = players.findIndex(p => p.id === currentPlayer?.id) + 1

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#022d94] to-[#0364c1] flex flex-col">
        <Header />
        
        <main className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 py-6">
          {/* Result Header */}
          <div className="card p-6 mb-4 text-center">
            {currentQuestion?.question_type === 'estimate' ? (
              <>
                <div className="text-4xl mb-2">📊</div>
                <p className="text-gray-600 text-sm">Richtige Antwort: <span className="font-bold text-green-600">{currentQuestion.answers[2]}</span></p>
                <p className="text-gray-500 text-sm">Deine Schätzung: {selectedAnswer}</p>
                <p className={`text-2xl font-bold mt-2 ${pointsEarned > 500 ? 'text-green-500' : pointsEarned > 200 ? 'text-[#ffbb1e]' : 'text-red-500'}`}>
                  +{pointsEarned} Punkte
                </p>
              </>
            ) : (
              <>
                <div className={`text-5xl mb-2 ${isCorrect ? 'animate-bounce' : ''}`}>
                  {isCorrect ? '✅' : '❌'}
                </div>
                <h2 className={`text-xl font-bold ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                  {isCorrect ? 'Richtig!' : 'Falsch!'}
                </h2>
                {!isCorrect && (
                  <p className="text-gray-600 text-sm mt-1">
                    Richtig: <span className="font-bold text-[#022d94]">
                      {currentQuestion?.question_type === 'true_false'
                        ? currentQuestion?.correct_index === 0 ? 'Wahr' : 'Falsch'
                        : currentQuestion?.answers[currentQuestion?.correct_index || 0]
                      }
                    </span>
                  </p>
                )}
                <p className={`text-2xl font-bold mt-2 ${isCorrect ? 'text-green-500' : 'text-gray-400'}`}>
                  +{pointsEarned} Punkte
                </p>
              </>
            )}
          </div>

          {/* Your Position */}
          <div className="bg-[#ffbb1e] rounded-xl p-4 mb-4 text-center">
            <p className="text-[#022d94] text-sm font-medium">Dein aktueller Platz</p>
            <p className="text-4xl font-bold text-[#022d94]">
              {currentRank === 1 ? '🥇' : currentRank === 2 ? '🥈' : currentRank === 3 ? '🥉' : `#${currentRank}`}
            </p>
            <p className="text-[#022d94] font-semibold">{currentPlayer?.score} Punkte</p>
          </div>

          {/* Scoreboard */}
          <div className="card p-4 flex-1">
            <h3 className="text-lg font-bold text-[#022d94] mb-3 text-center">📊 Zwischenstand</h3>
            <div className="space-y-2">
              {players.slice(0, 5).map((player, index) => (
                <div 
                  key={player.id} 
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    player.id === currentPlayer?.id 
                      ? 'bg-[#ffbb1e]' 
                      : index === 0 ? 'bg-yellow-100' : 'bg-gray-100'
                  }`}
                  style={{
                    animation: 'slideIn 0.4s ease-out forwards',
                    animationDelay: `${index * 0.08}s`,
                    opacity: 0
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[#022d94]">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <span className={`font-medium ${player.id === currentPlayer?.id ? 'text-[#022d94] font-bold' : 'text-[#022d94]'}`}>
                      {player.nickname}
                    </span>
                  </div>
                  <span className="text-[#022d94] font-bold">{player.score}</span>
                </div>
              ))}
              {players.length > 5 && currentRank > 5 && (
                <div className="text-center text-gray-500 text-sm py-2">
                  ... und {players.length - 5} weitere
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-white/70 mt-4 animate-pulse text-sm">
            Warte auf nächste Frage...
          </p>
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

  // ANSWERING SCREEN - Show question and answer options
  return (
    <div className={`min-h-screen flex flex-col ${gamification ? 'bg-gradient-to-br from-[#f5f7fa] via-blue-50 to-purple-50' : 'bg-[#f5f7fa]'}`}>
      {gamification && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute text-3xl opacity-30 animate-pulse"
              style={{
                left: `${15 + i * 15}%`,
                top: `${25 + (i % 2) * 50}%`,
                animationDelay: `${i * 0.4}s`
              }}
            >
              {['🎯', '⚡', '🔥', '💫', '🎮', '🏆'][i]}
            </div>
          ))}
        </div>
      )}
      <Header />
      
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-4 relative z-10">
        {/* Header Info */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-[#022d94]">
            <span className="text-gray-500">{gamification ? '🎯 ' : ''}Frage</span>{' '}
            <span className="text-xl font-bold">{(session?.current_question || 0) + 1}</span>
            <span className="text-gray-500">/{questions.length}</span>
          </div>
          <div className={`text-3xl font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-[#022d94]'} ${gamification && timeLeft <= 5 ? 'animate-bounce' : ''}`}>
            {gamification && timeLeft <= 5 ? '⏰ ' : ''}{timeLeft}s
          </div>
          <div className="text-[#022d94]">
            <span className="text-gray-500">{gamification ? '💰 ' : ''}Punkte:</span>{' '}
            <span className="font-bold">{currentPlayer?.score}</span>
          </div>
        </div>

        {/* Question */}
        <div className={`card p-6 mb-4 ${gamification ? 'border-2 border-[#ffbb1e] shadow-lg shadow-yellow-200/30' : ''}`}>
          <h2 className="text-xl font-bold text-[#022d94] text-center">
            {gamification ? '❓ ' : ''}{currentQuestion?.question_text}{gamification ? ' ❓' : ''}
          </h2>
        </div>

        {/* Answers */}
        {currentQuestion?.question_type === 'estimate' ? (
          // Estimate Question with Slider
          <div className="flex-1 flex flex-col justify-center">
            <div className="card p-6">
              <div className="text-center mb-4">
                <span className="text-4xl font-bold text-[#022d94]">{estimateValue}</span>
              </div>
              
              <input
                type="range"
                min={parseFloat(currentQuestion.answers[0])}
                max={parseFloat(currentQuestion.answers[1])}
                value={estimateValue}
                onChange={(e) => setEstimateValue(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#022d94]"
              />
              
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>{currentQuestion.answers[0]}</span>
                <span>{currentQuestion.answers[1]}</span>
              </div>

              <button
                onClick={submitEstimate}
                className="w-full mt-6 py-4 bg-[#ffbb1e] text-[#022d94] font-bold text-xl rounded-xl hover:bg-[#ffcc4d] transition"
              >
                Schätzung abgeben
              </button>
            </div>
          </div>
        ) : currentQuestion?.question_type === 'true_false' ? (
          // True/False Buttons
          <div className="grid grid-cols-2 gap-4 flex-1 max-h-40">
            <button
              onClick={() => submitAnswer(0)}
              disabled={hasAnswered}
              className="bg-green-500 hover:bg-green-600 active:bg-green-700 p-6 rounded-xl text-xl font-bold text-white transition transform hover:scale-[1.02] active:scale-95 shadow-lg"
            >
              ✓ Wahr
            </button>
            <button
              onClick={() => submitAnswer(1)}
              disabled={hasAnswered}
              className="bg-red-500 hover:bg-red-600 active:bg-red-700 p-6 rounded-xl text-xl font-bold text-white transition transform hover:scale-[1.02] active:scale-95 shadow-lg"
            >
              ✗ Falsch
            </button>
          </div>
        ) : (
          // Multiple Choice Buttons
          <div className="grid grid-cols-2 gap-3 flex-1">
            {currentQuestion?.answers.map((answer, index) => (
              <button
                key={index}
                onClick={() => submitAnswer(index)}
                disabled={hasAnswered}
                className={`${answerColors[index]} p-4 rounded-xl text-lg font-semibold text-white transition transform hover:scale-[1.02] active:scale-95 shadow-lg`}
              >
                {answer}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
