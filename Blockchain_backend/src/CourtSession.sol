// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CourtAccessControl.sol";
import "./FIRRegistry.sol";

contract CourtSession {
    enum CaseStatus {
        CREATED,
        PRE_TRIAL,
        IN_SESSION,
        CLOSED
    }

    struct Case {
        uint256 id;
        string linkedFirId;
        string title;
        string accused;
        string filer;
        CaseStatus status;
        address assignedJudge;
        uint256 creationDate;
        address defence;
        address prosecution;
        uint256 nextSessionId;
        string metaData;
        address assignedClerk;
    }

    struct SessionDetails {
        uint256 sessionId;
        uint256 scheduledDate;
        string description;
        bool isConcluded;
    }

    struct CurrSession {
        uint256 caseId;
        uint256 sessionId;
        string ipfsCid;
        bool isAdjourned;
        uint256 startTimestamp;
        uint256 endTimestamp;
    }

    CourtAccessControl public accessControl;
    FIRRegistry public firRegistry;
    uint256 private _caseIds;

    mapping(uint256 => Case) public cases;
    mapping(uint256 => address) public assignedJudgeMap;
    mapping(uint256 => mapping(string => address)) public isAssignedLawyer;

    // Fixed naming convention (camelCase)
    mapping(uint256 => mapping(uint256 => SessionDetails)) public nextSessions;
    mapping(uint256 => mapping(uint256 => CurrSession)) public sessions;

    event CaseCreated(uint256 indexed caseId, string title, string linkedFirId);
    event CaseStatusChanged(uint256 indexed caseId, CaseStatus status);
    event JudgeAssigned(uint256 indexed caseId, address judge);
    event LawyerAssigned(uint256 indexed caseId, address lawyer, string role);
    event NextSessionscheduled(
        uint256 indexed caseId,
        uint256 indexed sessionId,
        uint256 date
    );
    event SessionPublished(
        uint256 indexed caseId,
        uint256 indexed sessionId,
        string ipfsCid
    );

    // --- OPTIMIZED MODIFIERS ---
    modifier onlyClerk() {
        _checkClerk();
        _;
    }

    modifier onlyAssignedJudge(uint256 _caseId) {
        _checkAssignedJudge(_caseId);
        _;
    }

    function _checkClerk() internal view {
        require(
            accessControl.hasRole(accessControl.CLERK_ROLE(), msg.sender),
            "Only Clerk"
        );
    }

    function _checkAssignedJudge(uint256 _caseId) internal view {
        require(cases[_caseId].assignedJudge == msg.sender, "Not the Judge");
    }

    constructor(address _accessControl, address _firRegistry) {
        accessControl = CourtAccessControl(_accessControl);
        firRegistry = FIRRegistry(_firRegistry);
    }

    function createCase(
        string memory _title,
        string memory _firId,
        string memory _metaData
    ) external onlyClerk returns (uint256) {
        _caseIds++;
        uint256 newId = _caseIds;

        string memory _accused = "";
        string memory _filer = "";

        if (bytes(_firId).length > 0) {
            firRegistry.markForwarded(_firId, newId);
            (, , _accused, _filer, , ) = FIRRegistry(address(firRegistry)).firs(
                _firId
            );
        }

        cases[newId] = Case({
            id: newId,
            linkedFirId: _firId,
            title: _title,
            accused: _accused,
            filer: _filer,
            status: CaseStatus.CREATED,
            assignedJudge: address(0),
            creationDate: block.timestamp,
            defence: address(0),
            prosecution: address(0),
            nextSessionId: 1,
            metaData: _metaData,
            assignedClerk: msg.sender
        });

        emit CaseCreated(newId, _title, _firId);
        return newId;
    }

    function assignLawyer(
        uint256 _caseId,
        address _lawyer,
        string calldata _role
    ) external onlyClerk {
        require(cases[_caseId].creationDate != 0, "Case does not exist");
        require(accessControl.isLawyer(_lawyer), "User is not a Lawyer");
        require(
            isAssignedLawyer[_caseId][_role] != _lawyer,
            "Already assigned"
        );

        isAssignedLawyer[_caseId][_role] = _lawyer;

        if (keccak256(bytes(_role)) == keccak256("defence")) {
            cases[_caseId].defence = _lawyer;
        } else if (keccak256(bytes(_role)) == keccak256("prosecution")) {
            cases[_caseId].prosecution = _lawyer;
        }
        emit LawyerAssigned(_caseId, _lawyer, _role);
    }

    function assignJudge(uint256 _caseId, address _judge) external onlyClerk {
        require(cases[_caseId].creationDate != 0, "Case does not exist");
        require(accessControl.isJudge(_judge), "User is not a Judge");
        cases[_caseId].assignedJudge = _judge;
        emit JudgeAssigned(_caseId, _judge);
    }

    function scheduleSession(
        uint256 _caseId,
        uint256 _date,
        string memory _desc
    ) external onlyAssignedJudge(_caseId) {
        uint256 sId = cases[_caseId].nextSessionId;
        nextSessions[_caseId][sId] = SessionDetails({
            sessionId: sId,
            scheduledDate: _date,
            description: _desc,
            isConcluded: false
        });
        cases[_caseId].nextSessionId++;
        cases[_caseId].status = CaseStatus.IN_SESSION;
        emit NextSessionscheduled(_caseId, sId, _date);
    }

    function startSession(uint256 _caseId) external onlyAssignedJudge(_caseId) {
        require(cases[_caseId].nextSessionId > 0, "No sessions scheduled");
        uint256 sId = cases[_caseId].nextSessionId - 1;
        sessions[_caseId][sId] = CurrSession({
            caseId: _caseId,
            sessionId: sId,
            ipfsCid: "",
            isAdjourned: false,
            startTimestamp: block.timestamp,
            endTimestamp: 0
        });
    }

    function endSession(
        uint256 _caseId,
        string memory _ipfsCid,
        bool _isAdjourned
    ) external onlyAssignedJudge(_caseId) {
        require(cases[_caseId].nextSessionId > 0, "No sessions");
        uint256 sId = cases[_caseId].nextSessionId - 1;
        CurrSession storage currentSession = sessions[_caseId][sId];
        require(currentSession.startTimestamp != 0, "Session not started");

        currentSession.ipfsCid = _ipfsCid;
        currentSession.isAdjourned = _isAdjourned;
        currentSession.endTimestamp = block.timestamp;

        emit SessionPublished(_caseId, sId, _ipfsCid);
    }

    function getSessionDetails(
        uint256 _caseId,
        uint256 _sessionId
    ) external view returns (CurrSession memory) {
        return sessions[_caseId][_sessionId];
    }

    function getCaseSigners(
        uint256 _caseId
    )
        external
        view
        returns (
            address clerk,
            address judge,
            address defence,
            address prosecution
        )
    {
        return (
            cases[_caseId].assignedClerk,
            cases[_caseId].assignedJudge,
            cases[_caseId].defence,
            cases[_caseId].prosecution
        );
    }

    function getNextSessionDetails(
        uint256 _caseId
    ) external view returns (SessionDetails memory) {
        // Safe check to prevent underflow if no sessions exist
        if (cases[_caseId].nextSessionId <= 1) {
            return SessionDetails(0, 0, "", false); // Return empty if no session scheduled
        }

        // Logic: The "next" session is the one currently scheduled but not yet happened
        // or the last one added.
        uint256 sessionId = cases[_caseId].nextSessionId - 1;
        return nextSessions[_caseId][sessionId];
    }
}
