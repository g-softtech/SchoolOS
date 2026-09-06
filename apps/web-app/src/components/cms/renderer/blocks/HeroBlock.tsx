import React from 'react';

interface HeroBlockProps {
  block: {
    heading: string;
    subheading?: string;
    ctaText?: string;
    ctaUrl?: string;
    backgroundImageUrl?: string;
  };
}

export function HeroBlock({ block }: HeroBlockProps) {
  const bgStyle = block.backgroundImageUrl 
    ? { backgroundImage: `url(${block.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: 'var(--theme-primary, #000000)' };

  return (
    <section 
      className="relative w-full py-24 flex items-center justify-center text-center text-white"
      style={bgStyle}
    >
      {/* Optional dark overlay if using a background image */}
      {block.backgroundImageUrl && <div className="absolute inset-0 bg-black/50 z-0"></div>}
      
      <div className="relative z-10 max-w-4xl px-4 mx-auto space-y-6">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight">
          {block.heading}
        </h1>
        {block.subheading && (
          <p className="text-lg md:text-2xl opacity-90">
            {block.subheading}
          </p>
        )}
        {block.ctaText && block.ctaUrl && (
          <div className="pt-4">
            <a 
              href={block.ctaUrl} 
              className="inline-block px-8 py-3 text-lg font-semibold rounded-md bg-white text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {block.ctaText}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
