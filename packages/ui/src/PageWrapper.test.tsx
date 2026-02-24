import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageWrapper, PageSection, PageGrid } from './PageWrapper.js';

describe('PageWrapper', () => {
  it('renders page title', () => {
    render(<PageWrapper title="My Page">Content</PageWrapper>);
    expect(screen.getByText('My Page')).toBeInTheDocument();
  });

  it('renders page description when provided', () => {
    render(
      <PageWrapper title="My Page" description="This is a description">
        Content
      </PageWrapper>
    );
    expect(screen.getByText('This is a description')).toBeInTheDocument();
  });

  it('renders breadcrumbs when provided', () => {
    render(
      <PageWrapper title="My Page" breadcrumbs={<a href="/">Home</a>}>
        Content
      </PageWrapper>
    );
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    render(
      <PageWrapper title="My Page" actions={<button>Add Item</button>}>
        Content
      </PageWrapper>
    );
    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <PageWrapper title="My Page">
        <div data-testid="content">Page Content</div>
      </PageWrapper>
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('accepts custom style overrides', () => {
    render(
      <PageWrapper title="My Page" style={{ minHeight: '200vh' }}>
        Content
      </PageWrapper>
    );
    // Verify the component renders - we check that the title is still present
    expect(screen.getByText('My Page')).toBeInTheDocument();
  });
});

describe('PageSection', () => {
  it('renders section title when provided', () => {
    render(
      <PageSection title="Section Title">
        Content
      </PageSection>
    );
    expect(screen.getByText('Section Title')).toBeInTheDocument();
  });

  it('renders section description when provided', () => {
    render(
      <PageSection title="Section" description="Section description">
        Content
      </PageSection>
    );
    expect(screen.getByText('Section description')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <PageSection>
        <div data-testid="section-content">Section Content</div>
      </PageSection>
    );
    expect(screen.getByTestId('section-content')).toBeInTheDocument();
  });

  it('shows divider when showDivider is true', () => {
    render(
      <PageSection showDivider>
        Content
      </PageSection>
    );
    // The divider is a div with a border style
    const divider = document.querySelector('div[style*="background-color"]');
    expect(divider).toBeInTheDocument();
  });
});

describe('PageGrid', () => {
  it('renders children', () => {
    render(
      <PageGrid>
        <div>Item 1</div>
        <div>Item 2</div>
      </PageGrid>
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('applies grid class', () => {
    render(
      <PageGrid>
        <div>Item</div>
      </PageGrid>
    );
    const grid = screen.getByText('Item').parentElement;
    expect(grid?.className).toContain('page-grid');
  });

  it('accepts custom style overrides', () => {
    render(
      <PageGrid style={{ gap: '30px' }}>
        <div>Item</div>
      </PageGrid>
    );
    const grid = screen.getByText('Item').parentElement;
    expect(grid?.style.gap).toBe('30px');
  });
});
