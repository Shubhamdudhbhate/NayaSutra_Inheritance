// src/utils/stagingUploadUtils.ts

// --- Configuration ---
// In Vite, we access env vars via import.meta.env
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// --- Types ---
export const EVIDENCE_TYPES = {
  DOCUMENT: 'DOCUMENT',
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO',
  IMAGE: 'IMAGE',
  OTHER: 'OTHER'
} as const;

export type EvidenceType = keyof typeof EVIDENCE_TYPES;

/**
 * 1. Uploads file to Cloudinary
 */
export const uploadToCloudinary = async (file: File, caseId: string) => {
  // Safety Checks
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    console.error("Missing Env Vars. Cloud Name:", CLOUD_NAME, "Preset:", UPLOAD_PRESET);
    throw new Error("Cloudinary config missing. Check .env.local and ensure keys start with VITE_");
  }

  if (!caseId) {
    throw new Error("Case UUID is missing! Cannot upload without knowing the Case ID.");
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  
  // Dynamic Folder: staging_evidence / {caseId}
  formData.append('folder', `staging_evidence/${caseId}`);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Cloudinary Upload Failed: ${errorData.error?.message || res.statusText}`);
    }

    const data = await res.json();

    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      format: data.format,
      resource_type: data.resource_type
    };
  } catch (error) {
    console.error("Staging Upload Error:", error);
    throw error;
  }
};

/**
 * 2. Detects the File Type
 */
export const getEvidenceType = (file: File): EvidenceType => {
  const type = file.type;

  if (type.startsWith('image/')) return 'IMAGE';
  if (type.startsWith('video/')) return 'VIDEO';
  if (type.startsWith('audio/')) return 'AUDIO';

  if (
    type === 'application/pdf' ||
    type.includes('wordprocessingml') || 
    type.includes('msword') ||           
    type.includes('text/plain') ||       
    type.includes('csv')
  ) {
    return 'DOCUMENT';
  }

  return 'OTHER';
};

/**
 * 3. Validates File Size
 */
export const validateFile = (file: File) => {
  const MAX_MB = 100; 
  if (file.size > MAX_MB * 1024 * 1024) {
    throw new Error(`File is too large. Maximum allowed size is ${MAX_MB}MB.`);
  }
  return true;
};