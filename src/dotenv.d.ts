// Lets TypeScript accept `import text from '../../.env' with { loader: 'text' }` (see app/env.ts).
declare module '*.env' {
  const text: string;
  export default text;
}
