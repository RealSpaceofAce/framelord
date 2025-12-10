import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageRole, SpiritState } from '../types';
import { generateResponse } from '../services/geminiService';

interface ChatInterfaceProps {
  setSpiritState: React.Dispatch<React.SetStateAction<SpiritState>>;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ setSpiritState }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: MessageRole.MODEL, text: 'I am here. We are connected.', timestamp: Date.now() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      text: inputText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    
    // Update Spirit State
    setSpiritState(prev => ({ ...prev, isThinking: true }));

    // Prepare history for API
    const history = messages.map(m => ({
        role: m.role === MessageRole.USER ? 'user' : 'model',
        parts: [{ text: m.text }]
    }));

    try {
      const responseText = await generateResponse(userMsg.text, history);
      
      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.MODEL,
        text: responseText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
       console.error(error);
    } finally {
      setIsLoading(false);
      setSpiritState(prev => ({ ...prev, isThinking: false }));
    }
  };

  return (
    <div className="relative z-10 flex flex-col h-full pointer-events-none">
      {/* Spacer to keep the center orb visible initially or during idle */}
      <div className="flex-grow min-h-[40vh] md:min-h-[50vh] transition-all duration-500">
        {/* The orb lives behind here */}
      </div>

      {/* Chat Area - Glassmorphism */}
      <div className="flex-1 flex flex-col justify-end p-4 md:p-6 w-full max-w-2xl mx-auto pointer-events-auto">
        <div className="space-y-4 mb-4 overflow-y-auto max-h-[40vh] pr-2 mask-linear-fade">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 backdrop-blur-md border border-white/10 shadow-lg text-sm md:text-base transition-all duration-300 ${
                  msg.role === MessageRole.USER
                    ? 'bg-blue-600/30 text-white rounded-br-none'
                    : 'bg-white/10 text-gray-100 rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-white/5 backdrop-blur-md rounded-2xl rounded-bl-none px-4 py-3 flex gap-1">
                 <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-0"></div>
                 <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-100"></div>
                 <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-200"></div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
          <div className="relative flex items-center bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-full p-1.5">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Speak to the entity..."
              className="flex-grow bg-transparent text-white px-4 py-2 focus:outline-none placeholder-gray-400 text-sm md:text-base"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
