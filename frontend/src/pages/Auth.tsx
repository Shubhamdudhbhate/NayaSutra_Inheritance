// import { useEffect, useState } from "react";
// import { useNavigate, useSearchParams } from "react-router-dom";
// import { motion } from "framer-motion";
// import {
//   ArrowLeft,
//   CheckCircle2,
//   Gavel,
//   Loader2,
//   Shield,
//   Users,
//   Wallet,
//   Briefcase,
//   Clipboard,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { useWeb3 } from "@/contexts/Web3Context";
// import { cn } from "@/lib/utils";
// import { supabase } from "@/integrations/supabase/client";
// import { toast } from "sonner";

// // Define the Roles allowed in the UI
// type RoleCategory = "judiciary" | "lawyer" | "clerk" | "public_party" | "police";

// // Configuration for UI appearance per role
// const roleConfig = {
//   judiciary: {
//     title: "Judiciary Portal",
//     subtitle: "Judges & Administrators",
//     icon: Gavel,
//     theme: "text-amber-400",
//     border: "border-amber-500/30",
//     bg: "bg-amber-500/10",
//     gradient: "from-amber-600 to-amber-700",
//     description: "Manage cases, review evidence, and issue judgments",
//   },
//   lawyer: {
//     title: "Lawyer Portal",
//     subtitle: "Legal Practitioners & Advocates",
//     icon: Briefcase,
//     theme: "text-blue-400",
//     border: "border-blue-500/30",
//     bg: "bg-blue-500/10",
//     gradient: "from-blue-600 to-blue-700",
//     description: "File cases, manage client matters, and track evidence",
//   },
//   clerk: {
//     title: "Court Staff Portal",
//     subtitle: "Clerks & Paralegals",
//     icon: Clipboard,
//     theme: "text-cyan-400",
//     border: "border-cyan-500/30",
//     bg: "bg-cyan-500/10",
//     gradient: "from-cyan-600 to-cyan-700",
//     description: "Process documents, manage records, and coordinate filings",
//   },
//   public_party: {
//     title: "Public Portal",
//     subtitle: "Plaintiffs, Defendants & Citizens",
//     icon: Users,
//     theme: "text-slate-400",
//     border: "border-slate-500/30",
//     bg: "bg-slate-500/10",
//     gradient: "from-slate-600 to-slate-700",
//     description: "Track your cases and access case documents",
//   },
//   police: {
//     title: "Police Portal",
//     subtitle: "Officers & Investigators",
//     icon: Shield,
//     theme: "text-emerald-400",
//     border: "border-emerald-500/30",
//     bg: "bg-emerald-500/10",
//     gradient: "from-emerald-600 to-emerald-700",
//     description: "File FIRs and manage investigation evidence",
//   },
// };

// const Auth = () => {
//   const [searchParams] = useSearchParams();
//   const navigate = useNavigate();
  
//   // Use the Web3 Context for Wallet connection
//   const {
//     address,
//     isConnected,
//     isConnecting,
//     connect,
//     signMessage,
//     isSigning,
//   } = useWeb3();
  
//   const [authInitiated, setAuthInitiated] = useState(false);

//   // Get selected role from URL or default to public_party
//   const roleParam = searchParams.get("role") as RoleCategory | null;
//   const role: RoleCategory = roleParam && roleConfig[roleParam]
//     ? roleParam
//     : "public_party";
    
//   const config = roleConfig[role];
//   const Icon = config.icon;

//   // Check for existing custom session
//   useEffect(() => {
//     const token = localStorage.getItem("auth_token");
//     if (token) {
//       // You can add logic here to verify if token is expired
//       const savedRole = localStorage.getItem("user_role") || "public_party";
      
//       // Determine dashboard path
//       if (savedRole === "police") {
//         navigate("/police/dashboard", { replace: true });
//       } else {
//         navigate("/dashboard", { replace: true });
//       }
//     }
//   }, [navigate]);

//   // Auto-connect wallet if previously connected in MetaMask
//   useEffect(() => {
//     const checkExistingConnection = async () => {
//       if (isConnected) return;
//       if (typeof window !== "undefined" && (window as any).ethereum) {
//         try {
//           const accounts = await (window as any).ethereum.request({
//             method: "eth_accounts",
//           });
//           if (accounts.length > 0) {
//             connect();
//           }
//         } catch (err) {
//           console.error("Error checking existing connection", err);
//         }
//       }
//     };
//     checkExistingConnection();
//   }, [isConnected, connect]);

