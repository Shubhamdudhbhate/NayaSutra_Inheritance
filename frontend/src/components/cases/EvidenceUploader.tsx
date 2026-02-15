import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Adjust path if your supabase client is elsewhere
import { 
  uploadToCloudinary, 
  getEvidenceType, 
  validateFile 
} from '@/utils/storage/stagingUploadUtils'; // Ensure this matches your util filename

// Icons (Lucide React)
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface EvidenceUploaderProps {
  caseId: string;       // Passed from the URL (The specific case folder)
  uploaderUuid: string; // The logged-in user's ID
  uploaderRole: 'POLICE' | 'LAWYER'; 
  onUploadComplete?: () => void; // Optional: To refresh a list after upload
}

export const EvidenceUploader = ({ 
  caseId, 
  uploaderUuid, 
  uploaderRole,
  onUploadComplete 
}: EvidenceUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1. Reset State
      setIsUploading(true);
      setStatusType('idle');
      setStatusMessage("Validating file...");

      // 2. Validate Size & Format (Local Check)
      validateFile(file);

      // 3. Detect Evidence Type (VIDEO, IMAGE, DOCUMENT, etc.)
      const fileType = getEvidenceType(file);

      setStatusMessage("Uploading to Secure Cloud...");

      // 4. Upload to Cloudinary (Dynamic Folder: staging_evidence/{caseId})
      const { secure_url } = await uploadToCloudinary(file, caseId);

      setStatusMessage("Saving to Case Record...");

      // 5. Save Metadata to Supabase Staging Table
      const { error } = await supabase.from('staging_evidence').insert({
        case_id: caseId,
        uploader_uuid: uploaderUuid,
        uploader_role: uploaderRole,
        file_url: secure_url,
        file_type: fileType,       // 'VIDEO', 'IMAGE', etc.
        evidence_status: 'PENDING'
      });

      if (error) throw error;

      // 6. Success!
      setStatusMessage("Upload Successful!");
      setStatusType('success');
      
      // Clear the input so they can upload again if needed
      e.target.value = ""; 
      
      if (onUploadComplete) onUploadComplete();

    } catch (err: any) {
      console.error("Upload Error:", err);
      setStatusMessage(`Error: ${err.message}`);
      setStatusType('error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div 
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
          ${isUploading ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
        `}
      >
        {/* Hidden Input */}
        <input 
          type="file" 
          id="evidence-upload-input"
          className="hidden" 
          onChange={handleFileChange}
          disabled={isUploading}
        />

        {/* The UI Content */}
        <label 
          htmlFor="evidence-upload-input" 
          className="cursor-pointer flex flex-col items-center justify-center h-full w-full"
        >
          {/* ICON LOGIC */}
          <div className="mb-4">
            {isUploading ? (
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
            ) : statusType === 'success' ? (
              <CheckCircle className="h-10 w-10 text-green-500" />
            ) : statusType === 'error' ? (
              <AlertCircle className="h-10 w-10 text-red-500" />
            ) : (
              <UploadCloud className="h-10 w-10 text-gray-400" />
            )}
          </div>

          {/* TEXT LOGIC */}
          <h3 className="text-lg font-semibold text-gray-700">
            {isUploading ? "Processing Evidence..." : "Click to Upload Evidence"}
          </h3>
          
          <p className="text-sm text-gray-500 mt-2 max-w-xs">
            {statusMessage || "Supports Images, Videos, Audio & Documents (Max 100MB)"}
          </p>
        </label>
      </div>

      {/* Helper Text below box */}
      {statusType === 'success' && (
        <p className="text-center text-green-600 text-sm mt-3 font-medium">
          Evidence has been staged successfully.
        </p>
      )}
    </div>
  );
};