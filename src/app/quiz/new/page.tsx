'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'

type QuestionType = 'multiple_choice' | 'true_false' | 'estimate'

interface QuestionInput {
  question_text: string
  question_type: QuestionType
  answers: string[]
  correct_index: number
}

export default function NewQuiz() {
  const [title, setTitle] = useState('')
  const [gamification, setGamification] = useState(true)
  const [questions, setQuestions] = useState<QuestionInput[]>([
    { question_text: '', question_type: 'multiple_choice', answers: ['', '', '', ''], correct_index: 0 }
  ])
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/'
      return
    }
    setUserId(user.id)
  }

  const addQuestion = (type: QuestionType) => {
    if (type === 'true_false') {
      setQuestions([
        ...questions,
        { question_text: '', question_type: 'true_false', answers: ['Wahr', 'Falsch'], correct_index: 0 }
      ])
    } else if (type === 'estimate') {
      setQuestions([
        ...questions,
        { question_text: '', question_type: 'estimate', answers: ['0', '100', '50'], correct_index: 0 }
      ])
    } else {
      setQuestions([
        ...questions,
        { question_text: '', question_type: 'multiple_choice', answers: ['', '', '', ''], correct_index: 0 }
      ])
    }
  }

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const changeQuestionType = (index: number, newType: QuestionType) => {
    const updated = [...questions]
    if (newType === 'true_false') {
      updated[index] = {
        ...updated[index],
        question_type: 'true_false',
        answers: ['Wahr', 'Falsch'],
        correct_index: 0
      }
    } else if (newType === 'estimate') {
      updated[index] = {
        ...updated[index],
        question_type: 'estimate',
        answers: ['0', '100', '50'],
        correct_index: 0
      }
    } else {
      updated[index] = {
        ...updated[index],
        question_type: 'multiple_choice',
        answers: ['', '', '', ''],
        correct_index: 0
      }
    }
    setQuestions(updated)
  }

  const updateQuestion = (index: number, field: string, value: string | number) => {
    const updated = [...questions]
    if (field === 'question_text') {
      updated[index].question_text = value as string
    } else if (field === 'correct_index') {
      updated[index].correct_index = value as number
    }
    setQuestions(updated)
  }

  const updateAnswer = (qIndex: number, aIndex: number, value: string) => {
    const updated = [...questions]
    updated[qIndex].answers[aIndex] = value
    setQuestions(updated)
  }

  const updateEstimateValue = (qIndex: number, field: 'min' | 'max' | 'correct', value: string) => {
    const updated = [...questions]
    if (field === 'min') updated[qIndex].answers[0] = value
    else if (field === 'max') updated[qIndex].answers[1] = value
    else if (field === 'correct') updated[qIndex].answers[2] = value
    setQuestions(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      alert('Bitte gib einen Titel ein')
      return
    }

    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question_text.trim()) {
        alert(`Frage ${i + 1} hat keinen Text`)
        return
      }
      if (questions[i].question_type === 'multiple_choice') {
        const emptyAnswers = questions[i].answers.filter(a => !a.trim())
        if (emptyAnswers.length > 0) {
          alert(`Frage ${i + 1} hat leere Antworten`)
          return
        }
      }
      if (questions[i].question_type === 'estimate') {
        const min = parseFloat(questions[i].answers[0])
        const max = parseFloat(questions[i].answers[1])
        const correct = parseFloat(questions[i].answers[2])
        if (isNaN(min) || isNaN(max) || isNaN(correct)) {
          alert(`Frage ${i + 1}: Bitte gib gültige Zahlen ein`)
          return
        }
        if (correct < min || correct > max) {
          alert(`Frage ${i + 1}: Die richtige Antwort muss zwischen Min und Max liegen`)
          return
        }
      }
    }

    setSaving(true)

    try {
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({ title, creator_id: userId, gamification })
        .select()
        .single()

      if (quizError) throw quizError

      const questionsToInsert = questions.map((q, index) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        question_type: q.question_type,
        answers: q.answers,
        correct_index: q.correct_index,
        order_index: index
      }))

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert)

      if (questionsError) throw questionsError

      window.location.href = '/dashboard'
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten'
      alert('Fehler beim Speichern: ' + errorMessage)
      setSaving(false)
    }
  }

  const answerColors = [
    'border-red-400 focus:border-red-500',
    'border-blue-400 focus:border-blue-500', 
    'border-yellow-400 focus:border-yellow-500',
    'border-green-400 focus:border-green-500'
  ]

  const answerBgColors = [
    'bg-red-50',
    'bg-blue-50',
    'bg-yellow-50',
    'bg-green-50'
  ]

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Header showBackButton backHref="/dashboard" showProfile />
      
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-[#022d94] mb-6">Neues Quiz erstellen</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quiz Title */}
          <div className="card p-6">
            <label className="block text-[#022d94] font-semibold mb-2">Quiz-Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Allgemeinwissen"
              className="input-field"
            />
          </div>

          {/* Gamification Toggle */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-[#022d94] font-semibold">🎮 Gamification-Modus</label>
                <p className="text-gray-500 text-sm mt-1">
                  Mehr Emojis, Animationen und Farben für ein spielerisches Erlebnis
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGamification(!gamification)}
                className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
                  gamification ? 'bg-[#ffbb1e]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                    gamification ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
                {gamification && (
                  <span className="absolute top-1/2 left-1 -translate-y-1/2 text-xs">🚀</span>
                )}
              </button>
            </div>
            {gamification && (
              <div className="mt-3 p-3 bg-[#ffbb1e]/20 rounded-lg text-sm text-[#022d94]">
                ✨ Spieler sehen: Raketen-Animationen, bunte Effekte, Konfetti und mehr Emojis!
              </div>
            )}
          </div>

          {/* Questions */}
          {questions.map((question, qIndex) => (
            <div key={qIndex} className="card p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-[#022d94]">Frage {qIndex + 1}</h3>
                  {/* Question Type Selector */}
                  <select
                    value={question.question_type}
                    onChange={(e) => changeQuestionType(qIndex, e.target.value as QuestionType)}
                    className="text-sm px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 focus:outline-none focus:border-[#0364c1]"
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">Wahr/Falsch</option>
                    <option value="estimate">Schätzfrage</option>
                  </select>
                </div>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="flex items-center gap-1 text-red-500 hover:text-red-700 transition text-sm font-medium px-3 py-1 rounded hover:bg-red-50"
                  >
                    <span>🗑️</span> Löschen
                  </button>
                )}
              </div>

              <input
                type="text"
                value={question.question_text}
                onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                placeholder={question.question_type === 'estimate' ? "z.B. Wie viele Einwohner hat Deutschland (in Millionen)?" : "Deine Frage..."}
                className="input-field mb-4"
              />

              {question.question_type === 'true_false' ? (
                // True/False Question
                <div>
                  <p className="text-sm text-gray-600 mb-3">Wähle die richtige Antwort:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateQuestion(qIndex, 'correct_index', 0)}
                      className={`p-4 rounded-lg border-2 font-semibold transition ${
                        question.correct_index === 0
                          ? 'bg-green-100 border-green-500 text-green-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      ✓ Wahr
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQuestion(qIndex, 'correct_index', 1)}
                      className={`p-4 rounded-lg border-2 font-semibold transition ${
                        question.correct_index === 1
                          ? 'bg-green-100 border-green-500 text-green-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      ✗ Falsch
                    </button>
                  </div>
                </div>
              ) : question.question_type === 'estimate' ? (
                // Estimate Question
                <div>
                  <p className="text-sm text-gray-600 mb-3">Definiere den Zahlenbereich und die richtige Antwort:</p>
                  <div className="grid grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 h-4">Minimum</label>
                      <input
                        type="number"
                        value={question.answers[0]}
                        onChange={(e) => updateEstimateValue(qIndex, 'min', e.target.value)}
                        className="w-full h-10 px-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#0364c1]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 h-4">Maximum</label>
                      <input
                        type="number"
                        value={question.answers[1]}
                        onChange={(e) => updateEstimateValue(qIndex, 'max', e.target.value)}
                        className="w-full h-10 px-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#0364c1]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-green-600 mb-1 h-4">✓ Richtig</label>
                      <input
                        type="number"
                        value={question.answers[2]}
                        onChange={(e) => updateEstimateValue(qIndex, 'correct', e.target.value)}
                        className="w-full h-10 px-3 border-2 border-green-400 bg-green-50 rounded-lg focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                    <p className="text-sm text-gray-600">Vorschau:</p>
                    <input
                      type="range"
                      min={question.answers[0]}
                      max={question.answers[1]}
                      value={question.answers[2]}
                      disabled
                      className="w-full mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{question.answers[0]}</span>
                      <span className="text-green-600 font-semibold">Richtig: {question.answers[2]}</span>
                      <span>{question.answers[1]}</span>
                    </div>
                  </div>
                </div>
              ) : (
                // Multiple Choice Question
                <div>
                  <p className="text-sm text-gray-600 mb-3">Antworten (klicke auf ✓ für die richtige Antwort):</p>
                  <div className="grid grid-cols-2 gap-3">
                    {question.answers.map((answer, aIndex) => (
                      <div key={aIndex} className="relative">
                        <input
                          type="text"
                          value={answer}
                          onChange={(e) => updateAnswer(qIndex, aIndex, e.target.value)}
                          placeholder={`Antwort ${aIndex + 1}`}
                          className={`w-full px-4 py-3 pr-12 rounded-lg border-2 ${answerColors[aIndex]} ${
                            question.correct_index === aIndex ? answerBgColors[aIndex] : 'bg-white'
                          } focus:outline-none transition`}
                        />
                        <button
                          type="button"
                          onClick={() => updateQuestion(qIndex, 'correct_index', aIndex)}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition ${
                            question.correct_index === aIndex
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                          }`}
                          title="Als richtige Antwort markieren"
                        >
                          ✓
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Question Section */}
          <div>
            <h3 className="text-lg font-semibold text-[#022d94] mb-3">Weitere Frage hinzufügen</h3>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => addQuestion('multiple_choice')}
                className="py-4 border-2 border-dashed border-[#0364c1] rounded-xl text-[#0364c1] hover:border-[#022d94] hover:text-[#022d94] transition font-semibold text-sm"
              >
                + Multiple Choice
              </button>
              <button
                type="button"
                onClick={() => addQuestion('true_false')}
                className="py-4 border-2 border-dashed border-purple-400 rounded-xl text-purple-600 hover:border-purple-600 hover:text-purple-700 transition font-semibold text-sm"
              >
                + Wahr/Falsch
              </button>
              <button
                type="button"
                onClick={() => addQuestion('estimate')}
                className="py-4 border-2 border-dashed border-orange-400 rounded-xl text-orange-600 hover:border-orange-600 hover:text-orange-700 transition font-semibold text-sm"
              >
                + Schätzfrage
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full btn-secondary text-xl py-4 disabled:opacity-50"
          >
            {saving ? 'Speichern...' : 'Quiz speichern'}
          </button>
        </form>
      </main>
    </div>
  )
}
