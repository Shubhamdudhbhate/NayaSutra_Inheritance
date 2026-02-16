import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Info,
  Loader2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/contexts/Web3Context";
import { supabase } from "@/integrations/supabase";
import { toast } from "sonner";

const Auth = () => {
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
        throw new Error(
          "Access Denied: Your wallet is not whitelisted. Please contact the administrator.",
        );
      }

      // Security Check: Block suspended users
      if (
        (profileData as any).status === "suspended" ||
        (profileData as any).status === "pending"
      ) {
        throw new Error(
          "Access Denied: Your account is " + (profileData as any).status,
        );
      }

      if (!(profileData as any).nonce) {
        throw new Error("Security Error: Nonce missing.");
      }

      // STEP 2: Sign the Nonce
      const message = `Welcome to NyaySutra.\n\nNonce: ${
        (profileData as any).nonce
      }\n\nSign this message to verify your identity.`;

      const signature = await signMessage(message);

      if (!signature) {
        setAuthInitiated(false);
        toast.error("Signature rejected");
        return;
      }

      // STEP 3: Verify Signature on Backend
      const { data: authResult, error: authError } =
        await (supabase.rpc as any)("verify_user_login", {
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

      console.log("✅ Auth: Login successful! User role from Supabase:", {
        userId: (profileData as any).id,
        roleFromSupabase: (profileData as any).role_category,
        tokenSaved: !!authResult.token,
      });

      window.location.reload();

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
  const buttonClass = 
    "w-full h-16 text-lg font-semibold rounded-xl transition-all relative overflow-hidden " +
    "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 " +
    "shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 grid-background opacity-10" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-2xl"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-bold text-white mb-4">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              NyaySutra
            </span>
          </h1>
          <p className="text-xl text-slate-300">
            Digital Justice System
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass-card p-10 rounded-3xl border-2 border-blue-500/30 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative inline-block"
            >
            <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
            
            {/* Logo container with subtle background */}
            <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-3 border border-white/10 shadow-xl group-hover:border-white/20 transition-all duration-300">
              <img 
                src="/logo.png" 
                alt="NyaySutra" 
                className="h-24 w-auto object-contain filter drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            
            {/* Subtle accent line */}
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
            </motion.div>
            <h2 className="text-3xl font-bold text-white mt-6 mb-2">
              Secure Login
            </h2>
            <p className="text-slate-400">
              Connect your wallet to access the justice system
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
                    className={buttonClass + " border border-blue-400/50"}
                  >
                    {isSigning || authInitiated
                      ? (
                        <div className="flex items-center justify-center w-full">
                          <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                          Verifying Identity...
                        </div>
                      )
                      : (
                        <>
                          <span className="font-semibold text-xl">
                            Proceed to Login
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-300 font-mono">
                              {address?.slice(0, 6)}...{address?.slice(-4)}
                            </span>
                            <div className="bg-green-500/20 p-2 rounded-full">
                              <CheckCircle2 className="w-6 h-6 text-green-400" />
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
                          <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                          Connecting...
                        </>
                      )
                      : (
                        <>
                          <Wallet className="w-6 h-6 mr-3" />
                          Connect Wallet
                        </>
                      )}
                  </Button>
                </motion.div>
              )}

            {/* Important Notice */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-amber-300 font-semibold mb-1">
                    Important Notice
                  </p>
                  <p className="text-slate-300">
                    Please use your authorized and registered wallet address only. 
                    Access is restricted to pre-approved users in the system.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="text-xs text-center text-slate-500"
            >
            </motion.p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Auth;
