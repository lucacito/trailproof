import { useState, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, CheckboxControl } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import ScanProgress from '../components/ScanProgress';
import FocusOrderOverlay from '../components/FocusOrderOverlay';

const SCAN_TIMEOUT_MS = 40_000; // 40 s per page

// Common header/footer selectors across themes (Divi, Genesis, default WP themes, etc.)
const HEADER_SELECTORS = [
	'header', '#masthead', '#main-header', '.site-header',
	'#et-top-navigation', '.et-l--header',
];
const FOOTER_SELECTORS = [
	'footer', '#colophon', '#main-footer', '#et-pb-footer-area',
	'.et-l--footer', '#et-footer-nav', '.site-footer',
];

const HEADER_AXE_CONTEXT = { include: HEADER_SELECTORS.map( s => [ s ] ) };
const FOOTER_AXE_CONTEXT = { include: FOOTER_SELECTORS.map( s => [ s ] ) };
const PAGE_AXE_CONTEXT   = {
	exclude: [ ...HEADER_SELECTORS.map( s => [ s ] ), ...FOOTER_SELECTORS.map( s => [ s ] ) ],
};

/**
 * Injects axe-core into a same-origin iframe and runs it.
 * Returns the raw axe results object.
 *
 * axeContext — optional axe context (include/exclude object). Null = full page.
 *
 * We inject a <style> that forces every element to its visible end-state so that
 * Divi entrance animations (which start at opacity:0 and transition via IntersectionObserver)
 * don't hide content from axe before the analysis runs.
 */
function runAxeInIframe( iframe, axeUrl, axeContext = null ) {
	return new Promise( ( resolve, reject ) => {
		const timer = setTimeout( () => reject( new Error( 'Scan timed out' ) ), SCAN_TIMEOUT_MS );

		// Guard: if the page didn't load (still at about:blank), bail early with a clear error.
		const currentHref = iframe.contentWindow?.location?.href ?? '';
		if ( ! currentHref || currentHref === 'about:blank' ) {
			clearTimeout( timer );
			reject( new Error( `iframe did not load the page (href: ${ currentHref || 'empty' })` ) );
			return;
		}

		// Force all entrance animations to their completed/visible state so axe sees a
		// fully-rendered page regardless of whether Divi's IntersectionObserver has fired.
		try {
			const style = iframe.contentDocument.createElement( 'style' );
			style.textContent = '*, *::before, *::after { opacity: 1 !important; visibility: visible !important; animation: none !important; transition: none !important; }';
			iframe.contentDocument.head.appendChild( style );
		} catch ( e ) { /* cross-origin guard — should never happen on same-origin scans */ }

		const script  = iframe.contentDocument.createElement( 'script' );
		script.src    = axeUrl;
		script.onload = async () => {
			try {
				// Diagnostic: check actual page content in the iframe
				const h1s = [ ...iframe.contentDocument.querySelectorAll( 'h1' ) ];
				console.log( '[Trailproof] iframe href:', iframe.contentWindow.location.href );
				console.log( '[Trailproof] iframe title:', iframe.contentDocument.title );
				console.log( '[Trailproof] h1 count:', h1s.length );
				console.log( '[Trailproof] iframe body snippet:', iframe.contentDocument.body?.innerHTML?.trim().slice( 0, 300 ) );

				const results = axeContext
					? await iframe.contentWindow.axe.run( axeContext )
					: await iframe.contentWindow.axe.run();
				clearTimeout( timer );
				resolve( results );
			} catch ( err ) {
				clearTimeout( timer );
				reject( err );
			}
		};
		script.onerror = () => {
			clearTimeout( timer );
			reject( new Error( 'Failed to load axe-core' ) );
		};
		iframe.contentDocument.head.appendChild( script );
	} );
}

/**
 * Load a URL in a hidden iframe and resolve when the page fires load.
 */
function loadIframe( url ) {
	return new Promise( ( resolve, reject ) => {
		const iframe     = document.createElement( 'iframe' );
		// clip-path hides the iframe visually while keeping it fully active.
		// visibility:hidden causes Firefox to skip loading the URL entirely (the frame
		// stays at about:blank), so we use clip-path instead.
		iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1280px;height:900px;clip-path:inset(100%);';
		iframe.setAttribute( 'aria-hidden', 'true' );
		iframe.setAttribute( 'tabindex', '-1' );

		const timer = setTimeout( () => {
			document.body.removeChild( iframe );
			reject( new Error( 'Page load timed out' ) );
		}, 20_000 );

		iframe.onload = () => {
			// Firefox fires a load event for the initial about:blank document the moment
			// the iframe is appended to the DOM, before the real URL loads. Guard against
			// resolving too early — wait for the actual page.
			if ( iframe.contentWindow?.location?.href === 'about:blank' ) {
				return;
			}
			clearTimeout( timer );
			resolve( iframe );
		};
		iframe.onerror = () => {
			clearTimeout( timer );
			if ( iframe.parentNode ) iframe.parentNode.removeChild( iframe );
			reject( new Error( 'Iframe failed to load' ) );
		};

		// Set src BEFORE appending so Firefox doesn't fire an extra load event for the
		// initial about:blank state (which would resolve the promise prematurely).
		iframe.src = url;
		document.body.appendChild( iframe );
	} );
}

