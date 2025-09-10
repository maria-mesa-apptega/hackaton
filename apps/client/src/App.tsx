import { useState } from 'react'
import './App.css'

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
    <div className="App">
      <header className="App-header">
        <h1>🛡️ Apptega Compliance Copilot</h1>
        <p>Ask questions about SOC2, NIST, ISO, and CIS compliance frameworks</p>
        
        <div className="chat-container">
          <div className="input-section">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a compliance question... (e.g., 'What are the SOC2 requirements for data encryption?')"
              className="question-input"
              rows={3}
              disabled={loading}
            />
            <button 
              onClick={askQuestion} 
              disabled={loading || !question.trim()}
              className="ask-button"
            >
              {loading ? '⏳ Asking...' : '🤖 Ask Compliance Copilot'}
            </button>
          </div>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          {response && (
            <div className="response-container">
              <div className="response-section">
                <h3>📋 Executive Summary</h3>
                <p>{response.executiveSummary}</p>
              </div>

              <div className="response-section">
                <h3>🔧 Technical Details</h3>
                <ul>
                  {response.technicalDetails.map((detail, index) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              </div>

              <div className="response-section">
                <h3>🎯 Apptega Actions</h3>
                <ul>
                  {response.apptegaActions.map((action, index) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>

              <div className="response-section disclaimer">
                <h3>⚠️ Disclaimer</h3>
                <p>{response.disclaimer}</p>
              </div>
            </div>
          )}
        </div>

        <div className="info-section">
          <p className="read-the-docs">
            Powered by AWS Bedrock with Claude 3.5 Sonnet • Built for Apptega Hackathon
          </p>
        </div>
      </header>
    </div>
  )
}

export default App
