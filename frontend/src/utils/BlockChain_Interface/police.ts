import { ethers } from "ethers";
import { supabase } from '@/integrations/supabase/client';

// Declare ethereum on window object
import { MetaMaskInpageProvider } from "@metamask/providers";

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}
// --- Configuration ---
// Access environment variables safely in Vite/React
const FIR_REGISTRY_ADDR = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const FIR_ABI = [
    // Writes
    "function fileFIR(string _fir_id, string _stationId, string[] _ipcSections, string _ipfsCid, string _accused, string _filer, bytes32 _contentHash) external returns (string)",
    "function addSupplementaryReport(string _firId, string _ipfsCid, bytes32 _contentHash) external",
    "function addProofLink(string _firId, string _link) external",

    // Reads
    "function getReportCount(string _firId) view returns (uint256)",
    "function getIpcSections(string _firId) view returns (string[])",
    "function firs(string _firId) view returns (string id, string stationId, string accused, string filer, string[] ipcSections, bool isForwarded, address filedBy, uint256[] reportIndexes)",
    "function allReports(uint256) view returns (string ipfsCid, bytes32 contentHash, uint256 timestamp, address filedBy, bool isSupplementary)",
    "function getallReportIds(string _firId) view returns (uint256[] memory)",
    "function getFirProofs(string _firId) view returns (string[] memory)",

    // Events
    "event FIRFiled(string indexed firId, string stationId, string[] ipcSections)",
    "event SupplementaryFiled(string indexed firId, uint256 reportId)",
    "event ProofAdded(string indexed firId, string url)"
];

// --- Internal Helper: Get Contract ---
const getContract = async (withSigner = false) => {
    if (!window.ethereum) throw new Error("MetaMask not found");
    // Standard Ethers v6 provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    const runner = withSigner ? await provider.getSigner() : provider;
    return new ethers.Contract(FIR_REGISTRY_ADDR, FIR_ABI, runner);
};

// --- API Functions ---

/**
 * Files a new FIR
 */
export const fileFir = async (
    firId: string, 
    stationId: string, 
    ipcSections: string[], 
    ipfsCid: string, 
    accused: string, 
    filer: string, 
    contentHash: string
): Promise<{ firId: string; txHash: string }> => { // <--- Changed Return Type
    try {
        const contract = await getContract(true);
        console.log(`Filing FIR with IPFS CID: ${ipfsCid}`);

        // 1. Send Transaction
        const tx = await contract.fileFIR(
            firId,
            stationId,
            ipcSections,
            ipfsCid, 
            accused,
            filer,
            contentHash
        );

        console.log("Transaction sent:", tx.hash);
        
        // 2. Wait for confirmation (Mining)
        const receipt = await tx.wait();

        // 3. Find the Event to get the official ID
        const event = receipt.logs
            .map((log: any) => { try { return contract.interface.parseLog(log); } catch (e) { return null; } })
            .find((e: any) => e && e.name === "FIRFiled");

        if (!event) throw new Error("FIRFiled event not found in receipt!");

        console.log("FIR Filed Successfully. ID:", event.args.firId);

        // 4. Return both ID and Hash
        return { 
            firId: event.args.firId, 
            txHash: receipt.hash // or tx.hash
        };

    } catch (error: any) {
        console.error("fileFir Error:", error);
        throw error;
    }
};
/**
 * NEW: Fetches all proof links for an FIR
 */
export const getFirProofs = async (firId: string): Promise<string[]> => {
    try {
        const contract = await getContract();
        const proofsProxy = await contract.getFirProofs(firId);
        return Array.from(proofsProxy);
    } catch (error) {
        console.error("getFirProofs Error:", error);
        return [];
    }
};

/**
 * Adds a supplementary report to an existing FIR
 */
export const addSupplementaryReport = async (firId: string, ipfsCid: string, contentHash: string): Promise<void> => {
    try {
        const contract = await getContract(true);
        const tx = await contract.addSupplementaryReport(firId, ipfsCid, contentHash);
        await tx.wait();
        console.log(`Supplementary report added to FIR #${firId}`);
    } catch (error: any) {
        console.error("addSupplementaryReport Error:", error);
        throw error;
    }
};

/**
 * Fetches basic FIR details AND Proofs
 */
export const getFirDetails = async (firId: string): Promise<any> => {
    try {
        const contract = await getContract();

        const data = await contract.firs(firId);
        if (!data.id) return null;

        const proofsProxy = await contract.getFirProofs(firId);
        const proofsArray = Array.from(proofsProxy);

        return {
            id: data.id,
            stationId: data.stationId,
            accused: data.accused,
            filer: data.filer,
            isForwarded: data.isForwarded,
            filedBy: data.filedBy,
            ipcSections: Array.from(data.ipcSections),
            proofs: proofsArray
        };
    } catch (error: any) {
        console.error("getFirDetails Error:", error);
        throw error;
    }
};

/**
 * Fetches all reports associated with an FIR
 */
export const getFirReports = async (firId: string): Promise<any[]> => {
    try {
        const contract = await getContract();
        const reportIds = await contract.getallReportIds(firId);
        const reports = [];

        for (const id of reportIds) {
            const report = await contract.allReports(id);
            reports.push({
                ipfsCid: report.ipfsCid,
                contentHash: report.contentHash,
                timestamp: report.timestamp.toString(),
                filedBy: report.filedBy,
                isSupplementary: report.isSupplementary
            });
        }
        return reports;
    } catch (error: any) {
        console.error("getFirReports Error:", error);
        return [];
    }
};

export const getAllReportDetails = async (firId: string): Promise<string[]> => {
    try {
        const contract = await getContract();
        const reportIds = await contract.getallReportIds(firId);

        const reportPromises = reportIds.map(async (id: any) => {
            const report = await contract.allReports(id);
            return report.ipfsCid;
        });

        return await Promise.all(reportPromises);
    } catch (error) {
        console.error("Error fetching report details:", error);
        return [];
    }
};

/**
 * Real-time listener for new FIRs
 */
export const listenForFirs = async (callback: (data: any) => void) => {
    const contract = await getContract();

    const handler = (firId: string, stationId: string, ipcSections: any[], event: any) => {
        callback({
            firId: firId,
            stationId,
            ipcSections: Array.from(ipcSections),
            txHash: event.log.transactionHash
        });
    };

    contract.on("FIRFiled", handler);
    return () => contract.off("FIRFiled", handler);
};


export const confirmFirOnChain = async (firId: string, txHash: string) => {
    const { error } = await supabase
        .from('firs')
        .update({ 
            is_on_chain: true,
            blockchain_tx_hash: txHash,
            status: 'Registered' // Ensure status is set
        })
        .eq('fir_number', firId); // Assuming fir_number matches the ID used on chain

    if (error) console.error("Error confirming FIR in DB:", error);
};