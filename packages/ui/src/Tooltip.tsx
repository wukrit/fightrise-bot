import React from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const tooltipContainerStyles: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
};

const tooltipBase: React.CSSProperties = {
  position: 'absolute',
  padding: '6px 10px',
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  fontSize: '12px',
  borderRadius: '4px',
  whiteSpace: 'nowrap',
  zIndex: 1000,
  opacity: 0,
  visibility: 'hidden',
  transition: 'opacity 0.15s ease, visibility 0.15s ease',
  pointerEvents: 'none',
};

const positionStyles: Record<string, React.CSSProperties> = {
  top: {
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: '8px',
  },
  bottom: {
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: '8px',
  },
  left: {
    right: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    marginRight: '8px',
  },
  right: {
    left: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    marginLeft: '8px',
  },
};

export function Tooltip({ content, children, position = 'top', delay = 300 }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  return (
    <div
      style={tooltipContainerStyles}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      <div
        style={{
          ...tooltipBase,
          ...positionStyles[position],
          ...(isVisible ? { opacity: 1, visibility: 'visible' } : {}),
        }}
        role="tooltip"
      >
        {content}
      </div>
    </div>
  );
}
