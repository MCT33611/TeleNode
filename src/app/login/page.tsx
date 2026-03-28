'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { sendCodeAction, signInAction } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | 'code'>('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [username, setUsername] = useState('');
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !apiId || !apiHash || !phone) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    const res = await sendCodeAction(phone, parseInt(apiId), apiHash);
    setLoading(false);

    if (res.success) {
      setStep('code');
    } else {
      setError(res.error || 'Failed to send code');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!code) {
      setError('Please enter the code');
      return;
    }

    setLoading(true);
    const res = await signInAction(phone, code, username);
    setLoading(false);

    if (res.success) {
      router.push('/dashboard');
    } else {
      setError(res.error || 'Failed to sign in');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-yellow-400/50 glow-border bg-zinc-900/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center gradient-text">
              Connect Telegram
            </CardTitle>
            <CardDescription className="text-center text-zinc-400">
              {step === 'credentials' ? 'Enter API details from my.telegram.org' : 'Enter the OTP code sent to your Telegram app'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-destructive/20 text-destructive-foreground p-3 rounded-md mb-4 text-sm border border-destructive/50">
                {error}
              </div>
            )}

            {step === 'credentials' ? (
              <form id="creds-form" onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username">Username (Profile Alias)</Label>
                  <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="alias_name" className="bg-zinc-950 border-zinc-800" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="apiId">API ID</Label>
                  <Input id="apiId" value={apiId} onChange={e => setApiId(e.target.value)} placeholder="123456" className="bg-zinc-950 border-zinc-800" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="apiHash">API Hash</Label>
                  <Input id="apiHash" value={apiHash} onChange={e => setApiHash(e.target.value)} placeholder="abcdef123456" className="bg-zinc-950 border-zinc-800" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1234567890" className="bg-zinc-950 border-zinc-800" />
                </div>
              </form>
            ) : (
              <form id="code-form" onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code">OTP Code</Label>
                  <Input id="code" value={code} onChange={e => setCode(e.target.value)} placeholder="12345" className="bg-zinc-950 border-zinc-800 tracking-widest text-lg py-6 text-center shadow-[0_0_10px_rgba(250,204,21,0.2)_inset]" />
                </div>
              </form>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              form={step === 'credentials' ? 'creds-form' : 'code-form'} 
              disabled={loading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-semibold"
            >
              {loading ? 'Processing...' : step === 'credentials' ? 'Send Code' : 'Sign In'}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