export default function Scan( { navigate } ) {
	const [ scanning, setScanning ]       = useState( false );
	const [ pages, setPages ]             = useState( [] );
	const [ currentIndex, setIndex ]      = useState( 0 );
	const [ done, setDone ]               = useState( false );
	const [ errors, setErrors ]           = useState( [] );
	const [ includeElementor, setElem ]   = useState( false );
	const [ focusPage, setFocusPage ]     = useState( null );
	const abortRef = useRef( false );

	const axeUrl      = window.trailproofData?.axeUrl ?? '';
	const gbEnabled   = !! window.trailproofData?.gutenbergEnabled;
	const elemEnabled = !! window.trailproofData?.elementorEnabled;

	async function startScan() {
		abortRef.current = false;
		setScanning( true );
		setDone( false );
		setErrors( [] );
		setIndex( 0 );
		setFocusPage( null );

		let pageList;
		try {
			pageList = await apiFetch( { path: '/trailproof/v1/pages' } );
		} catch ( err ) {
			setErrors( [ __( 'Could not load page list: ', 'trailproof' ) + err.message ] );
			setScanning( false );
			return;
		}

		// Build the full scan queue:
		//   1. Site Header — scans only the header region of the home page
		//   2. Site Footer — scans only the footer region of the home page
		//   3. Each content page — scans the full page excluding header and footer
		const siteUrl = ( window.trailproofData?.siteUrl ?? window.location.origin + '/' )
			.replace( /\/$/, '' );

		const scanQueue = [
			{
				url:        siteUrl + '/?trailproof_zone=header',
				iframeUrl:  siteUrl + '/',
				post_id:    0,
				title:      __( 'Site Header', 'trailproof' ),
				axeContext: HEADER_AXE_CONTEXT,
				isSpecial:  true,
			},
			{
				url:        siteUrl + '/?trailproof_zone=footer',
				iframeUrl:  siteUrl + '/',
				post_id:    0,
				title:      __( 'Site Footer', 'trailproof' ),
				axeContext: FOOTER_AXE_CONTEXT,
				isSpecial:  true,
			},
			...pageList.map( p => ( {
				...p,
				iframeUrl:  p.url,
				axeContext: PAGE_AXE_CONTEXT,
				isSpecial:  false,
			} ) ),
		];

		setPages( scanQueue );
		const errs = [];

		for ( let i = 0; i < scanQueue.length; i++ ) {
			if ( abortRef.current ) break;
			setIndex( i );

			const { url, iframeUrl, post_id, title, axeContext, isSpecial } = scanQueue[ i ];

			// axe-core scan (client-side iframe)
			let iframe = null;
			try {
				const { scan_id } = await apiFetch( {
					path:   '/trailproof/v1/scans',
					method: 'POST',
					data:   { url, post_id, provider: 'axe' },
				} );

				// Diagnostic: check response headers before loading in iframe
				try {
					const r = await fetch( iframeUrl, { credentials: 'include' } );
					console.log( '[Trailproof] X-Frame-Options:', r.headers.get( 'X-Frame-Options' ) );
					console.log( '[Trailproof] CSP:', r.headers.get( 'Content-Security-Policy' ) );
				} catch ( e ) { /* ignore */ }

				iframe = await loadIframe( iframeUrl );
				const results = await runAxeInIframe( iframe, axeUrl, axeContext );
				document.body.removeChild( iframe );
				iframe = null;

				// Diagnostic — open browser DevTools console to see these
				console.log( '[Trailproof] scanned:', url, '(iframe:', iframeUrl, ')' );
				console.log( '[Trailproof] violations (' + ( results.violations?.length ?? 0 ) + '):', results.violations?.map( v => v.id ) );
				console.log( '[Trailproof] passes (' + ( results.passes?.length ?? 0 ) + '):', results.passes?.map( v => v.id ) );
				console.log( '[Trailproof] incomplete (' + ( results.incomplete?.length ?? 0 ) + '):', results.incomplete?.map( v => v.id ) );

				await apiFetch( {
					path:   `/trailproof/v1/scans/${ scan_id }/axe-results`,
					method: 'POST',
					data:   { url, post_id, results },
				} );
			} catch ( err ) {
				errs.push( `axe / ${ title ?? url }: ${ err.message }` );
			} finally {
				if ( iframe && iframe.parentNode ) {
					iframe.parentNode.removeChild( iframe );
				}
			}

			// Header/footer virtual scans skip Gutenberg/Elementor (they have no post content)
			if ( isSpecial ) {
				continue;
			}

			// Gutenberg scan (server-side DOMDocument — always included)
			if ( gbEnabled && ! abortRef.current ) {
				try {
					await apiFetch( {
						path:   '/trailproof/v1/scans',
						method: 'POST',
						data:   { url, post_id, provider: 'gutenberg', run_now: true },
					} );
				} catch ( err ) {
					errs.push( `Gutenberg / ${ title ?? url }: ${ err.message }` );
				}
			}

			// Elementor scan (server-side DOMDocument)
			if ( includeElementor && elemEnabled && ! abortRef.current ) {
				try {
					await apiFetch( {
						path:   '/trailproof/v1/scans',
						method: 'POST',
						data:   { url, post_id, provider: 'elementor', run_now: true },
					} );
				} catch ( err ) {
					errs.push( `Elementor / ${ title ?? url }: ${ err.message }` );
				}
			}
		}

		setErrors( errs );
		setIndex( scanQueue.length );
		setDone( true );
		setScanning( false );
	}

	function stopScan() {
		abortRef.current = true;
		setScanning( false );
	}

	return (
		<div>
			<h1 style={ { marginTop: 0 } }>{ __( '🔍 Scan your website', 'trailproof' ) }</h1>

			<p style={ { color: '#50575e', fontSize: 14, lineHeight: 1.6, maxWidth: 560, marginBottom: 20 } }>
				{ __( 'Trailproof will check each page of your website for accessibility issues. The scan runs in the background and may take a few minutes depending on how many pages you have.', 'trailproof' ) }
			</p>

			{ ! axeUrl && (
				<div style={ { background: '#fcf0f1', border: '1px solid #d63638', borderRadius: 4, padding: '1rem', marginBottom: '1rem' } }>
					{ __( 'Scanner not ready. Please contact your developer.', 'trailproof' ) }
				</div>
			) }

			{ /* Optional extras */ }
			{ elemEnabled && (
				<div style={ { marginBottom: 16, padding: '12px 16px', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: 4 } }>
					<p style={ { margin: '0 0 10px', fontWeight: 600, fontSize: 13 } }>
						{ __( 'Optional: run extra checks', 'trailproof' ) }
					</p>
					<CheckboxControl
						label={ __( 'Also check Elementor widgets', 'trailproof' ) }
						checked={ includeElementor }
						onChange={ setElem }
						__nextHasNoMarginBottom
					/>
				</div>
			) }

			<div style={ { display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' } }>
				{ ! scanning && (
					<Button
						variant="primary"
						onClick={ startScan }
						disabled={ ! axeUrl }
					>
						{ done
							? __( 'Scan again', 'trailproof' )
							: __( 'Start scan', 'trailproof' )
						}
					</Button>
				) }

				{ scanning && (
					<Button variant="secondary" onClick={ stopScan }>
						{ __( 'Stop', 'trailproof' ) }
					</Button>
				) }

				{ done && (
					<Button variant="secondary" onClick={ () => navigate( 'worklist' ) }>
						{ __( 'View results →', 'trailproof' ) }
					</Button>
				) }
			</div>

			{ ( scanning || done ) && (
				<ScanProgress
					pages={ pages }
					currentIndex={ currentIndex }
					done={ done }
					errors={ errors }
				/>
			) }

			{ done && errors.length === 0 && (
				<div style={ { background: '#edfaef', border: '1px solid #00a32a', borderRadius: 4, padding: '1rem', marginBottom: '1rem' } }>
					{ __( 'Scan complete! Head to "Fix Issues" to see what was found.', 'trailproof' ) }
				</div>
			) }

			{ /* Focus-order preview */ }
			{ done && pages.length > 0 && (
				<div style={ { marginTop: 24, padding: '16px', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: 4 } }>
					<p style={ { margin: '0 0 10px', fontWeight: 600, fontSize: 13 } }>
						{ __( 'Focus Order Preview', 'trailproof' ) }
					</p>
					<p style={ { margin: '0 0 6px', fontSize: 12, color: '#646970', lineHeight: 1.6 } }>
						{ __( 'Keyboard and assistive-technology users navigate by pressing Tab — they never use a mouse. The order in which Tab moves between links, buttons, and form fields must match the visual reading order of the page, otherwise users lose their place or reach controls in the wrong sequence.', 'trailproof' ) }
					</p>
					<p style={ { margin: '0 0 12px', fontSize: 12, color: '#646970', lineHeight: 1.6 } }>
						{ __( 'Select a page below to open a side-by-side preview: the left panel lists every focusable element numbered in the exact Tab order a keyboard user would encounter, and the right panel shows the live page so you can compare the sequence against the visual layout.', 'trailproof' ) }
					</p>

					<div style={ { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } }>
						<select
							value={ focusPage ? focusPage.url : '' }
							onChange={ ( e ) => {
								const p = pages.find( ( pg ) => pg.url === e.target.value );
								setFocusPage( p ?? null );
							} }
							style={ { height: 32, borderRadius: 4, border: '1px solid #8c8f94', padding: '0 8px' } }
						>
							<option value="">{ __( '— select a page —', 'trailproof' ) }</option>
							{ pages.filter( p => ! p.isSpecial ).map( ( p ) => (
								<option key={ p.url } value={ p.url }>{ p.title || p.url }</option>
							) ) }
						</select>

						{ focusPage && (
							<FocusOrderOverlay
								pageUrl={ focusPage.url }
								pageTitle={ focusPage.title }
							/>
						) }
					</div>
				</div>
			) }
		</div>
	);
}
