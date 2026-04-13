import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, X, FileImage, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const ImageUploadField = ({ onFilesSelected, maxFiles = 5, className }) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return t('upload.invalid_type');
    }
    if (file.size > MAX_FILE_SIZE) {
      return t('upload.too_large', { file: file.name });
    }
    return null;
  };

  const processFiles = useCallback((newFiles) => {
    setError(null);
    
    const validFiles = [];
    let validationError = null;

    for (const file of newFiles) {
      const err = validateFile(file);
      if (err) {
        validationError = err;
        break;
      }
      validFiles.push(Object.assign(file, {
        preview: URL.createObjectURL(file)
      }));
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setFiles(prev => {
      let updatedFiles;
      if (maxFiles === 1) {
        // Replace if only 1 file allowed
        prev.forEach(f => URL.revokeObjectURL(f.preview));
        updatedFiles = validFiles.slice(0, 1);
      } else {
        // Append up to maxFiles
        updatedFiles = [...prev, ...validFiles].slice(0, maxFiles);
      }
      onFilesSelected(maxFiles === 1 ? updatedFiles[0] : updatedFiles);
      return updatedFiles;
    });
  }, [maxFiles, onFilesSelected]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, [processFiles]);

  const handleFileInput = useCallback((e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  }, [processFiles]);

  const removeFile = useCallback((indexToRemove) => {
    setFiles(prev => {
      const updated = prev.filter((_, index) => index !== indexToRemove);
      URL.revokeObjectURL(prev[indexToRemove].preview);
      onFilesSelected(maxFiles === 1 ? (updated[0] || null) : updated);
      return updated;
    });
  }, [maxFiles, onFilesSelected]);

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-[8px] p-8 transition-all duration-200 ease-in-out flex flex-col items-center justify-center text-center cursor-pointer",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          error && "border-destructive/50 bg-destructive/5"
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          className="hidden"
          accept={ALLOWED_TYPES.join(',')}
          multiple={maxFiles > 1}
        />
        
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <UploadCloud className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-base font-medium mb-1">
          {t('upload.drop_or_click')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {t('upload.help', { count: maxFiles })}
        </p>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map((file, index) => (
            <div key={file.preview} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
              <img
                src={file.preview}
                alt={`Preview ${index}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="bg-destructive text-destructive-foreground p-2 rounded-full hover:scale-110 transition-transform"
                  aria-label={t('upload.remove_image')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploadField;
