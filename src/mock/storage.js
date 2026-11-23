// Mock of 'firebase/storage' used when running `npm run dev:mock`
export function getStorage() {
  return {};
}
export function ref(storage, path) {
  return { path };
}
export async function uploadBytes(reference) {
  return { ref: reference };
}
