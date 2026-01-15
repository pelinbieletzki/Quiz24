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
    
    if (sessionData.current_question !== lastQuestionIndex) {
      setHasAnswered(false)
      setSelectedAnswer(null)
      setLastQuestionIndex(sessionData.current_question)
    }
    
    setSession(sessionData)

    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', sessionData.quiz_id)
      .order('order_index')

    setQuestions(questionsData || [])
    
    // Set initial estimate value when question changes
    if (questionsData && questionsData[sessionData.current_question]?.question_type === 'estimate') {
      const q = questionsData[sessionData.current_question]
      const min = parseFloat(q.answers[0])
      const max = parseFloat(q.answers[1])
      setEstimateValue(Math.round((min + max) / 2))
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
  }, [code, currentPlayer, lastQuestionIndex])

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
    
    const responseTime = session.question_start_time 
      ? Date.now() - new Date(session.question_start_time).getTime()
      : 15000
    
    const points = isCorrect ? Math.max(100, Math.round(1000 - (responseTime / 15))) : 0

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
    
    setSelectedAnswer(estimateValue)
    setHasAnswered(true)

    const currentQuestion = questions[session.current_question]
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
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#022d94] to-[#0364c1]">
        <Header />
        
        <main className="max-w-md mx-auto px-4 py-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">🎉 Fertig!</h1>
          
          <div className="card p-8 mb-6">
            <p className="text-gray-500 mb-2">Du bist</p>
            <p className="text-6xl font-bold text-[#022d94] mb-2">
              #{rank}
            </p>
            <p className="text-2xl text-[#022d94] font-semibold">
              {currentPlayer?.score} Punkte
            </p>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold text-[#022d94] mb-4">Alle Spieler</h2>
            <div className="space-y-2">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    player.id === currentPlayer?.id ? 'bg-[#ffbb1e]' : 'bg-gray-100'
                  }`}
                >
                  <span className="text-[#022d94] font-medium">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}{' '}
                    {player.nickname}
                  </span>
                  <span className="text-[#022d94] font-bold">{player.score}</span>
                </div>
              ))}
            </div>
          </div>

          <a
            href="/join"
            className="inline-block mt-8 px-6 py-3 bg-white text-[#022d94] font-semibold rounded-xl hover:bg-gray-100 transition"
          >
            Neues Spiel beitreten
          </a>
        </main>
      </div>
    )
  }

  // PLAYING - Show question and answers
  const currentQuestion = questions[session?.current_question || 0]
  const answerColors = [
    'bg-red-500 hover:bg-red-600 active:bg-red-700',
    'bg-blue-500 hover:bg-blue-600 active:bg-blue-700',
    'bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700',
    'bg-green-500 hover:bg-green-600 active:bg-green-700'
  ]

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-4">
        {/* Header Info */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-[#022d94]">
            <span className="text-gray-500">Frage</span>{' '}
            <span className="text-xl font-bold">{(session?.current_question || 0) + 1}</span>
            <span className="text-gray-500">/{questions.length}</span>
          </div>
          <div className={`text-3xl font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-[#022d94]'}`}>
            {timeLeft}s
          </div>
          <div className="text-[#022d94]">
            <span className="text-gray-500">Punkte:</span>{' '}
            <span className="font-bold">{currentPlayer?.score}</span>
          </div>
        </div>

        {/* Question */}
        <div className="card p-6 mb-4">
          <h2 className="text-xl font-bold text-[#022d94] text-center">
            {currentQuestion?.question_text}
          </h2>
        </div>

        {/* Answers */}
        {hasAnswered ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center card p-8">
              {currentQuestion?.question_type === 'estimate' ? (
                <>
                  <div className="text-4xl mb-4">📊</div>
                  <p className="text-lg text-[#022d94] font-semibold">
                    Deine Schätzung: {selectedAnswer}
                  </p>
                  <p className="text-gray-500 mt-2">Warte auf die Auflösung...</p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">
                    {selectedAnswer === currentQuestion?.correct_index ? '✅' : '❌'}
                  </div>
                  <p className="text-xl text-[#022d94] font-semibold">
                    {selectedAnswer === currentQuestion?.correct_index 
                      ? 'Richtig!' 
                      : 'Leider falsch'}
                  </p>
                  <p className="text-gray-500 mt-2">Warte auf die nächste Frage...</p>
                </>
              )}
            </div>
          </div>
        ) : currentQuestion?.question_type === 'estimate' ? (
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
