
export default function PrimaryButton({
  label,
  onClick,
  loading,
  disabled,
  type = 'button',
}: {
  label: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      className="btn-primary"
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? 'Guardando…' : label}
    </button>
  );
}
