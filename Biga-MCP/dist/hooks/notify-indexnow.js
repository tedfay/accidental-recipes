/**
 * Post-mutation hook — notifies the frontend's IndexNow endpoint
 * after a recipe is published or updated.
 *
 * Fire-and-forget: never throws, never blocks the MCP tool response.
 * No-ops when FRONTEND_URL or INDEXNOW_SUBMIT_KEY is not set.
 */
const FRONTEND_URL = process.env['FRONTEND_URL'] || null;
const SUBMIT_KEY = process.env['INDEXNOW_SUBMIT_KEY'] || null;

export function notifyIndexNow(slugs) {
    if (!FRONTEND_URL || !SUBMIT_KEY || slugs.length === 0) return;
    const url = `${FRONTEND_URL}/api/indexnow`;
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUBMIT_KEY}`,
        },
        body: JSON.stringify({ slugs }),
    })
        .then((res) => {
        if (!res.ok) {
            console.error(`[notify-indexnow] ${res.status} from ${url}`);
        }
    })
        .catch((err) => {
        console.error('[notify-indexnow]', err);
    });
}
