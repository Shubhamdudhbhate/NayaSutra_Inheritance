import { ethers } from "ethers";
import { MetaMaskInpageProvider } from "@metamask/providers";

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}
// --- Configuration ---
// Safely access environment variables
const COURT_ADDR = import.meta.env.VITE_COURT_ADDR || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

const COURT_ABI = [
    // Writes
    "function createCase(string _title, string _firId, string _metaData) external returns (uint256)",
    "function assignLawyer(uint256 _caseId, address _lawyer, string _role) external",
    "function assignJudge(uint256 _caseId, address _judge) external",

    // Reads
    "function cases(uint256) view returns (uint256 id, string linkedFirId, string title, string accused, string filer, uint8 status, address assignedJudge, uint256 creationDate, address defence, address prosecution, uint256 nextSessionId, string metaData, address assignedClerk)",
    "function getCaseSigners(uint256 _caseId) view returns (address clerk, address judge, address defence, address prosecution)",

    // Events
    "event CaseCreated(uint256 indexed caseId, string title, string linkedFirId)"
];

// --- Types ---
export interface CaseDetails {
    id: string;
    linkedFirId: string;
    title: string;
    accused: string;
    filer: string;
    status: number;
    assignedJudge: string;
    creationDate: string; // Formatted Date String
    defence: string;
    prosecution: string;
    metaData: string;
    assignedClerk: string;
}

export interface CaseParticipants {
    clerk: string;
    judge: string;
    defence: string;
    prosecution: string;
}

export interface CreateCaseResponse {
    txHash: string;
    caseId: string;
}

// --- Internal Helper ---
const getClerkContract = async (): Promise<ethers.Contract> => {
    if (!window.ethereum) throw new Error("No Wallet Found");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(COURT_ADDR, COURT_ABI, signer);
};

// --- API Functions ---

/**
 * Creates a new Court Case linked to an FIR
 * @param {string} title - Case Title (e.g. "State vs John Doe")
 * @param {string} firIdString - The FIR ID String (e.g. "MH-2024-001")
 * @param {string} metaData - Additional JSON metadata
 */
export const clerkCreateCase = async (
    title: string, 
    firIdString: string, 
    metaData: string
): Promise<CreateCaseResponse> => {
    const contract = await getClerkContract();

    console.log(`Creating case linked to FIR ${firIdString}...`);

    // Contract call
    const tx = await contract.createCase(title, firIdString, metaData);
    console.log("Tx Sent:", tx.hash);

    const receipt = await tx.wait();

    // Parse Logs to find Case ID
    const event = receipt.logs
        .map((log: any) => {
            try { return contract.interface.parseLog(log); }
            catch (e) { return null; }
        })
        .find((parsed: any) => parsed && parsed.name === "CaseCreated");

    if (!event) throw new Error("CaseCreated event not found in receipt!");

    const newCaseId = event.args.caseId.toString();
    console.log(`Case Created! ID: ${newCaseId}`);

    return {
        txHash: tx.hash,
        caseId: newCaseId
    };
};

/**
 * Assigns a lawyer to a specific case
 */
export const clerkAssignLawyer = async (
    caseId: string | number, 
    lawyerAddress: string, 
    role: string
): Promise<ethers.ContractTransactionReceipt | null> => {
    const contract = await getClerkContract();

    const tx = await contract.assignLawyer(
        BigInt(caseId),
        lawyerAddress,
        role.toLowerCase()
    );
    console.log(`Assigning ${role}... Tx: ${tx.hash}`);
    return await tx.wait();
};

/**
 * Assigns a judge to a specific case
 */
export const clerkAssignJudge = async (
    caseId: string | number, 
    judgeAddress: string
): Promise<ethers.ContractTransactionReceipt | null> => {
    const contract = await getClerkContract();

    const tx = await contract.assignJudge(BigInt(caseId), judgeAddress);
    console.log(`Assigning Judge... Tx: ${tx.hash}`);
    return await tx.wait();
};

/**
 * Fetches the participants (Clerk, Judge, Lawyers) for a case
 */
export const getCaseParticipants = async (caseId: string | number): Promise<CaseParticipants> => {
    const contract = await getClerkContract();

    // Call getCaseSigners
    // Ethers v6 returns a Result object (array-like) for multiple return values
    const signers = await contract.getCaseSigners(BigInt(caseId));

    return {
        clerk: signers.clerk,
        judge: signers.judge,
        defence: signers.defence,
        prosecution: signers.prosecution
    };
};

/**
 * Fetches full details for a case
 */
export const getCaseDetails = async (caseId: string | number): Promise<CaseDetails> => {
    const contract = await getClerkContract();
    const c = await contract.cases(BigInt(caseId));

    // Map the struct returned by ethers v6
    return {
        id: c.id.toString(),
        linkedFirId: c.linkedFirId, // String
        title: c.title,
        accused: c.accused,
        filer: c.filer,
        status: Number(c.status), // Enum to number
        assignedJudge: c.assignedJudge,
        // Convert BigInt timestamp to Date string
        creationDate: new Date(Number(c.creationDate) * 1000).toLocaleString(),
        defence: c.defence,
        prosecution: c.prosecution,
        metaData: c.metaData,
        assignedClerk: c.assignedClerk
    };
};