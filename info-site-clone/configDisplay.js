// Public profile snapshot: local operation never writes to the original website.
export async function loadProfile() {
  const response = await fetch('./profile.json');
  if (!response.ok) throw new Error(`Profile HTTP ${response.status}`);
  return response.json();
}
