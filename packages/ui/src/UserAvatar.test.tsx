import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { UserAvatar } from './UserAvatar.js';

describe('UserAvatar', () => {
  it('renders an img element with src and alt', () => {
    const { container } = render(
      <UserAvatar src="https://example.com/avatar.png" alt="User avatar" />
    );
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');
    expect(img).toHaveAttribute('alt', 'User avatar');
  });

  describe('sizes', () => {
    it('applies small size (24px)', () => {
      const { container } = render(<UserAvatar src="test.jpg" alt="test" size="sm" />);
      const img = container.querySelector('img');
      expect(img).toHaveAttribute('width', '24');
      expect(img).toHaveAttribute('height', '24');
    });

    it('applies medium size (32px)', () => {
      const { container } = render(<UserAvatar src="test.jpg" alt="test" size="md" />);
      const img = container.querySelector('img');
      expect(img).toHaveAttribute('width', '32');
      expect(img).toHaveAttribute('height', '32');
    });

    it('applies large size (48px)', () => {
      const { container } = render(<UserAvatar src="test.jpg" alt="test" size="lg" />);
      const img = container.querySelector('img');
      expect(img).toHaveAttribute('width', '48');
      expect(img).toHaveAttribute('height', '48');
    });

    it('defaults to medium size', () => {
      const { container } = render(<UserAvatar src="test.jpg" alt="test" />);
      const img = container.querySelector('img');
      expect(img).toHaveAttribute('width', '32');
      expect(img).toHaveAttribute('height', '32');
    });
  });

  it('applies border-radius for circular shape', () => {
    const { container } = render(<UserAvatar src="test.jpg" alt="test" />);
    const img = container.querySelector('img');
    expect(img?.style.borderRadius).toBe('50%');
  });

  it('applies object-fit cover', () => {
    const { container } = render(<UserAvatar src="test.jpg" alt="test" />);
    const img = container.querySelector('img');
    expect(img?.style.objectFit).toBe('cover');
  });
});
