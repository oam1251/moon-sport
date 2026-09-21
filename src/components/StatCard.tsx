import type { IconType } from 'react-icons';

export type Tone = 'gold' | 'success' | 'danger' | 'neutral';

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
  helper,
}: {
  label: string;
  value: string;
  icon: IconType;
  tone?: Tone;
  helper?: string;
}) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-card__icon">
        <Icon />
      </div>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      {helper && <span className="stat-card__helper">{helper}</span>}
    </div>
  );
}
