import { ethers } from "ethers";

import { MetaMaskInpageProvider } from "@metamask/providers";



declare global {

  interface Window {

    ethereum?: MetaMaskInpageProvider;

  }

}

// --- Configuration ---

// Safely access Vite environment variables

const COURT_ADDR = import.meta.env.VITE_COURT_ADDR || "";



const JUDGE_ABI = [
    // Writes
    "function scheduleSession(string _caseId, uint256 _date, string _desc) external",
    "function finalizeSession(string _caseId, string _ipfsCid, bool _isAdjourned, uint256 _startTimestamp, uint256 _endTimestamp) external",
    "function addProofLink(string _caseId, string _proofLink) external",
    "function setCaseStatus(string _caseId, uint8 _status) external",
    "function updateNextSessionState(string _caseId, uint256 _sessionId, uint256 _newDate, string _description) external",

    // Reads
    "function getNextSessionDetails(string _caseId) view returns (tuple(uint256 sessionId, uint256 scheduledDate, string description, bool isConcluded))",
    "function getSessionDetails(string _caseId, uint256 _sessionId) view returns (tuple(string caseId, uint256 sessionId, string ipfsCid, bool isAdjourned, uint256 startTimestamp, uint256 endTimestamp))",
    "function getCaseSigners(string _caseId) view returns (address clerk, address judge, address defence, address prosecution)",
    "function getCaseProofLinks(string _caseId) view returns (string[] memory)"
];



// --- Types ---

export interface SessionRecord {

    caseId: string;

    sessionId: string;

    ipfsCid: string;

    adjourned: boolean;

    start: string; // Formatted Date String

    end: string;   // Formatted Date String or "In Progress"

}



export interface CaseParticipants {

    clerk: string;

    judge: string;

    defence: string;

    prosecution: string;

}



// --- Internal Helper ---

const getJudgeContract = async (): Promise<ethers.Contract> => {
    if (!window.ethereum) throw new Error("Wallet not found");
    
    // Validate contract address is configured
    if (!COURT_ADDR || COURT_ADDR === "") {
        throw new Error(
            "VITE_COURT_ADDR is not configured. " +
            "Please set the deployed contract address in your .env.local file"
        );
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(COURT_ADDR, JUDGE_ABI, signer);
};



// --- API Functions ---



/**

 * Schedules a new hearing for a case

 */

export const judgeScheduleHearing = async (

    caseId: string | number, 

    unixTimestamp: number, 

    description: string

): Promise<ethers.ContractTransactionReceipt | null> => {

    const contract = await getJudgeContract();

    console.log(`Scheduling Case #${caseId} for ${new Date(unixTimestamp * 1000).toLocaleString()}`);

    const tx = await contract.scheduleSession(

        caseId.toString(),

        BigInt(unixTimestamp),

        description

    );

    console.log("Tx Sent:", tx.hash);

    return await tx.wait();

};



/**

 * Fetches details of a specific session

 */

export const getSessionRecord = async (caseId: string | number, sessionId: string | number): Promise<SessionRecord> => {

    const contract = await getJudgeContract();



    // Fetch Struct

    // Ethers v6 returns a Result object (array-like) for structs

    const s = await contract.getSessionDetails(caseId.toString(), BigInt(sessionId));



    // Ethers v6 returns BigInts for uint256

    const endTimestamp = s.endTimestamp; // BigInt

    const isEnded = endTimestamp > 0n;



    return {

        caseId: s.caseId.toString(),

        sessionId: s.sessionId.toString(),

        ipfsCid: s.ipfsCid,

        adjourned: s.isAdjourned,

        // Convert BigInt to Number for Date (safe for timestamps < 2^53)

        start: new Date(Number(s.startTimestamp) * 1000).toLocaleString(),

        end: isEnded ? new Date(Number(endTimestamp) * 1000).toLocaleString() : "In Progress (Live)"

    };

};



/**

 * Fetches the participants (Judge, Lawyers, Clerk) for a case

 */

export const getCaseParticipants = async (caseId: string | number): Promise<CaseParticipants> => {

    const contract = await getJudgeContract();

    // Destructure Result object from getCaseSigners

    const signers = await contract.getCaseSigners(caseId.toString());



    return {

        clerk: signers.clerk,

        judge: signers.judge,

        defence: signers.defence,

        prosecution: signers.prosecution

    };

};



/**
 * Updates the state of the next session for a case
 */
export const judgeUpdateNextSession = async (
    caseId: string | number,
    sessionId: string | number,
    unixTimestamp: number,
    description: string
): Promise<ethers.ContractTransactionReceipt | null> => {
    const contract = await getJudgeContract();
    
    console.log(`Updating next session for Case #${caseId}, Session #${sessionId} to ${new Date(unixTimestamp * 1000).toLocaleString()}`);
    
    const tx = await contract.updateNextSessionState(
        caseId.toString(),
        BigInt(sessionId),
        BigInt(unixTimestamp),
        description
    );
    
    console.log("Tx Sent:", tx.hash);
    return await tx.wait();
};

/**
 * Finalizes a session in a single transaction (merges start and end)
 * Frontend provides timestamps and IPFS CID with all session data
 */
export const judgeFinalizeSession = async (
    caseId: string | number,
    ipfsCid: string,
    isAdjourned: boolean,
    startTimestamp: number,
    endTimestamp: number
): Promise<ethers.ContractTransactionReceipt | null> => {
    const contract = await getJudgeContract();
    
    console.log(`Finalizing session for Case #${caseId}`);
    console.log(`CID: ${ipfsCid}, Start: ${new Date(startTimestamp * 1000).toLocaleString()}, End: ${new Date(endTimestamp * 1000).toLocaleString()}`);
    
    const tx = await contract.finalizeSession(
        caseId.toString(),
        ipfsCid,
        isAdjourned,
        BigInt(startTimestamp),
        BigInt(endTimestamp)
    );
    
    console.log("Tx Sent:", tx.hash);
    return await tx.wait();
};

/**
 * Adds a proof link (IPFS CID) to the case on blockchain
 * Called when evidence is accepted in the review vault
 */
export const judgeAddProofLink = async (
    caseId: string | number,
    proofLink: string
): Promise<ethers.ContractTransactionReceipt | null> => {
    const contract = await getJudgeContract();
    
    console.log(`Adding proof link for Case #${caseId}: ${proofLink}`);
    
    const tx = await contract.addProofLink(
        caseId.toString(),
        proofLink
    );
    
    console.log("Tx Sent:", tx.hash);
    return await tx.wait();
};

/**
 * Fetches all proof links for a case
 */
export const getCaseProofLinks = async (caseId: string | number): Promise<string[]> => {
    const contract = await getJudgeContract();
    const links = await contract.getCaseProofLinks(caseId.toString());
    return links;
};