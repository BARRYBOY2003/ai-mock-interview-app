import React from "react";
import { FileUpload } from "@/components/ui/file-upload";

function ResumeUpload({ setFiles }: any) {
  const handleFileUpload = (files: File[]) => {
    setFiles(files[0]);
    console.log(files);
  };

  return (
    <div className="w-full max-w-4xl mx-auto min-h-96 border bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col items-center justify-center">
      <FileUpload onChange={handleFileUpload} />
    </div>
  );
}

export default ResumeUpload;

