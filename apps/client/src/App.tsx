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
  const [organizationId, setOrganizationId] = useState('')
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
        body: JSON.stringify({ 
          question,
          organizationId: organizationId || null
        }),
      })

      const data = await res.json()

      if (data.success) {
        setResponse(data.data)
        // Log analytics if available
        if (data.analytics) {
          console.log('Response analytics:', data.analytics)
        }
      } else {
        // Display specific error information
        const errorDetails = data.errorType ? `${data.errorType}: ${data.error}` : data.error;
        setError(errorDetails);
        console.error('API Error:', data);
      }
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Make sure the API is running on port 8000.')
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
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
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  placeholder="Organization ID (optional)"
                  className="flex-1 p-3 border-2 border-secondary-200 rounded-xl text-secondary-900 placeholder-secondary-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-200"
                  disabled={loading}
                />
                <button
                  onClick={() => setOrganizationId('')}
                  className="px-4 py-3 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-xl transition-colors duration-200"
                  disabled={loading}
                >
                  Clear
                </button>
              </div>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a compliance question... (e.g., 'What are the SOC2 requirements for data encryption?')"
                className="w-full p-4 border-2 border-secondary-200 rounded-2xl text-secondary-900 placeholder-secondary-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-200 resize-none"
                rows={3}
                disabled={loading}
              />
              
              {/* Quick Question Buttons */}
              <div className="space-y-2">
                <p className="text-sm text-secondary-600 font-medium">Quick Questions:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'What frameworks are available?',
                    'NIST cybersecurity framework controls',
                    'SOC2 requirements for data encryption',
                    'ISO 27001 implementation steps',
                    'What reports does Apptega generate?',
                    'CIS controls for cloud security'
                  ].map((quickQuestion) => (
                    <button
                      key={quickQuestion}
                      onClick={() => setQuestion(quickQuestion)}
                      className="px-3 py-1 text-xs bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-full transition-colors duration-200"
                      disabled={loading}
                    >
                      {quickQuestion}
                    </button>
                  ))}
                </div>
              </div>
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
                        <div className="flex items-start space-x-2">
                          <span className="text-xl">❌</span>
                          <div className="flex-1">
                            <div className="font-medium mb-2">Error Details:</div>
                            <div className="text-sm">{error}</div>
                            <div className="text-xs text-error-600 mt-2">
                              💡 Check the browser console for more technical details
                            </div>
                          </div>
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
                  <ol className="space-y-2 text-primary-700 list-decimal list-inside">
                    {response.technicalDetails.map((detail, index) => (
                      <li key={index} className="leading-relaxed">
                        {detail}
                      </li>
                    ))}
                  </ol>
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
