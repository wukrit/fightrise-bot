import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Form, FormField, FormGroup, FormActions } from './Form.js';

describe('Form', () => {
  it('renders a form element with children', () => {
    render(
      <Form>
        <input type="text" />
      </Form>
    );
    expect(document.querySelector('form')).toBeInTheDocument();
  });

  it('calls onSubmit when form is submitted', async () => {
    const handleSubmit = vi.fn();
    render(
      <Form onSubmit={handleSubmit}>
        <button type="submit">Submit</button>
      </Form>
    );

    fireEvent.submit(screen.getByRole('button').closest('form')!);
    expect(handleSubmit).toHaveBeenCalled();
  });

  it('applies noValidate when specified', () => {
    render(
      <Form noValidate>
        <input type="text" />
      </Form>
    );
    const form = document.querySelector('form');
    expect(form).toHaveAttribute('novalidate');
  });

  it('accepts custom style overrides', () => {
    render(
      <Form style={{ maxWidth: '500px' }}>
        <input type="text" />
      </Form>
    );
    const form = document.querySelector('form');
    expect(form?.style.maxWidth).toBe('500px');
  });
});

describe('FormField', () => {
  it('renders label when provided', () => {
    render(
      <FormField label="Email">
        <input type="email" />
      </FormField>
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders required asterisk when required', () => {
    render(
      <FormField label="Email" required>
        <input type="email" />
      </FormField>
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders error message when provided', () => {
    render(
      <FormField error="This field is required">
        <input type="text" />
      </FormField>
    );
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('renders helper text when no error', () => {
    render(
      <FormField helperText="Enter your email address">
        <input type="email" />
      </FormField>
    );
    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
  });

  it('shows error instead of helper text when both provided', () => {
    render(
      <FormField error="Error" helperText="Help">
        <input type="text" />
      </FormField>
    );
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.queryByText('Help')).not.toBeInTheDocument();
  });
});

describe('FormGroup', () => {
  it('renders label when provided', () => {
    render(
      <FormGroup label="Personal Info">
        <input type="text" />
      </FormGroup>
    );
    expect(screen.getByText('Personal Info')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <FormGroup>
        <input type="text" />
        <input type="email" />
      </FormGroup>
    );
    expect(screen.getAllByRole('textbox').length).toBe(2);
  });
});

describe('FormActions', () => {
  it('renders children', () => {
    render(
      <FormActions>
        <button>Cancel</button>
        <button>Save</button>
      </FormActions>
    );
    expect(screen.getAllByRole('button').length).toBe(2);
  });

  it('aligns actions to right by default', () => {
    render(
      <FormActions>
        <button>Action</button>
      </FormActions>
    );
    const container = screen.getByRole('button').parentElement;
    expect(container?.style.justifyContent).toBe('flex-end');
  });

  it('aligns actions to left when specified', () => {
    render(
      <FormActions align="left">
        <button>Action</button>
      </FormActions>
    );
    const container = screen.getByRole('button').parentElement;
    expect(container?.style.justifyContent).toBe('flex-start');
  });

  it('aligns actions to center when specified', () => {
    render(
      <FormActions align="center">
        <button>Action</button>
      </FormActions>
    );
    const container = screen.getByRole('button').parentElement;
    expect(container?.style.justifyContent).toBe('center');
  });
});
