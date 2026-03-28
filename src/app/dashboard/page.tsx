'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createFolderAction, linkFolderAction, getFoldersAction, deleteFolderAction, renameFolderAction } from '@/app/actions/folder';
import { Folder, Link as LinkIcon, Plus, Loader2, Trash2, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TeleFolder {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<TeleFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingChannelName, setAddingChannelName] = useState('');
  const [linkingChannelId, setLinkingChannelId] = useState('');
  const [linkingChannelName, setLinkingChannelName] = useState('');
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deletingFolderId, setDeletingFolderId] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState('');
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    getFoldersAction()
      .then(res => {
        setLoading(false);
        if (res.success && res.folders) {
          setFolders(res.folders);
        } else {
          router.push('/login');
        }
      })
      .catch(err => {
        console.error("getFoldersAction err:", err);
        setLoading(false);
      });
  }, [router]);

  const handleCreate = async () => {
    if (!addingChannelName) return;
    setActionLoading(true);
    const res = await createFolderAction(addingChannelName);
    setActionLoading(false);
    if (res.success && res.folder) {
      setFolders(prev => [...prev, res.folder!]);
      setIsCreateOpen(false);
      setAddingChannelName('');
    }
  };

  const handleLink = async () => {
    if (!linkingChannelId || !linkingChannelName) return;
    setActionLoading(true);
    const res = await linkFolderAction(linkingChannelId, linkingChannelName);
    setActionLoading(false);
    if (res.success && res.folder) {
      setFolders(prev => [...prev, res.folder!]);
      setIsLinkOpen(false);
      setLinkingChannelId('');
      setLinkingChannelName('');
    }
  };

  const handleDelete = async () => {
    if (!deletingFolderId) return;
    setActionLoading(true);
    const res = await deleteFolderAction(deletingFolderId);
    setActionLoading(false);
    if (res.success) {
      setFolders(prev => prev.filter(f => f.id !== deletingFolderId));
      setDeletingFolderId('');
    } else {
      alert("Failed to delete folder: " + res.error);
    }
  };

  const handleRename = async () => {
    if (!renamingFolderId || !renameValue) return;
    setActionLoading(true);
    const res = await renameFolderAction(renamingFolderId, renameValue);
    setActionLoading(false);
    if (res.success) {
      setFolders(prev => prev.map(f => f.id === renamingFolderId ? { ...f, name: renameValue } : f));
      setRenamingFolderId('');
    } else {
      alert("Failed to rename folder: " + res.error);
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-4">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-yellow-400">Folders</h2>
        
        <div className="flex gap-4">
          <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10">
                <LinkIcon className="mr-2 h-4 w-4" /> Link Channel
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-yellow-400/50">
              <DialogHeader>
                <DialogTitle className="text-yellow-400">Link Existing Channel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input placeholder="TeleNode Name (e.g., Photos)" value={linkingChannelName} onChange={e => setLinkingChannelName(e.target.value)} className="bg-zinc-800" />
                <Input placeholder="Channel ID or Username" value={linkingChannelId} onChange={e => setLinkingChannelId(e.target.value)} className="bg-zinc-800" />
                <Button onClick={handleLink} disabled={actionLoading} className="w-full bg-yellow-400 text-zinc-950 font-bold hover:bg-yellow-500">
                  {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Link'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-yellow-400 text-zinc-950 hover:bg-yellow-500 font-bold shadow-[0_0_10px_rgba(250,204,21,0.3)]">
                <Plus className="mr-2 h-4 w-4" /> New Folder
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-yellow-400/50">
              <DialogHeader>
                <DialogTitle className="text-yellow-400">Create New Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input placeholder="Folder Name" value={addingChannelName} onChange={e => setAddingChannelName(e.target.value)} className="bg-zinc-800" />
                <p className="text-sm text-zinc-400">This will create a new Telegram broadcast channel automatically.</p>
                <Button onClick={handleCreate} disabled={actionLoading} className="w-full bg-yellow-400 text-zinc-950 font-bold hover:bg-yellow-500">
                  {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {folders.map((folder, index) => (
            <motion.div
              key={folder.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer"
              onClick={() => router.push(`/folder/${folder.id}`)}
            >
              <Card className="border-yellow-400/20 bg-zinc-900/50 hover:border-yellow-400/60 transition-colors h-full flex flex-col glow-border group relative">
                <CardHeader>
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setRenameValue(folder.name); setRenamingFolderId(folder.id); }} className="p-1 px-2 text-zinc-500 hover:text-yellow-400 transition-colors rounded hover:bg-zinc-800"><Edit className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); setDeletingFolderId(folder.id); }} className="p-1 px-2 text-zinc-500 hover:text-red-500 transition-colors rounded hover:bg-zinc-800"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Folder className="h-5 w-5 text-yellow-400" />
                    {folder.name}
                  </CardTitle>
                </CardHeader>
                <CardFooter className="mt-auto">
                  <p className="text-xs text-zinc-500 font-mono">ID: {folder.id}</p>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
          
          {folders.length === 0 && (
            <div className="col-span-full h-40 flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-lg text-zinc-500">
              No folders found. Create or link a channel to begin.
            </div>
          )}
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingFolderId} onOpenChange={(open) => !open && setDeletingFolderId('')}>
        <DialogContent className="bg-zinc-900 border-red-500/50">
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4 text-zinc-300">
            <p>Are you absolutely sure?</p>
            <p className="text-xs text-zinc-500 bg-red-500/10 p-2 rounded border border-red-500/20">
              WARNING: This is a <b>HARD DELETE</b>. This action will completely and irreversibly destroy the underlying Telegram Channel and all media inside it!
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="ghost" className="hover:bg-zinc-800" onClick={() => setDeletingFolderId('')} disabled={actionLoading}>Cancel</Button>
              <Button variant="destructive" className="bg-red-500 hover:bg-red-600 font-bold" onClick={handleDelete} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Delete Channel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renamingFolderId} onOpenChange={(open) => !open && setRenamingFolderId('')}>
        <DialogContent className="bg-zinc-900 border-yellow-400/50">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input 
              placeholder="New Folder Name" 
              value={renameValue} 
              onChange={e => setRenameValue(e.target.value)} 
              className="bg-zinc-800"
              autoFocus
            />
            <Button onClick={handleRename} disabled={actionLoading} className="w-full bg-yellow-400 text-zinc-950 font-bold hover:bg-yellow-500">
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Rename'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
