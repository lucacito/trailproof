import { useState, useRef, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Spinner } from '@wordpress/components';

const FOCUSABLE = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled]):not([type="hidden"])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
	'details > summary',
	'area[href]',
].join( ',' );

/**
 * Loads a page in a visible iframe and collects focusable elements in DOM/tab order,
 * then renders a numbered side-panel listing each element's tag, accessible name, and selector.
 */
export default function FocusOrderOverlay( { pageUrl, pageTitle } ) {
	const [ open, setOpen ]         = useState( false );
	const [ loading, setLoading ]   = useState( false );
	const [ elements, setElements ] = useState( [] );
	const [ error, setError ]       = useState( '' );
	const iframeRef                 = useRef( null );

	const collectFocusOrder = useCallback( () => {
		const iframe = iframeRef.current;
		if ( ! iframe ) return;

		try {
			const doc    = iframe.contentDocument;
			const nodes  = Array.from( doc.querySelectorAll( FOCUSABLE ) );

			// Sort by tabindex: positive tabindex first (ascending), then 0 / unset (DOM order).
			const withTabIndex = nodes.map( ( el, domIndex ) => {
				const ti = parseInt( el.getAttribute( 'tabindex' ) ?? '0', 10 );
				return { el, domIndex, ti: isNaN( ti ) ? 0 : ti };
			} );

			const positives = withTabIndex
				.filter( ( { ti } ) => ti > 0 )
				.sort( ( a, b ) => a.ti - b.ti || a.domIndex - b.domIndex );

			const naturals = withTabIndex
				.filter( ( { ti } ) => ti <= 0 )
				.sort( ( a, b ) => a.domIndex - b.domIndex );

			const ordered = [ ...positives, ...naturals ].map( ( { el }, i ) => {
				const tag      = el.tagName.toLowerCase();
				const id       = el.id ? `#${ el.id }` : '';
				const cls      = el.classList.length ? `.${ el.classList[0] }` : '';
				const selector = id || `${ tag }${ cls }`;
				const name     = (
					el.getAttribute( 'aria-label' ) ||
					el.getAttribute( 'aria-labelledby' )
						? ( doc.getElementById( el.getAttribute( 'aria-labelledby' ) )?.textContent ?? '' )
						: '' ) ||
					el.getAttribute( 'title' ) ||
					el.textContent?.trim().slice( 0, 60 ) ||
					el.getAttribute( 'placeholder' ) ||
					el.getAttribute( 'name' ) ||
					'';
				return { seq: i + 1, tag, selector, name: name.trim() };
			} );

			setElements( ordered );
		} catch ( e ) {
			setError( __( 'Could not access page content. The page may be cross-origin or failed to load.', 'trailproof' ) );
		}
	}, [] );

	function openPreview() {
		setOpen( true );
		setLoading( true );
		setElements( [] );
		setError( '' );
	}

	function closePreview() {
		setOpen( false );
		setElements( [] );
		setError( '' );
	}

	function onIframeLoad() {
		setLoading( false );
		collectFocusOrder();
	}

	if ( ! pageUrl ) return null;

	return (
		<>
			<Button
				variant="secondary"
				onClick={ openPreview }
				style={ { marginTop: 4 } }
			>
				{ __( 'Preview focus order', 'trailproof' ) }
			</Button>

			{ open && (
				<div style={ {
					position:   'fixed',
					inset:      0,
					zIndex:     9999,
					background: 'rgba(0,0,0,0.55)',
					display:    'flex',
					alignItems: 'stretch',
				} }>
					{ /* Left panel: focus order list */ }
					<div style={ {
						width:      360,
						background: '#fff',
						overflowY:  'auto',
						padding:    '20px 16px',
						flexShrink: 0,
						boxShadow:  '4px 0 12px rgba(0,0,0,0.15)',
					} }>
						<div style={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 } }>
							<strong>{ __( 'Focus Order', 'trailproof' ) }</strong>
							<Button variant="tertiary" onClick={ closePreview }>✕</Button>
						</div>

						<p style={ { fontSize: 12, color: '#646970', marginTop: 0, marginBottom: 12 } }>
							{ pageTitle || pageUrl }
						</p>

						{ loading && (
							<div style={ { display: 'flex', alignItems: 'center', gap: 8, color: '#646970' } }>
								<Spinner />
								{ __( 'Loading page…', 'trailproof' ) }
							</div>
						) }

						{ error && (
							<p style={ { color: '#d63638', fontSize: 13 } }>{ error }</p>
						) }

						{ ! loading && ! error && elements.length === 0 && (
							<p style={ { color: '#646970', fontSize: 13 } }>
								{ __( 'No focusable elements found.', 'trailproof' ) }
							</p>
						) }

						{ elements.map( ( el ) => (
							<div key={ el.seq } style={ {
								display:      'flex',
								alignItems:   'flex-start',
								gap:          10,
								padding:      '8px 0',
								borderBottom: '1px solid #f0f0f0',
							} }>
								<span style={ {
									flexShrink:  0,
									width:        26,
									height:       26,
									borderRadius: '50%',
									background:   '#2271b1',
									color:        '#fff',
									fontSize:     11,
									fontWeight:   700,
									display:      'flex',
									alignItems:   'center',
									justifyContent: 'center',
								} }>
									{ el.seq }
								</span>
								<div style={ { minWidth: 0 } }>
									<code style={ { fontSize: 11, background: '#f6f7f7', padding: '1px 4px', borderRadius: 2 } }>
										{ el.selector }
									</code>
									{ el.name && (
										<p style={ { margin: '3px 0 0', fontSize: 12, color: '#3c434a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }>
											{ el.name }
										</p>
									) }
								</div>
							</div>
						) ) }

						{ ! loading && elements.length > 0 && (
							<p style={ { fontSize: 12, color: '#646970', marginTop: 12 } }>
								{ elements.length }{ ' ' }{ __( 'focusable elements', 'trailproof' ) }
								{ elements.some( ( el ) => /tabindex/i.test( el.selector ) ) && (
									<span style={ { color: '#d63638' } }>
										{ ' ' }·{ ' ' }{ __( 'positive tabindex detected — check focus order', 'trailproof' ) }
									</span>
								) }
							</p>
						) }
					</div>

					{ /* Right: the page iframe */ }
					<div style={ { flex: 1, position: 'relative' } }>
						<iframe
							ref={ iframeRef }
							src={ pageUrl }
							title={ __( 'Focus order preview', 'trailproof' ) }
							onLoad={ onIframeLoad }
							style={ { width: '100%', height: '100%', border: 'none', background: '#fff' } }
						/>
					</div>
				</div>
			) }
		</>
	);
}
