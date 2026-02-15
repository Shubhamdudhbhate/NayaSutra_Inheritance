# Smart Contracts Documentation

## Overview
This document provides comprehensive documentation for the NayaSutra blockchain smart contracts that power the digital court management system. These contracts ensure transparency, immutability, and proper access control for all judicial proceedings.

---

## 1. CourtAccessControl.sol

### Purpose
Central role management contract that extends OpenZeppelin's `AccessControl` to manage permissions for different judicial system participants. This contract ensures that only authorized users can perform specific actions within the court system.

### Contract Details
```solidity
contract CourtAccessControl is AccessControl
```

### Key Components

#### Role Definitions
```solidity
bytes32 public constant JUDGE_ROLE = keccak256("JUDGE_ROLE");
bytes32 public constant LAWYER_ROLE = keccak256("LAWYER_ROLE");
bytes32 public constant CLERK_ROLE = keccak256("CLERK_ROLE");
bytes32 public constant POLICE_ROLE = keccak256("POLICE_ROLE");
bytes32 public constant COURT_SYSTEM_ROLE = keccak256("COURT_SYSTEM_ROLE");
```

#### User Guide: Role Functions

| Function | What it Does | Who Can Use It | Simple Explanation |
|----------|--------------|----------------|-------------------|
| `isJudge(address)` | Checks if someone is a judge | Anyone | "Is this person a judge?" |
| `isLawyer(address)` | Checks if someone is a lawyer | Anyone | "Is this person a lawyer?" |
| `isPolice(address)` | Checks if someone is police | Anyone | "Is this person a police officer?" |
| `isCourtSytem(address)` | Checks if address is court system | Anyone | "Is this a court system contract?" |

#### Admin Functions (Inherited from AccessControl)
- `grantRole(bytes32 role, address account)` - Give someone a role
- `revokeRole(bytes32 role, address account)` - Take away someone's role
- `hasRole(bytes32 role, address account)` - Check if someone has a role

### Real-World Usage
```javascript
// Example: Check if a user can perform judge actions
if (await courtAccess.isJudge(userAddress)) {
    // Allow judge actions
    console.log("User is a judge");
} else {
    // Deny access
    console.log("User is not a judge");
}
```

---

## 2. FIRRegistry.sol

### Purpose
Manages First Information Reports (FIRs) - the initial police report filed when a crime is reported. This contract creates an immutable, tamper-proof record of all police investigations with support for supplementary reports and evidence.

### Contract Details
```solidity
contract FIRRegistry
```

### Key Structures

#### Report Struct
```solidity
struct Report {
    string ipfsCid;          // IPFS hash of encrypted PDF document
    bytes32 contentHash;     // Digital fingerprint for verification
    uint256 timestamp;       // When the report was filed
    address filedBy;         // Police officer who filed it
    bool isSupplementary;    // True for updates, false for original FIR
}
```

#### FIR Struct
```solidity
struct FIR {
    string id;               // Unique FIR number (e.g., "FIR-2024-001")
    string stationId;        // Police station identifier
    string accused;          // Name of accused person
    string filer;            // Name of person filing report
    string[] ipcSections;    // Legal sections violated (e.g., ["420", "304"])
    bool isForwarded;        // True once sent to court (then locked)
    address filedBy;         // Police officer who filed FIR
    uint256[] reportIndexes; // List of all report IDs for this FIR
}
```

### User Guide: Police Functions

#### `fileFIR()` - File a New Police Report
**When to Use**: When a crime is first reported at the police station

**What You Need**:
- FIR number (e.g., "FIR-2024-001")
- Police station ID
- List of IPC sections violated
- IPFS hash of the FIR document (encrypted PDF)
- Name of accused person
- Name of person filing the report
- Digital fingerprint of the document

**What Happens**:
1. Creates a new FIR record
2. Links the first police report
3. Makes the FIR publicly viewable (but not editable)

**Example**:
```javascript
// Police officer files a new FIR
const result = await firRegistry.fileFIR(
    "FIR-2024-001",           // FIR number
    "PS-Downtown",           // Police station
    ["420", "506"],          // IPC sections (cheating, criminal intimidation)
    "QmXyz...ipfs",          // IPFS hash of FIR document
    "John Doe",              // Accused name
    "Jane Smith",            // Complainant name
    "0xabc123..."            // Document hash
);
console.log("FIR filed:", result);
```

