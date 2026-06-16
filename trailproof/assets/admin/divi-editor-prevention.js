/**
 * Trailproof — Divi 5 Editor Prevention
 *
 * Watches the Divi 5 Visual Builder DOM via MutationObserver and surfaces
 * inline accessibility nudges when a module settings panel is open and contains
 * potential accessibility issues:
 *
 *   • Image module  — alt text field is empty or missing
 *   • Text/Heading  — heading level skips relative to previous heading on the page
 *   • Any module    — foreground/background color inputs appear to produce low contrast
 *
 * This script NEVER modifies any saved content. It is advisory only.
 * Nudges appear as small banner notices inside the builder settings panel.
 */
( function () {
	'use strict';

	const NUDGE_ID   = 'tp-divi-nudge';
	const NUDGE_ATTR = 'data-tp-nudge';

	// -------------------------------------------------------------------------
	// Nudge renderer
	// -------------------------------------------------------------------------

	function showNudge( panel, messages ) {
		removeNudge( panel );
		if ( ! messages.length ) return;

		const el       = document.createElement( 'div' );
		el.id          = NUDGE_ID;
		el.setAttribute( NUDGE_ATTR, 'true' );
		el.setAttribute( 'role', 'alert' );
		el.setAttribute( 'aria-live', 'polite' );
		el.style.cssText = [
			'margin:8px 16px 0;',
			'padding:10px 14px;',
			'background:#fff8e1;',
			'border:1px solid #e6a817;',
			'border-radius:4px;',
			'font-size:12px;',
			'line-height:1.5;',
			'color:#3c434a;',
		].join( '' );

		const title    = document.createElement( 'strong' );
		title.textContent = '⚠ Trailproof accessibility note';
		title.style.display = 'block';
		title.style.marginBottom = '6px';
		el.appendChild( title );

		messages.forEach( function ( msg ) {
			const p       = document.createElement( 'p' );
			p.style.margin = '2px 0';
			p.textContent  = msg;
			el.appendChild( p );
		} );

		// Insert at the top of the settings panel content area.
		const firstChild = panel.firstElementChild;
		if ( firstChild ) {
			panel.insertBefore( el, firstChild );
		} else {
			panel.appendChild( el );
		}
	}

	function removeNudge( panel ) {
		const existing = panel.querySelector( '[' + NUDGE_ATTR + ']' );
		if ( existing ) existing.remove();
	}

	// -------------------------------------------------------------------------
	// Field readers
	// -------------------------------------------------------------------------

	/** Read the value of a settings field by field name or aria-label substring. */
	function fieldValue( panel, name ) {
		// Divi 5 typically renders fields as <input> or <textarea> with a data-field_name attribute.
		let el = panel.querySelector( '[data-field_name="' + name + '"]' );
		if ( ! el ) {
			el = panel.querySelector( 'input[name*="' + name + '"], textarea[name*="' + name + '"]' );
		}
		return el ? el.value.trim() : null;
	}

	/** Find a color hex value in an input near a label containing labelText. */
	function colorNear( panel, labelText ) {
		const labels = Array.from( panel.querySelectorAll( 'label, .et-fb-settings__label, [class*="label"]' ) );
		for ( const label of labels ) {
			if ( label.textContent.toLowerCase().includes( labelText.toLowerCase() ) ) {
				const container = label.closest( '[class*="field"], [class*="row"], [class*="option"]' ) || label.parentElement;
				const input     = container && container.querySelector( 'input[type="text"][value^="#"], input[type="color"]' );
				if ( input ) return input.value.trim();
			}
		}
		return null;
	}

	// -------------------------------------------------------------------------
	// Contrast check (WCAG 1.4.3, 4.5:1 for normal text)
	// -------------------------------------------------------------------------

	function hexToRgb( hex ) {
		const clean = hex.replace( /^#/, '' );
		if ( clean.length === 3 ) {
			return [ parseInt( clean[0] + clean[0], 16 ), parseInt( clean[1] + clean[1], 16 ), parseInt( clean[2] + clean[2], 16 ) ];
		}
		if ( clean.length === 6 ) {
			return [ parseInt( clean.slice( 0, 2 ), 16 ), parseInt( clean.slice( 2, 4 ), 16 ), parseInt( clean.slice( 4, 6 ), 16 ) ];
		}
		return null;
	}

	function relativeLuminance( rgb ) {
		const c = rgb.map( function ( v ) {
			const s = v / 255;
			return s <= 0.03928 ? s / 12.92 : Math.pow( ( s + 0.055 ) / 1.055, 2.4 );
		} );
		return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
	}

	function contrastRatio( hex1, hex2 ) {
		const rgb1 = hexToRgb( hex1 );
		const rgb2 = hexToRgb( hex2 );
		if ( ! rgb1 || ! rgb2 ) return null;
		const l1 = relativeLuminance( rgb1 );
		const l2 = relativeLuminance( rgb2 );
		const lighter = Math.max( l1, l2 );
		const darker  = Math.min( l1, l2 );
		return ( lighter + 0.05 ) / ( darker + 0.05 );
	}

	// -------------------------------------------------------------------------
	// Heading-order check
	// -------------------------------------------------------------------------

	function getBuilderHeadingLevels() {
		// Gather all heading modules currently in the builder canvas.
		const selectors = [
			'.et_pb_text h1,.et_pb_text h2,.et_pb_text h3,.et_pb_text h4,.et_pb_text h5,.et_pb_text h6',
			'[class*="et_pb_"] h1,[class*="et_pb_"] h2,[class*="et_pb_"] h3',
		].join( ',' );

		const canvas = document.querySelector( '.et-fb-root-ancestor, #et-boc, .et-fb-app-ui' );
		if ( ! canvas ) return [];

		return Array.from( canvas.querySelectorAll( selectors ) )
			.map( function ( h ) { return parseInt( h.tagName.slice( 1 ), 10 ); } );
	}

	// -------------------------------------------------------------------------
	// Panel analysis
	// -------------------------------------------------------------------------

	function analyzePanel( panel ) {
		const messages = [];
		const panelClass = panel.className || '';

		// ---- Image modules: alt text ----
		if (
			panelClass.includes( 'image' ) ||
			panel.querySelector( '[data-field_name="alt"], [name*="alt"]' )
		) {
			const alt = fieldValue( panel, 'alt' );
			if ( alt !== null && alt === '' ) {
				messages.push(
					'Alt text is empty. If this image conveys information, describe it. If it is decorative, enter a single space or mark it as decorative so screen readers skip it.'
				);
			}
		}

		// ---- Heading modules: level skip detection ----
		if (
			panelClass.includes( 'heading' ) ||
			panel.querySelector( '[data-field_name="level"], select[name*="level"]' )
		) {
			const levelInput = panel.querySelector( '[data-field_name="level"], select[name*="level"]' );
			if ( levelInput ) {
				const selected = parseInt( levelInput.value, 10 );
				if ( ! isNaN( selected ) ) {
					const existingLevels = getBuilderHeadingLevels();
					if ( existingLevels.length > 0 ) {
						const maxExisting = Math.max( ...existingLevels );
						if ( selected > maxExisting + 1 ) {
							messages.push(
								'Heading level H' + selected + ' skips from the current highest H' + maxExisting + '. Skipped heading levels break the document outline for screen reader users. Use H' + ( maxExisting + 1 ) + ' instead.'
							);
						}
					}
				}
			}
		}

		// ---- Color contrast: text color vs background ----
		const textColor = colorNear( panel, 'text color' ) || colorNear( panel, 'font color' ) || colorNear( panel, 'colour' );
		const bgColor   = colorNear( panel, 'background color' ) || colorNear( panel, 'background colour' );

		if ( textColor && bgColor ) {
			const ratio = contrastRatio( textColor, bgColor );
			if ( ratio !== null && ratio < 4.5 ) {
				messages.push(
					'Contrast ratio between the text color (' + textColor + ') and background (' + bgColor + ') is approximately ' + ratio.toFixed( 2 ) + ':1, below the WCAG 1.4.3 minimum of 4.5:1. Adjust one or both colors for readable text.'
				);
			}
		}

		showNudge( panel, messages );
	}

	// -------------------------------------------------------------------------
	// MutationObserver setup
	// -------------------------------------------------------------------------

	let observerStarted = false;

	function startObserver() {
		if ( observerStarted ) return;
		observerStarted = true;

		const observer = new MutationObserver( function ( mutations ) {
			mutations.forEach( function ( mutation ) {
				mutation.addedNodes.forEach( function ( node ) {
					if ( node.nodeType !== 1 ) return;

					// Divi 5 settings panel containers: look for the settings sidebar/modal.
					const panels = [];

					if (
						node.classList &&
						( node.classList.contains( 'et-fb-settings' ) ||
						  node.classList.contains( 'et-fb-modal' ) ||
						  node.classList.contains( 'et-fb-settings-option' ) ||
						  ( node.className && node.className.includes( 'et-fb' ) ) )
					) {
						panels.push( node );
					}

					// Also search within the added node for panels.
					const found = node.querySelectorAll ?
						node.querySelectorAll( '[class*="et-fb-settings"], [class*="et-fb-modal"]' ) : [];
					found.forEach( function ( p ) { panels.push( p ); } );

					panels.forEach( function ( panel ) {
						// Small delay to let Divi populate field values.
						setTimeout( function () { analyzePanel( panel ); }, 150 );
					} );
				} );

				// Re-analyze on attribute changes within existing panels (field value changes).
				if (
					mutation.type === 'attributes' &&
					mutation.target &&
					mutation.target.closest &&
					mutation.target.closest( '[class*="et-fb-settings"]' )
				) {
					const panel = mutation.target.closest( '[class*="et-fb-settings"]' );
					clearTimeout( panel._tpDebounce );
					panel._tpDebounce = setTimeout( function () { analyzePanel( panel ); }, 300 );
				}
			} );
		} );

		observer.observe( document.body, {
			childList: true,
			subtree:   true,
			attributes: true,
			attributeFilter: [ 'value', 'data-value' ],
		} );
	}

	// -------------------------------------------------------------------------
	// Bootstrap
	// -------------------------------------------------------------------------

	function init() {
		// Wait for the Divi 5 builder app to mount before starting the observer.
		const builderSelectors = [
			'#et-boc',               // Divi 4 backend builder container
			'.et-fb-root-ancestor',   // Divi 5 frontend builder root
			'.et-fb-app-ui',          // Divi 5 app root
		];

		function findBuilder() {
			return builderSelectors.some( function ( sel ) { return document.querySelector( sel ); } );
		}

		if ( findBuilder() ) {
			startObserver();
			return;
		}

		// Poll briefly for the builder to mount (it loads async).
		let attempts = 0;
		const poll   = setInterval( function () {
			++attempts;
			if ( findBuilder() ) {
				clearInterval( poll );
				startObserver();
			} else if ( attempts > 60 ) {
				// 30 s elapsed — builder not found; give up quietly.
				clearInterval( poll );
			}
		}, 500 );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
