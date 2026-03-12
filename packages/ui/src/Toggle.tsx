import React from 'react';

export interface ToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

const sizeStyles: Record<string, { track: string; thumb: string; translate: string }> = {
  sm: {
    track: 'w-9 h-5',
    thumb: 'w-4 h-4 top-0.5 left-0.5',
    translate: 'translate-x-4',
  },
  md: {
    track: 'w-11 h-6',
    thumb: 'w-5 h-5 top-0.5 left-0.5',
    translate: 'translate-x-5',
  },
  lg: {
    track: 'w-14 h-7',
    thumb: 'w-6 h-6 top-0.5 left-0.5',
    translate: 'translate-x-7',
  },
};

export function Toggle({
  label,
  description,
  size = 'md',
  checked,
  onChange,
  className,
  id,
  disabled,
}: ToggleProps) {
  const generatedId = React.useId();
  const toggleId = id || generatedId;
  const sizeConfig = sizeStyles[size];

  return (
    <label
      htmlFor={toggleId}
      className={`flex items-center justify-between cursor-pointer group ${className || ''}`}
    >
      {(label || description) && (
        <div className="flex-1 mr-4">
          {label && (
            <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
              {label}
            </span>
          )}
          {description && (
            <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        id={toggleId}
        onClick={() => onChange?.(!checked)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChange?.(!checked);
          }
        }}
        disabled={disabled}
        className={`
          relative rounded-full transition-colors duration-200
          ${sizeConfig.track}
          ${checked ? 'bg-emerald-500' : 'bg-zinc-700 group-hover:bg-zinc-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <span
          className={`
            absolute bg-white rounded-full shadow-sm transition-transform duration-200
            ${sizeConfig.thumb}
            ${checked ? sizeConfig.translate : 'translate-x-0'}
          `}
        />
      </button>
    </label>
  );
}
