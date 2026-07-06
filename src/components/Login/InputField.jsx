export default function InputField({
  label,
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  onKeyDown,
  icon,
  toggleSlot,
  autoComplete,
}) {
  return (
    <div className="login-field">
      <label className="login-field__label" htmlFor={id}>
        {label}
      </label>

      <div className="login-field__wrap">
        <input
          id={id}
          type={type}
          className={`login-field__input${toggleSlot ? " login-field__input--with-toggle" : ""}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          autoComplete={autoComplete}
          spellCheck={false}
        />

        {/* Left icon */}
        <span className="login-field__icon">{icon}</span>

        {/* Right toggle (password visibility) */}
        {toggleSlot && toggleSlot}
      </div>
    </div>
  );
}
