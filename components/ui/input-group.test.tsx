// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from './input-group';

describe('InputGroup', () => {
  it('renders with data-slot and role=group', () => {
    const { container } = render(<InputGroup />);
    const el = container.querySelector('[data-slot=input-group]') as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('role', 'group');
  });

  it('merges custom className', () => {
    const { container } = render(<InputGroup className="custom" />);
    expect(container.querySelector('[data-slot=input-group]')!.className).toContain('custom');
  });
});

describe('InputGroupInput', () => {
  it('renders with input-group-control data-slot', () => {
    render(
      <InputGroup>
        <InputGroupInput placeholder="Type here" />
      </InputGroup>
    );
    const input = screen.getByPlaceholderText('Type here');
    expect(input).toHaveAttribute('data-slot', 'input-group-control');
  });
});

describe('InputGroupAddon', () => {
  it('renders with data-slot and default inline-start align', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupAddon>@</InputGroupAddon>
        <InputGroupInput />
      </InputGroup>
    );
    const addon = container.querySelector('[data-slot=input-group-addon]') as HTMLElement;
    expect(addon).toBeInTheDocument();
    expect(addon).toHaveAttribute('data-align', 'inline-start');
  });

  it('renders with inline-end alignment', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupInput />
        <InputGroupAddon align="inline-end">.com</InputGroupAddon>
      </InputGroup>
    );
    const addon = container.querySelector('[data-slot=input-group-addon]') as HTMLElement;
    expect(addon).toHaveAttribute('data-align', 'inline-end');
  });
});

describe('InputGroupButton', () => {
  it('renders a ghost button inside the group', () => {
    render(
      <InputGroup>
        <InputGroupInput />
        <InputGroupAddon align="inline-end">
          <InputGroupButton>Go</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    );
    const btn = screen.getByRole('button', { name: 'Go' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('data-slot', 'button');
  });
});

describe('InputGroupText', () => {
  it('renders text content', () => {
    render(
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>$</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput />
      </InputGroup>
    );
    expect(screen.getByText('$')).toBeInTheDocument();
  });
});

describe('InputGroupTextarea', () => {
  it('renders a textarea with input-group-control data-slot', () => {
    render(
      <InputGroup>
        <InputGroupTextarea placeholder="Write here" />
      </InputGroup>
    );
    const ta = screen.getByPlaceholderText('Write here');
    expect(ta.tagName).toBe('TEXTAREA');
    expect(ta).toHaveAttribute('data-slot', 'input-group-control');
  });
});
