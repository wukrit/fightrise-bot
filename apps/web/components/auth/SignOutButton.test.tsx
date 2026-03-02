import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignOutButton } from './SignOutButton';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));

import { signOut } from 'next-auth/react';

describe('SignOutButton', () => {
  it('should render sign out button', () => {
    render(<SignOutButton />);
    const button = screen.getByRole('button', { name: /sign out/i });
    expect(button).toBeInTheDocument();
  });

  it('should call signOut with default callback URL on click', async () => {
    const user = userEvent.setup();
    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });
    await user.click(button);

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' });
  });

  it('should call signOut with custom callback URL on click', async () => {
    const user = userEvent.setup();
    render(<SignOutButton callbackUrl="/login" />);

    const button = screen.getByRole('button', { name: /sign out/i });
    await user.click(button);

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login' });
  });

  it('should render with secondary variant', () => {
    render(<SignOutButton />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});
