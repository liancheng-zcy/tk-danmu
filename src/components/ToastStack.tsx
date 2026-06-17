export interface NoticeItem {
  id: string;
  level: 'warning' | 'error';
  message: string;
  timestamp: string;
}

interface ToastStackProps {
  notices: NoticeItem[];
  onDismiss: (id: string) => void;
}

function getNoticeTitle(level: NoticeItem['level']) {
  return level === 'error' ? '错误' : '提醒';
}

export function ToastStack({ notices, onDismiss }: ToastStackProps) {
  if (notices.length === 0) {
    return null;
  }

  return (
    <div className="toast-stack" aria-live="polite" aria-label="消息提示">
      {notices.map((notice) => (
        <div
          key={notice.id}
          className={`toast-card toast-card-${notice.level}`}
        >
          <div className="toast-head">
            <strong>{getNoticeTitle(notice.level)}</strong>
            <button
              type="button"
              className="toast-close"
              aria-label="关闭提示"
              onClick={() => onDismiss(notice.id)}
            >
              ×
            </button>
          </div>
          <p>{notice.message}</p>
        </div>
      ))}
    </div>
  );
}
