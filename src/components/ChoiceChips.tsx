
export default function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="choice-chips">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`choice-chip ${opt === value ? 'selected' : ''}`}
          onClick={() => onChange(opt)}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}
