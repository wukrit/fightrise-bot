import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { tokens } from './tokens.js';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

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

const contentStyles: React.CSSProperties = {
  position: 'absolute',
  padding: '6px 10px',
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  fontSize: '12px',
  borderRadius: '4px',
  whiteSpace: 'nowrap',
  zIndex: tokens.zIndex.tooltip,
  animation: 'fadeIn 150ms ease',
  boxShadow: tokens.shadows.md,
};

const arrowStyles: React.CSSProperties = {
  fill: '#1a1a1a',
};

export function Tooltip({ content, children, position = 'top', delay = 300 }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delay}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={position}
            sideOffset={8}
            style={contentStyles}
          >
            {content}
            <TooltipPrimitive.Arrow style={arrowStyles} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
