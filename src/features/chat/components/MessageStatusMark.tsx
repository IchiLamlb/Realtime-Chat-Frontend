import type { ChatMessage } from '../../../types';

interface MessageStatusMarkProps {
  status: ChatMessage['status'];
}

export function MessageStatusMark({ status }: MessageStatusMarkProps) {
  switch (status) {
    case 'SENT':
      return (
        <span className="status-check sent" title="Sent">
          ✓
        </span>
      );
    case 'DELIVERED':
      return (
        <span className="status-check delivered" title="Delivered">
          ✓✓
        </span>
      );
    case 'READ':
      return (
        <span className="status-check read" title="Read">
          ✓✓
        </span>
      );
    default:
      return null;
  }
}
