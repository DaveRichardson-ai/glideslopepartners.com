import type { ImageMetadata } from 'astro';
import davidPortrait from '../../assets/portraits/david-richardson.jpg';
import philipPortrait from '../../assets/portraits/philip-hyde.jpg';

export interface Author {
  id: 'david-richardson' | 'philip-hyde';
  name: string;
  firstName: string;
  role: string;
  portrait: ImageMetadata;
  linkedin: string;
  authorBox: string;
}

export const authors: Record<Author['id'], Author> = {
  'david-richardson': {
    id: 'david-richardson',
    name: 'David Richardson',
    firstName: 'David',
    role: 'Managing Partner',
    portrait: davidPortrait,
    linkedin: 'https://www.linkedin.com/in/david-p-richardson/',
    authorBox:
      'Led the AMP Advice separation and the AMP Capital separations to DigitalBridge and Dexus in prior roles.',
  },
  'philip-hyde': {
    id: 'philip-hyde',
    name: 'Philip Hyde',
    firstName: 'Phil',
    role: 'Founding Partner',
    portrait: philipPortrait,
    linkedin: 'https://www.linkedin.com/in/philip-hyde-sydney/',
    authorBox:
      'Led technology and data separations across more than 270 applications, including AMP Life to Resolution Life.',
  },
};
