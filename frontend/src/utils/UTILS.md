# Frontend Utils Documentation

## Overview
This document provides comprehensive documentation for all utility functions in the NayaSutra frontend application. These utilities handle blockchain interactions, file storage, evidence management, and integration with the smart contracts.

---

## Directory Structure

```
src/utils/
├── BlockChain_Interface/
│   ├── clerk.ts           # Clerk blockchain operations
│   ├── judge.ts           # Judge blockchain operations  
│   ├── police.ts          # Police blockchain operations
│   ├── evidenceContract.ts # Evidence submission contracts
│   ├── evidenceManager.ts # Evidence workflow manager
│   ├── evidenceUtils.ts   # Evidence helper functions
│   └── grantAccess.ts    # Access control utilities
└── storage/
    ├── ipfsUploadUtils.ts    # IPFS/Pinata file uploads
    ├── stagingUploadUtils.ts  # Cloudinary staging uploads
    └── cloudinaryFolderUtils.ts # Cloudinary folder management
```

---

## Blockchain Interface Utilities

### 1. Clerk Operations (`clerk.ts`)

**Purpose**: Handles all clerk-specific blockchain interactions including case creation and role assignments.

#### Key Functions

##### `clerkCreateCase()`
**When to Use**: Creating a new court case with all participants assigned

**Parameters**:
- `caseId`: Unique case identifier (e.g., "CASE-2024-001")
- `title`: Case title
- `firIdString`: Linked FIR ID (empty for civil cases)
- `prosecutionAddress`: Prosecution lawyer's Ethereum address
- `defenceAddress`: Defence lawyer's Ethereum address  
- `judgeAddress`: Judge's Ethereum address
- `metaData`: Additional case information (JSON string)

**Returns**: `{ txHash: string }`

**Workflow**:
1. Validates all Ethereum addresses
2. Calls `createCase()` on smart contract
3. Parses transaction receipt for CaseCreated event
4. Returns transaction hash

**Example**:
```typescript
const result = await clerkCreateCase(
    "CASE-2024-001",
    "State vs John Doe",
    "FIR-2024-001",
    "0xprosecution...",
    "0xdefence...", 
    "0xjudge...",
    '{"type": "criminal", "severity": "high"}'
);
console.log("Case created:", result.txHash);
```

##### `clerkReassignLawyer()`
**When to Use**: Replacing a lawyer on an existing case

**Parameters**:
- `caseId`: Case identifier
- `lawyerAddress`: New lawyer's Ethereum address
- `role`: "defence" or "prosecution"

**Returns**: Transaction receipt or null

##### `clerkReassignJudge()`
**When to Use**: Reassigning a judge to an existing case

**Parameters**:
- `caseId`: Case identifier
- `judgeAddress`: New judge's Ethereum address

**Returns**: Transaction receipt or null

##### `getCaseDetails()`
**When to Use**: Retrieving complete case information from blockchain

**Parameters**: `caseId`: Case identifier

**Returns**: `CaseDetails` object with all case information including formatted dates

##### `getCaseParticipants()`
**When to Use**: Getting all assigned participants for a case

**Parameters**: `caseId`: Case identifier

**Returns**: `CaseParticipants` with clerk, judge, defence, prosecution addresses

---

### 2. Judge Operations (`judge.ts`)

**Purpose**: Manages judge-specific blockchain operations including session scheduling and finalization.

#### Key Functions

##### `judgeScheduleHearing()`
**When to Use**: Scheduling a new court hearing

**Parameters**:
- `caseId`: Case identifier
- `unixTimestamp`: Date/time for hearing (Unix timestamp)
- `description`: Hearing agenda/description

**Returns**: Transaction receipt

**Example**:
```typescript
const nextMonth = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
const receipt = await judgeScheduleHearing(
    "CASE-2024-001",
    nextMonth,
    "Bail application hearing"
);
```

##### `judgeFinalizeSession()`
**When to Use**: Completing a court session with recording

**Parameters**:
- `caseId`: Case identifier
- `ipfsCid`: IPFS hash of session recording
- `isAdjourned`: Whether session was postponed
- `startTimestamp`: Session start time
- `endTimestamp`: Session end time

**Returns**: Transaction receipt

**Workflow**: This single function replaces separate start/end session calls, providing all session data in one transaction.

##### `judgeUpdateNextSession()`
**When to Use**: Modifying a scheduled session (date change, description update)

**Parameters**:
- `caseId`: Case identifier
- `sessionId`: Session to modify
- `unixTimestamp`: New date/time
- `description`: Updated description

**Returns**: Transaction receipt

##### `getSessionRecord()`
**When to Use**: Retrieving details of a completed session

**Parameters**:
- `caseId`: Case identifier
- `sessionId`: Session identifier

**Returns**: `SessionRecord` with formatted dates and IPFS information

