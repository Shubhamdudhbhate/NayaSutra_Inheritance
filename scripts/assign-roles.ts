import { ethers } from "ethers";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration from .env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const RPC_URL = process.env.RPC_URL!;
const COURT_ACCESS_CONTROL_ADDR = process.env.VITE_COURT_ACCESS_CONTROL_ADDR!;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Access Control Contract ABI
const ACCESS_CONTROL_ABI = [
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

    // Custom View Functions
    "function isJudge(address _user) view returns (bool)",
    "function isLawyer(address _user) view returns (bool)",
    "function isPolice(address _user) view returns (bool)",
    "function isCourtSytem(address _user) view returns (bool)"
];

// Role mapping
const ROLE_MAPPING = {
    'judge': 'JUDGE_ROLE',
    'lawyer': 'LAWYER_ROLE', 
    'court_staff': 'CLERK_ROLE',
    'police': 'POLICE_ROLE'
} as const;

type UserRole = keyof typeof ROLE_MAPPING;

// Initialize blockchain connection
function getContract() {
    if (!PRIVATE_KEY || !RPC_URL || !COURT_ACCESS_CONTROL_ADDR) {
        throw new Error('Missing required environment variables');
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(COURT_ACCESS_CONTROL_ADDR, ACCESS_CONTROL_ABI, wallet);
    
    return { contract, wallet, provider };
}

// Validate Ethereum address
function isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Fetch users from Supabase by role
async function fetchUsersByRole(role: UserRole) {
    console.log(`Fetching users with role: ${role}`);
    
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, wallet_address, role_category')
        .eq('role_category', role)
        .not('wallet_address', 'is', null);

    if (error) {
        throw new Error(`Failed to fetch ${role} profiles: ${error.message}`);
    }

    if (!profiles || profiles.length === 0) {
        console.log(`No ${role} profiles found with wallet addresses`);
        return [];
    }

    // Filter out invalid addresses
    const validProfiles = profiles.filter(profile => 
        profile.wallet_address && isValidAddress(profile.wallet_address)
    );

    if (validProfiles.length === 0) {
        console.log(`No ${role} profiles with valid wallet addresses found`);
        return [];
    }

    console.log(`Found ${validProfiles.length} ${role} profiles with valid wallet addresses`);
    return validProfiles;
}

// Grant role to a single user
async function grantRoleToUser(
    contract: ethers.Contract, 
    roleFunction: string, 
    userAddress: string, 
    userName: string
) {
    try {
        // Get the role hash
        const roleHash = await (contract as any)[roleFunction]();
        
        // Check if user already has the role
        const hasRole = await contract.hasRole(roleHash, userAddress);
        if (hasRole) {
            console.log(`✅ ${userName} (${userAddress}) already has ${roleFunction.replace('_ROLE', '')} role`);
            return { success: true, alreadyHadRole: true };
        }

        // Grant the role
        console.log(`🔄 Granting ${roleFunction.replace('_ROLE', '')} role to ${userName} (${userAddress})...`);
        const tx = await contract.grantRole(roleHash, userAddress);
        
        console.log(`⏳ Transaction sent: ${tx.hash}`);
        console.log(`⏳ Waiting for confirmation...`);
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            console.log(`✅ Successfully granted ${roleFunction.replace('_ROLE', '')} role to ${userName}`);
            return { success: true, txHash: tx.hash };
        } else {
            console.log(`❌ Failed to grant role to ${userName} - Transaction failed`);
            return { success: false, error: 'Transaction failed' };
        }
        
    } catch (error: any) {
        console.log(`❌ Failed to grant role to ${userName}: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Main function to assign roles for all users
async function assignAllRoles() {
    console.log('🚀 Starting role assignment process...\n');
    
    try {
        const { contract, wallet } = getContract();
        console.log(`📋 Using admin wallet: ${wallet.address}\n`);

        const results = {
            judge: { total: 0, success: 0, failed: 0, skipped: 0 },
            lawyer: { total: 0, success: 0, failed: 0, skipped: 0 },
            court_staff: { total: 0, success: 0, failed: 0, skipped: 0 },
            police: { total: 0, success: 0, failed: 0, skipped: 0 }
        };

        // Process each role
        for (const [roleKey, roleFunction] of Object.entries(ROLE_MAPPING)) {
            const role = roleKey as UserRole;
            console.log(`\n📂 Processing ${role.toUpperCase()} role assignments:`);
            console.log('='.repeat(50));

            const users = await fetchUsersByRole(role);
            results[role].total = users.length;

            if (users.length === 0) {
                console.log(`⚠️  No users found for ${role} role\n`);
                continue;
            }

            for (const user of users) {
                const result = await grantRoleToUser(
                    contract, 
                    roleFunction, 
                    user.wallet_address!, 
                    user.full_name || 'Unknown'
                );

                if (result.success) {
                    if (result.alreadyHadRole) {
                        results[role].skipped++;
                    } else {
                        results[role].success++;
                    }
                } else {
                    results[role].failed++;
                }
            }
        }

        // Print final summary
        console.log('\n📊 ROLE ASSIGNMENT SUMMARY');
        console.log('='.repeat(50));
        
        let totalUsers = 0;
        let totalSuccess = 0;
        let totalFailed = 0;
        let totalSkipped = 0;

        for (const [role, stats] of Object.entries(results)) {
            totalUsers += stats.total;
            totalSuccess += stats.success;
            totalFailed += stats.failed;
            totalSkipped += stats.skipped;
            
            console.log(`${role.toUpperCase()}:`);
            console.log(`  Total users: ${stats.total}`);
            console.log(`  ✅ Success: ${stats.success}`);
            console.log(`  ⏭️  Skipped: ${stats.skipped}`);
            console.log(`  ❌ Failed: ${stats.failed}`);
            console.log('');
        }

        console.log('OVERALL TOTALS:');
        console.log(`  Total users processed: ${totalUsers}`);
        console.log(`  ✅ Successful assignments: ${totalSuccess}`);
        console.log(`  ⏭️  Already had roles: ${totalSkipped}`);
        console.log(`  ❌ Failed assignments: ${totalFailed}`);
        console.log(`  📈 Success rate: ${totalUsers > 0 ? ((totalSuccess / totalUsers) * 100).toFixed(1) : 0}%`);

        if (totalFailed > 0) {
            console.log('\n⚠️  Some role assignments failed. Check the logs above for details.');
        } else {
            console.log('\n🎉 All role assignments completed successfully!');
        }

    } catch (error: any) {
        console.error('❌ Fatal error during role assignment:', error.message);
        process.exit(1);
    }
}

// Assign role to specific user by email or ID
async function assignRoleToSpecificUser(role: UserRole, userIdentifier: string) {
    console.log(`🎯 Assigning ${role} role to user: ${userIdentifier}`);
    
    try {
        const { contract } = getContract();

        // Find user by email or ID
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, full_name, wallet_address, role_category, email')
            .or(`email.eq.${userIdentifier},id.eq.${userIdentifier}`)
            .single();

        if (error || !profile) {
            console.log(`❌ User not found: ${userIdentifier}`);
            return;
        }

        if (!profile.wallet_address) {
            console.log(`❌ User ${profile.full_name} has no wallet address`);
            return;
        }

        if (!isValidAddress(profile.wallet_address)) {
            console.log(`❌ User ${profile.full_name} has invalid wallet address: ${profile.wallet_address}`);
            return;
        }

        const roleFunction = ROLE_MAPPING[role];
        const result = await grantRoleToUser(
            contract, 
            roleFunction, 
            profile.wallet_address, 
            profile.full_name || 'Unknown'
        );

        if (result.success && !result.alreadyHadRole) {
            console.log(`🎉 Successfully assigned ${role} role to ${profile.full_name}`);
        }

    } catch (error: any) {
        console.error('❌ Error assigning role to specific user:', error.message);
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('📋 Usage:');
        console.log('  npm run assign-roles                    # Assign all roles to all users');
        console.log('  npm run assign-roles judge              # Assign judge role to all judges');
        console.log('  npm run assign-roles lawyer user@email  # Assign lawyer role to specific user');
        console.log('\nAvailable roles: judge, lawyer, court_staff, police');
        process.exit(0);
    }

    const command = args[0];
    const userIdentifier = args[1];

    if (Object.keys(ROLE_MAPPING).includes(command)) {
        if (userIdentifier) {
            await assignRoleToSpecificUser(command as UserRole, userIdentifier);
        } else {
            // Assign specific role to all users of that type
            const users = await fetchUsersByRole(command as UserRole);
            if (users.length > 0) {
                const { contract } = getContract();
                const roleFunction = ROLE_MAPPING[command as UserRole];
                
                console.log(`\n📂 Assigning ${command.toUpperCase()} role to all users:`);
                console.log('='.repeat(50));
                
                for (const user of users) {
                    await grantRoleToUser(
                        contract, 
                        roleFunction, 
                        user.wallet_address!, 
                        user.full_name || 'Unknown'
                    );
                }
            }
        }
    } else if (command === 'all') {
        await assignAllRoles();
    } else {
        console.log(`❌ Unknown command: ${command}`);
        console.log('Available commands: all, judge, lawyer, court_staff, police');
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

export { assignAllRoles, assignRoleToSpecificUser };
