import React from 'react';
import DOMPurify from 'isomorphic-dompurify';

interface TextBlockProps {
  block: {
    html: string;
  };
}

export function TextBlock({ block }: TextBlockProps) {
  if (!block.html) return null;

  // Sanitize the HTML string to prevent XSS attacks before injecting into the DOM.
  const cleanHtml = DOMPurify.sanitize(block.html);

  return (
    <section className="w-full py-12 px-4">
      <div 
        className="max-w-4xl mx-auto prose prose-lg prose-blue"
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    </section>
  );
}
