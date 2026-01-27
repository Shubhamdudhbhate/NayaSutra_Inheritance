import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Scale,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
  comingSoon?: boolean;
}

export const NyaySutraSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { currentUser } = useRole();

  const navItems = useMemo(() => {
    console.log("🔍 NyaySutraSidebar: Checking user role for nav items", {
      currentUser: currentUser?.name,
      role: currentUser?.role,
      roleCategory: currentUser?.roleCategory,
    });

    if (currentUser?.role === 'lawyer') {
      console.log("👨‍⚖️ NyaySutraSidebar: Rendering lawyer nav items");
      return [
        {
          id: "today-cases",
          label: "Today's Cases",
          icon: Calendar,
          path: "/lawyer/today-cases",
        },
        {
          id: "case-repository",
          label: "Case Repository",
          icon: FolderOpen,
          path: "/lawyer/case-repository",
        },
        {
          id: "notifications",
          label: "Notifications",
          icon: Bell,
          path: "/lawyer/notifications",
        }
      ];
    } else {
      console.log("⚖️ NyaySutraSidebar: Rendering default/judge nav items (role:", currentUser?.role, ")");
      // Default/judge nav items
      return [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          path: "/dashboard",
        },
        { id: "cases", label: "Cases", icon: FolderOpen, path: "/courts" },
        {
          id: "calendar",
          label: "Court Calendar",
          icon: Calendar,
          path: "/court-calendar",
        },
        { id: "analytics", label: "Analytics", icon: BarChart3, path: "/analytics" },
      ];
    }
  }, [currentUser]);

  const bottomNavItems = useMemo(() => [
    {
      id: "logout",
      label: "Logout",
      icon: LogOut,
      path: "/",
    },
  ], []);

  const isActive = (path: string, id: string) => {
    if (id === "dashboard") return location.pathname === "/dashboard";
    if (id === "cases") {
      return location.pathname.startsWith("/courts") ||
        location.pathname.startsWith("/sections") ||
        location.pathname.startsWith("/cases");
    }
    if (id === "calendar") return location.pathname === "/court-calendar";
    if (id === "analytics") return location.pathname === "/analytics";
    if (id === "today-cases") return location.pathname === "/lawyer/today-cases";
    if (id === "case-repository") return location.pathname === "/lawyer/case-repository";
    return location.pathname === path;
  };

  const handleNavigation = async (item: NavItem) => {
    if (item.id === "logout") {
      await signOut();
      navigate("/");
      return;
    }
    if (item.comingSoon) {
      toast.info(`${item.label} - Coming Soon`, {
        description: "This feature is under development",
      });
      return;
    }
    navigate(item.path);
  };

  const NavItemComponent = (
    { item, isBottom = false }: { item: NavItem; isBottom?: boolean },
  ) => {
    void isBottom; // Mark as intentionally unused
    const Icon = item.icon;
    const active = isActive(item.path, item.id);

    const content = (
      <button
        onClick={() => handleNavigation(item)}
        className={cn(
          "nav-item w-full",
          active && !item.comingSoon && "active",
          item.comingSoon && "opacity-60",
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span>{item.label}</span>}
        {!collapsed && item.badge && (
          <span className="ml-auto bg-urgent text-urgent-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
        {!collapsed && item.comingSoon && (
          <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            Soon
          </span>
        )}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label} {item.comingSoon && "(Coming Soon)"}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar-background border-r border-sidebar-border flex flex-col transition-all duration-300 z-50",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary">
            <Scale className="h-6 w-6 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-lg text-sidebar-foreground">
                NyaySutra
              </h1>
              <p className="text-xs text-sidebar-foreground/60">
                Digital Court System
              </p>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <NavItemComponent
              key={item.id}
              item={item}
            />
          ))}
        </nav>

        {/* Bottom Navigation */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
          {bottomNavItems.map((item) => (
            <NavItemComponent key={item.id} item={item} isBottom />
          ))}
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-7 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-muted"
        >
          {collapsed
            ? <ChevronRight className="h-3 w-3" />
            : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </aside>
    </TooltipProvider>
  );
};
