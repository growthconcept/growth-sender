import { useState, useRef, useEffect } from 'react';
import { Upload, X, File, Image, Video, Music, Loader2 } from 'lucide-react';
import { Button } from './Button';

const typeIcons = {
  image: Image,
  video: Video,
  audio: Music,
  document: File
};

export default function FileUpload({ 
  onFileUploaded, 
  onUploadStart,
  onUploadError,
  accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx',
  maxSize = 50 * 1024 * 1024, // 50MB
  messageType = 'image',
  initialPreview = null,
  initialMimeType = null,
  initialName = ''
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [error, setError] = useState(null);
  const [previewError, setPreviewError] = useState(false);
  const fileInputRef = useRef(null);
  const lastObjectUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (initialPreview) {
      setUploadedFile({
        originalname: initialName || initialPreview.split('/').pop(),
        size: 0,
        mimetype: initialMimeType || '',
        preview: { src: initialPreview, type: initialMimeType || '' }
      });
      setPreviewError(false);
    } else {
      setUploadedFile(null);
    }
  }, [initialPreview, initialMimeType, initialName]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file) => {
    setError(null);
    setPreviewError(false);

    // Validar tamanho
    if (file.size > maxSize) {
      setError(`Arquivo muito grande. Tamanho máximo: ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
      return;
    }

    const tempPreviewUrl = URL.createObjectURL(file);
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
    }
    lastObjectUrlRef.current = tempPreviewUrl;

    setUploadedFile({
      originalname: file.name,
      size: file.size,
      mimetype: file.type,
      preview: { src: tempPreviewUrl, type: file.type },
      localPreview: tempPreviewUrl
    });

    setUploading(true);
    
    // Notificar que o upload começou
    if (onUploadStart) {
      onUploadStart();
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao fazer upload');
      }

      const data = await response.json();
      const previewObj = data.preview || { src: data.file.url, type: data.file.mimetype };
      setUploadedFile((prev) => ({
        ...data.file,
        mimetype: data.file.mimetype,
        preview: previewObj,
        localPreview: prev?.localPreview || lastObjectUrlRef.current
      }));
      if (onFileUploaded) {
        const fallbackPreview = lastObjectUrlRef.current;
        onFileUploaded(
          data.file.url,
          fallbackPreview || previewObj?.src || data.file.url
        );
      }
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Erro ao fazer upload do arquivo');
      
      // Notificar que o upload falhou
      if (onUploadError) {
        onUploadError();
      }
      
      // Limpar arquivo em caso de erro
      setUploadedFile(null);
      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = null;
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setUploadedFile(null);
    setError(null);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }
    if (onFileUploaded) {
      onFileUploaded('', null);
    }
    // Notificar que o upload foi cancelado/removido
    if (onUploadError) {
      onUploadError();
    }
  };

  const Icon = typeIcons[messageType] || File;
  const previewSrc = uploadedFile
    ? previewError && uploadedFile.localPreview
      ? uploadedFile.localPreview
      : uploadedFile.preview?.src ??
        uploadedFile.localPreview ??
        uploadedFile.preview ??
        uploadedFile.url
    : null;
  const previewType = uploadedFile
    ? uploadedFile.preview?.type ?? uploadedFile.mimetype ?? ''
    : '';

  const handleMediaError = () => {
    if (uploadedFile?.localPreview) {
      setPreviewError(true);
    }
  };

  return (
    <div className="space-y-2">
      {uploadedFile ? (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{uploadedFile.originalname}</p>
                <p className="text-xs text-muted-foreground">
                  {(uploadedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {previewSrc && previewType.startsWith('image/') && (
            <img
              src={previewSrc}
              alt="Preview"
              className="mt-3 rounded-lg max-h-48 max-w-full object-contain bg-white"
              onError={handleMediaError}
            />
          )}
          {previewSrc && previewType.startsWith('video/') && (
            <video
              src={previewSrc}
              controls
              className="mt-3 rounded-lg max-h-48 max-w-full object-contain bg-black"
              onError={handleMediaError}
            />
          )}
          {previewSrc && previewType.startsWith('audio/') && (
            <audio controls className="mt-3 w-full" onError={handleMediaError}>
              <source src={previewSrc} type={previewType} />
              Seu navegador não suporta áudio.
            </audio>
          )}
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          {uploading ? (
            <div className="space-y-2">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Enviando arquivo...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Arraste e solte o arquivo aqui
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ou clique para selecionar
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Selecionar Arquivo
              </Button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">
        Formatos suportados: Imagens, Vídeos, Áudios, PDFs, Docs
        <br />
        Tamanho máximo: {(maxSize / 1024 / 1024).toFixed(0)}MB
      </p>
    </div>
  );
}
