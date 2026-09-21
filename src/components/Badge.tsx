import type { Tone } from './StatCard';

export default function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return <span className={`badge ${tone}`}>{label}</span>;
}
