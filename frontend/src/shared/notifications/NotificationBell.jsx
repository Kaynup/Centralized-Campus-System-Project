import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import useNotifications from '../hooks/useNotification';
import NotificationBadge from './NotificationBadge';
import NotificationsFeed from './NotificationsFeed';

const DROPDOWN_LIMIT = 8;

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    const navigate = useNavigate();
    const { refreshNotifications, markAllAsRead, unreadCount } = useNotifications();

    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOpen = () => {
        setOpen((prev) => {
            if (!prev) refreshNotifications();
            return !prev;
        });
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={toggleOpen}
                aria-label="Notifications"
                aria-expanded={open}
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-forest/10"
            >
                <Bell size={20} className="text-forest" />
                <NotificationBadge />
            </button>

            {open && (
                <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-lg border border-slate/10 bg-white shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate/10 px-4 py-3">
                        <span className="text-sm font-semibold text-slate">Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={markAllAsRead}
                                className="text-xs font-medium text-forest hover:underline"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        <NotificationsFeed limit={DROPDOWN_LIMIT} onItemClick={() => setOpen(false)} />
                    </div>

                    <div className="border-t border-slate/10 px-4 py-2 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                navigate('/notifications');
                            }}
                            className="text-xs font-medium text-forest hover:underline"
                        >
                            View all notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}