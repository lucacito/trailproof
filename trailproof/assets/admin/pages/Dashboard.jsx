import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import StatusBadge, { groupStatus } from '../components/StatusBadge';

// ---- Sub-components ----

function ProgressBar( { pct, addressed, total } ) {
	const safe = Math.min( 100, Math.max( 0, pct ) );
	const color = safe === 100 ? '#1a7f37' : safe >= 50 ? '#2271b1' : '#cf222e';
	return (
		<div style={ { marginBottom: 24 } }>
			<div style={ { display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 600 } }>
				<span style={ { color: '#1d2327' } }>
					{ safe === 100
						? __( 'All problem types addressed', 'trailproof' )
						: `${ addressed } of ${ total } problem types addressed`
					}
				</span>
				<span style={ { color } }>{ safe }%</span>
			</div>
			<div style={ { background: '#e0e0e0', borderRadius: 99, height: 10, overflow: 'hidden' } }>
				<div style={ {
					width:        `${ safe }%`,
					height:       '100%',
					background:   color,
					borderRadius: 99,
					transition:   'width 0.4s ease',
				} } />
			</div>
			{ total === 0 && (
				<p style={ { fontSize: 12, color: '#646970', marginTop: 6 } }>
					{ __( 'Run your first scan to see progress here.', 'trailproof' ) }
				</p>
			) }
		</div>
	);
}

function BucketCard( { bucket, count, label, description, color, bg, navigate } ) {
	return (
		<div
			style={ {
				background:  '#fff',
				border:      `1px solid ${ color }30`,
				borderLeft:  `4px solid ${ color }`,
				borderRadius: 4,
				padding:     '14px 16px',
				minWidth:    180,
				flex:        1,
				cursor:      count > 0 ? 'pointer' : 'default',
			} }
			onClick={ count > 0 ? () => navigate( 'worklist' ) : undefined }
			title={ count > 0 ? __( 'Go to worklist', 'trailproof' ) : undefined }
		>
			<div style={ { fontSize: 28, fontWeight: 700, color, lineHeight: 1 } }>{ count }</div>
			<div style={ { fontSize: 13, fontWeight: 600, color: '#1d2327', marginTop: 4 } }>{ label }</div>
			<div style={ { fontSize: 11, color: '#646970', marginTop: 3, lineHeight: 1.4 } }>{ description }</div>
		</div>
	);
}

function SeverityDot( { severity } ) {
	const colors = { critical: '#cc1818', serious: '#d63638', moderate: '#dba617', minor: '#8c959f' };
	return (
		<span style={ {
			display:      'inline-block',
			width:        8,
			height:       8,
			borderRadius: '50%',
			background:   colors[ severity ] ?? '#8c959f',
			marginRight:  5,
			verticalAlign: 'middle',
			flexShrink:   0,
		} } />
	);
}

const SEVERITY_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 };

function TopIssueRow( { group, navigate } ) {
	const status    = groupStatus( group );
	const isOpen    = group.open_count > 0;
	const instances = group.instance_count === 1 ? '1 instance' : `${ group.instance_count } instances`;

	return (
		<tr
			style={ { cursor: 'pointer' } }
			onClick={ () => navigate( 'worklist' ) }
			title={ __( 'Go to worklist to address this', 'trailproof' ) }
		>
			<td style={ { paddingLeft: 12 } }>
				<SeverityDot severity={ group.max_severity } />
			</td>
			<td style={ { fontSize: 13 } }>
				{ group.description || group.rule_id }
			</td>
			<td>
				<span style={ { fontSize: 11, color: '#646970', whiteSpace: 'nowrap' } }>
					{ instances }
				</span>
			</td>
			<td>
				<StatusBadge status={ status } bucket={ group.bucket } size="sm" />
			</td>
		</tr>
	);
}

