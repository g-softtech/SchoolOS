import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BlockRegistry } from '../renderer/BlockRegistry';
import { ContentBlock } from '@/lib/cms/types';

jest.mock('isomorphic-dompurify', () => ({
  sanitize: (str: string) => {
    if (str.includes('<script>')) return str.replace(/<script>.*<\/script>/g, '');
    return str;
  }
}));

describe('BlockRegistry Dispatcher', () => {
  it('renders HeroBlock for type hero', () => {
    const block: ContentBlock = { id: '1', type: 'hero', heading: 'Welcome' };
    render(<BlockRegistry block={block} />);
    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });

  it('renders TextBlock with sanitized HTML for type text', () => {
    // Note: TextBlock uses DOMPurify which strips scripts.
    const block: ContentBlock = { id: '2', type: 'text', html: '<b>Bold Text</b><script>alert(1)</script>' };
    render(<BlockRegistry block={block} />);
    expect(screen.getByText('Bold Text')).toBeInTheDocument();
    expect(screen.queryByText('alert(1)')).not.toBeInTheDocument();
  });

  it('renders UnknownBlock fallback boundary for deprecated or unknown types', () => {
    const block: any = { id: '3', type: 'deprecated_carousel' };
    render(<BlockRegistry block={block} />);
    
    // The developer warning should be present in the non-production build
    expect(screen.getByText(/Unrecognized or deprecated block type/i)).toBeInTheDocument();
    expect(screen.getByText(/"deprecated_carousel"/)).toBeInTheDocument();
  });
});
