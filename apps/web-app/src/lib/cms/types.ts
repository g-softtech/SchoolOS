export type BlockType = 'hero' | 'text' | 'gallery' | (string & {});

export interface BaseBlock {
  id: string; // Unique UUID per block instance
  type: BlockType;
}

export interface HeroBlockData extends BaseBlock {
  type: 'hero';
  heading: string;
  subheading?: string;
  ctaText?: string;
  ctaUrl?: string;
  backgroundImageUrl?: string;
}

export interface TextBlockData extends BaseBlock {
  type: 'text';
  html: string;
}

export interface GalleryBlockData extends BaseBlock {
  type: 'gallery';
  images?: string[];
}

export type ContentBlock = HeroBlockData | TextBlockData | GalleryBlockData | BaseBlock;
