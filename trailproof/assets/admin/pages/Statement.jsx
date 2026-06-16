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

			<p>
				{ __( 'This statement summarises your scan findings and remediation effort. Copy the HTML and paste it into a WordPress page, or download the file.', 'trailproof' ) }
			</p>
			<p style={ { color: '#646970', fontSize: 13 } }>
				{ __( 'Never claim full compliance or use "ADA compliant" language. This statement uses "partially conformant / systematic documented remediation" framing as required.', 'trailproof' ) }
			</p>

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
