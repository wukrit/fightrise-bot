import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button.js';

describe('Button', () => {
  it('renders a button with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  describe('variants', () => {
    it('applies primary variant styles', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button.style.backgroundColor).toBe('rgb(59, 130, 246)');
      expect(button.style.color).toBe('rgb(255, 255, 255)');
    });

    it('applies secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button.style.backgroundColor).toBe('rgb(107, 114, 128)');
      expect(button.style.color).toBe('rgb(255, 255, 255)');
    });

    it('applies danger variant styles', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole('button');
      expect(button.style.backgroundColor).toBe('rgb(239, 68, 68)');
      expect(button.style.color).toBe('rgb(255, 255, 255)');
    });

    it('applies discord variant styles', () => {
      render(<Button variant="discord">Discord</Button>);
      const button = screen.getByRole('button');
      expect(button.style.backgroundColor).toBe('rgb(88, 101, 242)');
      expect(button.style.color).toBe('rgb(255, 255, 255)');
    });

    it('defaults to primary variant', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      expect(button.style.backgroundColor).toBe('rgb(59, 130, 246)');
    });
  });

  describe('sizes', () => {
    it('applies small size styles', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button.style.padding).toBe('4px 8px');
      expect(button.style.fontSize).toBe('14px');
    });

    it('applies medium size styles', () => {
      render(<Button size="md">Medium</Button>);
      const button = screen.getByRole('button');
      expect(button.style.padding).toBe('8px 16px');
      expect(button.style.fontSize).toBe('16px');
    });

    it('applies large size styles', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button.style.padding).toBe('16px 24px');
      expect(button.style.fontSize).toBe('18px');
    });

    it('defaults to medium size', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      expect(button.style.padding).toBe('8px 16px');
    });
  });

  describe('disabled state', () => {
    it('applies disabled styles when disabled', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.style.opacity).toBe('0.6');
      expect(button.style.cursor).toBe('not-allowed');
    });
  });

  it('accepts custom style overrides', () => {
    render(<Button style={{ marginTop: '10px' }}>Custom</Button>);
    const button = screen.getByRole('button');
    expect(button.style.marginTop).toBe('10px');
  });

  it('spreads additional props to button element', () => {
    render(<Button type="submit" data-testid="test-button">Submit</Button>);
    const button = screen.getByTestId('test-button');
    expect(button).toHaveAttribute('type', 'submit');
  });
});