#### `addSupplementaryReport()` - Add Updates to Existing FIR
**When to Use**: When new evidence or information comes up after the initial FIR

**What You Need**:
- FIR number to update
- IPFS hash of the supplementary document
- Digital fingerprint of the new document

**Important**: You can only add supplementary reports BEFORE the FIR is sent to court!

**Example**:
```javascript
// Add new evidence to existing FIR
await firRegistry.addSupplementaryReport(
    "FIR-2024-001",          // Existing FIR
    "QmSupplementary...ipfs", // New document
    "0xdef456..."            // New document hash
);
```

#### `addProofLink()` - Add Evidence Links
**When to Use**: To add links to digital evidence (photos, videos, documents)

**What You Need**:
- FIR number
- URL or IPFS link to evidence

**Example**:
```javascript
// Add photo evidence
await firRegistry.addProofLink(
    "FIR-2024-001",
    "https://storage.example.com/evidence/photo1.jpg"
);
```

### User Guide: View Functions

| Function | What it Returns | When to Use |
|----------|----------------|-------------|
| `getReportCount(firId)` | Number of reports for this FIR | Check how many reports exist |
| `getIpcSections(firId)` | List of legal sections | See what laws were broken |
| `getallReportIds(firId)` | All report IDs | Get all report numbers |
| `getFirProofs(firId)` | All evidence links | View all evidence |

### Workflow Example
```
1. Crime Reported → Police files FIR #1 (fileFIR)
   └─ Creates FIR with initial Report #1
   
2. New Evidence Found → Police adds supplementary report (addSupplementaryReport)
   └─ Adds Report #2 to FIR #1
   
3. Case Goes to Court → Clerk creates court case
   └─ Calls markForwarded("FIR-2024-001", caseId)
   └─ FIR #1 now locked forever, no more changes allowed
```

---

## 3. CourtSession.sol

### Purpose
The heart of the court system - manages case creation, role assignments, session scheduling, and recording of all court proceedings. This contract ensures proper judicial process and maintains an immutable record of all court activities.

### Key Structures

#### Case Status
```solidity
enum CaseStatus {
    CREATED,        // Case just created, waiting for assignments
    PRE_TRIAL,      // Pre-trial motions and preparations
    IN_SESSION,     // Active court proceedings
    CLOSED          // Case concluded
}
```

#### Case Struct
```solidity
struct Case {
    string id;                  // Case number (e.g., "CASE-2024-001")
    string linkedFirId;         // Reference to FIR (if criminal case)
    string title;               // Case title/name
    string accused;             // Name of accused (from FIR)
    string filer;               // Name of complainant (from FIR)
    CaseStatus status;          // Current case status
    address assignedJudge;      // Judge's Ethereum address
    uint256 creationDate;       // When case was created
    address defence;            // Defence lawyer's address
    address prosecution;        // Prosecution lawyer's address
    uint256 nextSessionId;      // ID for next scheduled session
    string metaData;            // Additional case information (JSON)
    address assignedClerk;       // Clerk who created the case
}
```

#### Session Details
```solidity
struct SessionDetails {
    uint256 sessionId;          // Session number for this case
    uint256 scheduledDate;      // When the hearing is scheduled
    string description;         // What will be discussed
    bool isConcluded;           // Whether hearing is finished
}
```

#### Completed Session
```solidity
struct CurrSession {
    string caseId;              // Associated case
    uint256 sessionId;           // Session number
    string ipfsCid;              // IPFS hash of session recording
    bool isAdjourned;           // True if postponed, false if finished
    uint256 startTimestamp;     // When session started
    uint256 endTimestamp;       // When session ended
}
```

### User Guide: Clerk Functions

#### `createCase()` - Create New Court Case
**When to Use**: When starting a new legal case (civil or criminal)

**What You Need**:
- Case number (e.g., "CASE-2024-001")
- Case title
- FIR number (for criminal cases, empty for civil)
- Prosecution lawyer's address
- Defence lawyer's address
- Judge's address
- Additional case information

**What Happens**:
1. Creates the case record
2. Links to FIR if provided
3. Assigns all participants
4. Sets status to "CREATED"
5. Marks FIR as forwarded (if criminal case)

**Example**:
```javascript
// Clerk creates a new case
await courtSession.createCase(
    "CASE-2024-001",          // Case number
    "State vs John Doe",      // Case title
    "FIR-2024-001",           // Linked FIR (empty for civil cases)
    "0xprosecution...",       // Prosecution lawyer address
    "0xdefence...",           // Defence lawyer address
    "0xjudge...",             // Judge address
    '{"type": "criminal", "severity": "high"}' // Case metadata
);
```

