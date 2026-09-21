import type { IconType } from 'react-icons';

export default function EmptyState({
  icon: Icon,
  title,
  message,
}: {
  icon: IconType;
  title: string;
  message: string;
}) {
  return (
    <div className="empty-state">
      <Icon />
      <span className="empty-state__title">{title}</span>
      <span className="empty-state__message">{message}</span>
    </div>
  );
}
