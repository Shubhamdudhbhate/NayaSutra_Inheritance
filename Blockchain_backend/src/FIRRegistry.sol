// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CourtAccessControl.sol";

contract FIRRegistry {
    struct Report {
        string ipfsCid;
        bytes32 contentHash;
        uint256 timestamp;
        address filedBy;
        bool isSupplementary;
    }

    struct FIR {
        string id;
        string stationId;
        string accused;
        string filer;
        string[] ipcSections;
        bool isForwarded;
        address filedBy;
        uint256[] reportIndexes;
    }

    CourtAccessControl public accessControl;

    mapping(string => FIR) public firs;
    mapping(uint256 => Report) public allReports;
    mapping(string => string[]) public firProofs;

    uint256 private _reportIds;

    event FIRFiled(
        string indexed firId,
        string stationId,
        string[] ipcSections
    );
    event SupplementaryFiled(string indexed firId, uint256 reportId);
    event FIRForwarded(string indexed firId, uint256 caseId);
    event ProofAdded(string indexed firId, string url);

    // --- OPTIMIZED MODIFIERS ---
    modifier onlyPolice() {
        _checkPolice();
        _;
    }

    modifier onlyCourtSession() {
        _checkCourtSession();
        _;
    }

    function _checkPolice() internal view {
        require(accessControl.isPolice(msg.sender), "Caller is not Police");
    }

    function _checkCourtSession() internal view {
        require(
            accessControl.isCourtSytem(msg.sender),
            "Caller is not the valid Court Session"
        );
    }

    constructor(address _accessControl) {
        accessControl = CourtAccessControl(_accessControl);
    }

    // Keeping 'fileFIR' name to match Frontend Interface
    function fileFIR(
        string calldata _firId, // Fixed naming warning
        string calldata _stationId,
        string[] calldata _ipcSections,
        string calldata _ipfsCid,
        string calldata _accused,
        string calldata _filer,
        bytes32 _contentHash
    ) external onlyPolice returns (string memory) {
        require(bytes(firs[_firId].id).length == 0, "FIR ID already exists");

        _reportIds++;
        allReports[_reportIds] = Report({
            ipfsCid: _ipfsCid,
            contentHash: _contentHash,
            timestamp: block.timestamp,
            filedBy: msg.sender,
            isSupplementary: false
        });

        uint256[] memory initReports = new uint256[](1);
        initReports[0] = _reportIds;

        firs[_firId] = FIR({
            id: _firId,
            stationId: _stationId,
            accused: _accused,
            filer: _filer,
            ipcSections: _ipcSections,
            isForwarded: false,
            filedBy: msg.sender,
            reportIndexes: initReports
        });

        emit FIRFiled(_firId, _stationId, _ipcSections);
        return _firId;
    }

    function addSupplementaryReport(
        string calldata _firId,
        string calldata _ipfsCid,
        bytes32 _contentHash
    ) external onlyPolice {
        require(bytes(firs[_firId].id).length != 0, "FIR does not exist");
        require(
            !firs[_firId].isForwarded,
            "Cannot update after forwarding to Court"
        );

        _reportIds++;
        allReports[_reportIds] = Report({
            ipfsCid: _ipfsCid,
            contentHash: _contentHash,
            timestamp: block.timestamp,
            filedBy: msg.sender,
            isSupplementary: true
        });

        firs[_firId].reportIndexes.push(_reportIds);
        emit SupplementaryFiled(_firId, _reportIds);
    }

    function addProofLink(
        string calldata _firId,
        string calldata _link
    ) external onlyPolice {
        require(bytes(firs[_firId].id).length != 0, "FIR does not exist");
        require(!firs[_firId].isForwarded, "Cannot update after forwarding");

        firProofs[_firId].push(_link);
        emit ProofAdded(_firId, _link);
    }

    function markForwarded(
        string calldata _firId,
        uint256 _caseId
    ) external onlyCourtSession {
        require(bytes(firs[_firId].id).length != 0, "FIR does not exist");
        require(!firs[_firId].isForwarded, "Already forwarded");

        firs[_firId].isForwarded = true;
        emit FIRForwarded(_firId, _caseId);
    }

    function getReportCount(
        string calldata _firId
    ) external view returns (uint256) {
        return firs[_firId].reportIndexes.length;
    }

    function getIpcSections(
        string calldata _firId
    ) external view returns (string[] memory) {
        return firs[_firId].ipcSections;
    }

    function getallReportIds(
        string calldata _firId
    ) external view returns (uint256[] memory) {
        return firs[_firId].reportIndexes;
    }

    function getFirProofs(
        string calldata _firId
    ) external view returns (string[] memory) {
        return firProofs[_firId];
    }
}
