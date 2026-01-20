// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// import "forge-std/Test.sol";
// import "../src/CourtAccessControl.sol";
// import "../src/CourtSession.sol";
// import "../src/FIRRegistry.sol";
// import "../src/EvidenceStaging.sol";

// contract IntegrationTest is Test {
//     CourtAccessControl accessControl;
//     CourtSession session;
//     FIRRegistry firRegistry;
//     EvidenceStaging staging;

//     address admin = makeAddr("admin");
//     address clerk = makeAddr("clerk");
//     address judge = makeAddr("judge");
//     address police = makeAddr("police");
//     address defenceLawyer = makeAddr("defenceLawyer");
//     address prosecutionLawyer = makeAddr("prosecutionLawyer");

//     function setUp() public {
//         vm.startPrank(admin);

//         // 1. Deploy Contracts
//         accessControl = new CourtAccessControl();
//         firRegistry = new FIRRegistry(address(accessControl));
//         session = new CourtSession(
//             address(accessControl),
//             address(firRegistry)
//         );
//         staging = new EvidenceStaging(address(accessControl));

//         // 2. Grant Roles
//         accessControl.grantRole(accessControl.CLERK_ROLE(), clerk);
//         accessControl.grantRole(accessControl.JUDGE_ROLE(), judge);
//         accessControl.grantRole(accessControl.POLICE_ROLE(), police);
//         accessControl.grantRole(accessControl.LAWYER_ROLE(), defenceLawyer);
//         accessControl.grantRole(accessControl.LAWYER_ROLE(), prosecutionLawyer);

//         // 3. Grant System Role to CourtSession (so it can mark FIRs as forwarded)
//         accessControl.grantRole(
//             accessControl.COURT_SYSTEM_ROLE(),
//             address(session)
//         );

//         vm.stopPrank();
//     }

//     function test_FullLifecycle() public {
//         // --- STEP 1: Police Files FIR ---
//         vm.startPrank(police);
//         string[] memory sections = new string[](1);
//         sections[0] = "302";

//         uint256 firId = firRegistry.fileFIR(
//             "PS_MUMBAI",
//             sections,
//             "QmFirIPFS",
//             "John Doe", // Accused
//             "Jane Smith", // Filer
//             keccak256("content")
//         );
//         vm.stopPrank();

//         // --- STEP 2: Clerk Creates Case ---
//         vm.startPrank(clerk);
//         uint256 caseId = session.createCase(
//             "State vs John Doe",
//             firId,
//             "Meta: Murder Case"
//         );

//         // Verify Data Transfer
//         (
//             ,
//             ,
//             string memory title,
//             string memory accused,
//             string memory filer,
//             ,
//             ,
//             ,
//             ,
//             ,
//             ,
//             ,

//         ) = session.cases(caseId);
//         assertEq(title, "State vs John Doe");
//         assertEq(accused, "John Doe"); // Auto-fetched from FIR
//         assertEq(filer, "Jane Smith"); // Auto-fetched from FIR

//         // --- STEP 3: Clerk Assigns Roles ---
//         session.assignJudge(caseId, judge);
//         session.assignLawyer(caseId, defenceLawyer, "defence");
//         session.assignLawyer(caseId, prosecutionLawyer, "prosecution");
//         vm.stopPrank();

//         // Verify Signers
//         (address sClerk, address sJudge, address sDef, address sPros) = session
//             .getCaseSigners(caseId);
//         assertEq(sJudge, judge);
//         assertEq(sDef, defenceLawyer);
//         assertEq(sPros, prosecutionLawyer);
//         assertEq(sClerk, clerk);

//         // --- STEP 4: Judge Schedules Session ---
//         vm.startPrank(judge);
//         session.scheduleSession(
//             caseId,
//             block.timestamp + 1 days,
//             "First Hearing"
//         );

//         // --- STEP 5: Judge Starts Session ---
//         session.startSession(caseId);

//         // FIX: Change 0 to 1
//         CourtSession.CurrSession memory curr = session.getSessionDetails(
//             caseId,
//             1
//         );

//         assertEq(curr.startTimestamp, block.timestamp);
//         assertEq(curr.endTimestamp, 0);

//         // --- STEP 6: Judge Ends Session ---
//         vm.warp(block.timestamp + 2 hours);
//         session.endSession(caseId, "QmSessionTranscript", true);

//         // FIX: Change 0 to 1
//         curr = session.getSessionDetails(caseId, 1);

//         assertEq(curr.ipfsCid, "QmSessionTranscript");
//         assertTrue(curr.isAdjourned);
//         vm.stopPrank();
//     }
// }
