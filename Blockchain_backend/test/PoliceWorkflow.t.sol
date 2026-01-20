// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// import "forge-std/Test.sol";
// import "../src/CourtAccessControl.sol";
// import "../src/CourtSession.sol";
// import "../src/FIRRegistry.sol";

// contract PoliceWorkflowTest is Test {
//     CourtAccessControl accessControl;
//     CourtSession session;
//     FIRRegistry firRegistry;

//     address admin = makeAddr("admin");
//     address police = makeAddr("police");
//     address clerk = makeAddr("clerk");

//     function setUp() public {
//         vm.startPrank(admin);
//         accessControl = new CourtAccessControl();
//         firRegistry = new FIRRegistry(address(accessControl));
//         session = new CourtSession(
//             address(accessControl),
//             address(firRegistry)
//         );

//         accessControl.grantRole(accessControl.POLICE_ROLE(), police);
//         accessControl.grantRole(accessControl.CLERK_ROLE(), clerk);
//         accessControl.grantRole(
//             accessControl.COURT_SYSTEM_ROLE(),
//             address(session)
//         );
//         vm.stopPrank();
//     }

//     function test_FIRLockingMechanism() public {
//         // 1. Police Files FIR
//         vm.startPrank(police);
//         string[] memory ipc = new string[](1);
//         ipc[0] = "420";
//         uint256 firId = firRegistry.fileFIR(
//             "PS_DELHI",
//             ipc,
//             "QmHash",
//             "Scammer",
//             "Victim",
//             bytes32(0)
//         );

//         // 2. Police adds supplementary report (Should succeed)
//         firRegistry.addSupplementaryReport(firId, "QmSupp1", bytes32(0));
//         vm.stopPrank();

//         // 3. Check Report Count
//         assertEq(firRegistry.getReportCount(firId), 2); // 1 Initial + 1 Supplementary

//         // 4. Clerk Forwards to Court
//         vm.startPrank(clerk);
//         session.createCase("State vs Scammer", firId, "Fraud Case");
//         vm.stopPrank();

//         // 5. Verify FIR is locked
//         (, , , , bool isForwarded) = firRegistry.firs(firId);
//         assertTrue(isForwarded);

//         // 6. Police tries to add report AFTER forwarding (Should Fail)
//         vm.startPrank(police);
//         vm.expectRevert("Cannot update after forwarding to Court");
//         firRegistry.addSupplementaryReport(firId, "QmSupp2", bytes32(0));
//         vm.stopPrank();
//     }
// }
