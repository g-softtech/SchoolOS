import React from 'react';

interface GalleryBlockProps {
  block: {
    images?: string[];
  };
}

export function GalleryBlock({ block }: GalleryBlockProps) {
  if (!block.images || block.images.length === 0) return null;

  return (
    <section className="w-full py-12 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {block.images.map((imgUrl, idx) => (
            <div 
              key={idx} 
              className="aspect-video bg-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={imgUrl} 
                alt={`Gallery image ${idx + 1}`} 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
