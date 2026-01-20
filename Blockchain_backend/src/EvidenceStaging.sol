// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CourtAccessControl.sol";
import "lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import "lib/openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";

contract EvidenceStaging is EIP712 {
    using ECDSA for bytes32;

    enum EvidenceType {
        DOCUMENT,
        AUDIO,
        VIDEO
    }
    enum Status {
        PENDING,
        ACCEPTED,
        REJECTED
    }

    struct Submission {
        uint256 id;
        uint256 caseId;
        address uploader;
        string cloudRef;
        bytes32 fileHash;
        EvidenceType fileType;
        Status status;
        uint256 timestamp;
        string metaData;
    }

    bytes32 private constant PERMIT_TYPEHASH =
        keccak256("UploadPermit(uint256 caseId,address witness,uint256 nonce)");

    CourtAccessControl public accessControl;
    uint256 private _submissionIds;
    mapping(uint256 => Submission) public submissions;
    mapping(uint256 => mapping(address => bool)) public registeredParticipants;
    mapping(address => uint256) public nonces;

    event EvidenceSubmitted(
        uint256 indexed submissionId,
        uint256 indexed caseId,
        bytes32 fileHash
    );
    event EvidenceReviewed(
        uint256 indexed submissionId,
        Status status,
        address reviewedBy
    );

    // --- OPTIMIZED MODIFIERS ---
    modifier onlyJudge() {
        _checkJudge();
        _;
    }

    modifier onlyClerk() {
        _checkClerk();
        _;
    }

    function _checkJudge() internal view {
        require(accessControl.isJudge(msg.sender), "Caller is not a Judge");
    }

    function _checkClerk() internal view {
        require(
            accessControl.hasRole(accessControl.CLERK_ROLE(), msg.sender),
            "Caller is not a Clerk"
        );
    }

    constructor(address _accessControl) EIP712("CourtEvidenceSystem", "1") {
        accessControl = CourtAccessControl(_accessControl);
    }

    function registerCaseParticipants(
        uint256 _caseId,
        address[] calldata _subjects
    ) external onlyClerk {
        for (uint256 i = 0; i < _subjects.length; i++) {
            registeredParticipants[_caseId][_subjects[i]] = true;
        }
    }

    function submitEvidence(
        uint256 _caseId,
        string calldata _cloudRef,
        bytes32 _fileHash,
        EvidenceType _fileType,
        string calldata _metaData,
        bytes calldata _lawyerSignature
    ) external {
        bool isAuthorized = false;
        if (accessControl.isLawyer(msg.sender)) {
            isAuthorized = true;
        } else if (registeredParticipants[_caseId][msg.sender]) {
            isAuthorized = true;
        } else if (_lawyerSignature.length > 0) {
            _verifyPermit(_caseId, msg.sender, _lawyerSignature);
            isAuthorized = true;
        }
        require(isAuthorized, "Not authorized");

        _submissionIds++;
        submissions[_submissionIds] = Submission({
            id: _submissionIds,
            caseId: _caseId,
            uploader: msg.sender,
            cloudRef: _cloudRef,
            fileHash: _fileHash,
            fileType: _fileType,
            status: Status.PENDING,
            timestamp: block.timestamp,
            metaData: _metaData
        });

        emit EvidenceSubmitted(_submissionIds, _caseId, _fileHash);
    }

    function reviewSubmission(
        uint256 _submissionId,
        bool _accepted
    ) external onlyJudge {
        require(
            submissions[_submissionId].status == Status.PENDING,
            "Already reviewed"
        );
        if (_accepted) {
            submissions[_submissionId].status = Status.ACCEPTED;
        } else {
            submissions[_submissionId].status = Status.REJECTED;
        }
        emit EvidenceReviewed(
            _submissionId,
            submissions[_submissionId].status,
            msg.sender
        );
    }

    function _verifyPermit(
        uint256 _caseId,
        address _witness,
        bytes calldata _signature
    ) internal {
        uint256 currentNonce = nonces[_witness];
        bytes32 structHash = keccak256(
            abi.encode(PERMIT_TYPEHASH, _caseId, _witness, currentNonce)
        );
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, _signature);
        require(
            accessControl.isLawyer(signer),
            "Signature must be from a Lawyer"
        );
        nonces[_witness]++;
    }

    function getTypedDataHash(
        bytes32 _structHash
    ) public view returns (bytes32) {
        return _hashTypedDataV4(_structHash);
    }
}
