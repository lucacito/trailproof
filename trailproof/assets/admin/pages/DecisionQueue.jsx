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
			{ ! loading && (
				<p style={ { margin: '0 0 16px', color: '#64748B', fontSize: 13 } }>
					{ open.length > 0
						? `${ open.length } ${ open.length === 1 ? __( 'issue needs your input', 'trailproof' ) : __( 'issues need your input', 'trailproof' ) }`
						: __( 'All issues decided — great work!', 'trailproof' )
					}
				</p>
			) }

			<p style={ { color: '#50575e', fontSize: 13, marginBottom: 16 } }>
				{ __( 'These issues were detected automatically, but the right fix depends on context only you know. Review each one and choose what to do — you can apply a fix, skip it, or mark it as not applicable.', 'trailproof' ) }
			</p>

			{ loading ? (
				<p>{ __( 'Loading…', 'trailproof' ) }</p>
			) : open.length === 0 ? (
				<div style={ { textAlign: 'center', padding: '24px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 } }>
					<div style={ { fontSize: 24, marginBottom: 6 } } aria-hidden="true">✓</div>
					<p style={ { color: '#1a7f37', fontWeight: 600, fontSize: 13, margin: 0 } }>
						{ __( 'All issues decided.', 'trailproof' ) }
					</p>
					<p style={ { color: '#50575e', fontSize: 12, margin: '4px 0 0' } }>
						{ __( 'No open "Needs your decision" issues remain.', 'trailproof' ) }
					</p>
				</div>
			) : (
				<table className="wp-list-table widefat fixed striped" style={ { tableLayout: 'auto' } }>
					<thead>
						<tr>
							<th style={ { width: 110 } }>{ __( 'Impact', 'trailproof' ) }</th>
							<th>{ __( 'What was found', 'trailproof' ) }</th>
							<th style={ { width: 150 } }></th>
						</tr>
					</thead>
					<tbody>
						{ open.map( ( issue ) => (
							<tr key={ issue.id }>
								<td><SeverityDot severity={ issue.severity } /></td>
								<td>
									<div style={ { fontSize: 13, color: '#1d2327', marginBottom: 4 } }>
										{ issue.description }
									</div>
									{ issue.wcag_sc && (
										<div style={ { fontSize: 11, color: '#8c959f' } }>
											{ __( 'Standard:', 'trailproof' ) }{ ' ' }
											<a
												href={ `https://www.w3.org/WAI/WCAG21/Understanding/${ wcagSlug( issue.wcag_sc ) }` }
												target="_blank"
												rel="noreferrer"
												style={ { color: '#8c959f' } }
											>
												WCAG { issue.wcag_sc }
											</a>
										</div>
									) }
								</td>
								<td>
									<Button
										variant="primary"
										onClick={ () => setActive( issue ) }
									>
										{ __( 'Review & decide', 'trailproof' ) }
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
						{ closed.length } { __( 'already decided', 'trailproof' ) }
					</summary>
					<table className="wp-list-table widefat fixed striped" style={ { marginTop: 8, tableLayout: 'auto' } }>
						<thead>
							<tr>
								<th>{ __( 'What was found', 'trailproof' ) }</th>
								<th style={ { width: 130 } }>{ __( 'Outcome', 'trailproof' ) }</th>
							</tr>
						</thead>
						<tbody>
							{ closed.map( ( issue ) => (
								<tr key={ issue.id }>
									<td>{ issue.description }</td>
									<td><StatusBadge status={ issue.status } bucket="B" /></td>
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
