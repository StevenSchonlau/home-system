// Settings from the project's .env file (KEY=VALUE lines, # comments). angular.json copies .env into
// the app when it exists, and it's loaded here the first time it's needed, so the app still builds
// and runs without one (the settings are then just empty). After adding or editing .env, reload.
// Note: .env is served with the app (at /.env), so anyone who can open the app can read it.

let settings: Promise<Record<string, string>> | undefined;

export function loadEnv(): Promise<Record<string, string>> {
  settings ??= fetch(new URL('.env', document.baseURI), { cache: 'no-store' })
    .then(async (response) => {
      // A missing file comes back as 404, or as the app's index.html (dev server / nginx fallback).
      const isHtml = response.headers.get('content-type')?.includes('text/html');
      return response.ok && !isHtml ? parseEnv(await response.text()) : {};
    })
    .catch(() => ({}));
  return settings;
}

function parseEnv(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (match && !line.trimStart().startsWith('#')) {
      values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2'); // drop surrounding quotes
    }
  }
  return values;
}
