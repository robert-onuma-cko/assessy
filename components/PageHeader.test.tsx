// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="My Work" />);
    expect(screen.getByRole('heading', { name: 'My Work' })).toBeInTheDocument();
  });

  it('renders lede when provided', () => {
    render(<PageHeader title="T" lede="You owe 3 things" />);
    expect(screen.getByText('You owe 3 things')).toBeInTheDocument();
  });

  it('does not render lede paragraph when omitted', () => {
    const { container } = render(<PageHeader title="T" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders actions when provided', () => {
    render(<PageHeader title="T" actions={<button>Action</button>} />);
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('does not render actions slot when omitted', () => {
    const { container } = render(<PageHeader title="T" />);
    // no extra div for actions
    expect(container.querySelectorAll('div').length).toBe(1);
  });

  it('renders backLink when provided', () => {
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    render(<PageHeader title="T" backLink={<a href="/">Back</a>} />);
    expect(screen.getByRole('link', { name: 'Back' })).toBeInTheDocument();
  });
});