//   /**
//    * MAIN AUTHENTICATION LOGIC
//    */
//   const handleAuth = async () => {
//     if (!isConnected || !address) return;
//     setAuthInitiated(true);
//     const walletAddress = address.toLowerCase();

//     try {
//       console.log("Starting Strict Auth for:", walletAddress);

//       // STEP 1: Fetch Nonce (Strict Check)
//       // We do NOT "maybeSingle" here because if they are missing, it's an error.
//       const { data: profileData, error: fetchError } = await supabase
//         .from("profiles")
//         .select("nonce, id, role_category, status")
//         .eq("wallet_address", walletAddress)
//         .maybeSingle();

//       if (fetchError) {
//         throw new Error("Database error: " + fetchError.message);
//       }

//       // --- THE CHANGE IS HERE ---
//       // If no profile found -> REJECT IMMEDIATELY
//       if (!profileData) {
//         throw new Error("Access Denied: Your wallet is not whitelisted. Please contact the administrator.");
//       }

//       // Security Check: Block suspended users
//       if (profileData.status === 'suspended' || profileData.status === 'pending') {
//          throw new Error("Access Denied: Your account is " + profileData.status);
//       }

//       if (!profileData.nonce) throw new Error("Security Error: Nonce missing.");

//       // STEP 2: Sign the Nonce
//       const message = `Welcome to NyaySutra.\n\nNonce: ${profileData.nonce}\n\nSign this message to verify your identity.`;
      
//       const signature = await signMessage(message);

//       if (!signature) {
//         setAuthInitiated(false);
//         toast.error("Signature rejected");
//         return;
//       }

//       // STEP 3: Verify Signature on Backend
//       const { data: authResult, error: authError } = await supabase
//         .rpc('verify_user_login', { 
//            _wallet: walletAddress,
//            _signature: signature 
//         });

//       if (authError) throw new Error(authError.message);

//       if (!authResult || !authResult.token) {
//         throw new Error("Verification failed: No token returned.");
//       }

//       // STEP 4: Login Success
//       localStorage.setItem("auth_token", authResult.token);
//       localStorage.setItem("user_role", profileData.role_category);
//       localStorage.setItem("user_id", profileData.id);

//       toast.success("Login successful!");
      
//       checkRoleAndRedirect(profileData.role_category);

//     } catch (err: any) {
//       console.error("Auth Error:", err);
//       // Show a clear error message to the user
//       toast.error(err?.message ?? "Authentication failed");
//       setAuthInitiated(false);
//     }
//   };

//   const checkRoleAndRedirect = (userRole: string) => {
//     // Define logic for where different roles go
//     if (userRole === "police" || userRole === "police_officer") {
//       navigate("/police/dashboard", { replace: true });
//     } else if (userRole === "judge") {
//         navigate("/dashboard", { replace: true }); // Or /judge/dashboard
//     } else {
//       navigate("/dashboard", { replace: true });
//     }
//   };

//   const handleConnectWallet = () => {
//     connect();
//   };

//   // Button styling
//   const buttonClass = cn(
//     "w-full h-14 text-lg font-semibold rounded-xl transition-all relative overflow-hidden",
//     "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
//     "shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30",
//   );

//   const roles: RoleCategory[] = ["judiciary", "lawyer", "clerk", "public_party", "police"];

//   // --- RENDER 1: ROLE SELECTION SCREEN (No role in URL) ---
//   if (!roleParam) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
//         <div className="absolute inset-0 grid-background opacity-10" />
//         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
//         <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

//         <motion.div
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ duration: 0.5 }}
//           className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4"
//         >
//           <motion.div
//             initial={{ opacity: 0, y: -20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.6 }}
//             className="text-center mb-12"
//           >
//             <h1 className="text-5xl font-bold text-white mb-4">
//               Welcome to <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">NyaySutra</span>
//             </h1>
//             <p className="text-xl text-slate-300">
//               Choose your role to continue
//             </p>
//           </motion.div>

