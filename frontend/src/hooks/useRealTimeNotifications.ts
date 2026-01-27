import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getUserNotifications, markNotificationAsRead, getUnreadNotificationCount } from '@/services/notificationServiceDatabase';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean | null;
  created_at: string | null;
}

export const useRealTimeNotifications = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    // 1. Load initial notifications
    const loadNotifications = async () => {
      try {
        const userNotifications = await getUserNotifications(profile.id, false);
        setNotifications(userNotifications);
        
        const unread = await getUnreadNotificationCount(profile.id);
        setUnreadCount(unread);
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();

    // 2. Set up real-time subscription
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          console.log('🔔 New notification received:', payload.new);
          
          // Show toast notification
          toast.info(payload.new.title, {
            description: payload.new.message,
            duration: 8000,
            action: {
              label: "Mark as Read",
              onClick: () => markNotificationAsRead(payload.new.id)
            }
          });

          // Update state
          setNotifications(prev => [payload.new as Notification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    // 3. Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const markAsRead = async (notificationId: string) => {
    const success = await markNotificationAsRead(notificationId);
    if (success) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    return success;
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.is_read);
    const promises = unreadNotifications.map(n => markNotificationAsRead(n.id));
    
    await Promise.all(promises);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch: () => {
      if (profile?.id) {
        getUserNotifications(profile.id, false).then(setNotifications);
        getUnreadNotificationCount(profile.id).then(setUnreadCount);
      }
    }
  };
};