function ActivityRow( { entry } ) {
	const ACTION_LABELS = {
		decision_apply:      'Fix applied',
		decision_na:         'Marked not applicable',
		decision_defer:      'Deferred',
		correction_reverted: 'Fix reverted',
		correction_enabled:  'Fix re-enabled',
		checklist_pass:      'Checklist: passed',
		checklist_fail:      'Checklist: failed',
		checklist_na:        'Checklist: N/A',
	};

	const label = ACTION_LABELS[ entry.action ] ?? entry.action;
	const desc  = entry.description ?? entry.rule_id ?? entry.fingerprint?.slice( 0, 12 ) + '…';
	const time  = entry.ts ? new Date( entry.ts ).toLocaleString() : '';

	return (
		<div style={ { display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: 12, alignItems: 'flex-start' } }>
			<span style={ { color: '#646970', whiteSpace: 'nowrap', marginTop: 1 } }>{ time }</span>
			<span style={ { flex: 1, color: '#1d2327' } }>
				<strong>{ label }</strong>{ ' ' }
				<span style={ { color: '#50575e' } }>{ desc }</span>
				{ entry.note && <em style={ { color: '#8c959f', marginLeft: 4 } }>"{ entry.note }"</em> }
			</span>
		</div>
	);
}

// ---- Main component ----

