import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';

describe('Home Page', () => {
  it('should render the main heading', () => {
    render(<Home />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('FightRise Tournament Bot');
  });

  it('should render the description text', () => {
    render(<Home />);
    const description = screen.getByText('Run Start.gg tournaments through Discord');
    expect(description).toBeInTheDocument();
  });

  it('should render a main element', () => {
    const { container } = render(<Home />);
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
  });

  it('should have correct content structure', () => {
    const { container } = render(<Home />);
    const main = container.querySelector('main');
    const h1 = main?.querySelector('h1');
    const p = main?.querySelector('p');

    expect(h1).toHaveTextContent('FightRise Tournament Bot');
    expect(p).toHaveTextContent('Run Start.gg tournaments through Discord');
  });
});
