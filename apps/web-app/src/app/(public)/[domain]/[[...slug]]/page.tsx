import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlockRegistry } from '@/components/cms/renderer/BlockRegistry';

interface PageProps {
  params: Promise<{ domain: string; slug?: string[] }>;
}

const EDGE_API_URL = process.env.EDGE_API_URL || 'http://localhost:3000'; // Assuming API Gateway is at localhost:3000 locally

async function fetchPageData(domain: string, slugArray?: string[]) {
  const path = slugArray && slugArray.length > 0 ? slugArray.join('/') : 'home'; // Default to 'home' if no slug is provided
  
  const res = await fetch(`${EDGE_API_URL}/api/v1/public/website/resolve?domain=${domain}&path=${path}`, {
    next: { 
      tags: [`website-${domain}`], 
      revalidate: 3600 
    }
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch page data: ${res.statusText}`);
  }

  return res.json();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { domain, slug } = resolvedParams;
  
  const data = await fetchPageData(domain, slug);
  
  if (!data) {
    return { title: 'Not Found' };
  }

  const { seoMeta, title: pageTitle } = data;
  const canonicalUrl = `https://${domain}/${slug ? slug.join('/') : ''}`;

  return {
    title: seoMeta?.title || pageTitle || 'School Website',
    description: seoMeta?.description || '',
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: seoMeta?.title || pageTitle,
      description: seoMeta?.description || '',
      images: seoMeta?.ogImage ? [seoMeta.ogImage] : [],
      url: canonicalUrl,
    }
  };
}

export default async function PublicWebsitePage({ params }: PageProps) {
  const resolvedParams = await params;
  const { domain, slug } = resolvedParams;
  
  const data = await fetchPageData(domain, slug);

  if (!data) {
    notFound();
  }

  const { contentBlocks, themeColors } = data;

  return (
    <div 
      className="public-website-container"
      style={{
        '--theme-primary': themeColors?.primary || '#000000',
        '--theme-secondary': themeColors?.secondary || '#ffffff',
      } as React.CSSProperties}
    >
      {contentBlocks && contentBlocks.length > 0 ? (
        contentBlocks.map((block: any) => (
          <BlockRegistry key={block.id} block={block} />
        ))
      ) : (
        <div className="flex items-center justify-center min-h-[50vh] text-gray-500">
          This page has no content.
        </div>
      )}
    </div>
  );
}
