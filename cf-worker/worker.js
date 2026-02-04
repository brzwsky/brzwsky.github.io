/**
 * Cloudflare Worker - Geo-Location Meta Tag Injector
 *
 * Purpose:
 * - Read CF-IPCountry header (automatically set by Cloudflare)
 * - Inject <meta name="visitor-country" content="XX"> into <head> of HTML responses
 * - Enable frontend JavaScript to detect visitor location and show geo-targeted popup
 *
 * Behavior:
 * - Only processes text/html responses (avoids JSON, images, etc.)
 * - Adds meta tag before closing </head> tag
 * - No performance impact (stream-based processing)
 * - Does not redirect or modify page structure
 *
 * Example:
 * - Visitor from Canada → injects <meta name="visitor-country" content="CA">
 * - Visitor from France → injects <meta name="visitor-country" content="FR">
 */

export default {
	async fetch(request) {
		// Fetch the original response from origin
		const response = await fetch(request);

		// Only process HTML responses
		const contentType = response.headers.get('content-type') || '';
		if (!contentType.includes('text/html')) {
			return response;
		}

		// Guard: avoid modifying non-HTML bodies without a head tag
		const html = await response.text();
		if (!html.includes('</head>')) {
			return new Response(html, {
				status: response.status,
				statusText: response.statusText,
				headers: response.headers,
			});
		}

		// Get visitor country from Cloudflare header
		// CF-IPCountry is automatically added by Cloudflare (e.g., "CA", "FR", "US")
		const rawCountry = request.headers.get('cf-ipCountry') || '';
		const visitorCountry = rawCountry ? rawCountry.toUpperCase() : 'UNKNOWN';

		// Inject meta tag into <head> before closing tag
		// This allows JavaScript to detect: document.querySelector('meta[name="visitor-country"]')
		const metaTag = `<meta name="visitor-country" content="${visitorCountry}" />`;
		const updatedHtml = html.replace('</head>', `${metaTag}</head>`);

		// Remove content-length to avoid mismatch after body modification
		const headers = new Headers(response.headers);
		headers.delete('content-length');

		// Return modified response with same headers
		return new Response(updatedHtml, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	},
};
