import { useRole } from "@/contexts/RoleContext";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useNavigate } from "react-router-dom";

// Import all dashboard components
import { PoliceDashboard } from "@/components/dashboard/PoliceDashboard";
import { JudiciaryDashboard } from "@/components/dashboard/JudiciaryDashboard";
import { ClerkDashboard } from "@/components/dashboard/clerk/ClerkDashboard";
import { PublicDashboard } from "@/components/dashboard/PublicDashboard";

const Dashboard = () => {
  const { currentUser } = useRole();
  const navigate = useNavigate();

  // Wait until currentUser is loaded
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  // Log role detection
  console.log("🔍 Dashboard Router: Checking user role...", {
    currentUser: currentUser.name,
    role: currentUser.role,
    roleCategory: currentUser.roleCategory,
  });

  // ROLE-BASED DASHBOARD ROUTING
  // Each role gets their own dashboard component
  switch (currentUser.role) {
    case "police":
      console.log("🚔 Dashboard Router: Rendering PoliceDashboard");
      return <PoliceDashboard />;

    case "judge":
      console.log("⚖️ Dashboard Router: Rendering JudiciaryDashboard");
      return <JudiciaryDashboard />;

    case "clerk":
      console.log("📋 Dashboard Router: Rendering ClerkDashboard");
      return <ClerkDashboard />;

    case "lawyer":
      console.log("👨‍⚖️ Dashboard Router: Redirecting lawyer to TodayCases");
      // Redirect lawyers to their main page instead of dashboard
      navigate("/lawyer/today-cases", { replace: true });
      return <div>Redirecting...</div>;

    case "observer":
    default:
      console.log("👥 Dashboard Router: Rendering PublicDashboard");
      return <PublicDashboard />;
  }
};

export default Dashboard;
