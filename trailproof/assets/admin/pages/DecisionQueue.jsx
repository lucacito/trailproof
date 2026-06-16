import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import DecisionScreen from '../components/DecisionScreen';

export default function DecisionQueue() {
	const [ issues, setIssues ]         = useState( [] );
	const [ loading, setLoading ]       = useState( true );
	const [ activeIssue, setActive ]    = useState( null );

	const fetchIssues = useCallback( () => {
		setLoading( true );
		apiFetch( { path: '/trailproof/v1/issues?bucket=B&status=open&per_page=200' } )
			.then( setIssues )
			.catch( () => setIssues( [] ) )
			.finally( () => setLoading( false ) );
	}, [] );

	useEffect( () => { fetchIssues(); }, [ fetchIssues ] );

	function handleDecision( updatedIssue ) {
		setIssues( ( prev ) => prev.map( ( i ) => i.id === updatedIssue.id ? updatedIssue : i ) );
		setActive( null );
	}

	const open   = issues.filter( ( i ) => [ 'open', 'regressed' ].includes( i.status ) );
	const closed = issues.filter( ( i ) => ! [ 'open', 'regressed' ].includes( i.status ) );

	if ( activeIssue ) {
		return (
			<div>
				<button
					className="button button-small"
					onClick={ () => setActive( null ) }
					style={ { marginBottom: 12 } }
				>
					← Back to queue
				</button>
				<DecisionScreen
					issue={ activeIssue }
					onDecision={ handleDecision }
					onCancel={ () => setActive( null ) }
				/>
			</div>
		);
	}

	return (
		<div>
			<div style={ { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' } }>
				<h1 style={ { margin: 0 } }>{ __( 'Decision Queue', 'trailproof' ) }</h1>
				<span style={ { color: '#646970', fontSize: 13 } }>
					{ loading ? __( 'Loading…', 'trailproof' ) : `${ open.length } ${ __( 'awaiting decision', 'trailproof' ) }` }
				</span>
			</div>

			<p style={ { color: '#50575e', fontSize: 13, marginBottom: 16 } }>
				{ __( 'Bucket B issues require a human decision before a fix is applied. Review each issue and choose to apply a fix, defer, or mark as not applicable.', 'trailproof' ) }
			</p>

			{ loading ? (
				<p>{ __( 'Loading…', 'trailproof' ) }</p>
			) : open.length === 0 ? (
				<p style={ { color: '#1a7f37', fontWeight: 600 } }>
					{ __( '✓ No open Bucket B issues. All have been decided.', 'trailproof' ) }
				</p>
			) : (
				<table className="wp-list-table widefat fixed striped" style={ { tableLayout: 'auto' } }>
					<thead>
						<tr>
							<th>{ __( 'Severity', 'trailproof' ) }</th>
							<th>{ __( 'Rule', 'trailproof' ) }</th>
							<th>{ __( 'Description', 'trailproof' ) }</th>
							<th>{ __( 'WCAG', 'trailproof' ) }</th>
							<th>{ __( 'Selector', 'trailproof' ) }</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{ open.map( ( issue ) => (
							<tr key={ issue.id }>
								<td><SeverityDot severity={ issue.severity } /></td>
								<td><code>{ issue.rule_id }</code></td>
								<td style={ { maxWidth: 260 } }>{ issue.description }</td>
								<td>
									<a
										href={ `https://www.w3.org/WAI/WCAG21/Understanding/${ wcagSlug( issue.wcag_sc ) }` }
										target="_blank"
										rel="noreferrer"
									>
										{ issue.wcag_sc }
									</a>
								</td>
								<td><code style={ { fontSize: 11 } }>{ issue.selector }</code></td>
								<td>
									<Button
										variant="primary"
										onClick={ () => setActive( issue ) }
									>
										{ __( 'Decide', 'trailproof' ) }
									</Button>
								</td>
							</tr>
						) ) }
					</tbody>
				</table>
			) }

			{ ! loading && closed.length > 0 && (
				<details style={ { marginTop: 24 } }>
					<summary style={ { cursor: 'pointer', fontWeight: 600, fontSize: 13 } }>
						{ closed.length } { __( 'decided', 'trailproof' ) }
					</summary>
					<table className="wp-list-table widefat fixed striped" style={ { marginTop: 8, tableLayout: 'auto' } }>
						<thead>
							<tr>
								<th>{ __( 'Rule', 'trailproof' ) }</th>
								<th>{ __( 'Description', 'trailproof' ) }</th>
								<th>{ __( 'Status', 'trailproof' ) }</th>
							</tr>
						</thead>
						<tbody>
							{ closed.map( ( issue ) => (
								<tr key={ issue.id }>
									<td><code>{ issue.rule_id }</code></td>
									<td>{ issue.description }</td>
									<td><StatusBadge status={ issue.status } /></td>
								</tr>
							) ) }
						</tbody>
					</table>
				</details>
			) }
		</div>
	);
}

function SeverityDot( { severity } ) {
	const colors = { critical: '#cf222e', serious: '#e16f24', moderate: '#f0a400', minor: '#6e7781' };
	return (
		<span style={ { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 } }>
			<span style={ { width: 10, height: 10, borderRadius: '50%', background: colors[ severity ] || '#888', display: 'inline-block' } } />
			{ severity }
		</span>
	);
}

function StatusBadge( { status } ) {
	const map = {
		fixed:    { bg: '#dafbe1', color: '#1a7f37' },
		deferred: { bg: '#fff3cd', color: '#856404' },
		na:       { bg: '#e2e3e5', color: '#383d41' },
	};
	const s = map[ status ] || { bg: '#f0f0f0', color: '#666' };
	return (
		<span style={ { padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color } }>
			{ status }
		</span>
	);
}

function wcagSlug( sc ) {
	return sc ? sc.replace( /\./g, '' ) : '';
}
