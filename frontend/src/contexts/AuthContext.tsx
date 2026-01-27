import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Define Roles matching your Database + Frontend mapping
type RoleCategory =
  | "judiciary"
  | "judge" // Added for DB compatibility
  | "lawyer"
  | "clerk"
  | "court_staff" // Added for DB compatibility
  | "public_party"
  | "police"
  | "police_officer" // Added for DB compatibility
  | "legal_practitioner";

// Updated Profile type to match your actual DB structure
type Profile = {
  id: string;
  wallet_address?: string; // Changed from email
  full_name: string;
  role_category: RoleCategory;
  // unique_id: string | null; // Optional, might not exist in your new schema
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Kept for compatibility but likely unused now
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: RoleCategory,
  ) => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // FETCH PROFILE: Now uses 'id' (Primary Key) instead of 'user_id'
  const fetchProfile = async (profileId: string) => {
    try {``
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      return data as any; // Cast to any to avoid strict type mismatch during migration
    } catch (err) {
      console.error("Fetch profile crash:", err);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);

      // 1. CHECK LOCAL STORAGE (The "Wristband")
      const token = localStorage.getItem("auth_token");
      const userId = localStorage.getItem("user_id");

      if (token && userId) {
        console.log("Restoring custom session for:", userId);

        // Fetch the real profile data from Supabase
        const profileData = await fetchProfile(userId);

        if (profileData) {
          console.log("✅ Profile loaded from Supabase:", {
            id: profileData.id,
            role_category: profileData.role_category,
            full_name: profileData.full_name,
          });
          setProfile(profileData);

          // MOCK THE USER OBJECT
          // This ensures components expecting 'user' (like Dashboard) don't crash.
          const mockUser: any = {
            id: userId,
            email: profileData.wallet_address || "wallet-user@nyaysutra.eth",
            aud: "authenticated",
            created_at: new Date().toISOString(),
          };
          setUser(mockUser);

          // Create a fake session object if needed
          setSession({
            access_token: token,
            token_type: "bearer",
            user: mockUser,
          } as Session);
        } else {
          // If profile fetch fails (e.g. deleted user), clear auth
          console.warn("Token existed but profile not found. Logging out.");
          localStorage.clear();
        }
      } // 2. FALLBACK: Check Standard Supabase Auth (Optional, keeps backward compatibility)
      else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // This path is unlikely to be used now, but safe to keep
          setSession(session);
          setUser(session.user);
          // logic to fetch profile by user_id would go here if you still had that column
        }
      }

      setIsLoading(false);
    };

    initializeAuth();

    // Listen for storage changes (e.g. logout in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth_token" && !e.newValue) {
        setUser(null);
        setProfile(null);
        setSession(null);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const signOut = async () => {
    // 1. Clear Supabase (Good practice)
    await supabase.auth.signOut();

    // 2. Clear Local Storage (CRITICAL)
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_id");

    // 3. Reset State
    setUser(null);
    setSession(null);
    setProfile(null);
    toast.success("Signed out successfully");
  };

  // Legacy stubs (unused but kept to prevent TS errors in other files)
  const signIn = async (e: string, p: string) => ({ error: null });
  const signUp = async (e: string, p: string, f: string, r: RoleCategory) => ({
    error: null,
  });

  const value = {
    user,
    session,
    profile,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user || !!profile, // True if either exists
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Return default context instead of throwing
    return {
      user: null,
      session: null,
      profile: null,
      signOut: async () => {},
      isAuthenticated: false,
      isLoading: true,
      signIn: async () => ({ error: new Error("Auth not initialized") }),
      signUp: async () => ({ error: new Error("Auth not initialized") }),
    } as AuthContextType;
  }
  return context;
};
