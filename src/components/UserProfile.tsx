'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, UserCircle, LogOut } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';

export default function UserProfile({ username }: { username: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [avatarKey, setAvatarKey] = useState('');

  useEffect(() => {
    setAvatarKey(Date.now().toString());
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(username);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 text-zinc-400 font-mono text-sm ml-0 pl-0 border-l-0 sm:ml-4 sm:pl-4 sm:border-l border-zinc-700">
      <div className="relative w-8 h-8 rounded-full overflow-hidden border border-zinc-700 hover:border-yellow-400 transition-colors flex items-center justify-center bg-zinc-900 border-2 shrink-0">
        {avatarKey && (
          <img 
            src={`/api/media/${username}/profile?k=${avatarKey}`} 
            alt="Profile"
            className="w-full h-full object-cover"
            onError={(e) => {
               (e.target as HTMLImageElement).style.display = 'none';
               // @ts-ignore
               (e.target as any).nextSibling.style.display = 'block';
            }}
          />
        )}
        <UserCircle className="w-5 h-5 text-yellow-500 absolute hidden" />
      </div>
      
      <div className="hidden sm:flex items-center gap-2">
        <button 
          onClick={copyToClipboard} 
          className="p-1 hover:bg-yellow-400/10 rounded transition-colors group"
          title="Copy Username"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-zinc-500 group-hover:text-yellow-400" />
          )}
        </button>
        <span className="truncate max-w-[120px]">{username}</span>
      </div>

      <button 
        onClick={async () => {
          await logoutAction();
          router.push('/login');
        }} 
        className="p-1 hover:bg-red-500/10 rounded transition-colors group"
        title="Disconnect Session"
      >
        <LogOut className="w-4 h-4 text-zinc-600 group-hover:text-red-400" />
      </button>
    </div>
  );
}
