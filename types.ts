
export type MessageRole = 'user' | 'model';

export interface MessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface Message {
  role: MessageRole;
  parts: MessagePart[];
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}
