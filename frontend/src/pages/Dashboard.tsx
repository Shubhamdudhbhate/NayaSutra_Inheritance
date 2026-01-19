import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { JudiciaryDashboard } from "@/components/dashboard/JudiciaryDashboard";
import { ClerkDashboard } from "@/components/dashboard/clerk/ClerkDashboard";
import { PublicDashboard } from "@/components/dashboard/PublicDashboard";
import { PoliceDashboard } from "@/components/dashboard/PoliceDashboard";
import ProfessionalDashboard from "@/components/ProfessionalDashboard";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const Dashboard = () => {
  const { currentUser } = useRole();
  const { profile } = useAuth();

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  // Show professional dashboard for new roles
  if (profile?.role_category === "lawyer" || profile?.role_category === "clerk") {
    return <ProfessionalDashboard />;
  }

  // Role-based dashboard switching for existing roles
  switch (currentUser.role) {
    case "judge":
      return <JudiciaryDashboard />;
    case "clerk":
      return <ClerkDashboard />;
    case "police":
      return <PoliceDashboard />;
    case "observer":
      return <PublicDashboard />;
    default:
      return <ProfessionalDashboard />;
  }
};

export default Dashboard;
