import { useState } from 'react';
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from './types/chat';
import { SendHorizontal } from 'lucide-react';

import {example} from './assets/example';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [history, setHistory] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const [processingTime, setProcessingTime] = useState<string>('');
  const [metadata, setMetadata] = useState<{
    dataSources: string[];
    complianceFrameworks: string[];
    organizationContext: boolean;
  }>({
    dataSources: [],
    complianceFrameworks: [],
    organizationContext: false,
  });

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-200 text-slate-800 p-2 gap-4">
    <header className="text-2xl font-bold">
      <h1>Compliance Chatbot</h1>
    </header>
    <main className="flex flex-col flex-1 w-full bg-white py-6 px-4 rounded-lg max-w-7xl overflow-hidden min-h-0 w-container">
      <div className="markdown pb-6 flex-1 overflow-y-auto min-h-0 rounded-lg">
        {/* {messages.length === 0 ? (
        <p className="text-gray-500">No messages yet.</p>
      ) : (
        <ul>
          {messages.map((m) => (
            <li key={m.id} className="mb-2">
              <strong>{m.role}:</strong> {m.content}
            </li>
          ))}
        </ul>
      )} */}

      <Markdown remarkPlugins={[remarkGfm]}>{example}</Markdown>
      </div>
      <div className="flex-none flex flex-row gap-2 pt-6">
        <input type="text" placeholder="What information are you looking for today?" className="w-full p-2 rounded-lg border border-slate-300 outline-0" />
        <button className="bg-blue-500 text-white p-2 rounded-lg"><SendHorizontal /></button>
      </div>
    </main>
    <footer>
      <p>Hackathon 2025 Team 4</p>
    </footer>
    </div>
  )
}

export default App
