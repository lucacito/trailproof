import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Notice } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

const whiteLabel = !! window.trailproofData?.whiteLabel;

export default function Statement() {
	const [ html, setHtml ]         = useState( '' );
	const [ loading, setLoading ]   = useState( true );
	const [ copied, setCopied ]     = useState( false );

	useEffect( () => {
		apiFetch( { path: '/trailproof/v1/statement' } )
			.then( ( data ) => setHtml( data.html ?? '' ) )
			.finally( () => setLoading( false ) );
	}, [] );

	async function copyHtml() {
		try {
			await navigator.clipboard.writeText( html );
			setCopied( true );
			setTimeout( () => setCopied( false ), 2500 );
		} catch {
			// Fallback: select the textarea
			document.getElementById( 'tp-statement-textarea' )?.select();
		}
	}

	function downloadHtml() {
		const blob = new Blob( [ html ], { type: 'text/html' } );
		const a    = document.createElement( 'a' );
		a.href     = URL.createObjectURL( blob );
		a.download = 'accessibility-statement.html';
		a.click();
		URL.revokeObjectURL( a.href );
	}

	if ( loading ) return <p>{ __( 'Generating statement…', 'trailproof' ) }</p>;

	return (
		<div>
			<h1 style={ { marginTop: 0 } }>{ __( 'Accessibility Statement', 'trailproof' ) }</h1>

			{ whiteLabel && (
				<div style={ { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 4, padding: '5px 10px', marginBottom: 12, fontSize: 12 } }>
					<span style={ { width: 7, height: 7, borderRadius: '50%', background: '#0284c7', display: 'inline-block', flexShrink: 0 } } />
					<span style={ { color: '#0369a1', fontWeight: 600 } }>
						{ __( 'White-label mode ON', 'trailproof' ) }
					</span>
					<span style={ { color: '#0369a1' } }>
						{ __( '— Trailproof attribution will be removed from the exported statement and report bundle.', 'trailproof' ) }
					</span>
				</div>
			) }

			<div style={ { background: '#f6f7f7', border: '1px solid #dcdcde', borderRadius: 4, padding: '16px 18px', marginBottom: 20 } }>
				<p style={ { margin: '0 0 10px', fontWeight: 600, fontSize: 13 } }>
					{ __( 'What is an accessibility statement?', 'trailproof' ) }
				</p>
				<p style={ { margin: '0 0 10px', fontSize: 13, color: '#3c434a' } }>
					{ __( 'An accessibility statement is a public page on your website that discloses your accessibility status, describes known limitations, and tells users how to request help or report a barrier. It is the standard way to demonstrate that accessibility is an active, ongoing effort rather than something you\'ve declared done.', 'trailproof' ) }
				</p>

				<p style={ { margin: '0 0 4px', fontWeight: 600, fontSize: 13 } }>
					{ __( 'Why does this matter?', 'trailproof' ) }
				</p>
				<ul style={ { margin: '0 0 10px', paddingLeft: 20, fontSize: 13, color: '#3c434a' } }>
					<li style={ { marginBottom: 4 } }>{ __( 'Several frameworks — including the EU Web Accessibility Directive, UK public sector requirements, and many state-level procurement rules — legally require a published statement.', 'trailproof' ) }</li>
					<li style={ { marginBottom: 4 } }>{ __( 'It is your primary evidence of good-faith remediation effort. In the event of a complaint or audit, a dated, specific statement is far more credible than silence.', 'trailproof' ) }</li>
					<li>{ __( 'It gives users with disabilities a direct way to contact you when they hit a barrier — which is itself a WCAG 2 conformance requirement (2.5.5 / ATAG).', 'trailproof' ) }</li>
				</ul>

				<p style={ { margin: '0 0 4px', fontWeight: 600, fontSize: 13 } }>
					{ __( 'How to publish it', 'trailproof' ) }
				</p>
				<p style={ { margin: '0 0 10px', fontSize: 13, color: '#3c434a' } }>
					{ __( 'Copy the HTML below, create a new WordPress page (e.g. "Accessibility Statement"), paste into the HTML block or Custom HTML widget, and publish. Link to it from your site footer. Update it whenever your remediation status changes — the statement is generated fresh from your current scan data each time you visit this screen.', 'trailproof' ) }
				</p>

				<p style={ { margin: '0 0 4px', fontWeight: 600, fontSize: 13, color: '#783f04' } }>
					{ __( 'A note on language', 'trailproof' ) }
				</p>
				<p style={ { margin: 0, fontSize: 13, color: '#3c434a' } }>
					{ __( 'This statement uses "partially conformant — systematic documented remediation" framing deliberately. Claiming "fully ADA compliant" or "100% accessible" is legally risky and almost never accurate. Partial conformance with active remediation is both honest and defensible. Do not change this framing.', 'trailproof' ) }
				</p>
			</div>

			{ copied && (
				<Notice status="success" isDismissible={ false } style={ { marginBottom: '1rem' } }>
					{ __( 'Copied to clipboard!', 'trailproof' ) }
				</Notice>
			) }

			<div style={ { display: 'flex', gap: 8, marginBottom: '1rem' } }>
				<Button variant="primary" onClick={ copyHtml }>
					{ __( 'Copy HTML', 'trailproof' ) }
				</Button>
				<Button variant="secondary" onClick={ downloadHtml }>
					{ __( 'Download HTML', 'trailproof' ) }
				</Button>
			</div>

			{ /* Editable textarea so users can review / tweak before pasting */ }
			<textarea
				id="tp-statement-textarea"
				value={ html }
				onChange={ ( e ) => setHtml( e.target.value ) }
				rows={ 30 }
				style={ {
					width: '100%',
					fontFamily: 'monospace',
					fontSize: 12,
					padding: '0.75rem',
					border: '1px solid #ccc',
					borderRadius: 4,
					boxSizing: 'border-box',
				} }
				aria-label={ __( 'Accessibility statement HTML source', 'trailproof' ) }
			/>
		</div>
	);
}
