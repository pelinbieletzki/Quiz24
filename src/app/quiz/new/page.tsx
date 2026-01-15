'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface QuestionInput {
  question_text: string
  answers: string[]
  correct_index: number
}

export default function NewQuiz() {
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<QuestionInput[]>([
    { question_text: '', answers: ['', '', '', ''], correct_index: 0 }
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

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { question_text: '', answers: ['', '', '', ''], correct_index: 0 }
    ])
  }

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return
    setQuestions(questions.filter((_, i) => i !== index))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      alert('Bitte gib einen Titel ein')
      return
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question_text.trim()) {
        alert(`Frage ${i + 1} hat keinen Text`)
        return
      }
      const emptyAnswers = questions[i].answers.filter(a => !a.trim())
      if (emptyAnswers.length > 0) {
        alert(`Frage ${i + 1} hat leere Antworten`)
        return
      }
    }

    setSaving(true)

    try {
      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({ title, creator_id: userId })
        .select()
        .single()

      if (quizError) throw quizError

      // Create questions
      const questionsToInsert = questions.map((q, index) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Neues Quiz</h1>
          <a href="/dashboard" className="text-gray-400 hover:text-white transition">
            ← Zurück
          </a>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Quiz Title */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
            <label className="block text-white font-semibold mb-2">Quiz-Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Allgemeinwissen"
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Questions */}
          {questions.map((question, qIndex) => (
            <div
              key={qIndex}
              className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-white">Frage {qIndex + 1}</h3>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    Entfernen
                  </button>
                )}
              </div>

              <input
                type="text"
                value={question.question_text}
                onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                placeholder="Deine Frage..."
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              />

              <div className="grid grid-cols-2 gap-3">
                {question.answers.map((answer, aIndex) => (
                  <div key={aIndex} className="relative">
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => updateAnswer(qIndex, aIndex, e.target.value)}
                      placeholder={`Antwort ${aIndex + 1}`}
                      className={`w-full px-4 py-3 pr-12 rounded-lg border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        question.correct_index === aIndex
                          ? 'bg-green-500/20 border-green-500/50'
                          : 'bg-white/10 border-white/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => updateQuestion(qIndex, 'correct_index', aIndex)}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition ${
                        question.correct_index === aIndex
                          ? 'bg-green-500 text-white'
                          : 'bg-white/20 text-gray-400 hover:bg-white/30'
                      }`}
                      title="Als richtige Antwort markieren"
                    >
                      ✓
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Klicke auf ✓ um die richtige Antwort zu markieren
              </p>
            </div>
          ))}

          {/* Add Question Button */}
          <button
            type="button"
            onClick={addQuestion}
            className="w-full py-4 border-2 border-dashed border-purple-500/50 rounded-xl text-purple-300 hover:border-purple-400 hover:text-purple-200 transition"
          >
            + Weitere Frage hinzufügen
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xl rounded-xl hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50"
          >
            {saving ? 'Speichern...' : 'Quiz speichern'}
          </button>
        </form>
      </div>
    </div>
  )
}
