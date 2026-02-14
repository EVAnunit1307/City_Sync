/**
 * Pre-fetch map data to warm up the browser cache
 * Call this on app initialization
 */

/** Study area: Markham, York Region. Center lat 43.8561, lng -79.3370 */
const MARKHAM_BBOX = {
  south: 43.82,
  west: -79.42,
  north: 43.89,
  east: -79.25,
};

/**
 * Pre-fetch all map data to warm up the browser cache
 * This can be called on app startup to improve initial load performance
 */
export async function prefetchMapData() {
  if (typeof window === 'undefined') return; // Only run client-side

  try {
    // Pre-fetch all endpoints in parallel with aggressive caching
    await Promise.allSettled([
      fetch(`/api/map/buildings?south=${MARKHAM_BBOX.south}&west=${MARKHAM_BBOX.west}&north=${MARKHAM_BBOX.north}&east=${MARKHAM_BBOX.east}`, {
        cache: 'force-cache',
        next: { revalidate: 86400 },
      }),
      fetch(`/api/map/roads?south=${MARKHAM_BBOX.south}&west=${MARKHAM_BBOX.west}&north=${MARKHAM_BBOX.north}&east=${MARKHAM_BBOX.east}`, {
        cache: 'force-cache',
        next: { revalidate: 86400 },
      }),
      fetch(`/api/map/traffic-signals?south=${MARKHAM_BBOX.south}&west=${MARKHAM_BBOX.west}&north=${MARKHAM_BBOX.north}&east=${MARKHAM_BBOX.east}`, {
        cache: 'force-cache',
        next: { revalidate: 86400 },
      }),
    ]);

    console.log('✅ Map data cache pre-warmed');
  } catch (error) {
    console.warn('Failed to pre-warm map data cache:', error);
  }
}
