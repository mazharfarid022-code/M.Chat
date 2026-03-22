import React from 'react';
import { Plus, MessageSquare, Settings, Wrench, Image as ImageIcon, Code, FileText } from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  chats: any[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onSelectTool: (tool: string) => void;
  currentTool: string | null;
}

export function Sidebar({ chats, currentChatId, onSelectChat, onNewChat, onOpenSettings, onSelectTool, currentTool }: SidebarProps) {
  return (
    <div className="w-64 bg-zinc-950 text-zinc-100 flex flex-col h-screen border-r border-zinc-800">
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-md border border-zinc-700 hover:bg-zinc-800 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="text-xs font-semibold text-zinc-500 mb-3 mt-2 px-2 uppercase tracking-wider">
          Tools
        </div>
        <button
          onClick={() => onSelectTool('chat')}
          className={clsx(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            currentTool === 'chat' ? "bg-zinc-800 text-white" : "hover:bg-zinc-800/50 text-zinc-300"
          )}
        >
          <MessageSquare size={16} />
          General Chat
        </button>
        <button
          onClick={() => onSelectTool('image')}
          className={clsx(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            currentTool === 'image' ? "bg-zinc-800 text-white" : "hover:bg-zinc-800/50 text-zinc-300"
          )}
        >
          <ImageIcon size={16} />
          Image Generator
        </button>
        <button
          onClick={() => onSelectTool('code')}
          className={clsx(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            currentTool === 'code' ? "bg-zinc-800 text-white" : "hover:bg-zinc-800/50 text-zinc-300"
          )}
        >
          <Code size={16} />
          Code Generator
        </button>
        <button
          onClick={() => onSelectTool('summarize')}
          className={clsx(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            currentTool === 'summarize' ? "bg-zinc-800 text-white" : "hover:bg-zinc-800/50 text-zinc-300"
          )}
        >
          <FileText size={16} />
          Summarizer
        </button>

        <div className="text-xs font-semibold text-zinc-500 mb-3 mt-6 px-2 uppercase tracking-wider">
          Recent Chats
        </div>
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors truncate text-left",
              currentChatId === chat.id && currentTool === 'chat' ? "bg-zinc-800 text-white" : "hover:bg-zinc-800/50 text-zinc-300"
            )}
          >
            <MessageSquare size={16} className="shrink-0" />
            <span className="truncate">{chat.title || 'New Chat'}</span>
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-zinc-800 space-y-1">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-800 transition-colors text-sm text-zinc-300"
        >
          <Settings size={16} />
          Settings
        </button>
      </div>
    </div>
  );
}
