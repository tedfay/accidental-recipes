import { setServers } from 'node:dns';
import postgres from 'postgres';
// Override local DNS to avoid home/office router resolution failures
// for external hostnames (Supabase pooler). Node-process-scoped only.
setServers(['8.8.8.8', '8.8.4.4']);
const url = process.env['DATABASE_URL'];
if (!url)
    throw new Error('DATABASE_URL is not set');
export const sql = postgres(url, { onnotice: () => { } });
