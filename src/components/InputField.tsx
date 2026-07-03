"use client";

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
} from "react";
import { Eye, EyeOff, Search } from "lucide-react";

type InputFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: string;
  helperText?: string;
  error?: string;
  success?: string;
  inputType?: "text" | "search" | "password";
  containerClassName?: string;
};

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  function InputField(
    {
      id,
      label,
      helperText,
      error,
      success,
      inputType,
      type,
      disabled,
      value,
      defaultValue,
      containerClassName = "",
      className = "",
      ...inputProps
    },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id || generatedId;
    const resolvedType = inputType || (type === "password" ? "password" : "text");
    const [showPassword, setShowPassword] = useState(false);
    const hasValue =
      (typeof value === "string" && value.length > 0) ||
      (typeof defaultValue === "string" && defaultValue.length > 0);
    const message = error || success || helperText;
    const messageId = message ? `${inputId}-message` : undefined;

    return (
      <div
        className={`sf-input ${containerClassName}`.trim()}
        data-disabled={disabled || undefined}
        data-error={Boolean(error) || undefined}
        data-success={Boolean(success) || undefined}
        data-filled={hasValue || undefined}
      >
        {label && (
          <label className="sf-input__label" htmlFor={inputId}>
            {label}
          </label>
        )}

        <div className="sf-input__control">
          {resolvedType === "search" && (
            <Search
              aria-hidden="true"
              className="sf-input__icon"
              size={24}
              strokeWidth={1}
            />
          )}

          <input
            {...inputProps}
            ref={ref}
            id={inputId}
            type={
              resolvedType === "password"
                ? showPassword
                  ? "text"
                  : "password"
                : type || resolvedType
            }
            disabled={disabled}
            value={value}
            defaultValue={defaultValue}
            className={`sf-input__native ${className}`.trim()}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={messageId}
          />

          {resolvedType === "password" && (
            <button
              type="button"
              className="sf-input__password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              disabled={disabled}
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" size={24} strokeWidth={1} />
              ) : (
                <Eye aria-hidden="true" size={24} strokeWidth={1} />
              )}
            </button>
          )}
        </div>

        {message && (
          <p className="sf-input__message" id={messageId}>
            {message}
          </p>
        )}
      </div>
    );
  },
);

export default InputField;
