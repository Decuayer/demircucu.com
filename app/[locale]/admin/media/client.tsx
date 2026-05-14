"use client";

import { useState, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Image as ImageIcon, 
  FileIcon, 
  Trash2, 
  Upload, 
  Search, 
  Copy,
  ExternalLink,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { MediaFile } from "@prisma/client";
import { deleteMediaFile } from "@/app/actions/media";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdminMediaClientProps {
  initialFiles: MediaFile[];
}

export default function AdminMediaClient({ initialFiles }: AdminMediaClientProps) {
  const t = useTranslations("admin");
  const [files, setFiles] = useState<MediaFile[]>(initialFiles);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "image" | "document">("all");
  
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter files
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filterType === "image") return file.type.startsWith("image/");
    if (filterType === "document") return !file.type.startsWith("image/");
    return true;
  });

  // Handle direct upload from media page
  const handleUpload = async (file: File) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("fileSizeLimit"));
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "media-library");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setFiles(prev => [data.file, ...prev]);
        toast.success(t("fileUploaded"));
      } else {
        throw new Error(data.error || t("uploadFailed"));
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle file deletion
  const handleDelete = async () => {
    if (!deleteId) return;
    
    startTransition(async () => {
      const res = await deleteMediaFile(deleteId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(t("fileDeleted"));
        setFiles(prev => prev.filter(f => f.id !== deleteId));
        if (selectedFile?.id === deleteId) {
          setSelectedFile(null);
        }
      }
      setDeleteId(null);
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("URL kopyalandı!");
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold flex items-center gap-3"
        >
          <ImageIcon className="h-6 w-6 text-violet-400" />
          {t("mediaLibrary")}
        </motion.h1>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={t("searchFiles")} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-accent/30"
            />
          </div>
          <Button 
            onClick={() => !isUploading && fileInputRef.current?.click()} 
            disabled={isUploading}
            className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 whitespace-nowrap"
          >
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isUploading ? t("uploading") : t("uploadFile")}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleUpload(e.target.files[0]);
            }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-4">
        <Button 
          variant={filterType === "all" ? "default" : "ghost"} 
          size="sm" 
          onClick={() => setFilterType("all")}
          className={filterType === "all" ? "bg-accent/50 text-foreground" : "text-muted-foreground"}
        >
          {t("all")}
        </Button>
        <Button 
          variant={filterType === "image" ? "default" : "ghost"} 
          size="sm" 
          onClick={() => setFilterType("image")}
          className={filterType === "image" ? "bg-accent/50 text-foreground" : "text-muted-foreground"}
        >
          {t("images")}
        </Button>
        <Button 
          variant={filterType === "document" ? "default" : "ghost"} 
          size="sm" 
          onClick={() => setFilterType("document")}
          className={filterType === "document" ? "bg-accent/50 text-foreground" : "text-muted-foreground"}
        >
          {t("documents")}
        </Button>
      </div>

      {/* Grid */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-xl bg-accent/10">
          <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium">{t("noFilesFound")}</h3>
          <p className="text-sm text-muted-foreground">{t("noMatchingFiles")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredFiles.map((file, i) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card 
                className="overflow-hidden cursor-pointer group border-border/50 bg-card/50 hover:border-violet-500/50 transition-colors"
                onClick={() => setSelectedFile(file)}
              >
                <div className="aspect-square bg-accent/20 flex items-center justify-center p-2 relative">
                  {file.type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.url} alt={file.name} className="object-cover w-full h-full rounded-md" />
                  ) : (
                    <FileIcon className="h-12 w-12 text-cyan-400 opacity-80" />
                  )}
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" className="h-8 text-xs">
                      <EyeIcon className="mr-2 h-3 w-3" /> {t("detail")}
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="text-xs font-medium truncate" title={file.name}>{file.name}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-muted-foreground">{formatSize(file.size)}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(file.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* File Details Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <DialogContent className="sm:max-w-[700px] border-border/50 bg-background">
          <DialogHeader>
            <DialogTitle>{t("fileDetails")}</DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="bg-accent/20 rounded-xl flex items-center justify-center p-4 border border-border/50 min-h-[200px]">
                {selectedFile.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedFile.url} alt={selectedFile.name} className="max-w-full max-h-[300px] object-contain rounded-md" />
                ) : (
                  <FileIcon className="h-24 w-24 text-cyan-400" />
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg break-words leading-tight mb-1">{selectedFile.name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{selectedFile.type}</Badge>
                    <span className="text-xs text-muted-foreground">{formatSize(selectedFile.size)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Public URL</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={selectedFile.url} className="bg-accent/30 h-8 text-xs" />
                    <Button size="icon" variant="secondary" className="h-8 w-8 shrink-0" onClick={() => copyToClipboard(selectedFile.url)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <a href={selectedFile.url} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="outline" className="h-8 w-8 shrink-0">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("uploadDate")}</Label>
                  <p className="text-sm">{new Date(selectedFile.createdAt).toLocaleString()}</p>
                </div>

                {selectedFile.usedIn && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{t("usedIn")}</Label>
                    <p className="text-sm px-3 py-1.5 bg-accent/30 rounded-md border border-border/50 inline-block">
                      {selectedFile.usedIn}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-border/50 mt-4">
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => {
                      setDeleteId(selectedFile.id);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("deleteFile")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="border-border/50 bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteFileConfirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isPending}>
              {isPending ? t("deleting") : t("deleteFile")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Helper icon component since Eye isn't imported above to avoid conflict
function EyeIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
