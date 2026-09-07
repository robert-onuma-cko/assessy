// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { PageContainer } from './PageContainer';

describe('PageContainer', () => {
  it('renders children', () => {
    render(<PageContainer><p>Content</p></PageContainer>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies narrow CSS custom property when narrow=true', () => {
    const { container } = render(<PageContainer narrow><p>X</p></PageContainer>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.getPropertyValue('--page-max-w')).toBe('var(--page-max-w-inbox)');
  });

  it('does not apply narrow style when narrow=false', () => {
    const { container } = render(<PageContainer><p>X</p></PageContainer>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.getPropertyValue('--page-max-w')).toBe('');
  });

  it('renders rail when provided', () => {
    render(<PageContainer rail={<aside data-testid="rail">Rail</aside>}><p>Content</p></PageContainer>);
    expect(screen.getByTestId('rail')).toBeInTheDocument();
  });

  it('does not render aside element when rail is omitted', () => {
    const { container } = render(<PageContainer><p>X</p></PageContainer>);
    expect(container.querySelector('aside')).toBeNull();
  });

  it('applies extra className to content column', () => {
    const { container } = render(<PageContainer className="space-y-4"><p>X</p></PageContainer>);
    const contentDiv = container.querySelector('.space-y-4');
    expect(contentDiv).not.toBeNull();
  });
});
