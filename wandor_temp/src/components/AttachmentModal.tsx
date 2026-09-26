import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, CheckCircle, Trash2 } from 'lucide-react';

interface AttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttach: (fileInfo: { name: string; summary: string; base64?: string; mimeType?: string }) => void;
  currentAttachment?: { name: string; summary: string; base64?: string; mimeType?: string } | null;
  onRemoveAttachment?: () => void;
}

export const AttachmentModal: React.FC<AttachmentModalProps> = ({
  isOpen,
  onClose,
  onAttach,
  currentAttachment,
  onRemoveAttachment
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string; type: string } | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [base64Data, setBase64Data] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    setSelectedFile({
      name: file.name,
      size: `${sizeMb} MB`,
      type: file.type || 'document'
    });
    setExtractedText('');
    setErrorMsg(null);

    // Read base64 for fallback multimodal
    const reader = new FileReader();
    reader.onload = (e) => setBase64Data(e.target?.result as string);
    reader.readAsDataURL(file);

    // Extract text from server
    setIsExtracting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/extract-attachment', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setExtractedText(data.text || '');
      } else {
        setErrorMsg(data.error || 'Failed to extract text from document');
      }
    } catch (err) {
      setErrorMsg('Network error while extracting text');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onAttach({
        name: selectedFile.name,
        summary: extractedText || selectedFile.name,
        base64: base64Data || undefined,
        mimeType: selectedFile.type
      });
      onClose();
    } else if (extractedText) {
      onAttach({
        name: 'Custom Travel Notes',
        summary: extractedText
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[#FAF6F0] rounded-[24px] border border-white p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-stone-500 hover:text-black rounded-full hover:bg-stone-200/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <h3 className="font-heading text-xl font-bold text-stone-900">
            Attach Bookings or Inspiration
          </h3>
          <p className="text-sm text-stone-600 mt-1">
            Upload your flight tickets, hotel confirmation PDFs, Airbnb links, or saved photos. Our AI will automatically read them.
          </p>
        </div>

        {currentAttachment && !selectedFile && (
          <div className="mb-4 p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-medium text-stone-800 truncate max-w-[280px]">
                Currently attached: {currentAttachment.name}
              </span>
            </div>
            {onRemoveAttachment && (
              <button
                onClick={onRemoveAttachment}
                className="text-stone-500 hover:text-red-600 p-1 text-xs"
                title="Remove attachment"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Drag & Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-amber-700 bg-amber-50/50'
              : 'border-stone-300 hover:border-stone-400 bg-[#F4EFE6]/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          <UploadCloud className="w-10 h-10 mx-auto text-stone-600 mb-2" />
          <p className="text-sm font-medium text-stone-800">
            Click to upload or drag & drop files
          </p>
          <p className="text-xs text-stone-500 mt-1">
            PDF, PNG, JPG, or TXT up to 15MB
          </p>
        </div>

        {selectedFile && (
          <div className="mt-3 p-3 bg-white/80 rounded-xl border border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <FileText className="w-4 h-4 text-stone-700 shrink-0" />
              <div className="text-left truncate">
                <p className="text-xs font-semibold text-stone-900 truncate">{selectedFile.name}</p>
                <p className="text-[11px] text-stone-500">{selectedFile.size}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedFile(null);
                setExtractedText('');
              }}
              className="text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMsg && (
          <p className="text-xs text-red-600 mt-2 font-medium">{errorMsg}</p>
        )}

        {/* Extracted Text Preview / Edit */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-stone-700 mb-1 flex justify-between items-center">
            <span>{isExtracting ? 'Extracting text...' : 'Extracted Text / Custom Notes:'}</span>
            {isExtracting && <span className="w-3 h-3 border-2 border-amber-600/40 border-t-amber-600 rounded-full animate-spin"></span>}
          </label>
          <textarea
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
            disabled={isExtracting}
            placeholder={isExtracting ? 'Reading document...' : 'e.g. Arriving at Haneda at 3 PM, staying in Shinjuku'}
            className="w-full text-xs px-3.5 py-2.5 bg-white/90 border border-stone-300 rounded-xl focus:outline-none focus:border-stone-800 text-stone-800 placeholder:text-stone-400 min-h-[100px] resize-y disabled:opacity-50"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-black"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={(!selectedFile && !extractedText) || isExtracting}
            className="px-5 py-2.5 bg-[#121212] hover:bg-stone-800 disabled:opacity-40 text-white text-xs font-semibold uppercase tracking-wider rounded-full transition-colors"
          >
            Attach to Trip
          </button>
        </div>
      </div>
    </div>
  );
};
