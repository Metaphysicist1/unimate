"use client";

import { useCallback } from "react";

interface UploadZoneProps {
  label: string;
  onFileSelect: (file: File | undefined) => void;
}

export function UploadZone({ label, onFileSelect }: UploadZoneProps) {
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

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-500 transition"
    >
      <p className="font-medium">{label}</p>
      <p className="text-sm text-gray-500 mt-2">
        Drag & drop or click to select
      </p>
      <input
        type="file"
        onChange={handleChange}
        className="hidden"
        accept=".pdf,.doc,.docx"
      />
    </div>
  );
}
