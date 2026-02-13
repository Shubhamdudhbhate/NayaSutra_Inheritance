// src/utils/storage/ipfsUploadUtils.ts

// --- Configuration ---
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

// --- Types ---
export interface IpfsUploadResponse {
  cid: string;          // The IPFS Hash (Qm...)
  ipfsUrl: string;      // The viewable Gateway URL
  fileName: string;
  size: number;
  timestamp: string;
}

export interface JsonUploadResponse {
  cid: string;
  ipfsUrl: string;
  name: string;
  timestamp: string;
}

// These match the 'evidence_file_type' Enum in your Supabase Database
export const EVIDENCE_TYPES = {
  DOCUMENT: 'DOCUMENT',
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO',
  IMAGE: 'IMAGE',
  OTHER: 'OTHER'
} as const;

export type EvidenceType = keyof typeof EVIDENCE_TYPES;

/**
 * 1. Uploads a File to Pinata (IPFS)
 * @param file - The standard browser File object
 * @param caseId - Used to tag the file in your Pinata Dashboard for organization
 */
export const uploadToPinata = async (file: File, caseId: string): Promise<IpfsUploadResponse> => {
  // Safety Checks
  if (!PINATA_JWT) {
    throw new Error("Pinata JWT is missing. Check VITE_PINATA_JWT in .env.local");
  }

  // 1. Prepare Form Data
  const formData = new FormData();
  formData.append('file', file);

  // 2. Add Metadata (Optional but recommended for your Dashboard organization)
  // This does NOT create a second CID. It just names the file in the Pinata UI.
  // Ensure caseId is a valid string for Pinata metadata
  const safeCaseId = caseId && typeof caseId === 'string' ? caseId : 'unknown';
  const metadata = JSON.stringify({
    name: `${safeCaseId}_${file.name}`, // Example: "CASE-123_evidence.pdf"
    keyvalues: {
      caseId: safeCaseId,
      uploadDate: new Date().toISOString()
    }
  });
  formData.append('pinataMetadata', metadata);

  // 3. Pinata Options (Optional: cidVersion 1 is newer/safer)
  const options = JSON.stringify({
    cidVersion: 1,
  });
  formData.append('pinataOptions', options);

  try {
    // 4. Send Request
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        // Note: Do NOT set 'Content-Type': 'multipart/form-data' manually.
        // The browser sets it automatically with the correct boundary.
      },
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Pinata Upload Failed: ${errorData.error || res.statusText}`);
    }

    const data = await res.json();

    // 5. Construct the Result
    // data.IpfsHash is the CID.
    return {
      cid: data.IpfsHash,
      ipfsUrl: resolveIpfsUrl(data.IpfsHash),
      fileName: file.name,
      size: data.PinSize,
      timestamp: data.Timestamp
    };

  } catch (error) {
    console.error("IPFS Upload Error:", error);
    throw error;
  }
};

/**
 * 2. Helper: Resolves a CID to a Viewable URL
 * Useful if you pull a CID from the database and need to show it.
 */
export const resolveIpfsUrl = (cid: string) => {
  // Always use the official Pinata gateway for consistent access
  const baseUrl = "https://gateway.pinata.cloud";
  return `${baseUrl}/ipfs/${cid}`;
};

/**
 * 3. Detects File Type
 * Maps MIME types to your Supabase 'EVIDENCE_TYPES' enum
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
 * 4. Validates File Size (100MB Max)
 */
export const validateFile = (file: File) => {
  const MAX_MB = 100; 
  if (file.size > MAX_MB * 1024 * 1024) {
    throw new Error(`File is too large. Maximum allowed size is ${MAX_MB}MB.`);
  }
  return true;
};

/**
 * 5. Uploads a JSON object to Pinata (IPFS)
 * @param jsonData - The JSON object to upload
 * @param name - The name for the file in Pinata
 * @param metadata - Optional metadata keyvalues
 */
export const uploadJsonToPinata = async (
  jsonData: object,
  name: string,
  metadata?: Record<string, string>
): Promise<JsonUploadResponse> => {
  if (!PINATA_JWT) {
    throw new Error("Pinata JWT is missing. Check VITE_PINATA_JWT in .env.local");
  }

  try {
    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinataContent: jsonData,
        pinataMetadata: {
          name: name,
          keyvalues: {
            type: "session_finalization",
            timestamp: new Date().toISOString(),
            ...metadata,
          },
        },
        pinataOptions: {
          cidVersion: 1,
        },
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("Pinata JSON Upload Error:", errorData);
      throw new Error(`Pinata JSON Upload Failed: ${JSON.stringify(errorData.error || errorData.message || errorData)}`);
    }

    const data = await res.json();

    return {
      cid: data.IpfsHash,
      ipfsUrl: resolveIpfsUrl(data.IpfsHash),
      name: name,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("IPFS JSON Upload Error:", error);
    throw error;
  }
};

/**
 * 6. Fetches and parses JSON from IPFS
 * @param cid - The IPFS CID to fetch
 */
export const fetchJsonFromIpfs = async <T = unknown>(cid: string): Promise<T> => {
  try {
    const url = resolveIpfsUrl(cid);
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch from IPFS: ${res.statusText}`);
    }
    
    const data = await res.json();
    return data as T;
  } catch (error) {
    console.error("Error fetching JSON from IPFS:", error);
    throw error;
  }
};