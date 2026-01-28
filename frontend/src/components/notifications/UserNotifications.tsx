import { useState, useEffect } from "react";
import { Bell, Check, X, Clock, AlertCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  requires_confirmation?: boolean;
  type?: string;
  metadata?: any;
}

interface UserNotificationsProps {
  className?: string;
}

export const UserNotifications = ({ className }: UserNotificationsProps) => {
  const { profile } = useAuth();
  const { connect, isConnected, isConnecting } = useWeb3();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications for current user only
  const fetchNotifications = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id) // Only fetch notifications for current user
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      if (data) {
        const formattedNotifications = data.map((n: any) => ({
          ...n,
          is_read: n.is_read ?? false,
          created_at: n.created_at ?? new Date().toISOString(),
        }));
        
        setNotifications(formattedNotifications);
        setUnreadCount(formattedNotifications.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Real-time subscription for current user's notifications
  useEffect(() => {
    if (!profile?.id) return;

    // Initial fetch
    fetchNotifications();

    // Set up real-time subscription for current user's notifications
    const channel = supabase
      .channel(`user-notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}` // Only listen for current user's notifications
        },
        (payload) => {
          console.log('🔔 Real-time notification received:', payload);
          
          if (payload.eventType === 'INSERT') {
            // New notification received
            const newNotification: Notification = {
              id: payload.new.id,
              title: payload.new.title,
              message: payload.new.message,
              is_read: payload.new.is_read ?? false,
              created_at: payload.new.created_at ?? new Date().toISOString(),
              confirmed_at: payload.new.confirmed_at,
              confirmed_by: payload.new.confirmed_by,
              requires_confirmation: payload.new.requires_confirmation,
            };
            
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Show toast for new notification
            toast.success(newNotification.title, {
              description: newNotification.message,
              duration: 5000,
            });
          } else if (payload.eventType === 'UPDATE') {
            // Notification updated (marked as read, etc.)
            setNotifications(prev => 
              prev.map(n => n.id === payload.new.id ? { 
                ...n, 
                ...payload.new,
                is_read: payload.new.is_read ?? n.is_read,
                created_at: payload.new.created_at ?? n.created_at,
              } : n)
            );
            
            // Update unread count
            if (payload.new.is_read && !payload.old.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          } else if (payload.eventType === 'DELETE') {
            // Notification deleted
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
            if (!payload.old.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) {
        console.error("Error marking notification as read:", error);
        toast.error("Failed to mark notification as read");
        return;
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", profile.id)
        .eq("is_read", false);

      if (error) {
        console.error("Error marking all notifications as read:", error);
        toast.error("Failed to mark all notifications as read");
        return;
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("Failed to mark all notifications as read");
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) {
        console.error("Error deleting notification:", error);
        toast.error("Failed to delete notification");
        return;
      }

      // Update local state
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast.success("Notification deleted");
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  const handleConnectWallet = async () => {
    try {
      await connect();
      toast.success("Wallet connected successfully!");
    } catch (error) {
      console.error("Wallet connection failed:", error);
      toast.error("Failed to connect wallet");
    }
  };

  const handleConfirmSession = async (notification: Notification) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      // Mark notification as confirmed
      const { error } = await supabase
        .from("notifications")
        .update({ 
          confirmed_at: new Date().toISOString(),
          confirmed_by: profile?.id,
          is_read: true
        })
        .eq("id", notification.id);

      if (error) {
        console.error("Error confirming session:", error);
        toast.error("Failed to confirm session");
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notification.id 
          ? { ...n, confirmed_at: new Date().toISOString(), confirmed_by: profile?.id, is_read: true }
          : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      toast.success("Session confirmed successfully!");
    } catch (error) {
      console.error("Error confirming session:", error);
      toast.error("Failed to confirm session");
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    if (notification.requires_confirmation) {
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    }
    if (!notification.is_read) {
      return <Bell className="w-4 h-4 text-blue-500" />;
    }
    return <Check className="w-4 h-4 text-green-500" />;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className={className}>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setShowNotifications(!showNotifications)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <Card className="absolute right-0 top-12 w-96 z-50 shadow-lg border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {unreadCount > 0 && (
              <CardDescription>
                You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b hover:bg-muted/50 transition-colors ${
                        !notification.is_read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-medium truncate ${
                              !notification.is_read ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {notification.title}
                            </p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(notification.created_at)}
                              </span>
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNotification(notification.id)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          {notification.type === 'session_ended' && notification.requires_confirmation && !notification.confirmed_at && (
                            <div className="mt-3 space-y-2">
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Session Confirmation Required
                              </Badge>
                              <div className="flex gap-2 mt-2">
                                {!isConnected ? (
                                  <Button
                                    size="sm"
                                    onClick={handleConnectWallet}
                                    disabled={isConnecting}
                                    className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
                                  >
                                    <Wallet className="w-3 h-3 mr-1" />
                                    {isConnecting ? 'Connecting...' : 'Sign In with MetaMask'}
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleConfirmSession(notification)}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                  >
                                    <Check className="w-3 h-3 mr-1" />
                                    Confirm Session
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                          {notification.requires_confirmation && !notification.confirmed_at && notification.type !== 'session_ended' && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              Action Required
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