//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.6, delay: 0.2 }}
//             className="w-full max-w-6xl grid md:grid-cols-5 gap-4"
//           >
//             {roles.map((r, index) => {
//               const cfg = roleConfig[r];
//               const RoleIcon = cfg.icon;
//               return (
//                 <motion.div
//                   key={r}
//                   initial={{ opacity: 0, y: 20 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ duration: 0.6, delay: 0.1 * index }}
//                   whileHover={{ scale: 1.05, translateY: -5 }}
//                   onClick={() => navigate(`/auth?role=${r}`)}
//                   className={cn(
//                     "glass-card p-6 rounded-2xl border-2 cursor-pointer transition-all",
//                     cfg.border,
//                     "hover:shadow-lg hover:shadow-blue-500/20"
//                   )}
//                 >
//                   <div className="text-center">
//                     <div className={cn(
//                       "w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center bg-gradient-to-br",
//                       cfg.gradient
//                     )}>
//                       <RoleIcon className="w-8 h-8 text-white" />
//                     </div>
//                     <h3 className="text-lg font-bold text-white mb-1">
//                       {cfg.title.split(" ")[0]}
//                     </h3>
//                     <p className="text-xs text-slate-400 mb-3">
//                       {cfg.description}
//                     </p>
//                     <div className="flex items-center justify-center gap-2 text-blue-400 text-sm font-medium hover:text-blue-300">
//                       Get Started
//                       <ArrowLeft className="w-4 h-4 rotate-180" />
//                     </div>
//                   </div>
//                 </motion.div>
//               );
//             })}
//           </motion.div>
//         </motion.div>
//       </div>
//     );
//   }

//   // --- RENDER 2: LOGIN/SIGNUP SCREEN (Role Selected) ---
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
//       <div className="absolute inset-0 grid-background opacity-10" />
//       <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
//       <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

//       <motion.div
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.6 }}
//         className="relative z-10 w-full max-w-md"
//       >
//         <Button
//           variant="ghost"
//           size="sm"
//           onClick={() => navigate("/auth")}
//           className="mb-6 text-slate-400 hover:text-slate-200"
//         >
//           <ArrowLeft className="w-4 h-4 mr-2" />
//           Back to Role Selection
//         </Button>

//         <div
//           className={cn("glass-card p-8 rounded-2xl border-2", config.border)}
//         >
//           <div className="text-center mb-8">
//             <div className="flex justify-center mb-4">
//               <motion.div
//                 initial={{ scale: 0 }}
//                 animate={{ scale: 1 }}
//                 transition={{ duration: 0.5, delay: 0.1 }}
//                 className="relative"
//               >
//                 <div
//                   className={cn(
//                     "absolute inset-0 blur-xl rounded-full opacity-50 w-20 h-20",
//                     config.bg.replace("bg-", "bg-"),
//                   )}
//                 />
//                 <div className={cn(
//                   "relative w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center border border-white/20",
//                   config.gradient
//                 )}>
//                   <Icon className="w-10 h-10 text-white" />
//                 </div>
//               </motion.div>
//             </div>
//             <h1 className={cn("text-3xl font-bold", config.theme)}>
//               {config.title}
//             </h1>
//             <p className="text-sm text-slate-400 mt-2">
//               {config.subtitle}
//             </p>
//           </div>

//           <div className="space-y-6">
//             {isConnected && address
//               ? (
//                 <motion.div
//                   initial={{ opacity: 0, y: 10 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ duration: 0.4 }}
//                 >
//                   <Button
//                     onClick={handleAuth}
//                     disabled={isSigning || authInitiated}
//                     className={cn(
//                       buttonClass,
//                       "border border-blue-400/50 flex justify-between items-center px-6",
//                     )}
//                   >
//                     {isSigning || authInitiated
//                       ? (
//                         <div className="flex items-center justify-center w-full">
//                           <Loader2 className="w-5 h-5 mr-2 animate-spin" />
//                           Verifying Identity...
//                         </div>
//                       )
//                       : (
//                         <>
//                           <span className="font-semibold text-lg">
//                             Login with Wallet
//                           </span>
//                           <div className="flex items-center gap-2">
//                             <span className="text-xs text-slate-300 font-mono hidden sm:inline-block">
//                               {address?.slice(0, 6)}...{address?.slice(-4)}
//                             </span>
//                             <div className="bg-green-500/20 p-1 rounded-full">
//                               <CheckCircle2 className="w-5 h-5 text-green-400" />
//                             </div>
//                           </div>
//                         </>
//                       )}
//                   </Button>
//                 </motion.div>
//               )
//               : (
//                 <motion.div
//                   initial={{ opacity: 0, y: 10 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ duration: 0.4 }}
//                 >
//                   <Button
//                     onClick={handleConnectWallet}
//                     disabled={isConnecting}
//                     className={buttonClass}
//                   >
//                     {isConnecting
//                       ? (
//                         <>
//                           <Loader2 className="w-5 h-5 mr-2 animate-spin" />
//                           Connecting...
//                         </>
//                       )
//                       : (
//                         <>
//                           <Wallet className="w-5 h-5 mr-2" />
//                           Connect MetaMask
//                         </>
//                       )}
//                   </Button>
//                 </motion.div>
//               )}

