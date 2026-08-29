export interface FeedVideo {
  id: string;
  platform: 'youtube' | 'instagram';
  creatorName: string;
  creatorHandle: string;
  initials: string;
  caption: string;
  inAppViews: number;
  gradientFrom: string;
  gradientTo: string;
}

export const mockFeed: FeedVideo[] = [
  {
    id: '1',
    platform: 'youtube',
    creatorName: 'Marcus Reyes',
    creatorHandle: '@marcusfilms',
    initials: 'MR',
    caption: '3am editing sessions hit different 🎬',
    inAppViews: 842,
    gradientFrom: '#FF651C',
    gradientTo: '#FD3667',
  },
  {
    id: '2',
    platform: 'instagram',
    creatorName: 'Priya Nair',
    creatorHandle: '@priya.edits',
    initials: 'PN',
    caption: 'Behind the scenes of yesterday’s shoot',
    inAppViews: 356,
    gradientFrom: '#DB3293',
    gradientTo: '#5B18C9',
  },
  {
    id: '3',
    platform: 'youtube',
    creatorName: 'Diego Alvarez',
    creatorHandle: '@diego.motion',
    initials: 'DA',
    caption: 'One take, zero cuts. How’d we do?',
    inAppViews: 129,
    gradientFrom: '#FE4940',
    gradientTo: '#7D27E3',
  },
];

export interface MyVideo {
  id: string;
  title: string;
  status: 'approved' | 'pending' | 'rejected' | 'flagged';
  views?: number;
  rejectionReason?: string;
  gradientFrom: string;
  gradientTo: string;
}

export const mockMyVideos: MyVideo[] = [
  {
    id: '1',
    title: '3am editing sessions hit different',
    status: 'approved',
    views: 842,
    gradientFrom: '#FF651C',
    gradientTo: '#FD3667',
  },
  {
    id: '2',
    title: 'Studio tour, part two',
    status: 'pending',
    gradientFrom: '#DB3293',
    gradientTo: '#5B18C9',
  },
  {
    id: '3',
    title: 'Behind the scenes: color grade',
    status: 'rejected',
    rejectionReason: 'Link no longer available',
    gradientFrom: '#FE4940',
    gradientTo: '#5c1c3a',
  },
];
