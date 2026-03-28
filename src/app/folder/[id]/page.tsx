'use client';

export const maxDuration = 60;

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, Reorder } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getRecordsAction, createRecordAction, deleteRecordAction, editRecordAction, transferRecordAction } from '@/app/actions/record';
import { updateFolderPhotoAction, getFoldersAction } from '@/app/actions/folder';
import { 
  Loader2, Plus, Trash2, ArrowLeft, Edit, Camera, Download, ExternalLink,
  File as FileIcon, FileText, FileSpreadsheet, FileArchive, FileAudio, FileVideo, Image as ImageIcon
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-10 w-10 text-blue-400" />;
  if (mimeType.startsWith('video/')) return <FileVideo className="h-10 w-10 text-purple-400" />;
  if (mimeType.startsWith('audio/')) return <FileAudio className="h-10 w-10 text-pink-400" />;
  if (mimeType.includes('pdf')) return <FileText className="h-10 w-10 text-red-400" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return <FileSpreadsheet className="h-10 w-10 text-green-400" />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return <FileArchive className="h-10 w-10 text-orange-400" />;
  return <FileIcon className="h-10 w-10 text-zinc-500" />;
};

export default function FolderPage() {
  const params = useParams();
  const folderId = decodeURIComponent(params.id as string);

  const [records, setRecords] = useState<any[]>([]);
  const [folderName, setFolderName] = useState('Folder');
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [folders, setFolders] = useState<any[]>([]);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferRecord, setTransferRecord] = useState<any>(null);
  
  const [avatarKey, setAvatarKey] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    setAvatarKey(Date.now().toString());
  }, []);

  // Form State
  const [files, setFiles] = useState<File[]>([]);
  const [recordId, setRecordId] = useState(() => typeof crypto !== 'undefined' ? crypto.randomUUID() : Date.now().toString());
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<{key: string, value: string}[]>([{ key: '', value: '' }]);
  const [error, setError] = useState('');

  // Editing State
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [deletedMediaIds, setDeletedMediaIds] = useState<number[]>([]);
  const [reorderMediaItems, setReorderMediaItems] = useState<any[]>([]);

  useEffect(() => {
    if (files.length > 0 && !title) {
      setTitle(files[0].name);
    }
  }, [files]);

  const fetchRecords = async () => {
    setLoading(true);
    const res = await getRecordsAction(folderId);
    if (res.success) {
      setRecords(res.records || []);
      if (res.folderName) setFolderName(res.folderName);
      if (res.username) setUsername(res.username);
    }
    setLoading(false);
  };

  const fetchFolders = async () => {
    const res = await getFoldersAction();
    if (res.success && res.folders) {
      setFolders(res.folders.filter((f: any) => f.id !== folderId));
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchFolders();
  }, [folderId]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const avatarFile = e.target.files?.[0];
    if (!avatarFile) return;

    try {
      setActionLoading(true);
      const resizedBlob: Blob = await new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(avatarFile);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('No context');
          
          const scale = Math.max(512 / img.width, 512 / img.height);
          const x = (512 / scale - img.width) / 2;
          const y = (512 / scale - img.height) / 2;
          
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, 512, 512);
          ctx.scale(scale, scale);
          ctx.drawImage(img, x, y);
          canvas.toBlob((blob) => blob ? resolve(blob) : reject('Blob fail'), 'image/jpeg', 0.95);
        };
        img.onerror = reject;
        img.src = url;
      });

      const fd = new FormData();
      fd.append('file', new File([resizedBlob], "avatar.jpeg", { type: 'image/jpeg' }));
      const res = await updateFolderPhotoAction(folderId, fd);
      if (res.success) {
        setTimeout(() => setAvatarKey(Date.now().toString()), 1500);
      } else {
        alert("Failed to update folder avatar: " + res.error);
      }
    } catch(err) {
      console.error(err);
      alert("Error parsing image");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreate = async () => {
    setError('');
    if (files.length === 0) {
      setError('A media file is required.');
      return;
    }
    if (files.length > 10) {
      setError('Telegram limits a single record album to a maximum of 10 media files. Please upload fewer files.');
      return;
    }

    const payload: any = {
      id: recordId,
      title: title || files[0].name,
    };
    
    for (const f of fields) {
      if (f.key.trim()) payload[f.key.trim()] = f.value;
    }

    const compiledJson = JSON.stringify(payload);

    setActionLoading(true);
    const formData = new FormData();
    files.forEach(f => formData.append('file', f));
    formData.append('jsonData', compiledJson);

    const res = await createRecordAction(folderId, formData);
    setActionLoading(false);
    
    if (res.success) {
      setIsAddOpen(false);
      setFiles([]);
      setTitle('');
      setRecordId(typeof crypto !== 'undefined' ? crypto.randomUUID() : Date.now().toString());
      setFields([{ key: '', value: '' }]);
      fetchRecords(); // Refresh exactly
    } else {
      setError(res.error || 'Failed to create record');
    }
  };

  const handleEditOpen = (record: any) => {
    setEditingRecord(record);
    const initialFields = [];
    for (const key of Object.keys(record.data)) {
      if (key !== 'id' && key !== 'title') {
         const val = record.data[key];
         const valStr = (typeof val === 'object') ? JSON.stringify(val) : String(val);
         initialFields.push({ key, value: valStr });
      }
    }
    if (initialFields.length === 0) initialFields.push({ key: '', value: '' });

    setFields(initialFields);
    setRecordId(record.data.id || record.id);
    setTitle(record.data.title || '');
    setDeletedMediaIds([]);
    setReorderMediaItems(record.mediaItems || []);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async () => {
    setError('');
    
    // Calculate the custom media order by grabbing remaining IDs in their current sorted sequence
    const currentOrder = reorderMediaItems
      .filter(item => !deletedMediaIds.includes(item.msgId))
      .map(item => item.msgId);

    const payload: any = {
      id: recordId,
      title: title,
      mediaOrder: currentOrder // persist the drag-and-drop sequence
    };
    for (const f of fields) {
      if (f.key.trim()) {
        try {
          // Attempt to restore objects/arrays if they were native
          payload[f.key.trim()] = JSON.parse(f.value);
        } catch {
          payload[f.key.trim()] = f.value;
        }
      }
    }
    const compiledJson = JSON.stringify(payload);

    setActionLoading(true);
    const res = await editRecordAction(folderId, editingRecord.captionMsgId, compiledJson, deletedMediaIds, editingRecord.msgIds);
    setActionLoading(false);

    if (res.success) {
      setIsEditOpen(false);
      fetchRecords(); // re-fetch to reflect deletions
    } else {
      setError(res.error || 'Failed to edit record');
    }
  };

  const handleDelete = async (recordId: number, msgIds: number[]) => {
    if (!confirm('Delete this record entirely?')) return;
    const res = await deleteRecordAction(folderId, msgIds);
    if (res.success) {
      setRecords(prev => prev.filter(r => r.id !== recordId));
    }
  };

  const handleDownloadAll = async (record: any) => {
    if (!record.mediaUrls || record.mediaUrls.length === 0) return;
    for (let i = 0; i < record.mediaUrls.length; i++) {
       try {
         const res = await fetch(record.mediaUrls[i]);
         const blob = await res.blob();
         const link = document.createElement('a');
         link.href = URL.createObjectURL(blob);
         link.download = `telenode_${record.id}_media_${i+1}.jpeg`;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         URL.revokeObjectURL(link.href);
         await new Promise(r => setTimeout(r, 200));
       } catch (err) { console.error("Download failed", err); }
    }
  };

  const handleTransferSubmit = async (isMove: boolean) => {
    if (!transferTargetId || !transferRecord) return;
    setActionLoading(true);
    const res = await transferRecordAction(folderId, transferTargetId, transferRecord.msgIds, isMove);
    setActionLoading(false);
    
    if (res.success) {
      setIsTransferOpen(false);
      if (isMove) {
        setRecords(prev => prev.filter(r => r.id !== transferRecord.id));
      }
    } else {
       alert("Failed to transfer: " + res.error);
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-4">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="hover:text-yellow-400" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          
          <div className="relative group cursor-pointer inline-block">
            {username && avatarKey && (
              <img 
                src={`/api/media/${username}/avatar/${folderId}?v=${avatarKey}`} 
                alt="Folder Avatar"
                className="w-12 h-12 rounded-full border border-yellow-400/30 object-cover"
                onError={(e) => { e.currentTarget.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' }}
              />
            )}
            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-5 h-5 text-yellow-400" />
            </div>
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-yellow-400">{folderName}</h2>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-yellow-400 text-zinc-950 font-bold hover:bg-yellow-500 shadow-[0_0_10px_rgba(250,204,21,0.3)]">
              <Plus className="mr-2 h-4 w-4" /> Add Record
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-yellow-400/50">
            <DialogHeader>
              <DialogTitle className="text-yellow-400">New Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {error && <div className="text-destructive text-sm bg-destructive/20 p-2 rounded">{error}</div>}
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Media Files (Albums Supported)</label>
                <Input type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} className="bg-zinc-800 text-zinc-200 border-zinc-700" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Record ID</label>
                  <Input value={recordId} readOnly className="bg-zinc-950 text-zinc-500 font-mono border-zinc-800 focus-visible:ring-0" />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Title</label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Auto-filled from file" className="bg-zinc-800 text-zinc-200 border-zinc-700" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-zinc-400 block">Custom Properties</label>
                  <Button variant="ghost" size="sm" onClick={() => setFields([...fields, {key: '', value: ''}])} className="h-6 text-xs text-yellow-500 hover:bg-yellow-400/10">
                    <Plus className="h-3 w-3 mr-1"/> Add Field
                  </Button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {fields.map((field, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input placeholder="Key" value={field.key} onChange={e => {
                        const newF = [...fields]; newF[idx].key = e.target.value; setFields(newF);
                      }} className="bg-zinc-800 text-zinc-200 font-mono text-sm border-zinc-700" />
                      <Input placeholder="Value" value={field.value} onChange={e => {
                        const newF = [...fields]; newF[idx].value = e.target.value; setFields(newF);
                      }} className="bg-zinc-800 text-zinc-200 text-sm border-zinc-700" />
                      <Button variant="ghost" size="icon" onClick={() => {
                        setFields(fields.filter((_, i) => i !== idx));
                      }} className="text-zinc-500 hover:text-destructive hover:bg-destructive/20 h-9 w-9 shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {fields.length === 0 && <p className="text-xs text-zinc-500 italic">No custom properties.</p>}
                </div>
              </div>
              <Button onClick={handleCreate} disabled={actionLoading} className="w-full bg-yellow-400 text-zinc-950 font-bold hover:bg-yellow-500 mt-2">
                {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Upload Record'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
        </div>
      ) : (
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {records.map((record, index) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-zinc-800 bg-zinc-900 overflow-hidden flex flex-col h-full hover:border-yellow-400/50 transition-colors duration-300">
                  <div className="h-40 bg-zinc-950 flex flex-col items-center justify-center border-b border-zinc-800 relative group overflow-hidden">
                    {record.mediaItems && record.mediaItems.length > 0 ? (
                      record.mediaItems[0].mimeType.startsWith('image/') ? (
                        <img src={record.mediaItems[0].url} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                           {getFileIcon(record.mediaItems[0].mimeType)}
                           <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[150px]">{record.mediaItems[0].fileName}</span>
                        </div>
                      )
                    ) : (
                      <FileIcon className="h-10 w-10 text-zinc-700 group-hover:text-yellow-400/50 transition-colors" />
                    )}
                    {record.mediaUrls && record.mediaUrls.length > 1 && (
                      <span className="absolute top-2 right-2 text-xs text-zinc-950 font-bold bg-yellow-400 px-2 rounded-full shadow">+ {record.mediaUrls.length - 1}</span>
                    )}
                  </div>
                  <CardHeader className="p-4 flex-1">
                    <CardTitle className="text-lg text-zinc-200">
                      Record #{record.id}
                    </CardTitle>
                    <div className="text-xs text-zinc-500 mb-2">
                       {new Date(record.date * 1000).toLocaleString()}
                    </div>
                    <div className="bg-zinc-950 p-3 rounded text-xs font-mono text-zinc-400 overflow-auto max-h-32">
                      <pre>{JSON.stringify(record.data, null, 2)}</pre>
                    </div>
                  </CardHeader>
                  <CardFooter className="p-4 pt-0 justify-end gap-2 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={() => handleDownloadAll(record)} className="text-zinc-500 hover:text-green-400 hover:bg-green-400/10" disabled={!record.hasMedia}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setTransferRecord(record); setIsTransferOpen(true); }} className="text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditOpen(record)} className="text-zinc-500 hover:text-yellow-400 hover:bg-yellow-400/10">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(record.id, record.msgIds)} className="text-destructive hover:text-white hover:bg-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}

            {records.length === 0 && (
              <div className="col-span-full h-40 flex items-center justify-center border border-dashed border-zinc-800 rounded-lg text-zinc-500">
                No records here yet. Add a new record to get started.
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Edit Form Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-zinc-900 border-yellow-400/50 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Edit Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {error && <div className="text-destructive text-sm bg-destructive/20 p-2 rounded">{error}</div>}
            
            {editingRecord && reorderMediaItems && reorderMediaItems.length > 0 && (
              <div>
                 <label className="text-sm text-zinc-400 mb-2 block">Media Content (Drag to reorder)</label>
                 <Reorder.Group 
                   axis="x" 
                   values={reorderMediaItems} 
                   onReorder={setReorderMediaItems}
                   className="flex flex-wrap gap-2 pb-2"
                 >
                    {reorderMediaItems.map((mItem: any) => {
                      const isDeleted = deletedMediaIds.includes(mItem.msgId);
                      if (isDeleted) return null;
                      return (
                        <Reorder.Item 
                          key={mItem.msgId} 
                          value={mItem}
                          className="relative w-24 h-24 shrink-0 group rounded overflow-hidden border border-zinc-800 bg-zinc-950 flex items-center justify-center cursor-grab active:cursor-grabbing" 
                          title={`${mItem.fileName} (Drag to reorder)`}
                        >
                          {mItem.mimeType.startsWith('image/') ? (
                             <img src={mItem.url} alt="sub item" className="w-full h-full object-cover pointer-events-none" />
                          ) : (
                             <div className="flex flex-col items-center scale-75 pointer-events-none">
                                {getFileIcon(mItem.mimeType)}
                                <span className="text-[8px] text-zinc-500 font-mono mt-1 break-all text-center px-1">{mItem.fileName}</span>
                             </div>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-auto">
                            <button onClick={(e) => { e.stopPropagation(); setDeletedMediaIds([...deletedMediaIds, mItem.msgId]); }} className="p-2 bg-red-500 rounded-full hover:bg-red-600">
                               <Trash2 className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </Reorder.Item>
                      )
                    })}
                    {reorderMediaItems.every((mItem: any) => deletedMediaIds.includes(mItem.msgId)) && (
                       <div className="text-sm text-zinc-500 italic py-2">All media staged for deletion</div>
                    )}
                 </Reorder.Group>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Record ID</label>
                <Input value={recordId} readOnly className="bg-zinc-950 text-zinc-500 font-mono border-zinc-800 focus-visible:ring-0" />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Title</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-zinc-800 text-zinc-200 border-zinc-700" />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-zinc-400 block">Custom Properties</label>
                <Button variant="ghost" size="sm" onClick={() => setFields([...fields, {key: '', value: ''}])} className="h-6 text-xs text-yellow-500 hover:bg-yellow-400/10">
                  <Plus className="h-3 w-3 mr-1"/> Add Field
                </Button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {fields.map((field, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input placeholder="Key" value={field.key} onChange={e => {
                      const newF = [...fields]; newF[idx].key = e.target.value; setFields(newF);
                    }} className="bg-zinc-800 text-zinc-200 font-mono text-sm border-zinc-700" />
                    <Input placeholder="Value" value={field.value} onChange={e => {
                      const newF = [...fields]; newF[idx].value = e.target.value; setFields(newF);
                    }} className="bg-zinc-800 text-zinc-200 text-sm border-zinc-700" />
                    <Button variant="ghost" size="icon" onClick={() => {
                      setFields(fields.filter((_, i) => i !== idx));
                    }} className="text-zinc-500 hover:text-destructive hover:bg-destructive/20 h-9 w-9 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {fields.length === 0 && <p className="text-xs text-zinc-500 italic">No custom properties.</p>}
              </div>
            </div>
            <Button onClick={handleEditSubmit} disabled={actionLoading} className="w-full bg-yellow-400 text-zinc-950 font-bold hover:bg-yellow-500 mt-2">
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Transfer Form Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="bg-zinc-900 border-yellow-400/50">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Transfer Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
             <label className="text-sm text-zinc-400 mb-1 block">Destination Folder</label>
             <select 
               className="w-full bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-md p-2 h-10 outline-none focus:border-yellow-400 transition-colors"
               value={transferTargetId}
               onChange={(e) => setTransferTargetId(e.target.value)}
             >
                <option value="" disabled>Select a folder...</option>
                {folders.map(f => (
                   <option key={f.id} value={f.id}>{f.name}</option>
                ))}
             </select>
             
             {folders.length === 0 && <p className="text-xs text-red-400">No other folders available. Create one in Dashboard.</p>}

             <div className="grid grid-cols-2 gap-4 mt-6 pt-4">
                <Button onClick={() => handleTransferSubmit(false)} disabled={actionLoading || !transferTargetId} className="w-full bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 hover:text-white">
                  <ExternalLink className="mr-2 h-3.5 w-3.5" /> Copy Explicitly
                </Button>
                <Button onClick={() => handleTransferSubmit(true)} disabled={actionLoading || !transferTargetId} className="w-full bg-yellow-400 text-zinc-950 font-bold hover:bg-yellow-500">
                  {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><ExternalLink className="mr-2 h-3.5 w-3.5" /> Move Entirely</>}
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
