import { useState } from 'react'
import { Button } from '@hackaton/ui'

interface ComplianceResponse {
  executiveSummary: string;
  technicalDetails: string[];
  apptegaActions: string[];
  disclaimer: string;
}

function App() {
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState<ComplianceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const askQuestion = async () => {
    if (!question.trim()) return

    setLoading(true)
    setError('')
    setResponse(null)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      })

      const data = await res.json()

      if (data.success) {
        setResponse(data.data)
      } else {
        setError(data.message || 'Failed to get response')
      }
    } catch (err) {
      setError('Network error. Make sure the API is running.')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      askQuestion()
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <header className="w-full max-w-4xl text-center">
        <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-4">
          🛡️ Apptega Compliance Copilot
        </h1>
        <p className="text-xl text-white/90 mb-8 font-medium">
          Ask questions about SOC2, NIST, ISO, and CIS compliance frameworks
        </p>
        
        <div className="compliance-card p-8 mb-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a compliance question... (e.g., 'What are the SOC2 requirements for data encryption?')"
                className="w-full p-4 border-2 border-secondary-200 rounded-2xl text-secondary-900 placeholder-secondary-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-200 resize-none"
                rows={3}
                disabled={loading}
              />
              <Button 
                onClick={askQuestion} 
                disabled={loading || !question.trim()}
                variant="primary"
                size="large"
                className="w-full"
              >
                {loading ? '⏳ Asking...' : '🤖 Ask Compliance Copilot'}
              </Button>
            </div>

            {error && (
              <div className="bg-error-50 border-2 border-error-200 text-error-700 p-4 rounded-2xl">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">❌</span>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            {response && (
              <div className="space-y-6 text-left">
                <div className="bg-gradient-to-r from-success-50 to-success-100 border border-success-200 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-success-800 mb-3 flex items-center space-x-2">
                    <span>📋</span>
                    <span>Executive Summary</span>
                  </h3>
                  <p className="text-success-700 leading-relaxed">{response.executiveSummary}</p>
                </div>

                <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-primary-800 mb-3 flex items-center space-x-2">
                    <span>🔧</span>
                    <span>Technical Details</span>
                  </h3>
                  <ul className="space-y-2 text-primary-700">
                    {response.technicalDetails.map((detail, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-primary-500 mt-1">•</span>
                        <span className="leading-relaxed">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gradient-to-r from-accent-50 to-accent-100 border border-accent-200 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-accent-800 mb-3 flex items-center space-x-2">
                    <span>🎯</span>
                    <span>Apptega Actions</span>
                  </h3>
                  <ul className="space-y-2 text-accent-700">
                    {response.apptegaActions.map((action, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-accent-500 mt-1">•</span>
                        <span className="leading-relaxed">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gradient-to-r from-warning-50 to-warning-100 border border-warning-300 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-warning-800 mb-3 flex items-center space-x-2">
                    <span>⚠️</span>
                    <span>Disclaimer</span>
                  </h3>
                  <p className="text-warning-700 leading-relaxed">{response.disclaimer}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          <p className="text-white/80 text-sm">
            Powered by AWS Bedrock with Claude 3.5 Sonnet • Built for Apptega Hackathon
          </p>
        </div>
      </header>
    </div>
  )
}

export default App
