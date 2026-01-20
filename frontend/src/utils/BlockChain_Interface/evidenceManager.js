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
} from './evidenceUtils.js';

import {
    submitEvidenceToBlockchain,
    generateLawyerPermitSignature,
    getWitnessNonce
} from './evidenceContract.js';

export { EVIDENCE_TYPES };

export const submitEvidence = async ({
    caseId,
    file,
    metaData = "",
    lawyerSignature = null
}) => {
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

    } catch (error) {
        console.error("[EvidenceManager] Failed:", error);
        return {
            success: false,
            error: error.message || "Unknown error"
        };
    }
};

export const createWitnessPermit = async (caseId, witnessAddress) => {
    try {
        const nonce = await getWitnessNonce(witnessAddress);
        const signature = await generateLawyerPermitSignature(caseId, witnessAddress, nonce);
        return signature;
    } catch (error) {
        console.error("[Permit] Error:", error);
        throw error;
    }
};