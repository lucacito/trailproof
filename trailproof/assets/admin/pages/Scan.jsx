import { useState, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, CheckboxControl } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import ScanProgress from '../components/ScanProgress';
import FocusOrderOverlay from '../components/FocusOrderOverlay';

const SCAN_TIMEOUT_MS = 40_000; // 40 s per page

/**
 * Injects axe-core into a same-origin iframe and runs it.
 * Returns the raw axe results object.
 */
function runAxeInIframe( iframe, axeUrl ) {
	return new Promise( ( resolve, reject ) => {
		const timer = setTimeout( () => reject( new Error( 'Scan timed out' ) ), SCAN_TIMEOUT_MS );

		const script    = iframe.contentDocument.createElement( 'script' );
		script.src      = axeUrl;
		script.onload   = async () => {
			try {
				const results = await iframe.contentWindow.axe.run();
				clearTimeout( timer );
				resolve( results );
			} catch ( err ) {
				clearTimeout( timer );
				reject( err );
			}
		};
		script.onerror  = () => {
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
		iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1280px;height:900px;visibility:hidden;';
		iframe.setAttribute( 'aria-hidden', 'true' );
		iframe.setAttribute( 'tabindex', '-1' );

		const timer = setTimeout( () => {
			document.body.removeChild( iframe );
			reject( new Error( 'Page load timed out' ) );
		}, 20_000 );

		iframe.onload = () => {
			clearTimeout( timer );
			resolve( iframe );
		};
		iframe.onerror = () => {
			clearTimeout( timer );
			document.body.removeChild( iframe );
			reject( new Error( 'Iframe failed to load' ) );
		};

		document.body.appendChild( iframe );
		iframe.src = url;
	} );
}

export default function Scan( { navigate } ) {
	const [ scanning, setScanning ]       = useState( false );
	const [ pages, setPages ]             = useState( [] );
	const [ currentIndex, setIndex ]      = useState( 0 );
	const [ done, setDone ]               = useState( false );
	const [ errors, setErrors ]           = useState( [] );
	const [ includeWave, setWave ]        = useState( false );
	const [ includeGutenberg, setGb ]     = useState( false );
	const [ includeElementor, setElem ]   = useState( false );
	const [ focusPage, setFocusPage ]     = useState( null );
	const abortRef = useRef( false );

	const axeUrl         = window.trailproofData?.axeUrl ?? '';
	const waveEnabled    = !! window.trailproofData?.waveEnabled;
	const gbEnabled      = !! window.trailproofData?.gutenbergEnabled;
	const elemEnabled    = !! window.trailproofData?.elementorEnabled;

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

		setPages( pageList );
		const errs = [];

		for ( let i = 0; i < pageList.length; i++ ) {
			if ( abortRef.current ) break;
			setIndex( i );

			const { url, post_id, title } = pageList[ i ];

			// axe-core scan (client-side iframe)
			try {
				const { scan_id } = await apiFetch( {
					path:   '/trailproof/v1/scans',
					method: 'POST',
					data:   { url, post_id, provider: 'axe' },
				} );

				const iframe  = await loadIframe( url );
				const results = await runAxeInIframe( iframe, axeUrl );
				document.body.removeChild( iframe );

				await apiFetch( {
					path:   `/trailproof/v1/scans/${ scan_id }/axe-results`,
					method: 'POST',
					data:   { url, post_id, results },
				} );
			} catch ( err ) {
				errs.push( `axe / ${ title ?? url }: ${ err.message }` );
			}

			// WAVE scan (server-side relay)
			if ( includeWave && waveEnabled && ! abortRef.current ) {
				try {
					await apiFetch( {
						path:   '/trailproof/v1/scans',
						method: 'POST',
						data:   { url, post_id, provider: 'wave', run_now: true },
					} );
				} catch ( err ) {
					errs.push( `WAVE / ${ title ?? url }: ${ err.message }` );
				}
			}

			// Gutenberg scan (server-side DOMDocument)
			if ( includeGutenberg && gbEnabled && ! abortRef.current ) {
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
		setIndex( pageList.length );
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
			{ ( waveEnabled || gbEnabled || elemEnabled ) && (
				<div style={ { marginBottom: 16, padding: '12px 16px', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: 4 } }>
					<p style={ { margin: '0 0 10px', fontWeight: 600, fontSize: 13 } }>
						{ __( 'Optional: run extra checks', 'trailproof' ) }
					</p>

					{ waveEnabled && (
						<CheckboxControl
							label={ __( 'Run a second independent check with WAVE (uses your API credits)', 'trailproof' ) }
							checked={ includeWave }
							onChange={ setWave }
							__nextHasNoMarginBottom
						/>
					) }
					{ gbEnabled && (
						<CheckboxControl
							label={ __( 'Also check Gutenberg blocks', 'trailproof' ) }
							checked={ includeGutenberg }
							onChange={ setGb }
							__nextHasNoMarginBottom
						/>
					) }
					{ elemEnabled && (
						<CheckboxControl
							label={ __( 'Also check Elementor widgets', 'trailproof' ) }
							checked={ includeElementor }
							onChange={ setElem }
							__nextHasNoMarginBottom
						/>
					) }
				</div>
			) }

			{ ! waveEnabled && (
				<p style={ { fontSize: 12, color: '#646970', marginBottom: 16 } }>
					{ __( 'Want a second opinion from WAVE? Add your WebAIM API key in ', 'trailproof' ) }
					<a href="?page=trailproof-settings">{ __( 'Settings', 'trailproof' ) }</a>.
				</p>
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
					<p style={ { margin: '0 0 12px', fontSize: 12, color: '#646970' } }>
						{ __( 'Select a page to preview its keyboard focus order — all focusable elements listed in the sequence a keyboard user would encounter them.', 'trailproof' ) }
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
							{ pages.map( ( p ) => (
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
