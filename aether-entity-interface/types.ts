export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
}

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
}

export interface SpiritState {
  isThinking: boolean;
  isSpeaking: boolean;
  emotion: 'neutral' | 'excited' | 'contemplative';
}