---

### 3. Police Operations (`police.ts`)

**Purpose**: Handles police-specific blockchain operations for FIR management.

#### Key Functions

##### `fileFir()`
**When to Use**: Filing a new First Information Report

**Parameters**:
- `firId`: Unique FIR identifier
- `stationId`: Police station identifier
- `ipcSections`: Array of legal sections violated
- `ipfsCid`: IPFS hash of FIR document
- `accused`: Name of accused person
- `filer`: Name of person filing report
- `contentHash`: Document integrity hash

**Returns**: `{ firId: string, txHash: string }`

**Workflow**:
1. Uploads document to IPFS via Pinata
2. Calls `fileFIR()` on smart contract
3. Parses transaction receipt for FIRFiled event
4. Updates Supabase with blockchain confirmation

##### `addSupplementaryReport()`
**When to Use**: Adding additional evidence to existing FIR

**Parameters**:
- `firId`: FIR identifier
- `ipfsCid`: IPFS hash of supplementary document
- `contentHash`: Document integrity hash

**Returns**: void

**Important**: Can only be called before FIR is forwarded to court.

##### `getFirDetails()`
**When to Use**: Retrieving complete FIR information with all proofs

**Parameters**: `firId`: FIR identifier

**Returns**: FIR object with details and proof links array

---

### 4. Evidence Management (`evidenceManager.ts`)

**Purpose**: High-level evidence submission workflow that combines storage and blockchain operations.

#### Key Functions

##### `submitEvidence()`
**When to Use**: Complete evidence submission workflow

**Parameters**:
- `caseId`: Case identifier
- `file`: Evidence file
- `metaData`: Optional metadata
- `lawyerSignature`: Optional lawyer signature for access

**Returns**: `SubmitEvidenceResult` with all submission details

**Workflow**:
1. Validates file size and type
2. Calculates file integrity hash
3. Uploads to Cloudinary staging
4. Submits to blockchain evidence contract
5. Returns complete submission record

**Example**:
```typescript
const result = await submitEvidence({
    caseId: "CASE-2024-001",
    file: evidenceFile,
    metaData: "Witness testimony PDF"
});

if (result.success) {
    console.log("Evidence submitted:", result.submissionId);
    console.log("IPFS CID:", result.cloudUrl);
}
```

##### `createWitnessPermit()`
**When to Use**: Generating access permits for witnesses to submit evidence

**Parameters**:
- `caseId`: Case identifier
- `witnessAddress`: Witness's Ethereum address

**Returns**: Signature string for witness to use

---

## Storage Utilities

### 1. IPFS Upload (`ipfsUploadUtils.ts`)

**Purpose**: Handles file uploads to IPFS via Pinata service for permanent, decentralized storage.

#### Key Functions

##### `uploadToPinata()`
**When to Use**: Uploading files to IPFS for permanent storage

**Parameters**:
- `file`: Browser File object
- `caseId`: Used for organization in Pinata dashboard

**Returns**: `IpfsUploadResponse` with CID and metadata

**Features**:
- Automatic file type detection
- 100MB file size limit
- CID version 1 (latest/safer)
- Metadata tagging with case ID and upload date

**Example**:
```typescript
const result = await uploadToPinata(file, "CASE-2024-001");
console.log("IPFS CID:", result.cid);
console.log("View URL:", result.ipfsUrl);
```

##### `uploadJsonToPinata()`
**When to Use**: Uploading JSON data (session finalization, metadata)

**Parameters**:
- `jsonData`: JSON object to upload
- `name`: Filename for the upload
- `metadata`: Optional additional metadata

**Returns**: `JsonUploadResponse` with CID

##### `resolveIpfsUrl()`
**When to Use**: Converting IPFS CID to viewable URL

**Parameters**: `cid`: IPFS content identifier

**Returns**: Gateway URL for viewing content

##### `getEvidenceType()`
**When to Use**: Automatically detecting evidence type from file MIME type

**Parameters**: `file`: Browser File object

**Returns**: Evidence type ('DOCUMENT', 'AUDIO', 'VIDEO', 'IMAGE', 'OTHER')

**Type Mapping**:
- `image/*` → 'IMAGE'
- `video/*` → 'VIDEO'  
- `audio/*` → 'AUDIO'
- `application/pdf`, `wordprocessingml`, `text/plain`, `csv` → 'DOCUMENT'
- Everything else → 'OTHER'

---

### 2. Staging Upload (`stagingUploadUtils.ts`)

**Purpose**: Handles temporary file uploads to Cloudinary for evidence review and staging.

#### Key Functions

##### `uploadToCloudinary()`
**When to Use**: Uploading files for evidence review before blockchain submission

**Parameters**:
- `file`: Browser File object
- `caseId`: Used for folder organization

**Returns**: Upload response with secure URL and metadata

