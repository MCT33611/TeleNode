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

  const [username, setUsername] = useState('');
  const [avatarKey, setAvatarKey] = useState(() => Date.now().toString());

  useEffect(() => {
    getFoldersAction()
      .then(res => {
        setLoading(false);
        if (res.success && res.folders) {
          setFolders(res.folders);
          if (res.username) setUsername(res.username);
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

  const handleDelete = async (hard: boolean = false) => {
    if (!deletingFolderId) return;
    setActionLoading(true);
    const res = await deleteFolderAction(deletingFolderId, hard);
    if (res.success) {
      setFolders(prev => prev.filter(f => f.id !== deletingFolderId));
      setDeletingFolderId('');
      setActionLoading(false);
    } else {
      setActionLoading(false);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-yellow-400">Folders</h2>
        
        <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto">
          <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10">
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
              <Button className="flex-1 sm:flex-none bg-yellow-400 text-zinc-950 hover:bg-yellow-500 font-bold shadow-[0_0_10px_rgba(250,204,21,0.3)]">
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
                  <CardTitle className="text-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-yellow-400/30 overflow-hidden flex items-center justify-center bg-zinc-950 shrink-0">
                      {username && (
                        <img 
                          src={`/api/media/${username}/avatar/${folder.id}?v=${avatarKey}`} 
                          alt={folder.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                             (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder h-5 w-5 text-yellow-400"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>';
                          }}
                        />
                      )}
                    </div>
                    <span className="truncate">{folder.name}</span>
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
        <DialogContent className="bg-zinc-900 border-yellow-400/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-500">
               Delete Folder: {folders.find(f => f.id === deletingFolderId)?.name || '...'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4 text-zinc-300">
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm">
              Are you sure you want to remove this folder from TeleNode? 
            </div>

            <div className="grid grid-cols-1 gap-4">
               <Button 
                 variant="outline" 
                 className="w-full flex flex-col items-start h-auto p-4 gap-1 hover:bg-yellow-400/10 border-yellow-400/20 whitespace-normal text-left"
                 onClick={() => handleDelete(false)}
                 disabled={actionLoading}
               >
                  <span className="font-bold text-yellow-400">Option 1: Soft Delete (Unlink)</span>
                  <span className="text-xs text-zinc-500 leading-relaxed">Only removes it from this dashboard. Local copies are cleared, but your Telegram Channel stays active.</span>
               </Button>

               <Button 
                 variant="destructive" 
                 className="w-full flex flex-col items-start h-auto p-4 gap-1 bg-red-500/10 hover:bg-red-500/20 border-red-500/20 border whitespace-normal text-left"
                 onClick={() => handleDelete(true)}
                 disabled={actionLoading}
               >
                  <span className="font-bold text-red-500">Option 2: Hard Delete (Destroy Channel)</span>
                  <span className="text-xs text-red-400/60 font-mono leading-relaxed">WARNING: This will IRREVERSIBLY destroy the underlying Telegram Channel and all files inside it!</span>
               </Button>
            </div>

            <div className="flex justify-end mt-2">
              <Button variant="ghost" className="hover:bg-zinc-800" onClick={() => setDeletingFolderId('')} disabled={actionLoading}>Cancel</Button>
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
