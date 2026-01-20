import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

// --- Configuration ---
const COURT_ADDR = ""; // TODO: Fill Address after deployment

const JUDGE_ABI = [
    // Writes
    "function scheduleSession(uint256 _caseId, uint256 _date, string _desc) external",
    "function startSession(uint256 _caseId) external",
    "function endSession(uint256 _caseId, string _ipfsCid, bool _isAdjourned) external",
    "function setCaseStatus(uint256 _caseId, uint8 _status) external",

    // Reads
    "function getNextSessionDetails(uint256 _caseId) view returns (tuple(uint256 sessionId, uint256 scheduledDate, string description, bool isConcluded))",
    "function getSessionDetails(uint256 _caseId, uint256 _sessionId) view returns (tuple(uint256 caseId, uint256 sessionId, string ipfsCid, bool isAdjourned, uint256 startTimestamp, uint256 endTimestamp))",
    "function getCaseSigners(uint256 _caseId) view returns (address clerk, address judge, address defence, address prosecution)"

];

// --- Internal Helper ---
const getJudgeContract = async () => {
    if (!window.ethereum) throw new Error("Wallet not found");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(COURT_ADDR, JUDGE_ABI, signer);
};

// --- API Functions ---

export const judgeScheduleHearing = async (caseId, unixTimestamp, description) => {
    const contract = await getJudgeContract();
    console.log(`Scheduling Case #${caseId} for ${new Date(unixTimestamp * 1000).toLocaleString()}`);

    const tx = await contract.scheduleSession(
        BigInt(caseId),
        BigInt(unixTimestamp),
        description
    );
    console.log("Tx Sent:", tx.hash);
    return await tx.wait();
};

export const judgeStartHearing = async (caseId) => {
    const contract = await getJudgeContract();
    const tx = await contract.startSession(BigInt(caseId));
    console.log("Tx Sent:", tx.hash);
    return await tx.wait();
};

export const judgeEndHearing = async (caseId, ipfsCid, isAdjourned) => {
    const contract = await getJudgeContract();
    const tx = await contract.endSession(BigInt(caseId), ipfsCid, isAdjourned);
    console.log("Tx Sent:", tx.hash);
    return await tx.wait();
};

export const getSessionRecord = async (caseId, sessionId) => {
    const contract = await getJudgeContract();

    // Fetch Struct
    const s = await contract.getSessionDetails(BigInt(caseId), BigInt(sessionId));

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

export const getCaseParticipants = async (caseId) => {
    const contract = await getJudgeContract();
    // Destructure Result object from getCaseSigners
    const signers = await contract.getCaseSigners(BigInt(caseId));

    return {
        clerk: signers.clerk,
        judge: signers.judge,
        defence: signers.defence,
        prosecution: signers.prosecution
    };
};