import React, { useState } from 'react';
import { X, Key, Moon, Sun, Trash2, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, profile, updateProfile } = useAuth();
  const [apiKey, setApiKey] = useState(profile?.openaiApiKey || '');
  const [theme, setTheme] = useState<'light' | 'dark'>(profile?.theme || 'dark');
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ openaiApiKey: apiKey, theme });
      onClose();
    } catch (error) {
      console.error('Failed to save settings', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearHistory = async () => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete all your chat history? This cannot be undone.')) return;
    
    setIsClearing(true);
    try {
      const q = query(collection(db, 'chats'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(async (chatDoc) => {
        // Delete messages subcollection first
        const messagesQ = query(collection(db, `chats/${chatDoc.id}/messages`));
        const messagesSnap = await getDocs(messagesQ);
        const msgDeletes = messagesSnap.docs.map(msgDoc => deleteDoc(msgDoc.ref));
        await Promise.all(msgDeletes);
        
        // Delete chat document
        return deleteDoc(chatDoc.ref);
      });
      
      await Promise.all(deletePromises);
      alert('Chat history cleared successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'chats');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Settings</h2>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <Key size={16} />
              OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-zinc-100"
            />
            <p className="text-xs text-zinc-500">Your API key is stored securely in your profile and used for generating responses.</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              Theme
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('light')}
                className={clsx(
                  "flex-1 py-2 text-sm rounded-md border transition-colors",
                  theme === 'light' ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100" : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={clsx(
                  "flex-1 py-2 text-sm rounded-md border transition-colors",
                  theme === 'dark' ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100" : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                Dark
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={handleClearHistory}
              disabled={isClearing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
              {isClearing ? 'Clearing...' : 'Clear Chat History'}
            </button>
          </div>
        </div>

        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
