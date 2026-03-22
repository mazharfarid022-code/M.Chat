import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Code, FileText, Loader2 } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { clsx } from 'clsx';
import { generateChatResponse, generateImage } from '../services/openai';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

interface ChatAreaProps {
  chatId: string | null;
  currentTool: string | null;
  onChatCreated: (id: string) => void;
}

export function ChatArea({ chatId, currentTool, onChatCreated }: ChatAreaProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${chatId}/messages`);
    });

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !user) return;

    if (!profile?.openaiApiKey) {
      alert('Please configure your OpenAI API Key in Settings first.');
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    let currentChatId = chatId;

    try {
      if (!currentChatId) {
        // Create new chat
        const chatRef = await addDoc(collection(db, 'chats'), {
          userId: user.uid,
          title: userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : ''),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        currentChatId = chatRef.id;
        onChatCreated(currentChatId);
      } else {
        await updateDoc(doc(db, 'chats', currentChatId), {
          updatedAt: serverTimestamp(),
        });
      }

      // Save user message
      await addDoc(collection(db, `chats/${currentChatId}/messages`), {
        chatId: currentChatId,
        userId: user.uid,
        role: 'user',
        content: userMessage,
        createdAt: serverTimestamp(),
        type: 'text',
      });

      if (currentTool === 'image') {
        const imageUrl = await generateImage(userMessage, profile.openaiApiKey);
        await addDoc(collection(db, `chats/${currentChatId}/messages`), {
          chatId: currentChatId,
          userId: user.uid,
          role: 'assistant',
          content: 'Here is your generated image:',
          createdAt: serverTimestamp(),
          type: 'image',
          imageUrl,
        });
      } else {
        // Prepare context
        const contextMessages = messages.map(m => ({ role: m.role, content: m.content }));
        
        // Add system prompt based on tool
        let systemPrompt = "You are a helpful AI assistant.";
        if (currentTool === 'code') systemPrompt = "You are an expert programmer. Provide clean, efficient, and well-commented code.";
        if (currentTool === 'summarize') systemPrompt = "You are an expert summarizer. Provide concise, clear summaries of the provided text.";

        const apiMessages = [
          { role: 'system', content: systemPrompt },
          ...contextMessages,
          { role: 'user', content: userMessage }
        ];

        const responseStream = await generateChatResponse(apiMessages as any, profile.openaiApiKey);
        
        let fullResponse = '';
        const assistantMsgRef = await addDoc(collection(db, `chats/${currentChatId}/messages`), {
          chatId: currentChatId,
          userId: user.uid,
          role: 'assistant',
          content: '',
          createdAt: serverTimestamp(),
          type: 'text',
        });

        // Add a temporary message to local state for streaming
        setMessages(prev => [...prev, { id: assistantMsgRef.id, role: 'assistant', content: '', type: 'text' }]);

        for await (const chunk of responseStream) {
          const content = chunk.choices[0]?.delta?.content || '';
          fullResponse += content;
          
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMsgRef.id ? { ...msg, content: fullResponse, isStreaming: true } : msg
          ));
        }

        // Final save
        await updateDoc(doc(db, `chats/${currentChatId}/messages`, assistantMsgRef.id), {
          content: fullResponse,
        });
        
        // Remove streaming flag
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMsgRef.id ? { ...msg, isStreaming: false } : msg
        ));
      }

    } catch (error: any) {
      console.error('Error generating response:', error);
      alert('Error: ' + (error.message || 'Something went wrong'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRegenerate = async (msgToRegenerate: any) => {
    if (isLoading || !user || !profile?.openaiApiKey || !chatId) return;
    
    // Find the last user message before this assistant message
    const msgIndex = messages.findIndex(m => m.id === msgToRegenerate.id);
    if (msgIndex <= 0) return;
    
    // We'll just resend the context up to the last user message
    const contextMessages = messages.slice(0, msgIndex).map(m => ({ role: m.role, content: m.content }));
    
    setIsLoading(true);
    try {
      let systemPrompt = "You are a helpful AI assistant.";
      if (currentTool === 'code') systemPrompt = "You are an expert programmer. Provide clean, efficient, and well-commented code.";
      if (currentTool === 'summarize') systemPrompt = "You are an expert summarizer. Provide concise, clear summaries of the provided text.";

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...contextMessages
      ];

      const responseStream = await generateChatResponse(apiMessages as any, profile.openaiApiKey);
      
      let fullResponse = '';
      
      // Update the existing message locally to show streaming
      setMessages(prev => prev.map(msg => 
        msg.id === msgToRegenerate.id ? { ...msg, content: '', isStreaming: true } : msg
      ));

      for await (const chunk of responseStream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        
        setMessages(prev => prev.map(msg => 
          msg.id === msgToRegenerate.id ? { ...msg, content: fullResponse, isStreaming: true } : msg
        ));
      }

      // Final save
      await updateDoc(doc(db, `chats/${chatId}/messages`, msgToRegenerate.id), {
        content: fullResponse,
      });
      
      // Remove streaming flag
      setMessages(prev => prev.map(msg => 
        msg.id === msgToRegenerate.id ? { ...msg, isStreaming: false } : msg
      ));
    } catch (error: any) {
      console.error('Error regenerating response:', error);
      alert('Error: ' + (error.message || 'Something went wrong'));
    } finally {
      setIsLoading(false);
    }
  };

  const getToolPlaceholder = () => {
    switch (currentTool) {
      case 'image': return 'Describe the image you want to generate...';
      case 'code': return 'Describe the code you need...';
      case 'summarize': return 'Paste text to summarize...';
      default: return 'Message M Chat...';
    }
  };

  const getToolIcon = () => {
    switch (currentTool) {
      case 'image': return <ImageIcon size={48} className="text-emerald-500 mb-4" />;
      case 'code': return <Code size={48} className="text-emerald-500 mb-4" />;
      case 'summarize': return <FileText size={48} className="text-emerald-500 mb-4" />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-white dark:bg-zinc-950">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          {getToolIcon()}
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            {currentTool === 'image' ? 'Image Generator' : 
             currentTool === 'code' ? 'Code Generator' : 
             currentTool === 'summarize' ? 'Text Summarizer' : 
             'How can I help you today?'}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
            {currentTool === 'image' ? 'Describe an image in detail and AI will generate it for you.' : 
             currentTool === 'code' ? 'Ask for code snippets, debugging help, or architecture advice.' : 
             currentTool === 'summarize' ? 'Paste long articles or documents to get a quick summary.' : 
             'Ask me anything, or select a specific tool from the sidebar.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto w-full">
          {messages.map((msg, index) => (
            <MessageBubble
              key={msg.id || index}
              role={msg.role}
              content={msg.content}
              type={msg.type}
              imageUrl={msg.imageUrl}
              isStreaming={msg.isStreaming}
              onRegenerate={msg.role === 'assistant' && index === messages.length - 1 ? () => handleRegenerate(msg) : undefined}
            />
          ))}
          {isLoading && currentTool === 'image' && (
            <div className="w-full py-6 bg-zinc-50 dark:bg-zinc-900/50">
              <div className="max-w-3xl mx-auto flex gap-4 px-4">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
                  <Loader2 size={18} className="animate-spin" />
                </div>
                <div className="flex items-center text-zinc-500 dark:text-zinc-400 text-sm">
                  Generating image...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="p-4 w-full max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-2 shadow-sm focus-within:ring-1 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getToolPlaceholder()}
            className="w-full max-h-48 min-h-[44px] bg-transparent border-none resize-none px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-0"
            rows={1}
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 mb-0.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors shrink-0"
          >
            {isLoading && currentTool !== 'image' ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <div className="text-center mt-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            M Chat can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>
    </div>
  );
}
