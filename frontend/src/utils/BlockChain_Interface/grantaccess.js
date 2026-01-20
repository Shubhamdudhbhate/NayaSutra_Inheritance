import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
let a = ""///hardcoded for testing purpose later will come from .env vars..
const abi = [
    // Role Constants (Getters for the keccak256 hashes)
    "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
    "function JUDGE_ROLE() view returns (bytes32)",
    "function LAWYER_ROLE() view returns (bytes32)",
    "function CLERK_ROLE() view returns (bytes32)",
    "function POLICE_ROLE() view returns (bytes32)",
    "function COURT_SYSTEM_ROLE() view returns (bytes32)",

    // Role Management
    "function grantRole(bytes32 role, address account) external",
    "function revokeRole(bytes32 role, address account) external",
    "function hasRole(bytes32 role, address account) view returns (bool)",

    // Your Custom View Functions
    "function isJudge(address _user) view returns (bool)",
    "function isLawyer(address _user) view returns (bool)",
    "function isPolice(address _user) view returns (bool)",
    "function isCourtSytem(address _user) view returns (bool)"
];
// access.grantRole(access.POLICE_ROLE(), deployer);
export const grantAccess = async () => {
    if (!window.ethereum) throw new Error("MetaMask not found");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(a, abi, signer);
    const POLICE_ROLE = await contract.POLICE_ROLE();
    const userAddress = await signer.getAddress();
    const tx = await contract.grantRole(POLICE_ROLE, userAddress);
    console.log("Granting POLICE_ROLE to", userAddress, "Transaction Hash:", tx.hash);
    await tx.wait();
    console.log("POLICE_ROLE granted successfully to", userAddress);
}