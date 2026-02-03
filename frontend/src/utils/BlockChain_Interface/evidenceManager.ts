/**
 * EVIDENCE MANAGER (Master Controller)
 * Strictly Ethers v6 Compatible
 */

import {
    uploadToCloudinary,
    calculateFileHash,
    getEvidenceType,
    validateFile,
    EVIDENCE_TYPES
} from './evidenceUtils';

import {
    submitEvidenceToBlockchain,
    generateLawyerPermitSignature,
    getWitnessNonce
} from './evidenceContract';

export { EVIDENCE_TYPES };

export interface SubmitEvidenceParams {
    caseId: string | number;
    file: File;
    metaData?: string;
    lawyerSignature?: string | null;
}

export interface SubmitEvidenceResult {
    success: boolean;
    submissionId?: string;
    txHash?: string;
    cloudUrl?: string;
    integrityHash?: string;
    timestamp?: string;
    error?: string;
}

export const submitEvidence = async ({
    caseId,
    file,
    metaData = "",
    lawyerSignature = null
}: SubmitEvidenceParams): Promise<SubmitEvidenceResult> => {
    try {
        console.log(`[EvidenceManager] Starting submission for Case #${caseId}...`);

        // 1. Validate
        validateFile(file);

        // 2. Hash & Type
        const fileHash = await calculateFileHash(file);
        const fileType = getEvidenceType(file);

        console.log(`[Hash] ${fileHash}`);

        // 3. Upload to Cloud
        const cloudUrl = await uploadToCloudinary(file);
        console.log(`[Cloud] Uploaded to ${cloudUrl}`);

        // 4. Blockchain Transaction
        const result = await submitEvidenceToBlockchain(
            caseId,
            cloudUrl,
            fileHash,
            fileType,
            metaData,
            lawyerSignature
        );

        console.log(`[Chain] Success! ID: ${result.submissionId}`);

        return {
            success: true,
            submissionId: result.submissionId,
            txHash: result.txHash,
            cloudUrl: cloudUrl,
            integrityHash: fileHash,
            timestamp: new Date().toISOString()
        };

    } catch (error: any) {
        console.error("[EvidenceManager] Failed:", error);
        return {
            success: false,
            error: error.message || "Unknown error"
        };
    }
};

export const createWitnessPermit = async (caseId: string | number, witnessAddress: string): Promise<string> => {
    try {
        const nonce = await getWitnessNonce(witnessAddress);
        const signature = await generateLawyerPermitSignature(caseId, witnessAddress, nonce);
        return signature;
    } catch (error: any) {
        console.error("[Permit] Error:", error);
        throw error;
    }
};
