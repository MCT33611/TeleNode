import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cookies } from 'next/headers';
import UserProfile from '@/components/UserProfile';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TeleNode',
  description: 'Telegram MTProto Database & Storage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const username = cookies().get('tele_user')?.value;

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen flex flex-col items-center bg-zinc-950`}>
        <header className="w-full max-w-5xl px-6 py-4 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center font-bold text-zinc-950 text-xl shadow-[0_0_15px_rgba(250,204,21,0.5)]">
              TN
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-200">
              Tele<span className="text-yellow-400">Node</span>
            </h1>
            {username && <UserProfile username={username} />}
          </div>
        </header>
        <main className="w-full max-w-5xl px-6 py-8 flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
