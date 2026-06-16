import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Notice } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

export default function Reports() {
	const [ reports, setReports ]   = useState( [] );
	const [ loading, setLoading ]   = useState( true );
	const [ generating, setGen ]    = useState( false );
	const [ error, setError ]       = useState( null );
	const [ success, setSuccess ]   = useState( null );

	const fetchReports = useCallback( () => {
		setLoading( true );
		apiFetch( { path: '/trailproof/v1/reports' } )
			.then( setReports )
			.catch( () => setReports( [] ) )
			.finally( () => setLoading( false ) );
	}, [] );

	useEffect( () => { fetchReports(); }, [ fetchReports ] );

	async function generateBundle() {
		setGen( true );
		setError( null );
		setSuccess( null );
		try {
			const result = await apiFetch( {
				path:   '/trailproof/v1/reports',
				method: 'POST',
			} );
			setSuccess( __( 'Evidence bundle generated: ', 'trailproof' ) + result.filename );
			fetchReports();
		} catch ( err ) {
			setError( err?.message || __( 'Failed to generate report.', 'trailproof' ) );
		} finally {
			setGen( false );
		}
	}

	function downloadUrl( reportId ) {
		// Build the authenticated REST download URL with the WP nonce
		const base = window.trailproofData?.restUrl ?? '/wp-json/trailproof/v1/';
		const nonce = window.trailproofData?.nonce ?? '';
		return `${ base }reports/${ reportId }/download?_wpnonce=${ nonce }`;
	}

	return (
		<div>
			<div style={ { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' } }>
				<h1 style={ { margin: 0 } }>{ __( 'Evidence Bundle', 'trailproof' ) }</h1>
			</div>

			<p style={ { color: '#50575e', fontSize: 13, maxWidth: 600, marginBottom: 16 } }>
				{ __( 'An evidence bundle is a dated ZIP file containing: your accessibility statement, a full issues CSV with WCAG mapping, an append-only decisions log CSV, and a scan history JSON. Generate a bundle before filing a response to a legal inquiry or at each compliance review milestone.', 'trailproof' ) }
			</p>

			{ error   && <Notice status="error"   isDismissible onRemove={ () => setError( null ) }>{ error }</Notice> }
			{ success && <Notice status="success" isDismissible onRemove={ () => setSuccess( null ) }>{ success }</Notice> }

			<Button
				variant="primary"
				onClick={ generateBundle }
				disabled={ generating }
				style={ { marginBottom: 24 } }
			>
				{ generating
					? __( 'Generating…', 'trailproof' )
					: __( 'Generate evidence bundle', 'trailproof' )
				}
			</Button>

			<h2 style={ { fontSize: 14, fontWeight: 600, marginBottom: 8 } }>
				{ __( 'Past bundles', 'trailproof' ) }
			</h2>

			{ loading ? (
				<p>{ __( 'Loading…', 'trailproof' ) }</p>
			) : reports.length === 0 ? (
				<p style={ { color: '#646970' } }>
					{ __( 'No bundles yet. Generate your first one above.', 'trailproof' ) }
				</p>
			) : (
				<table className="wp-list-table widefat fixed striped">
					<thead>
						<tr>
							<th>{ __( 'Generated', 'trailproof' ) }</th>
							<th>{ __( 'Filename', 'trailproof' ) }</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{ reports.map( ( report ) => (
							<tr key={ report.id }>
								<td style={ { fontSize: 13 } }>
									{ new Date( report.generated_at ).toLocaleString() }
								</td>
								<td>
									<code style={ { fontSize: 11 } }>{ report.filename }</code>
								</td>
								<td>
									<a
										href={ downloadUrl( report.id ) }
										className="button button-small"
										download
									>
										{ __( 'Download', 'trailproof' ) }
									</a>
								</td>
							</tr>
						) ) }
					</tbody>
				</table>
			) }

			<div style={ { marginTop: 24, padding: '12px 16px', background: '#f0f6fc', border: '1px solid #bcd6f0', borderRadius: 4, fontSize: 12, color: '#1c4587', maxWidth: 560 } }>
				<strong>{ __( 'What this bundle is not:', 'trailproof' ) }</strong>{ ' ' }
				{ __( 'It is a record of systematic documented remediation — not a certification of full conformance. Always describe it accurately: "We are engaged in ongoing WCAG 2.1 AA remediation; this bundle documents our process and findings."', 'trailproof' ) }
			</div>
		</div>
	);
}
