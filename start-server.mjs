import { pathToFileURL } from 'url';
import path from 'path';

const serverEntry = path.join(process.cwd(), '.output', 'server', 'index.mjs');
await import(pathToFileURL(serverEntry).href);
