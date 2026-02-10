import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client'; 
import { 
  uploadToPinata, 
  validateFile, 
  getEvidenceType 
} from '../../utils/storage/ipfsUploadUtils';
import { EvidenceUploadType } from '@/services/caseEvidenceService';

interface IpfsUploadProps {
  caseId?: string | null; // Make optional for FIR uploads
  userProfileId: string; // The ID from your 'profiles' table
  evidenceType?: EvidenceUploadType; // Type of evidence (supplementary_chargesheet, etc.)
  onUploadSuccess?: (cid: string, fileName: string) => void;
  triggerUpload?: boolean; // New prop to trigger upload externally
}

export const IpfsUpload = ({ 
  caseId, 
  userProfileId, 
  evidenceType = 'general_evidence',
  onUploadSuccess,
  triggerUpload
}: IpfsUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Just store the file, don't upload yet
    setSelectedFile(file);
    setError(null);
    setSuccessMsg(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Validate File Size (>100MB check)
      validateFile(selectedFile);

      // 2. Upload to IPFS (Pinata) - pass empty string if caseId is null
      const ipfsResult = await uploadToPinata(selectedFile, caseId || '');

      // 3. Determine File Category (VIDEO, IMAGE, etc.)
      const category = getEvidenceType(selectedFile);

      // 4. Save Record to Supabase - only if caseId is provided
      if (caseId) {
        const { error: dbError } = await supabase
          .from('case_evidence')
          .insert({
            case_id: caseId,
            cid: ipfsResult.cid,
            file_name: ipfsResult.fileName,
            category: category,
            uploaded_by: userProfileId // Links to profiles table
          });

        if (dbError) throw dbError;
      }

      setSuccessMsg(`File uploaded successfully as ${evidenceType}!`);
      if (onUploadSuccess) onUploadSuccess(ipfsResult.cid, ipfsResult.fileName);
      
      // Clear file
      setSelectedFile(null);

    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setUploading(false);
    }
  };

  // Trigger upload when triggerUpload prop changes to true
  useEffect(() => {
    if (triggerUpload && selectedFile) {
      handleUpload();
    }
  }, [triggerUpload, selectedFile]);

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-bold mb-3">
        Upload {evidenceType.replace(/_/g, ' ').toUpperCase()}
      </h3>
      
      <div className="flex flex-col gap-3">
        <input 
          type="file" 
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
        
        {uploading && (
          <p className="text-blue-600 text-sm animate-pulse">
            Uploading to IPFS... Please wait.
          </p>
        )}
        
        {error && (
          <p className="text-red-600 text-sm bg-red-50 p-2 rounded">
            Error: {error}
          </p>
        )}
        
        {successMsg && (
          <p className="text-green-600 text-sm bg-green-50 p-2 rounded">
            {successMsg}
          </p>
        )}
      </div>
    </div>
  );
};