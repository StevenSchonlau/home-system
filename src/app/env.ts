// Settings from the project's .env file (KEY=VALUE lines, # comments), read when the app is built
// by ng serve / ng build. The file must exist; it's git-ignored because it holds the API key.
// Note: the values are built into the app, so anyone who can open the app can find them.
import envFile from '../../.env' with { loader: 'text' };

export const ENV = parseEnv(envFile);

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
