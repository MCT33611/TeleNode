'use client';

import { useState } from 'react';
import { UserCircle, Copy, Check } from 'lucide-react';

export default function CopyUsername({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(username);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className="ml-4 pl-4 border-l border-zinc-700 flex items-center gap-2 text-zinc-400 font-mono text-sm">
      <UserCircle className="w-4 h-4 text-yellow-400" />
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
      {username}
    </span>
  );
}
