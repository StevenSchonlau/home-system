// The browser's location for the dashboard widgets. Rejects with a short message to show instead.
// A recent position is reused (maximumAge), so the two widgets don't each wait for a fresh fix.
export function currentLocation(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!globalThis.navigator?.geolocation) {
      reject('Location not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve(coords),
      (error) => reject(error.code === 1 ? 'Location permission denied' : 'Location unavailable'),
      { timeout: 10000, maximumAge: 300000 },
    );
  });
}
