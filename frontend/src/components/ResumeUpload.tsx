'use client';

import { useState, useRef, type DragEvent } from 'react';
import { UploadCloud, FileText, X, ArrowLeft, Loader2 } from 'lucide-react';

export default function ResumeUpload({ onUpload, submitting, onBack }: { onUpload: (file: File) => void; submitting: boolean; onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF or DOCX file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
      return;
    }
    setFile(file);
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center mb-8">
        <button onClick={onBack} disabled={submitting} className="p-2 mr-4 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors disabled:opacity-50">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Upload Resume</h2>
          <p className="text-gray-400">Upload your PDF or DOCX resume (max 10MB).</p>
        </div>
      </div>

      {!file ? (
        <div
          className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-colors duration-300 ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 bg-gray-950/50 hover:bg-gray-800/50 hover:border-gray-500'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleChange}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4 text-blue-400">
            <UploadCloud size={32} />
          </div>
          <p className="text-lg font-medium text-white mb-2">Drag and drop your resume here</p>
          <p className="text-sm text-gray-400 mb-6">or</p>
          <button
            type="button"
            onClick={onButtonClick}
            className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-colors border border-gray-700"
          >
            Browse Files
          </button>
        </div>
      ) : (
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div>
              <p className="font-medium text-white line-clamp-1">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            disabled={submitting}
            className="p-2 rounded-full hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <div className="pt-8 flex flex-col gap-4">
        <button
          onClick={() => file && onUpload(file)}
          disabled={!file || submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2"
        >
          {submitting ? (
            <><Loader2 className="animate-spin" size={20} /> Submitting Profile...</>
          ) : (
            'Submit & Proceed to HTML5 Recording'
          )}
        </button>
      </div>
    </div>
  );
}
