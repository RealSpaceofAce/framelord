import React, { useState } from 'react';
import AISpirit from './components/AISpirit';
import ChatInterface from './components/ChatInterface';
import { SpiritState } from './types';

const App: React.FC = () => {
  const [spiritState, setSpiritState] = useState<SpiritState>({
    isThinking: false,
    isSpeaking: false,
    emotion: 'neutral'
  });

  return (
    <div className="relative w-full h-screen bg-gray-950 overflow-hidden flex flex-col">
      {/* Background - kept subtle to show off the 3D spirit transparency */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-950 to-black z-0 pointer-events-none" />

      {/* The Spirit Visual Layer - Fully Interactive */}
      <AISpirit state={spiritState} />

      {/* The Chat UI Layer */}
      <ChatInterface setSpiritState={setSpiritState} />
      
      {/* API Key Warning Overlay */}
      {!process.env.API_KEY && (
        <div className="absolute top-0 left-0 w-full bg-red-500/20 text-red-200 text-xs p-1 text-center z-50 backdrop-blur-sm pointer-events-none">
          Warning: API_KEY not detected. Chat response will fail.
        </div>
      )}
    </div>
  );
};

export default App;