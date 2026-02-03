import { ethers } from "ethers";

// --- Configuration ---
// TODO: Load these from your actual environment variables in production
const CLOUD_NAME = "de6awokeq";
const UPLOAD_PRESET = "nyaysutra_unsigned";

// Matches EvidenceStaging.sol Enum
export const EVIDENCE_TYPES = {
    DOCUMENT: 0,
    AUDIO: 1,
    VIDEO: 2
} as const;

export type EvidenceType = typeof EVIDENCE_TYPES[keyof typeof EVIDENCE_TYPES];

/**
 * 1. Uploads to Cloudinary
 * Returns the Secure URL (cloudRef)
 */
export const uploadToCloudinary = async (file: File): Promise<string> => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        console.warn("Cloudinary config missing. Check evidenceUtils.ts");
        // Throwing error to stop execution if config is missing
        throw new Error("Cloudinary configuration missing");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'nyaysutra_evidence');

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error(`Cloudinary Upload Failed: ${res.statusText}`);

        const data = await res.json();
        return data.secure_url;
    } catch (error) {
        console.error("Cloud Upload Error:", error);
        throw error;
    }
};

/**
 * 2. Calculates KECCAK-256 Hash (Ethers v6)
 * Uses ethers.keccak256 directly on Uint8Array
 */
export const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // v6: ethers.keccak256 accepts Uint8Array directly
    return ethers.keccak256(bytes);
};

/**
 * 3. Detects Evidence Type
 */
export const getEvidenceType = (file: File): EvidenceType => {
    if (file.type.startsWith('video/')) return EVIDENCE_TYPES.VIDEO;
    if (file.type.startsWith('audio/')) return EVIDENCE_TYPES.AUDIO;
    return EVIDENCE_TYPES.DOCUMENT;
};

/**
 * 4. Validation Helper
 */
export const validateFile = (file: File): boolean => {
    const MAX_MB = 100;
    if (file.size > MAX_MB * 1024 * 1024) {
        throw new Error(`File too large. Max ${MAX_MB}MB.`);
    }

    // Allow basic types + Word Docs
    const validTypes = ['image/', 'video/', 'audio/', 'application/pdf', 'text/'];
    const isMimeValid = validTypes.some(t => file.type.startsWith(t));
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isMimeValid && !isDocx) {
        throw new Error("Unsupported file type.");
    }
    return true;
};