//             <motion.p
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               transition={{ duration: 0.4, delay: 0.2 }}
//               className="text-xs text-center text-slate-500"
//             >
//               🔒 Secure custom authentication. Your wallet is your identity.
//             </motion.p>
//           </div>
//         </div>
//       </motion.div>
//     </div>
//   );
// };

// export default Auth;


import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Gavel,
  Loader2,
  Shield,
  Users,
  Wallet,
  Briefcase,
  Clipboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/contexts/Web3Context";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Define the Roles allowed in the UI
type RoleCategory = "judiciary" | "lawyer" | "clerk" | "public_party" | "police";

// Configuration for UI appearance per role
const roleConfig = {
  judiciary: {
    title: "Judiciary Portal",
    subtitle: "Judges & Administrators",
    icon: Gavel,
    theme: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    gradient: "from-amber-600 to-amber-700",
    description: "Manage cases, review evidence, and issue judgments",
  },
  lawyer: {
    title: "Lawyer Portal",
    subtitle: "Legal Practitioners & Advocates",
    icon: Briefcase,
    theme: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
    gradient: "from-blue-600 to-blue-700",
    description: "File cases, manage client matters, and track evidence",
  },
  clerk: {
    title: "Court Staff Portal",
    subtitle: "Clerks & Paralegals",
    icon: Clipboard,
    theme: "text-cyan-400",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
    gradient: "from-cyan-600 to-cyan-700",
    description: "Process documents, manage records, and coordinate filings",
  },
  public_party: {
    title: "Public Portal",
    subtitle: "Plaintiffs, Defendants & Citizens",
    icon: Users,
    theme: "text-slate-400",
    border: "border-slate-500/30",
    bg: "bg-slate-500/10",
    gradient: "from-slate-600 to-slate-700",
    description: "Track your cases and access case documents",
  },
  police: {
    title: "Police Portal",
    subtitle: "Officers & Investigators",
    icon: Shield,
    theme: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    gradient: "from-emerald-600 to-emerald-700",
    description: "File FIRs and manage investigation evidence",
  },
};

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Use the Web3 Context for Wallet connection
  const {
    address,
    isConnected,
    isConnecting,
    connect,
    signMessage,
    isSigning,
  } = useWeb3();

  const [authInitiated, setAuthInitiated] = useState(false);

  // Get selected role from URL or default to public_party
  const roleParam = searchParams.get("role") as RoleCategory | null;
  const role: RoleCategory = roleParam && roleConfig[roleParam]
    ? roleParam
    : "public_party";

  const config = roleConfig[role];
  const Icon = config.icon;

  // Check for existing custom session
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      // All users now go to /dashboard (police dashboard handled by Dashboard router)
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  // Auto-connect wallet if previously connected in MetaMask
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (isConnected) return;
      if (typeof window !== "undefined" && (window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            connect();
          }
        } catch (err) {
          console.error("Error checking existing connection", err);
        }
      }
    };
    checkExistingConnection();
  }, [isConnected, connect]);

  /**
   * MAIN AUTHENTICATION LOGIC
   */
  const handleAuth = async () => {
    if (!isConnected || !address) return;
    setAuthInitiated(true);
    const walletAddress = address.toLowerCase();

    try {
      console.log("Starting Strict Auth for:", walletAddress);

      // STEP 1: Fetch Nonce (Strict Check)
      const { data: profileData, error: fetchError } = await supabase
        .from("profiles")
        .select("nonce, id, role_category, status")
        .eq("wallet_address", walletAddress)
        .maybeSingle();

      if (fetchError) {
        throw new Error("Database error: " + fetchError.message);
      }

      // If no profile found -> REJECT IMMEDIATELY
      if (!profileData) {
        throw new Error("Access Denied: Your wallet is not whitelisted. Please contact the administrator.");
      }

      // Security Check: Block suspended users
      if ((profileData as any).status === 'suspended' || (profileData as any).status === 'pending') {
        throw new Error("Access Denied: Your account is " + (profileData as any).status);
      }

      if (!(profileData as any).nonce) throw new Error("Security Error: Nonce missing.");

      // STEP 2: Sign the Nonce
      const message = `Welcome to NyaySutra.\n\nNonce: ${(profileData as any).nonce}\n\nSign this message to verify your identity.`;

      const signature = await signMessage(message);

      if (!signature) {
        setAuthInitiated(false);
        toast.error("Signature rejected");
        return;
      }

      // STEP 3: Verify Signature on Backend
      const { data: authResult, error: authError } = await (supabase.rpc as any)('verify_user_login', {
        _wallet: walletAddress,
        _signature: signature,
      });

      if (authError) throw new Error(authError.message);

      if (!authResult || !authResult.token) {
        throw new Error("Verification failed: No token returned.");
      }

      // STEP 4: Login Success
      localStorage.setItem("auth_token", authResult.token);
      localStorage.setItem("user_role", (profileData as any).role_category);
      localStorage.setItem("user_id", (profileData as any).id);

      toast.success("Login successful!");

      // All users go to /dashboard (police dashboard is handled by Dashboard router)
      navigate("/dashboard", { replace: true });

    } catch (err: any) {
      console.error("Auth Error:", err);
      // Show a clear error message to the user
      toast.error(err?.message ?? "Authentication failed");
      setAuthInitiated(false);
    }
  };

  const handleConnectWallet = () => {
    connect();
  };

  // Button styling
  const buttonClass = cn(
    "w-full h-14 text-lg font-semibold rounded-xl transition-all relative overflow-hidden",
    "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
    "shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30",
  );

  const roles: RoleCategory[] = ["judiciary", "lawyer", "clerk", "public_party", "police"];

  // --- RENDER 1: ROLE SELECTION SCREEN (No role in URL) ---
  if (!roleParam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 grid-background opacity-10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-bold text-white mb-4">
              Welcome to <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">NyaySutra</span>
            </h1>
            <p className="text-xl text-slate-300">
              Choose your role to continue
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-6xl grid md:grid-cols-5 gap-4"
          >
            {roles.map((r, index) => {
              const cfg = roleConfig[r];
              const RoleIcon = cfg.icon;
              return (
                <motion.div
                  key={r}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  whileHover={{ scale: 1.05, translateY: -5 }}
                  onClick={() => navigate(`/auth?role=${r}`)}
                  className={cn(
                    "glass-card p-6 rounded-2xl border-2 cursor-pointer transition-all",
                    cfg.border,
                    "hover:shadow-lg hover:shadow-blue-500/20"
                  )}
                >
                  <div className="text-center">
                    <div className={cn(
                      "w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center bg-gradient-to-br",
                      cfg.gradient
                    )}>
                      <RoleIcon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      {cfg.title.split(" ")[0]}
                    </h3>
                    <p className="text-xs text-slate-400 mb-3">
                      {cfg.description}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-blue-400 text-sm font-medium hover:text-blue-300">
                      Get Started
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // --- RENDER 2: LOGIN/SIGNUP SCREEN (Role Selected) ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 grid-background opacity-10" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/auth")}
          className="mb-6 text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Role Selection
        </Button>

        <div
          className={cn("glass-card p-8 rounded-2xl border-2", config.border)}
        >
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative"
              >
                <div
                  className={cn(
                    "absolute inset-0 blur-xl rounded-full opacity-50 w-20 h-20",
                    config.bg.replace("bg-", "bg-"),
                  )}
                />
                <div className={cn(
                  "relative w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center border border-white/20",
                  config.gradient
                )}>
                  <Icon className="w-10 h-10 text-white" />
                </div>
              </motion.div>
            </div>
            <h1 className={cn("text-3xl font-bold", config.theme)}>
              {config.title}
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              {config.subtitle}
            </p>
          </div>

          <div className="space-y-6">
            {isConnected && address
              ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Button
                    onClick={handleAuth}
                    disabled={isSigning || authInitiated}
                    className={cn(
                      buttonClass,
                      "border border-blue-400/50 flex justify-between items-center px-6",
                    )}
                  >
                    {isSigning || authInitiated
                      ? (
                        <div className="flex items-center justify-center w-full">
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Verifying Identity...
                        </div>
                      )
                      : (
                        <>
                          <span className="font-semibold text-lg">
                            Login with Wallet
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-300 font-mono hidden sm:inline-block">
                              {address?.slice(0, 6)}...{address?.slice(-4)}
                            </span>
                            <div className="bg-green-500/20 p-1 rounded-full">
                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                            </div>
                          </div>
                        </>
                      )}
                  </Button>
                </motion.div>
              )
              : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Button
                    onClick={handleConnectWallet}
                    disabled={isConnecting}
                    className={buttonClass}
                  >
                    {isConnecting
                      ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Connecting...
                        </>
                      )
                      : (
                        <>
                          <Wallet className="w-5 h-5 mr-2" />
                          Connect MetaMask
                        </>
                      )}
                  </Button>
                </motion.div>
              )}

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="text-xs text-center text-slate-500"
            >
              🔒 Secure custom authentication. Your wallet is your identity.
            </motion.p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;