export default function Dashboard( { navigate } ) {
	const [ data, setData ]       = useState( null );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ]     = useState( null );

	useEffect( () => {
		apiFetch( { path: '/trailproof/v1/dashboard' } )
			.then( setData )
			.catch( ( err ) => setError( err.message ?? __( 'Failed to load dashboard.', 'trailproof' ) ) )
			.finally( () => setLoading( false ) );
	}, [] );

	if ( loading ) return <p style={ { color: '#646970' } }>{ __( 'Loading…', 'trailproof' ) }</p>;
	if ( error )   return <p style={ { color: '#cc1818' } }>{ error }</p>;

	const {
		unique_open, unique_by_bucket, unique_total, unique_addressed, progress_pct,
		top_grouped, last_scan_at, recent_activity,
	} = data;

	const hasScans = !! last_scan_at;

	return (
		<div style={ { maxWidth: 900 } }>
			<h1 style={ { marginTop: 0, fontSize: 22, fontWeight: 700 } }>
				{ __( 'Accessibility overview', 'trailproof' ) }
			</h1>

			{ /* First-run empty state */ }
			{ ! hasScans && (
				<div style={ {
					background:   '#f6f8fa',
					border:       '1px dashed #c3c4c7',
					borderRadius: 6,
					padding:      '2rem',
					textAlign:    'center',
					marginBottom: '2rem',
				} }>
					<div style={ { fontSize: 32, marginBottom: 8 } }>🔍</div>
					<h2 style={ { margin: '0 0 8px', fontSize: 16 } }>
						{ __( 'Run your first scan to get started', 'trailproof' ) }
					</h2>
					<p style={ { color: '#50575e', fontSize: 13, marginBottom: 16 } }>
						{ __( 'Trailproof will check your pages for accessibility issues and tell you exactly what to do about each one.', 'trailproof' ) }
					</p>
					<button className="button button-primary button-large" onClick={ () => navigate( 'scan' ) }>
						{ __( 'Scan my site', 'trailproof' ) }
					</button>
				</div>
			) }

			{ hasScans && (
				<>
					{ /* Progress bar */ }
					<ProgressBar
						pct={ progress_pct }
						addressed={ unique_addressed }
						total={ unique_total }
					/>

					{ /* Bucket cards */ }
					<div style={ { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 } }>
						<BucketCard
							bucket="A"
							count={ unique_by_bucket?.A ?? 0 }
							label={ __( 'Safe to fix now', 'trailproof' ) }
							description={ __( 'Auto-fixable — one click, always revertable', 'trailproof' ) }
							color="#065f46"
							navigate={ navigate }
						/>
						<BucketCard
							bucket="B"
							count={ unique_by_bucket?.B ?? 0 }
							label={ __( 'Need your decision', 'trailproof' ) }
							description={ __( 'Detected, but the right fix is a judgment call', 'trailproof' ) }
							color="#7d4e00"
							navigate={ navigate }
						/>
						<BucketCard
							bucket="C"
							count={ unique_by_bucket?.C ?? 0 }
							label={ __( 'Need a human check', 'trailproof' ) }
							description={ __( 'Can\'t be detected automatically — needs manual review', 'trailproof' ) }
							color="#3730a3"
							navigate={ navigate }
						/>
					</div>

					{ last_scan_at && (
						<p style={ { color: '#646970', fontSize: 12, marginTop: -16, marginBottom: 24 } }>
							{ __( 'Last scan:', 'trailproof' ) }{ ' ' }
							{ new Date( last_scan_at ).toLocaleString() }
							{ ' · ' }
							<button
								className="button-link"
								style={ { fontSize: 12, color: '#2271b1' } }
								onClick={ () => navigate( 'scan' ) }
							>
								{ __( 'Scan again', 'trailproof' ) }
							</button>
						</p>
					) }

					<div style={ { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 } }>
						{ /* Top open issues */ }
						<div>
							<h2 style={ { fontSize: 14, fontWeight: 700, marginBottom: 8, marginTop: 0 } }>
								{ __( 'Top issues to address', 'trailproof' ) }
							</h2>
							{ top_grouped && top_grouped.length > 0 ? (
								<>
									<table className="wp-list-table widefat" style={ { fontSize: 12 } }>
										<thead>
											<tr>
												<th style={ { width: 16 } }></th>
												<th>{ __( 'Problem', 'trailproof' ) }</th>
												<th style={ { width: 80 } }>{ __( 'Scope', 'trailproof' ) }</th>
												<th style={ { width: 110 } }>{ __( 'Status', 'trailproof' ) }</th>
											</tr>
										</thead>
										<tbody>
											{ top_grouped.map( ( group ) => (
												<TopIssueRow key={ group.rule_id } group={ group } navigate={ navigate } />
											) ) }
										</tbody>
									</table>
									{ unique_open > 5 && (
										<p style={ { fontSize: 12, marginTop: 8 } }>
											<button
												className="button-link"
												style={ { color: '#2271b1', fontSize: 12 } }
												onClick={ () => navigate( 'worklist' ) }
											>
												{ `+ ${ unique_open - 5 } more → View full worklist` }
											</button>
										</p>
									) }
								</>
							) : (
								<p style={ { color: '#1a7f37', fontWeight: 600, fontSize: 13 } }>
									{ __( '✓ No open issues. Run a scan to check for regressions.', 'trailproof' ) }
								</p>
							) }
						</div>

						{ /* Recent activity */ }
						<div>
							<h2 style={ { fontSize: 14, fontWeight: 700, marginBottom: 8, marginTop: 0 } }>
								{ __( 'Recent activity', 'trailproof' ) }
							</h2>
							{ recent_activity && recent_activity.length > 0 ? (
								<div>
									{ recent_activity.map( ( entry, i ) => (
										<ActivityRow key={ entry.id ?? i } entry={ entry } />
									) ) }
								</div>
							) : (
								<p style={ { color: '#646970', fontSize: 12 } }>
									{ __( 'No activity yet. Apply a fix or make a decision to see it here.', 'trailproof' ) }
								</p>
							) }
						</div>
					</div>

					{ /* Bucket legend */ }
					<div style={ {
						marginTop:    32,
						padding:      '12px 16px',
						background:   '#f6f8fa',
						borderRadius: 4,
						border:       '1px solid #e0e0e0',
						fontSize:     12,
						color:        '#57606a',
					} }>
						<strong style={ { color: '#1d2327' } }>{ __( 'How fixes are categorized:', 'trailproof' ) }</strong>{ ' ' }
						<strong style={ { color: '#065f46' } }>{ __( 'Safe to fix now', 'trailproof' ) }</strong>
						{ __( ' — issues with a safe, automatic fix we can apply for you. ', 'trailproof' ) }
						<strong style={ { color: '#7d4e00' } }>{ __( 'Need your decision', 'trailproof' ) }</strong>
						{ __( ' — issues where the right fix depends on context only you know. ', 'trailproof' ) }
						<strong style={ { color: '#3730a3' } }>{ __( 'Need a human check', 'trailproof' ) }</strong>
						{ __( ' — issues that automated tools can\'t verify at all.', 'trailproof' ) }
					</div>
				</>
			) }
		</div>
	);
}
