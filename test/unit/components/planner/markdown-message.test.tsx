/**
 * Markdown Message Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownMessage } from '@/components/planner/markdown-message';

describe('MarkdownMessage', () => {
  it('renders plain text correctly', () => {
    render(<MarkdownMessage content="Hello, world!" />);
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('renders bold text correctly', () => {
    render(<MarkdownMessage content="This is **bold** text" />);
    expect(screen.getByText('bold')).toBeInTheDocument();
  });

  it('renders italic text correctly', () => {
    render(<MarkdownMessage content="This is *italic* text" />);
    expect(screen.getByText('italic')).toBeInTheDocument();
  });

  it('renders inline code correctly', () => {
    render(<MarkdownMessage content="Use `console.log()` to debug" />);
    expect(screen.getByText('console.log()')).toBeInTheDocument();
  });

  it('renders links correctly', () => {
    render(<MarkdownMessage content="Visit [Google](https://google.com)" />);
    const link = screen.getByRole('link', { name: 'Google' });
    expect(link).toHaveAttribute('href', 'https://google.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders lists correctly', () => {
    const content = `
- Item 1
- Item 2
- Item 3
    `;
    render(<MarkdownMessage content={content} />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('renders headings correctly', () => {
    const content = `# Heading 1

## Heading 2

### Heading 3`;
    render(<MarkdownMessage content={content} />);
    expect(screen.getByText('Heading 1')).toBeInTheDocument();
    expect(screen.getByText('Heading 2')).toBeInTheDocument();
    expect(screen.getByText('Heading 3')).toBeInTheDocument();
  });

  it('renders code blocks correctly', () => {
    const content = '```javascript\nconst x = 42;\n```';
    const { container } = render(<MarkdownMessage content={content} />);
    const codeBlock = container.querySelector('code');
    expect(codeBlock).toBeInTheDocument();
    expect(codeBlock?.textContent).toContain('const');
    expect(codeBlock?.textContent).toContain('x');
    expect(codeBlock?.textContent).toContain('42');
  });

  it('renders blockquotes correctly', () => {
    render(<MarkdownMessage content="> This is a quote" />);
    expect(screen.getByText('This is a quote')).toBeInTheDocument();
  });
});
