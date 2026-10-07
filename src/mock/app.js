// Mock of 'firebase/app' used when running `npm run dev:mock`
export function initializeApp(config) {
  return { name: '[mock]', options: config };
}
