import { __ } from '@wordpress/i18n';

function daysSince( isoString ) {
	if ( ! isoString ) return null;
	const diff = Date.now() - new Date( isoString ).getTime();
	return Math.floor( diff / ( 1000 * 60 * 60 * 24 ) );
}

function ActionCard( { icon, headline, body, cta, onClick, color = '#2271b1', success = false } ) {
	return (
		<div style={ {
			display:      'flex',
			alignItems:   'flex-start',
			gap:          14,
			background:   success ? '#f0fdf4' : '#f6f8fa',
			border:       `1px solid ${ success ? '#bbf7d0' : '#e0e0e0' }`,
			borderLeft:   `4px solid ${ color }`,
			borderRadius: 6,
			padding:      '14px 16px',
			marginBottom: 20,
		} }>
			<span style={ { fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 2 } } aria-hidden="true">
				{ icon }
			</span>
			<div style={ { flex: 1 } }>
				<p style={ { margin: '0 0 4px', fontWeight: 600, fontSize: 14, color: '#1d2327' } }>
					{ headline }
				</p>
				{ body && (
					<p style={ { margin: '0 0 10px', fontSize: 13, color: '#50575e', lineHeight: 1.5 } }>
						{ body }
					</p>
				) }
				{ cta && onClick && (
					<button
						className="button button-primary button-small"
						onClick={ onClick }
						style={ { fontSize: 12 } }
					>
						{ cta }
					</button>
				) }
			</div>
		</div>
	);
}

export default function NextAction( { status, navigate } ) {
	if ( ! status ) return null;

	const {
		last_scan_at,
		unique_by_bucket,
		health_score,
		has_statement,
		has_bundle,
	} = status;

	const openA       = unique_by_bucket?.A ?? 0;
	const openB       = unique_by_bucket?.B ?? 0;
	const scoreC      = health_score?.components?.c?.score ?? 0;
	const totalC      = health_score?.components?.c?.total ?? 0;
	const pendingC    = totalC - Math.round( ( scoreC / 100 ) * totalC );
	const daysSinceScan = daysSince( last_scan_at );

	// Priority: no scan → A open → B open → C pending → no statement → no bundle → stale scan → all clear
	if ( ! last_scan_at ) {
		return (
			<ActionCard
				icon="🔍"
				headline={ __( 'Start by scanning your site', 'trailproof' ) }
				body={ __( 'Trailproof checks your pages for accessibility issues and tells you exactly what to do about each one. Run your first scan to see your score.', 'trailproof' ) }
				cta={ __( 'Run first scan', 'trailproof' ) }
				onClick={ () => navigate( 'scan' ) }
				color="#2271b1"
			/>
		);
	}

	if ( openA > 0 ) {
		return (
			<ActionCard
				icon="⚡"
				headline={ `${ openA } ${ openA === 1
					? __( 'accessibility issue can be fixed automatically', 'trailproof' )
					: __( 'accessibility issues can be fixed automatically', 'trailproof' ) }` }
				body={ __( 'These changes are safe and reversible — they can be undone with a single click at any time.', 'trailproof' ) }
				cta={ __( 'Apply fixes →', 'trailproof' ) }
				onClick={ () => navigate( 'worklist' ) }
				color="#065f46"
			/>
		);
	}

	if ( openB > 0 ) {
		return (
			<ActionCard
				icon="⚖️"
				headline={ `${ openB } ${ openB === 1
					? __( 'issue needs your decision', 'trailproof' )
					: __( 'issues need your decision', 'trailproof' ) }` }
				body={ __( 'These were detected automatically but the right fix depends on context only you know. Review each one and choose how to handle it.', 'trailproof' ) }
				cta={ __( 'Go to Decisions', 'trailproof' ) }
				onClick={ () => navigate( 'decisions' ) }
				color="#7d4e00"
			/>
		);
	}

	if ( pendingC > 0 ) {
		return (
			<ActionCard
				icon="📋"
				headline={ `${ pendingC } ${ pendingC === 1
					? __( 'manual check still pending', 'trailproof' )
					: __( 'manual checks still pending', 'trailproof' ) }` }
				body={ __( "These items can't be verified automatically — a human needs to review each one and record their finding.", 'trailproof' ) }
				cta={ __( 'Go to Checklist', 'trailproof' ) }
				onClick={ () => navigate( 'checklist' ) }
				color="#3730a3"
			/>
		);
	}

	if ( ! has_statement ) {
		return (
			<ActionCard
				icon="📄"
				headline={ __( 'Generate your accessibility statement', 'trailproof' ) }
				body={ __( 'Your issues are addressed. Generate a statement that documents your remediation effort — required for most compliance frameworks.', 'trailproof' ) }
				cta={ __( 'Go to Statement', 'trailproof' ) }
				onClick={ () => navigate( 'statement' ) }
				color="#2271b1"
			/>
		);
	}

	if ( ! has_bundle ) {
		return (
			<ActionCard
				icon="📦"
				headline={ __( 'Export your evidence bundle', 'trailproof' ) }
				body={ __( 'Create a dated ZIP with your statement, issues CSV, decisions log, and scan history — your audit trail if you ever need to demonstrate remediation effort.', 'trailproof' ) }
				cta={ __( 'Go to Reports', 'trailproof' ) }
				onClick={ () => navigate( 'reports' ) }
				color="#2271b1"
			/>
		);
	}

	if ( daysSinceScan !== null && daysSinceScan > 30 ) {
		return (
			<ActionCard
				icon="🕐"
				headline={ `${ __( 'Last scanned', 'trailproof' ) } ${ daysSinceScan } ${ __( 'days ago', 'trailproof' ) }` }
				body={ __( 'Regular scans catch regressions early. Run a fresh scan to keep your score current.', 'trailproof' ) }
				cta={ __( 'Scan now', 'trailproof' ) }
				onClick={ () => navigate( 'scan' ) }
				color="#dba617"
			/>
		);
	}

	// All clear
	return (
		<ActionCard
			icon="✅"
			headline={ __( 'All detected issues have been addressed', 'trailproof' ) }
			body={ __( 'Great work. Run a scan periodically to catch regressions as your content changes.', 'trailproof' ) }
			cta={ __( 'Scan again', 'trailproof' ) }
			onClick={ () => navigate( 'scan' ) }
			color="#1a7f37"
			success={ true }
		/>
	);
}
