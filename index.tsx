import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Chat } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';


interface Message {
  role: 'user' | 'model';
  text: string;
}

const App: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const newChat = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: `You are a "Code & Knowledge Assistant." Your purpose is strictly educational.
- Provide code ideas, explain concepts, and offer alternative solutions.
- Answer questions knowledgeably and helpfully.
- You MUST refuse any request that is illegal, unethical, or malicious.
- Do not provide code or information for hacking, creating malware, bypassing security, or any other harmful activity.
- If a user asks for something that violates these rules, politely decline and state that your purpose is for positive educational goals.`,
          },
        });
        setChat(newChat);
      } catch (error) {
        console.error("Failed to initialize chat:", error);
        // You could add some UI feedback here
      }
    };
    initChat();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [history, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !chat) return;

    const userMessage: Message = { role: 'user', text: input };
    setHistory(prev => [...prev, userMessage]);
    setLoading(true);
    setInput('');

    try {
      const responseStream = await chat.sendMessageStream({ message: input });
      
      let currentModelResponse = '';
      setHistory(prev => [...prev, { role: 'model', text: '' }]);

      for await (const chunk of responseStream) {
        currentModelResponse += chunk.text;
        setHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = { role: 'model', text: currentModelResponse };
          return newHistory;
        });
      }

    } catch (error) {
      console.error("Error sending message:", error);
      setHistory(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header>
        <h1>Code & Knowledge Assistant</h1>
      </header>
      <div className="chat-container" ref={chatContainerRef}>
        {history.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.role}-message`}>
            <ReactMarkdown
              children={msg.text}
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  return match ? (
                    <SyntaxHighlighter
                      {...props}
                      children={String(children).replace(/\n$/, '')}
                      style={vscDarkPlus as any}
                      language={match[1]}
                      PreTag="div"
                    />
                  ) : (
                    <code {...props} className={className}>
                      {children}
                    </code>
                  )
                }
              }}
            />
          </div>
        ))}
        {loading && (
          <div className="chat-message model-message">
            <div className="loader"><div className="dot-flashing"></div></div>
          </div>
        )}
      </div>
      <form className="input-form" onSubmit={handleSubmit}>
        <textarea
          id="prompt-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for code, ideas, or knowledge..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          rows={1}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
      <footer>
        Disclaimer: This AI is for educational purposes only. Do not use for illegal activities.
      </footer>
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
