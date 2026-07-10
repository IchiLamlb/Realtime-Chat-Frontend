import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, RefreshCw, ShieldCheck, Users, X } from 'lucide-react';
import { api } from '../../../api';
import type {
  ActiveUsersMetric,
  MessagesPerMinuteMetric,
  PeakTrafficWindowMetric,
  RateLimitRatioMetric,
  TopConversationMetric,
} from '../../../types';
import { useChatControllerContext } from '../model/useChatControllerContext';

interface AdminAnalyticsState {
  messagesPerMinute: MessagesPerMinuteMetric[];
  activeUsers: ActiveUsersMetric[];
  topConversations: TopConversationMetric[];
  peakTrafficWindow: PeakTrafficWindowMetric | null;
  rateLimitRatio: RateLimitRatioMetric[];
}

const emptyAnalytics: AdminAnalyticsState = {
  messagesPerMinute: [],
  activeUsers: [],
  topConversations: [],
  peakTrafficWindow: null,
  rateLimitRatio: [],
};

function formatDateTime(value?: string | null) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export function AdminPanelModal() {
  const { adminPanel, session } = useChatControllerContext();
  const [analytics, setAnalytics] = useState<AdminAnalyticsState>(emptyAnalytics);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestMessages = analytics.messagesPerMinute[0]?.messageCount ?? 0;
  const latestActiveUsers = analytics.activeUsers[0]?.activeUsers ?? 0;
  const latestRateLimitRatio = analytics.rateLimitRatio[0]?.rateLimitRatio ?? 0;

  const refreshAnalytics = useCallback(async () => {
    if (!session.token) return;

    setLoading(true);
    setError(null);
    try {
      const [
        messagesPerMinute,
        activeUsers,
        topConversations,
        peakTrafficWindow,
        rateLimitRatio,
      ] = await Promise.all([
        api.messagesPerMinute(session.token, 20),
        api.activeUsers(session.token, 20),
        api.topConversations(session.token, 10),
        api.peakTrafficWindow(session.token),
        api.rateLimitRatio(session.token, 20),
      ]);

      setAnalytics({
        messagesPerMinute,
        activeUsers,
        topConversations,
        peakTrafficWindow,
        rateLimitRatio,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tải được dữ liệu quản trị');
    } finally {
      setLoading(false);
    }
  }, [session.token]);

  useEffect(() => {
    if (adminPanel.show) {
      void refreshAnalytics();
    }
  }, [adminPanel.show, refreshAnalytics]);

  const topRows = useMemo(
    () =>
      analytics.topConversations.map((item) => ({
        ...item,
        shortId: item.conversationId.slice(0, 8),
      })),
    [analytics.topConversations],
  );

  if (!adminPanel.show) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <section className="modal-content admin-panel-modal" aria-label="Admin application management">
        <div className="modal-header admin-panel-header">
          <div>
            <span className="admin-panel-kicker">
              <ShieldCheck size={15} />
              Admin
            </span>
            <h3>Quản lý ứng dụng</h3>
          </div>
          <div className="admin-panel-actions">
            <button className="icon-button" type="button" onClick={refreshAnalytics} disabled={loading} title="Làm mới">
              <RefreshCw size={18} />
            </button>
            <button className="icon-button" type="button" onClick={adminPanel.close} aria-label="Đóng trang quản trị">
              <X size={18} />
            </button>
          </div>
        </div>

        {error ? <div className="admin-error">{error}</div> : null}

        <div className="admin-summary-grid">
          <div className="admin-metric-card">
            <BarChart3 size={20} />
            <span>Tin nhắn/phút</span>
            <strong>{latestMessages.toLocaleString('vi-VN')}</strong>
          </div>
          <div className="admin-metric-card">
            <Users size={20} />
            <span>Active users</span>
            <strong>{latestActiveUsers.toLocaleString('vi-VN')}</strong>
          </div>
          <div className="admin-metric-card">
            <ShieldCheck size={20} />
            <span>Rate limit</span>
            <strong>{formatPercent(latestRateLimitRatio)}</strong>
          </div>
        </div>

        <div className="admin-section-grid">
          <section className="admin-section">
            <h4>Peak traffic window</h4>
            <div className="admin-peak-row">
              <span>{formatDateTime(analytics.peakTrafficWindow?.windowStart)}</span>
              <strong>{(analytics.peakTrafficWindow?.messageCount ?? 0).toLocaleString('vi-VN')} messages</strong>
            </div>
          </section>

          <section className="admin-section">
            <h4>Top conversations</h4>
            <div className="admin-table">
              {topRows.length ? topRows.map((row) => (
                <div className="admin-table-row" key={`${row.conversationId}-${row.windowStart}`}>
                  <span>#{row.shortId}</span>
                  <span>{formatDateTime(row.windowStart)}</span>
                  <strong>{row.messageCount.toLocaleString('vi-VN')}</strong>
                </div>
              )) : <p className="admin-empty">Chưa có dữ liệu conversation.</p>}
            </div>
          </section>

          <section className="admin-section">
            <h4>Messages per minute</h4>
            <div className="admin-table">
              {analytics.messagesPerMinute.length ? analytics.messagesPerMinute.slice(0, 8).map((row) => (
                <div className="admin-table-row" key={`${row.windowStart}-${row.windowEnd}`}>
                  <span>{formatDateTime(row.windowStart)}</span>
                  <strong>{row.messageCount.toLocaleString('vi-VN')}</strong>
                </div>
              )) : <p className="admin-empty">Chưa có dữ liệu message.</p>}
            </div>
          </section>

          <section className="admin-section">
            <h4>Active users</h4>
            <div className="admin-table">
              {analytics.activeUsers.length ? analytics.activeUsers.slice(0, 8).map((row) => (
                <div className="admin-table-row" key={`${row.windowStart}-${row.windowEnd}`}>
                  <span>{formatDateTime(row.windowStart)}</span>
                  <strong>{row.activeUsers.toLocaleString('vi-VN')}</strong>
                </div>
              )) : <p className="admin-empty">Chưa có dữ liệu user active.</p>}
            </div>
          </section>
        </div>

        {loading ? <div className="admin-loading">Đang tải analytics...</div> : null}
      </section>
    </div>
  );
}
