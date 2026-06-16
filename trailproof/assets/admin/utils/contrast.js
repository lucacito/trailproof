/**
 * WCAG 2.1 contrast ratio utilities.
 *
 * All math follows the WCAG 2.1 spec:
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

/** Parse "#rrggbb" or "#rgb" into { r, g, b } (0–255 integers). */
export function hexToRgb( hex ) {
	const clean = hex.replace( /^#/, '' );
	if ( clean.length === 3 ) {
		return {
			r: parseInt( clean[ 0 ] + clean[ 0 ], 16 ),
			g: parseInt( clean[ 1 ] + clean[ 1 ], 16 ),
			b: parseInt( clean[ 2 ] + clean[ 2 ], 16 ),
		};
	}
	return {
		r: parseInt( clean.slice( 0, 2 ), 16 ),
		g: parseInt( clean.slice( 2, 4 ), 16 ),
		b: parseInt( clean.slice( 4, 6 ), 16 ),
	};
}

/** Convert 0–255 channel to linear (un-gamma) value. */
function linearize( c ) {
	const s = c / 255;
	return s <= 0.04045 ? s / 12.92 : Math.pow( ( s + 0.055 ) / 1.055, 2.4 );
}

/** Relative luminance per WCAG 2.1 §1.4.3. */
export function relativeLuminance( hex ) {
	const { r, g, b } = hexToRgb( hex );
	return 0.2126 * linearize( r ) + 0.7152 * linearize( g ) + 0.0722 * linearize( b );
}

/**
 * WCAG contrast ratio between two hex colors.
 * Returns a value between 1 and 21.
 */
export function contrastRatio( hex1, hex2 ) {
	const l1 = relativeLuminance( hex1 );
	const l2 = relativeLuminance( hex2 );
	const lighter = Math.max( l1, l2 );
	const darker  = Math.min( l1, l2 );
	return ( lighter + 0.05 ) / ( darker + 0.05 );
}

/** WCAG AA thresholds. */
export function passesAA( ratio, isLargeText = false ) {
	return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

/** WCAG AAA thresholds. */
export function passesAAA( ratio, isLargeText = false ) {
	return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
}

/**
 * Find the nearest shade of `fgHex` that achieves AA contrast against `bgHex`.
 * Steps the foreground color toward black (if too light) or toward white (if too dark).
 *
 * Returns the nearest compliant hex string, or null if none found within 50 steps.
 */
export function nearestCompliantShade( fgHex, bgHex, isLargeText = false ) {
	const threshold = isLargeText ? 3.0 : 4.5;

	// If already passing, return as-is.
	if ( contrastRatio( fgHex, bgHex ) >= threshold ) {
		return fgHex;
	}

	const bg        = relativeLuminance( bgHex );
	const { r, g, b } = hexToRgb( fgHex );

	// Determine direction: darken fg if bg is dark, lighten if bg is light.
	const darkenFg = bg > 0.5;

	let cr = r, cg = g, cb = b;
	const step = darkenFg ? -5 : 5;

	for ( let i = 0; i < 50; i++ ) {
		cr = Math.min( 255, Math.max( 0, cr + step ) );
		cg = Math.min( 255, Math.max( 0, cg + step ) );
		cb = Math.min( 255, Math.max( 0, cb + step ) );

		const candidate = rgbToHex( cr, cg, cb );
		if ( contrastRatio( candidate, bgHex ) >= threshold ) {
			return candidate;
		}

		// Stop if we've hit white or black
		if ( ( step < 0 && cr === 0 && cg === 0 && cb === 0 ) ||
		     ( step > 0 && cr === 255 && cg === 255 && cb === 255 ) ) {
			break;
		}
	}

	return null;
}

/** { r, g, b } integers → "#rrggbb". */
export function rgbToHex( r, g, b ) {
	return '#' + [ r, g, b ].map( ( c ) => c.toString( 16 ).padStart( 2, '0' ) ).join( '' );
}

/** Format ratio as "4.51 : 1". */
export function formatRatio( ratio ) {
	return ratio.toFixed( 2 ) + ' : 1';
}
