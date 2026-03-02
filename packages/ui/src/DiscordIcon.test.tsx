import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiscordIcon } from './DiscordIcon.js';

describe('DiscordIcon', () => {
  it('renders an SVG element', () => {
    render(<DiscordIcon />);
    const svg = document.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('applies default size of 24', () => {
    render(<DiscordIcon />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('accepts custom size', () => {
    render(<DiscordIcon size={48} />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('width', '48');
    expect(svg).toHaveAttribute('height', '48');
  });

  it('accepts custom className', () => {
    render(<DiscordIcon className="custom-class" />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('class', 'custom-class');
  });

  it('has correct viewBox', () => {
    render(<DiscordIcon />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 71 55');
  });

  it('is hidden from assistive technology', () => {
    render(<DiscordIcon />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses currentColor for fill', () => {
    render(<DiscordIcon />);
    const svg = document.querySelector('svg');
    // The path uses fill="currentColor"
    const path = svg?.querySelector('path');
    expect(path).toHaveAttribute('fill', 'currentColor');
  });
});
