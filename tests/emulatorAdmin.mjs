// Writes a document bypassing security rules (emulator only).
export async function withSecurityRulesDisabled(path, data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) fields[k] = { timestampValue: new Date(v.toMillis()).toISOString() };
  const res = await fetch(`http://127.0.0.1:8080/v1/projects/demo-test/databases/(default)/documents/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(await res.text());
}