**Features**:
- Automatic folder creation: `staging_evidence/{caseId}`
- File type detection
- 100MB file size limit
- Integration with Cloudinary upload presets

**Example**:
```typescript
const result = await uploadToCloudinary(file, "CASE-2024-001");
console.log("Staging URL:", result.secure_url);
```

---

## Essential Workflow Functions

### Complete Case Creation Workflow

```typescript
// 1. Clerk creates case
const caseResult = await clerkCreateCase(
    caseId,
    title,
    firId,
    prosecutionAddress,
    defenceAddress,
    judgeAddress,
    metadata
);

// 2. Judge schedules first hearing
const hearingResult = await judgeScheduleHearing(
    caseId,
    scheduledTimestamp,
    "Initial hearing and arraignment"
);

// 3. Participants can now submit evidence
const evidenceResult = await submitEvidence({
    caseId,
    evidenceFile,
    "Initial evidence submission"
});
```

### FIR to Court Workflow

```typescript
// 1. Police files FIR
const firResult = await fileFir(
    firId,
    stationId,
    ipcSections,
    ipfsCid,
    accused,
    filer,
    contentHash
);

// 2. Clerk creates linked court case
const caseResult = await clerkCreateCase(
    caseId,
    title,
    firId, // Links to the FIR above
    prosecutionAddress,
    defenceAddress,
    judgeAddress,
    metadata
);
```

### Evidence Submission Workflow

```typescript
// 1. Upload file to staging (review)
const stagingResult = await uploadToCloudinary(file, caseId);

// 2. Submit to blockchain (permanent)
const evidenceResult = await submitEvidence({
    caseId,
    file,
    metaData,
    lawyerSignature // Optional access permit
});

// 3. Judge reviews and accepts evidence
// (Handled in evidence review interface)
```

### Session Management Workflow

```typescript
// 1. Schedule hearing
await judgeScheduleHearing(caseId, date, "Bail hearing");

// 2. Start session (automatic when scheduled time arrives)
// (Handled by session management system)

// 3. Finalize session with recording
const sessionResult = await judgeFinalizeSession(
    caseId,
    ipfsCid,        // Recording uploaded to IPFS
    false,            // Not adjourned
    startTimestamp,
    endTimestamp
);
```

---

## Error Handling & Best Practices

### Common Error Patterns

#### Blockchain Errors
- **"No Wallet Found"**: MetaMask not installed/connected
- **"Invalid address format"**: Ethereum address validation failed
- **"Transaction failed"**: Contract call reverted (check gas, permissions)

#### Storage Errors
- **"File is too large"**: Exceeds 100MB limit
- **"Upload Failed"**: Network or service error
- **"Missing Env Vars"**: Configuration not set

### Best Practices

#### For Developers
1. **Always validate addresses** before contract calls
2. **Handle transaction receipts** to confirm success
3. **Use proper TypeScript types** for all parameters
4. **Implement proper error boundaries** for async operations
5. **Log all blockchain interactions** for debugging

#### For Users
1. **Ensure MetaMask is connected** before operations
2. **Wait for transaction confirmations** before proceeding
3. **Keep file sizes reasonable** (< 100MB)
4. **Organize evidence by case** using provided case IDs
5. **Double-check all addresses** when assigning roles

---

## Configuration Requirements

### Environment Variables

```bash
# Blockchain
VITE_COURT_ADDR=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
VITE_FIR_REGISTRY_ADDR=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# Storage
VITE_PINATA_JWT=your_pinata_jwt_token
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

### Dependencies

```json
{
  "ethers": "^6.0.0",
  "@metamask/providers": "^10.0.0"
}
```

---

## Integration Examples

### React Component Integration

```typescript
import { clerkCreateCase } from '@/utils/BlockChain_Interface/clerk';
import { submitEvidence } from '@/utils/BlockChain_Interface/evidenceManager';
import { uploadToPinata } from '@/utils/storage/ipfsUploadUtils';

const CaseCreationComponent = () => {
    const handleCreateCase = async () => {
        try {
            const result = await clerkCreateCase(/* params */);
            toast.success("Case created successfully");
        } catch (error) {
            toast.error("Failed to create case: " + error.message);
        }
    };

    const handleEvidenceSubmit = async (file: File) => {
        const result = await submitEvidence({
            caseId: "CASE-2024-001",
            file
        });
        
        if (result.success) {
            toast.success("Evidence submitted");
        }
    };

    return (
        // Component JSX
    );
};
```

---

## Conclusion

These utilities provide a complete interface between the NayaSutra frontend and blockchain smart contracts. They handle all essential workflows including case creation, evidence management, session scheduling, and file storage with proper error handling and user feedback.

The modular design allows for easy maintenance and extension, while maintaining consistency across all blockchain interactions. All functions include comprehensive error handling and logging to ensure reliable operation in production environments.
