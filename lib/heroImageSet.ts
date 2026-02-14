/**
 * Hero Image Set Configuration
 * Premium technical imagery for GrowthSync digital twin platform
 */

export interface HeroImage {
  id: string;
  label: string;
  category: 'infrastructure' | 'planning' | 'digital-twin';
  src: string;
  alt: string;
  focalPosition: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

export const heroImageSet: HeroImage[] = [
  {
    id: 'suburban-aerial',
    label: 'Suburban Development Pattern',
    category: 'planning',
    src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
    alt: 'Aerial view of suburban subdivision layout and development patterns',
    focalPosition: 'center',
  },
  {
    id: 'highway-interchange',
    label: 'Infrastructure Systems',
    category: 'infrastructure',
    src: 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=800&q=80',
    alt: 'Aerial view of complex highway interchange infrastructure',
    focalPosition: 'center',
  },
  {
    id: 'architectural-model',
    label: 'Massing Study',
    category: 'digital-twin',
    src: 'https://images.unsplash.com/photo-1460472178825-e5240623afd5?w=800&q=80',
    alt: 'Physical architectural massing model for urban planning',
    focalPosition: 'center',
  },
  {
    id: 'transit-infrastructure',
    label: 'Transit Systems',
    category: 'infrastructure',
    src: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80',
    alt: 'Modern transit station infrastructure and architecture',
    focalPosition: 'center',
  },
  {
    id: 'construction-aerial',
    label: 'Development Lifecycle',
    category: 'planning',
    src: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80',
    alt: 'Aerial view of construction site and urban development',
    focalPosition: 'top',
  },
  {
    id: 'technical-blueprint',
    label: 'Technical Planning',
    category: 'planning',
    src: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80',
    alt: 'Architectural blueprints and technical planning documents',
    focalPosition: 'center',
  },
];
