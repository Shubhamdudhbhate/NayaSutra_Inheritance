import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Power, Settings, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean | null;
  created_at: string | null;
}

interface DashboardHeaderProps {
  judgeName: string;
  designation?: string;
  avatarUrl?: string;
  notificationCount?: number;
}

export const DashboardHeader = ({
  judgeName,
  designation = "Honorable Justice",
  avatarUrl,
  notificationCount = 3,
}: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch full notification details when dropdown opens
  useEffect(() => {
    if (!showNotifications) return;

    const fetchNotifications = async () => {
      try {
        const { data } = await supabase
          .from("notifications")
          .select("id, title, message, is_read, created_at")
          .order("created_at", { ascending: false })
          .limit(10);

        if (data) {
          setNotifications((data as any[]).map((n) => ({
            ...n,
            is_read: n.is_read ?? false,
            created_at: n.created_at ?? new Date().toISOString(),
          })));
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  }, [showNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      setNotifications((prev) =>
        prev.map((n) => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <header className="bg-transparent border-none">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Greeting */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {designation} <span className="text-gradient">{judgeName}</span>
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>{formatDate(currentTime)}</span>
            <span className="text-primary font-mono">
              {formatTime(currentTime)}
            </span>
          </div>
        </div>

        {/* Center: Search */}
        <div></div>

        {/* Right: Consolidated Actions in Avatar Dropdown */}
        <DropdownMenu
          open={showNotifications}
          onOpenChange={setShowNotifications}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-12 w-12 rounded-full hover:bg-slate-800/50 transition-colors"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={avatarUrl} alt={judgeName} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm">
                  {judgeName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              {notificationCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white">
                  {notificationCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 max-h-96 overflow-y-auto"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-900 sticky top-0 z-10">
              <p className="text-sm font-semibold text-white">{judgeName}</p>
              <p className="text-xs text-slate-300">{designation}</p>
            </div>
            <DropdownMenuSeparator className="m-0" />

            {/* Notifications List */}
            {notifications && notifications.length > 0
              ? (
                <div className="space-y-2 p-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        notification.is_read
                          ? "bg-slate-900/30 border-slate-700"
                          : "bg-blue-500/10 border-blue-500/30"
                      } hover:bg-slate-800/50`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-slate-300 line-clamp-2 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {notification.created_at
                              ? new Date(notification.created_at)
                                .toLocaleDateString()
                              : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="flex-shrink-0 p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="mt-2 text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )
              : (
                <div className="p-6 text-center">
                  <Bell className="h-8 w-8 text-slate-500 mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-slate-400">No notifications</p>
                </div>
              )}

            <DropdownMenuSeparator />

            {/* Menu Items */}
            <DropdownMenuItem className="cursor-pointer py-2.5 px-3 focus:bg-slate-800/50">
              <User className="mr-3 h-4 w-4 text-blue-400" />
              <span className="text-sm">Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer py-2.5 px-3 focus:bg-slate-800/50">
              <Settings className="mr-3 h-4 w-4 text-purple-400" />
              <span className="text-sm">Preferences</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer py-2.5 px-3 focus:bg-red-500/20 text-red-400"
              onClick={handleLogout}
            >
              <Power className="mr-3 h-4 w-4" />
              <span className="text-sm">Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
