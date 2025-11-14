import React, { useState, useEffect } from 'react';
import './NotificationCenter.css';

interface Notification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      type: 'info',
      title: 'Новая консультация',
      message: 'Запись на консультацию к Доктору Иванову И.И. подтверждена на 15.11.2024 в 15:00',
      timestamp: new Date(),
      read: false
    },
    {
      id: 2,
      type: 'success',
      title: 'Пополнение баланса',
      message: 'Ваш баланс пополнен на 1000 поинтов',
      timestamp: new Date(Date.now() - 3600000),
      read: false
    },
    {
      id: 3,
      type: 'warning',
      title: 'Напоминание',
      message: 'Консультация начнется через 1 час',
      timestamp: new Date(Date.now() - 7200000),
      read: true
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: number) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleDelete = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info': return '💡';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '📢';
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const seconds = Math.floor((new Date().getTime() - timestamp.getTime()) / 1000);
    if (seconds < 60) return 'только что';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} мин назад`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч назад`;
    const days = Math.floor(hours / 24);
    return `${days} д назад`;
  };

  return (
    <div className="notification-center">
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="notification-overlay"
            onClick={() => setIsOpen(false)}
          />
          <div className="notification-panel">
            <div className="notification-header">
              <h3>Уведомления</h3>
              {unreadCount > 0 && (
                <button
                  className="mark-all-read-btn"
                  onClick={handleMarkAllAsRead}
                >
                  Прочитать все
                </button>
              )}
            </div>

            <div className="notification-list">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${notification.read ? 'read' : 'unread'} ${notification.type}`}
                  >
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">
                        {getTimeAgo(notification.timestamp)}
                      </div>
                    </div>
                    <div className="notification-actions">
                      {!notification.read && (
                        <button
                          className="notification-action-btn"
                          onClick={() => handleMarkAsRead(notification.id)}
                          title="Отметить как прочитанное"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        className="notification-action-btn delete"
                        onClick={() => handleDelete(notification.id)}
                        title="Удалить"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="notification-empty">
                  <div className="empty-icon">🔕</div>
                  <p>Нет уведомлений</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;

