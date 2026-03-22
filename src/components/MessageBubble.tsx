import React from 'react';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, RefreshCw, User, Bot } from 'lucide-react';

interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'image' | 'code';
  imageUrl?: string;
  onRegenerate?: () => void;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, type = 'text', imageUrl, onRegenerate, isStreaming }: MessageProps) {
  const isUser = role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  if (role === 'system') return null;

  return (
    <div className={clsx("w-full py-6", isUser ? "bg-transparent" : "bg-zinc-50 dark:bg-zinc-900/50")}>
      <div className="max-w-3xl mx-auto flex gap-4 px-4">
        <div className="shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
              <User size={18} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white">
              <Bot size={18} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-4">
          <div className="prose prose-zinc dark:prose-invert max-w-none break-words">
            {type === 'image' && imageUrl ? (
              <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 inline-block">
                <img src={imageUrl} alt="Generated" className="max-w-full h-auto max-h-[512px] object-contain" referrerPolicy="no-referrer" />
                <div className="p-2 bg-zinc-100 dark:bg-zinc-900 flex justify-between items-center">
                  <span className="text-xs text-zinc-500">Generated Image</span>
                  <a href={imageUrl} download="generated-image.png" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:text-emerald-500 font-medium">
                    Download
                  </a>
                </div>
              </div>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="relative group rounded-md overflow-hidden my-4">
                        <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 text-zinc-300 text-xs">
                          <span>{match[1]}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                            className="hover:text-white transition-colors flex items-center gap-1"
                          >
                            <Copy size={12} />
                            Copy code
                          </button>
                        </div>
                        <SyntaxHighlighter
                          {...props}
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, borderRadius: '0 0 0.375rem 0.375rem' }}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code {...props} className={clsx("bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md text-sm font-mono", className)}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {content}
              </ReactMarkdown>
            )}
            
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-zinc-400 animate-pulse align-middle" />
            )}
          </div>

          {!isUser && !isStreaming && (
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleCopy}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Copy message"
              >
                <Copy size={14} />
              </button>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Regenerate response"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
