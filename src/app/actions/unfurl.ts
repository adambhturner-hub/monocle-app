'use server';

import * as cheerio from 'cheerio';

export async function fetchUrlMeta(url: string) {
    try {
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sec timeout

        const response = await fetch(fullUrl, {
            headers: {
                'User-Agent': 'MonocleBot/1.0 (+https://monocle.app)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return { error: `Failed to fetch: ${response.statusText}` };
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        let title = $('meta[property="og:title"]').attr('content') ||
            $('title').text() ||
            $('meta[name="twitter:title"]').attr('content');

        if (title) {
            // Clean up the title (remove newlines, collapse whitespace)
            title = title.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
            return { title, url: fullUrl };
        }

        return { error: 'No title found' };
    } catch (e: any) {
        console.error("Unfurl Error:", e);
        return { error: e.message || 'Unknown error during unfurl' };
    }
}
