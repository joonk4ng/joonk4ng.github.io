import React from 'react';
import './Notification.css';

interface NotificationProps {
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  onClose: () => void;
  duration?: number;
}

export function Notification(props: NotificationProps) {
  const { message, type, onClose, duration = 3000 } = props;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`notification notification-${type}`}>
      <div className="notification-content">
        {message}
      </div>
      <button className="notification-close" onClick={onClose}>×</button>
    </div>
  );
} 