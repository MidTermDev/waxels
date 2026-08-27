import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'WAXELS — crayon art, melted permanently into Solana',
  description:
    'The first NFT protocol built for Solana v1 transactions (SIMD-0385). The entire image lives on chain — minted, scribbled, and sealed in a single 4096-byte transaction. No IPFS. No servers. Forever.',
  metadataBase: new URL('https://waxels.example'),
  openGraph: {
    title: 'WAXELS',
    description: 'Fully on-chain crayon NFTs on Solana v1 transactions.',
    images: ['/banner.png'],
  },
  icons: { icon: '/chain/pfp.png' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
