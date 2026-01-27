import { useState, useEffect } from "react";
import { Bell, Check, Clock, AlertCircle, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
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
  user_id: string;
}

interface NotificationTabProps {
  className?: string;
}

export const NotificationTab = ({ className }: NotificationTabProps) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  // Fetch notifications for current user only
  const fetchNotifications = async () => {
    if (!profile?.id) {
      setIsLoading(false);
      return;
    }

    try {
      console.log(`🔔 Fetching notifications for user: ${profile.id}`);
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id) // Only fetch notifications for current user
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching notifications:", error);
        toast.error("Failed to fetch notifications");
        return;
      }

      if (data) {
        console.log(`📬 Found ${data.length} notifications for user ${profile.id}`);
        const formattedNotifications = data.map((n: any) => ({
          ...n,
          is_read: n.is_read ?? false,
          created_at: n.created_at ?? new Date().toISOString(),
        }));
        
        setNotifications(formattedNotifications);
        setUnreadCount(formattedNotifications.filter(n => !n.is_read).length);
      } else {
        console.log("No notifications found");
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to fetch notifications");
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time subscription for current user's notifications
  useEffect(() => {
    if (!profile?.id) return;

    console.log(`🔔 Setting up real-time notifications for user: ${profile.id}`);

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
              user_id: payload.new.user_id,
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time notifications subscribed successfully');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time notifications subscription failed');
        }
      });

    return () => {
      console.log('🔔 Cleaning up real-time notifications');
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
      toast.success("Notification marked as read");
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

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === "unread") return !n.is_read;
    if (activeTab === "read") return n.is_read;
    return true;
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-muted-foreground">Loading notifications...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
        <CardDescription>
          {unreadCount > 0 
            ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
            : "All notifications read"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="flex items-center gap-2">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex items-center gap-2">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="read" className="flex items-center gap-2">
              Read ({notifications.filter(n => n.is_read).length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-4">
            <ScrollArea className="h-96">
              {filteredNotifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>
                    {activeTab === "unread" ? "No unread notifications" :
                     activeTab === "read" ? "No read notifications" :
                     "No notifications yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        !notification.is_read ? 'bg-blue-50/50 border-blue-200' : 'bg-muted/30'
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
                              {!notification.is_read ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  className="h-6 w-6 p-0"
                                  title="Mark as read"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  className="h-6 w-6 p-0"
                                  title="Mark as unread"
                                >
                                  <EyeOff className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNotification(notification.id)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                title="Delete notification"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          {notification.requires_confirmation && !notification.confirmed_at && (
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
