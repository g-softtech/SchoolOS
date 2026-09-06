import React from 'react';
import { HeroBlock } from './blocks/HeroBlock';
import { TextBlock } from './blocks/TextBlock';
import { GalleryBlock } from './blocks/GalleryBlock';
import { UnknownBlock } from './blocks/UnknownBlock';
import { ContentBlock } from '@/lib/cms/types';

interface BlockRegistryProps {
  block: ContentBlock;
}

export function BlockRegistry({ block }: BlockRegistryProps) {
  // We use a switch statement to map the abstract 'block.type' string
  // into concrete React components.
  switch (block.type) {
    case 'hero':
      return <HeroBlock block={block as any} />;
    case 'text':
      return <TextBlock block={block as any} />;
    case 'gallery':
      return <GalleryBlock block={block as any} />;
    default:
      // If a block type is deprecated or unrecognized, we fail gracefully
      // by rendering the UnknownBlock Error Boundary, preventing whole-tree SSR crashes.
      return <UnknownBlock type={block.type} />;
  }
}