#### `reassignJudge()` - Change the Judge
**When to Use**: When the current judge cannot continue (transfer, retirement, etc.)

**What You Need**:
- Case number
- New judge's address

**Example**:
```javascript
await courtSession.reassignJudge(
    "CASE-2024-001",
    "0xnewJudge..."
);
```

#### `reassignLawyer()` - Change a Lawyer
**When to Use**: When replacing prosecution or defence lawyer

**What You Need**:
- Case number
- New lawyer's address
- Role: "defence" or "prosecution"

**Example**:
```javascript
// Replace defence lawyer
await courtSession.reassignLawyer(
    "CASE-2024-001",
    "0xnewDefenceLawyer...",
    "defence"
);
```

### User Guide: Judge Functions

#### `scheduleSession()` - Schedule Court Hearing
**When to Use**: To set a date for the next court session

**What You Need**:
- Case number
- Date and time (Unix timestamp)
- Description of what will be discussed

**What Happens**:
1. Creates a new session entry
2. Sets the case status to "IN_SESSION"
3. Increments session counter

**Example**:
```javascript
// Schedule hearing for next month
const nextMonth = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
await courtSession.scheduleSession(
    "CASE-2024-001",
    nextMonth,
    "Hearing on bail application and evidence review"
);
```

#### `finalizeSession()` - End Court Session
**When to Use**: After a court session is completed

**What You Need**:
- Case number
- IPFS hash of session recording/transcript
- Whether the session was adjourned (postponed)
- Session start time
- Session end time

**What Happens**:
1. Records the session details
2. Stores the IPFS hash of proceedings
3. Updates case status
4. Emits event for public record

**Example**:
```javascript
const startTime = Math.floor(Date.now() / 1000) - (2 * 60 * 60); // 2 hours ago
const endTime = Math.floor(Date.now() / 1000); // Now

await courtSession.finalizeSession(
    "CASE-2024-001",
    "QmSessionRecording...ipfs",  // IPFS hash of recording
    false,                        // Not adjourned - session completed
    startTime,                    // Session started 2 hours ago
    endTime                       // Session ended now
);
```

#### `addProofLink()` - Add Case Evidence
**When to Use**: To add evidence links to the case record

**What You Need**:
- Case number
- Evidence URL or IPFS link

**Example**:
```javascript
await courtSession.addProofLink(
    "CASE-2024-001",
    "https://storage.example.com/evidence/document.pdf"
);
```

#### `updateNextSessionState()` - Modify Scheduled Session
**When to Use**: When you need to change the date or description of a scheduled session

**What You Need**:
- Case number
- Session ID
- New date
- New description

**Example**:
```javascript
await courtSession.updateNextSessionState(
    "CASE-2024-001",
    1,                           // Session ID 1
    newDate,                     // New date (Unix timestamp)
    "Updated: Additional witnesses to be examined"
);
```

### User Guide: View Functions

| Function | What it Returns | When to Use |
|----------|----------------|-------------|
| `getCaseSigners(caseId)` | All participant addresses | Get judge, lawyers, clerk for case |
| `getSessionDetails(caseId, sessionId)` | Session information | Get details of a past session |
| `getNextSessionDetails(caseId)` | Upcoming session info | See when next hearing is scheduled |
| `getCaseProofLinks(caseId)` | All evidence links | View all case evidence |

### Complete Case Workflow
```
1. Case Creation (Clerk)
   └─ createCase() → Links FIR, assigns participants

2. Pre-trial Setup (Judge)
   └─ scheduleSession() → Sets first hearing date

3. Court Proceedings (Judge)
   └─ finalizeSession() → Records each hearing
   └─ addProofLink() → Adds evidence during trial

4. Case Conclusion
   └─ Multiple finalizeSession() calls until case resolved
   └─ Case status changes to CLOSED
```

---

## Cross-Contract Integration

### How Contracts Work Together

```
CourtAccessControl (Base Contract)
  ↑
  ├─ FIRRegistry (uses for police role checks)
  ├─ CourtSession (uses for all role checks)
  └─ All contracts check roles before allowing actions

FIRRegistry (Police Records)
  ↑
  └─ CourtSession (reads FIR data when creating criminal cases)

CourtSession (Case Management)
  ↑
  └─ Central hub - coordinates with all other contracts
```

