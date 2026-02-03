import { ethers } from "ethers";
import { MetaMaskInpageProvider } from "@metamask/providers";
import { EVIDENCE_TYPES } from './evidenceUtils';

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

// --- Configuration ---
// TODO: Replace with your actual Deployed Address
const EVIDENCE_STAGING_ADDR = import.meta.env.VITE_EVIDENCE_STAGING_ADDR || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

// EIP-712 Domain Config
const EIP712_DOMAIN = {
    name: "CourtEvidenceSystem",
    version: "1",
    chainId: null, // Dynamic
    verifyingContract: EVIDENCE_STAGING_ADDR
};

// Status Enum
export const Status = {
    PENDING: 0,
    ACCEPTED: 1,
    REJECTED: 2
} as const;

export type StatusType = typeof Status[keyof typeof Status];

// ABI
const EVIDENCE_ABI = [
    "function registerCaseParticipants(uint256 _caseId, address[] calldata _subjects) external",
    "function submitEvidence(uint256 _caseId, string calldata _cloudRef, bytes32 _fileHash, uint8 _fileType, string calldata _metaData, bytes calldata _lawyerSignature) external",
    "function reviewSubmission(uint256 _submissionId, bool _accepted) external",
    "function submissions(uint256) view returns (uint256 id, uint256 caseId, address uploader, string cloudRef, bytes32 fileHash, uint8 fileType, uint8 status, uint256 timestamp, string metaData)",
    "function registeredParticipants(uint256, address) view returns (bool)",
    "function nonces(address) view returns (uint256)",
    "event EvidenceSubmitted(uint256 indexed submissionId, uint256 indexed caseId, bytes32 fileHash)",
    "event EvidenceReviewed(uint256 indexed submissionId, uint8 status, address reviewedBy)"
];

// v6 Helper: Get Contract
const getEvidenceContract = async (withSigner = false): Promise<ethers.Contract> => {
    if (!window.ethereum) throw new Error("MetaMask not found.");
    // v6: Use BrowserProvider, NOT Web3Provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    if (withSigner) {
        const signer = await provider.getSigner();
        return new ethers.Contract(EVIDENCE_STAGING_ADDR, EVIDENCE_ABI, signer);
    }
    return new ethers.Contract(EVIDENCE_STAGING_ADDR, EVIDENCE_ABI, provider);
};

// ==============================================================================
// 1. EIP-712 SIGNATURE (v6 Compliant)
// ==============================================================================

export const generateLawyerPermitSignature = async (caseId: string | number, witnessAddress: string, nonce: string | number): Promise<string> => {
    try {
        if (!window.ethereum) throw new Error("MetaMask not found");
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const network = await provider.getNetwork();

        // v6: Domain must match the chain we are on
        const domain = {
            ...EIP712_DOMAIN,
            chainId: Number(network.chainId), // v6 returns BigInt, converting to Number for safety in simple objects
            verifyingContract: EVIDENCE_STAGING_ADDR
        };

        const types = {
            UploadPermit: [
                { name: 'caseId', type: 'uint256' },
                { name: 'witness', type: 'address' },
                { name: 'nonce', type: 'uint256' }
            ]
        };

        // v6: Values use BigInt for uint256
        const value = {
            caseId: BigInt(caseId),
            witness: witnessAddress,
            nonce: BigInt(nonce)
        };

        // v6: signTypedData (no underscore)
        const signature = await signer.signTypedData(domain, types, value);
        return signature;
    } catch (error) {
        console.error("Signature Error:", error);
        throw error;
    }
};

export const getWitnessNonce = async (witnessAddress: string): Promise<number> => {
    const contract = await getEvidenceContract();
    const nonce = await contract.nonces(witnessAddress);
    return Number(nonce);
};

// ==============================================================================
// 2. TRANSACTIONS
// ==============================================================================

export interface SubmitEvidenceParams {
    caseId: string | number;
    cloudRef: string;
    fileHash: string;
    evidenceType: number;
    metaData?: string;
    lawyerSignature?: string | null;
}

export interface SubmitEvidenceResult {
    submissionId: string;
    txHash: string;
}

export const submitEvidenceToBlockchain = async (
    caseId: string | number,
    cloudRef: string,
    fileHash: string,
    evidenceType: number,
    metaData: string = "",
    lawyerSignature: string | null = null
): Promise<SubmitEvidenceResult> => {
    try {
        const contract = await getEvidenceContract(true);

        // v6: Ensure bytes32 is properly formatted
        const fileHashBytes32 = fileHash.startsWith('0x') ? fileHash : '0x' + fileHash;
        const signatureBytes = lawyerSignature || "0x";

        const tx = await contract.submitEvidence(
            BigInt(caseId), // v6: Use BigInt
            cloudRef,
            fileHashBytes32,
            evidenceType,
            metaData,
            signatureBytes
        );

        console.log("Tx Sent:", tx.hash);
        const receipt = await tx.wait();

        // v6: Event parsing
        // We look for the log that matches the topic of EvidenceSubmitted
        const log = receipt.logs.find((l: any) => {
            try {
                const parsed = contract.interface.parseLog(l);
                return parsed && parsed.name === "EvidenceSubmitted";
            } catch (e) { return false; }
        });

        if (!log) throw new Error("Submission Event not found in receipt");

        const parsedLog = contract.interface.parseLog(log);
        
        if (!parsedLog) throw new Error("Failed to parse submission event");

        return {
            submissionId: parsedLog.args.submissionId.toString(),
            txHash: tx.hash
        };
    } catch (error) {
        console.error("Submit Error:", error);
        throw error;
    }
};

// ==============================================================================
// 3. READS (Optimized with QueryFilter)
// ==============================================================================

export interface SubmissionDetails {
    id: string;
    caseId: string;
    uploader: string;
    cloudRef: string;
    fileHash: string;
    fileType: number;
    fileTypeName: string;
    status: number;
    statusName: string;
    timestamp: number;
    date: string;
    metaData: string;
}

export const getSubmissionDetails = async (submissionId: string | number): Promise<SubmissionDetails> => {
    const contract = await getEvidenceContract();
    const sub = await contract.submissions(BigInt(submissionId));

    return {
        id: sub.id.toString(),
        caseId: sub.caseId.toString(),
        uploader: sub.uploader,
        cloudRef: sub.cloudRef,
        fileHash: sub.fileHash,
        fileType: Number(sub.fileType),
        fileTypeName: Object.keys(EVIDENCE_TYPES)[Number(sub.fileType)],
        status: Number(sub.status),
        statusName: Object.keys(Status)[Number(sub.status)],
        timestamp: Number(sub.timestamp),
        date: new Date(Number(sub.timestamp) * 1000).toLocaleString(),
        metaData: sub.metaData
    };
};

export const getCaseSubmissions = async (caseId: string | number): Promise<SubmissionDetails[]> => {
    try {
        const contract = await getEvidenceContract();

        // v6: queryFilter with Topics
        // topic[1] is caseId. We must pad it to 32 bytes.
        const caseIdTopic = ethers.zeroPadValue(ethers.toBeHex(BigInt(caseId)), 32);
        const filter = contract.filters.EvidenceSubmitted(null, caseIdTopic);

        const logs = await contract.queryFilter(filter);

        if (logs.length === 0) return [];

        // Parallel fetch details
        const fetchPromises = logs.map((log: any) => {
            // v6: log.args is a Result object. Access by index or name.
            const submissionId = log.args[0];
            return getSubmissionDetails(submissionId);
        });

        return await Promise.all(fetchPromises);
    } catch (error) {
        console.error("Optimized Fetch Error:", error);
        return [];
    }
};
