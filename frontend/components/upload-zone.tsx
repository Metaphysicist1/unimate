"use client";

import { useCallback, useRef } from "react";

interface UploadZoneProps {
  label: string;
  onFileSelect: (file: File | undefined) => void;
}

export function UploadZone({ label, onFileSelect }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    // Inside your return statement:
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={handleClick}
      className="group relative border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center cursor-pointer 
             hover:border-purple-500 hover:bg-purple-50/50 transition-all duration-300 ease-in-out"
    >
      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
        <span className="text-2xl">📄</span>
      </div>
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">
        PDF only • Max 5MB
      </p>
    </div>
  );
}