### Data Flow Example
```
1. Police files FIR → FIRRegistry
2. Clerk creates case → CourtSession reads from FIRRegistry
3. All role checks → CourtAccessControl
4. Case proceedings → CourtSession
5. Evidence storage → Links to IPFS/cloud storage
```

---

## Security Features

### Access Control
- **Role-based permissions**: Only authorized users can perform actions
- **Immutable records**: Once forwarded to court, FIRs cannot be changed
- **Audit trail**: All actions emit events for transparency

### Data Integrity
- **Content hashes**: All documents verified with digital fingerprints
- **IPFS integration**: Decentralized storage for court records
- **Timestamp tracking**: All actions recorded with block timestamps

### Event Logging
Every important action emits an event:
- `FIRFiled` - New FIR created
- `CaseCreated` - New case started
- `SessionPublished` - Court session completed
- `JudgeAssigned` - Judge assigned to case
- `LawyerAssigned` - Lawyer assigned to case

---

## Frontend Integration Guide

### Basic Setup
```javascript
// Contract addresses (replace with your deployed addresses)
const COURT_ACCESS_CONTROL = "0x123...";
const FIR_REGISTRY = "0x456...";
const COURT_SESSION = "0x789...";

// Connect to contracts
const accessControl = new ethers.Contract(COURT_ACCESS_CONTROL, accessControlABI, signer);
const firRegistry = new ethers.Contract(FIR_REGISTRY, firRegistryABI, signer);
const courtSession = new ethers.Contract(COURT_SESSION, courtSessionABI, signer);
```

### Common Patterns

#### Check User Role
```javascript
const isJudge = await accessControl.isJudge(userAddress);
const isLawyer = await accessControl.isLawyer(userAddress);
const isPolice = await accessControl.isPolice(userAddress);
```

#### Handle Transactions
```javascript
try {
    const tx = await courtSession.createCase(/* params */);
    await tx.wait(); // Wait for confirmation
    console.log("Case created successfully");
} catch (error) {
    console.error("Transaction failed:", error);
}
```

#### Listen to Events
```javascript
// Listen for new cases
courtSession.on("CaseCreated", (caseId, title, firId) => {
    console.log(`New case: ${caseId} - ${title}`);
    // Update UI
});

// Listen for new FIRs
firRegistry.on("FIRFiled", (firId, stationId, ipcSections) => {
    console.log(`New FIR: ${firId} at ${stationId}`);
    // Update UI
});
```

---

## Best Practices

### For Developers
1. **Always check roles** before performing actions
2. **Handle transaction errors** gracefully
3. **Use events** to update UI in real-time
4. **Validate inputs** before sending transactions
5. **Keep gas costs** in mind for complex operations

### For Court Staff
1. **Double-check addresses** when assigning roles
2. **Keep IPFS hashes** secure and accessible
3. **Document metadata** should be well-structured JSON
4. **Regular backups** of important documents
5. **Follow proper judicial procedures** in the system

### For Police
1. **File FIRs promptly** after crime reports
2. **Add supplementary reports** before court forwarding
3. **Maintain evidence links** for transparency
4. **Ensure document integrity** with proper hashing

---

## Troubleshooting

### Common Issues

#### "Only Clerk" Error
- **Cause**: Non-clerk trying to perform clerk actions
- **Solution**: Ensure user has CLERK_ROLE

#### "FIR already exists" Error
- **Cause**: Trying to create FIR with duplicate ID
- **Solution**: Use unique FIR numbers

#### "Cannot update after forwarding" Error
- **Cause**: Trying to modify FIR after court creation
- **Solution**: Make all changes before creating court case

#### Gas Issues
- **Cause**: Complex transactions with multiple operations
- **Solution**: Break into smaller transactions or increase gas limit

### Debug Tips
1. **Check event logs** for transaction details
2. **Verify role assignments** in CourtAccessControl
3. **Confirm contract addresses** are correct
4. **Use testnet** before mainnet deployment

---

## Conclusion

These smart contracts provide a robust, transparent foundation for digital court proceedings. By combining role-based access control, immutable record-keeping, and decentralized storage, the NayaSutra system ensures judicial integrity while modernizing court operations.

The modular design allows for future enhancements while maintaining backward compatibility, and the comprehensive event logging provides complete audit trails for all judicial activities.
