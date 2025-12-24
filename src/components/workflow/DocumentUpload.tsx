import { useState, useRef } from 'react';
import { Upload, File, Trash2, Loader2, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { workflowDb, Document } from '@/lib/api/workflowDb';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DocumentUploadProps {
  workflowId?: string;
  documents: Document[];
  onDocumentsChange: (docs: Document[]) => void;
}

export function DocumentUpload({ workflowId, documents, onDocumentsChange }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadedDocs: Document[] = [];

    for (const file of Array.from(files)) {
      const doc = await workflowDb.uploadDocument(file, workflowId);
      if (doc) {
        uploadedDocs.push(doc);
      } else {
        toast.error(`Failed to upload: ${file.name}`);
      }
    }

    if (uploadedDocs.length > 0) {
      onDocumentsChange([...uploadedDocs, ...documents]);
      toast.success(`Uploaded ${uploadedDocs.length} document(s)`);
    }

    setIsUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDelete = async (doc: Document) => {
    const success = await workflowDb.deleteDocument(doc.id, doc.file_path);
    if (success) {
      onDocumentsChange(documents.filter((d) => d.id !== doc.id));
      toast.success('Document deleted');
    } else {
      toast.error('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
          dragActive
            ? 'border-primary bg-primary/10'
            : 'border-border hover:border-primary/50 hover:bg-surface-2'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          accept=".txt,.md,.pdf,.doc,.docx"
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Drop files or click to upload
            </span>
            <span className="text-xs text-muted-foreground/70">
              TXT, MD, PDF, DOC supported
            </span>
          </div>
        )}
      </div>

      {/* Document List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground font-medium">
            {documents.length} document(s)
          </span>
          <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-2 p-2 rounded bg-surface-2 group"
              >
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {doc.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(doc)}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
