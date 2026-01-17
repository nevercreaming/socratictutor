
import React, { useState, useRef, useEffect } from 'react';
import { Message, MessagePart } from './types';
import { getGeminiResponse } from './services/gemini';
import { MathDisplay } from './components/MathDisplay';

const SUBJECTS = [
  { id: 'Math', icon: '∑', color: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' },
  { id: 'Physics', icon: '⚛', color: 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100' },
  { id: 'History', icon: '📜', color: 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' },
  { id: 'Literature', icon: '📖', color: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' },
  { id: 'Chemistry', icon: '🧪', color: 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' },
  { id: 'Philosophy', icon: '⚖', color: 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100' }
];

interface TutorMessageContent {
  explanation: string;
  options: string[];
}

const App: React.FC = () => {
  const [subject, setSubject] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [customSubject, setCustomSubject] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const startSession = (subj: string) => {
    setSubject(subj);
    setMessages([{
      role: 'model',
      parts: [{ text: JSON.stringify({ 
        explanation: `I'm ready to help with ${subj}. What are we working on? You can type a question or upload a photo.`, 
        options: [] 
      }) }]
    }]);
  };

  const handleSubjectSelect = (subj: string) => {
    startSession(subj);
  };

  const handleCustomSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSubject.trim()) {
      startSession(customSubject.trim());
      setCustomSubject('');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangeSubject = () => {
    // Direct state reset to ensure responsiveness across all environments
    setSubject(null);
    setMessages([]);
    setInputText('');
    setPreviewImage(null);
    setCustomSubject('');
    setIsLoading(false);
  };

  const handleRestartProblem = () => {
    if (!subject) return;
    setMessages([{
      role: 'model',
      parts: [{ text: JSON.stringify({ 
        explanation: `Let's take a fresh look at this ${subject} problem. What's the initial question?`, 
        options: [] 
      }) }]
    }]);
    setInputText('');
    setPreviewImage(null);
    setIsLoading(false);
  };

  const handleSend = async (forcedText?: string) => {
    const textToUse = forcedText || inputText;
    if (!textToUse.trim() && !previewImage) return;

    const userParts: MessagePart[] = [];
    if (textToUse.trim()) userParts.push({ text: textToUse });
    if (previewImage) {
      userParts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: previewImage.split(',')[1]
        }
      });
    }

    const newUserMessage: Message = { role: 'user', parts: userParts };
    const updatedMessages = [...messages, newUserMessage];
    
    setMessages(updatedMessages);
    setInputText('');
    setPreviewImage(null);
    setIsLoading(true);

    try {
      const tutorData = await getGeminiResponse(updatedMessages, subject || 'General');
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: JSON.stringify(tutorData) }] }]);
    } catch (err) {
      console.error("Gemini Error:", err);
      setMessages(prev => [...prev, { 
        role: 'model', 
        parts: [{ text: JSON.stringify({ 
          explanation: "I'm having a little trouble connecting. Could we try that step again?", 
          options: ["Retry last step", "Start over"] 
        }) }] 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTutorMessage = (jsonStr: string, isLatest: boolean) => {
    try {
      const data: TutorMessageContent = JSON.parse(jsonStr);
      return (
        <div className="space-y-4">
          <div className="serif text-lg text-stone-700">
            <MathDisplay content={data.explanation} />
          </div>
          {isLatest && data.options && data.options.length > 0 && (
            <div className="grid grid-cols-1 gap-2 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {data.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(option)}
                  disabled={isLoading}
                  className="flex items-center gap-3 p-4 text-left bg-white hover:bg-amber-50 border border-stone-200 hover:border-amber-300 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 group"
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-stone-100 border border-stone-200 group-hover:border-amber-400 group-hover:bg-amber-100 flex items-center justify-center text-[10px] font-black text-stone-500 group-hover:text-amber-600 transition-colors">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm font-semibold text-stone-700 group-hover:text-amber-900">{option}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    } catch (e) {
      return <MathDisplay content={jsonStr} />;
    }
  };

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-[#fcfaf7]">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-stone-100 transition-all duration-500">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-6 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-stone-800 mb-2">Socratic Tutor</h1>
            <p className="text-stone-500 serif italic">What shall we learn today?</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mb-8">
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSubjectSelect(s.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border shadow-sm active:scale-95 ${s.color}`}
              >
                <span className="text-2xl">{s.icon}</span>
                <span className="font-bold text-xs">{s.id}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleCustomSubjectSubmit} className="relative group">
            <input
              ref={customInputRef}
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="Or type a custom subject..."
              className="w-full p-4 pr-14 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-stone-50 text-stone-700 transition-all font-medium"
            />
            <button 
              type="submit"
              className="absolute right-2 top-2 bottom-2 px-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-50"
              disabled={!customSubject.trim()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto md:shadow-2xl bg-white overflow-hidden border-x border-stone-100">
      <header className="p-4 md:p-5 border-b bg-white flex items-center justify-between sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="shrink-0 w-9 h-9 md:w-11 md:h-11 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 border border-amber-100">
             <span className="font-bold text-lg">{SUBJECTS.find(s => s.id === subject)?.icon || '✨'}</span>
          </div>
          <div className="truncate">
            <h1 className="text-base md:text-lg font-extrabold text-stone-800 truncate leading-tight">{subject} Tutor</h1>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-[0.1em]">Step-by-Step Logic</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleRestartProblem}
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-50 rounded-full transition-all border border-stone-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Restart
          </button>
          <button 
            onClick={handleChangeSubject}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-stone-800 hover:bg-black rounded-full transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            <span className="hidden xs:inline">New Subject</span>
            <span className="xs:hidden">Switch</span>
          </button>
        </div>
      </header>

      <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-[#fdfbf9]">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-500`}>
            <div className={`max-w-[92%] md:max-w-[85%] rounded-3xl p-5 md:p-7 shadow-sm border ${
              msg.role === 'user' 
                ? 'bg-amber-50 border-amber-200 text-stone-800 rounded-tr-none' 
                : 'bg-white border-stone-200 text-stone-800 rounded-tl-none shadow-md shadow-stone-100'
            }`}>
              {msg.parts.map((part, pIdx) => (
                <div key={pIdx}>
                  {part.inlineData && (
                    <div className="mb-4 overflow-hidden rounded-xl border border-stone-200 shadow-sm">
                      <img 
                        src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                        className="max-w-full h-auto" 
                        alt="Question Input"
                      />
                    </div>
                  )}
                  {part.text && (
                    <div className={msg.role === 'model' ? '' : 'text-stone-800 font-medium'}>
                      {msg.role === 'model' 
                        ? renderTutorMessage(part.text, idx === messages.length - 1)
                        : <MathDisplay content={part.text} />
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Thinking...</span>
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 md:p-5 bg-white border-t border-stone-100 shrink-0">
        {previewImage && (
          <div className="mb-4 relative inline-block animate-in zoom-in duration-200">
            <img src={previewImage} className="h-20 w-auto rounded-xl border-2 border-amber-300 shadow-lg object-cover" alt="Preview" />
            <button 
              onClick={() => setPreviewImage(null)} 
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-xl hover:bg-red-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/></svg>
            </button>
          </div>
        )}
        
        <div className="flex gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-4 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all border border-transparent hover:border-amber-100"
            title="Upload photo of a problem"
          >
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          </button>
          
          <div className="flex-1 relative">
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask a question or explain your reasoning..."
              className="w-full p-4 pr-14 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-stone-50 text-stone-700 resize-none font-medium min-h-[56px] transition-all"
              rows={1}
            />
            <button 
              onClick={() => handleSend()}
              disabled={isLoading || (!inputText.trim() && !previewImage)}
              className="absolute right-2.5 bottom-2.5 p-2.5 bg-amber-500 text-white rounded-xl disabled:bg-stone-300 hover:bg-amber-600 transition-all shadow-md active:scale-95"
            >
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-3 px-2">
          <button 
            onClick={() => handleSend("Can you explain the current concept in more detail?")} 
            className="text-[10px] font-black uppercase tracking-wider text-amber-600 hover:text-amber-700 transition-colors"
          >
            Explain More
          </button>
          <button 
            onClick={() => handleSend("Why is this the next logical step?")} 
            className="text-[10px] font-black uppercase tracking-wider text-stone-400 hover:text-stone-600 transition-colors"
          >
            "Why this step?"
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
