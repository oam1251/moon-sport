
export default function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'textarea' | 'password';
  required?: boolean;
}) {
  return (
    <div className="form-field">
      <label>{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          placeholder={placeholder}
          required={required}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type === 'number' ? 'number' : type === 'password' ? 'password' : 'text'}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={value}
          placeholder={placeholder}
          required={required}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
