import { IoAdd } from 'react-icons/io5';

export default function FAB({
  onClick,
  ariaLabel,
}: {
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button className="fab" onClick={onClick} aria-label={ariaLabel}>
      <IoAdd />
    </button>
  );
}
