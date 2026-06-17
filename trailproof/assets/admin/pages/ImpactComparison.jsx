import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';

const card = {
	background:   '#fff',
	borderRadius: 8,
	boxShadow:    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
	border:       '1px solid #E8ECF2',
};

// ─── Number input ─────────────────────────────────────────────────────────────

function NumberField( { label, value, onChange, hint } ) {
	return (
		<div style={ { display: 'flex', flexDirection: 'column', gap: 4 } }>
			<label style={ { fontSize: 12, fontWeight: 600, color: '#374151' } }>{ label }</label>
			<input
				type="number"
				min="0"
				value={ value }
				onChange={ e => onChange( Math.max( 0, parseInt( e.target.value ) || 0 ) ) }
				style={ {
					width:        '100%',
					padding:      '8px 10px',
					fontSize:     14,
					fontWeight:   700,
					border:       '1px solid #D1D5DB',
					borderRadius: 6,
					color:        '#1A2742',
					background:   '#fff',
					boxSizing:    'border-box',
				} }
			/>
			{ hint && <span style={ { fontSize: 11, color: '#94A3B8' } }>{ hint }</span> }
		</div>
	);
}

// ─── Snapshot form ────────────────────────────────────────────────────────────

const TOOLS = [
	{ value: '', label: __( 'Select tool…', 'trailproof' ) },
	{ value: 'wave', label: 'WebAIM WAVE' },
	{ value: 'axe', label: 'axe DevTools' },
	{ value: 'lighthouse', label: 'Google Lighthouse' },
	{ value: 'other', label: __( 'Other WCAG tool', 'trailproof' ) },
];

function SnapshotForm( { title, onSave, saving } ) {
	const [ form, setForm ] = useState( { errors: '', warnings: '', contrast: '', navigation: '', images: '', tool: '' } );

	const set = ( key, val ) => setForm( f => ( { ...f, [ key ]: val } ) );

	return (
		<div>
			<div style={ { fontSize: 13, fontWeight: 600, color: '#1A2742', marginBottom: 16 } }>{ title }</div>

			<div style={ { marginBottom: 16 } }>
				<label style={ { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 } }>
					{ __( 'Accessibility tool used', 'trailproof' ) }
				</label>
				<select
					value={ form.tool }
					onChange={ e => set( 'tool', e.target.value ) }
					style={ { width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 6, background: '#fff', color: '#1A2742', boxSizing: 'border-box' } }
				>
					{ TOOLS.map( t => <option key={ t.value } value={ t.value }>{ t.label }</option> ) }
				</select>
			</div>

			<div style={ { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 } }>
				<NumberField label={ __( 'Total errors', 'trailproof' ) } value={ form.errors }
					onChange={ v => set( 'errors', v ) } hint={ __( 'From the scan report', 'trailproof' ) } />
				<NumberField label={ __( 'Warnings', 'trailproof' ) } value={ form.warnings }
					onChange={ v => set( 'warnings', v ) } />
				<NumberField label={ __( 'Contrast issues', 'trailproof' ) } value={ form.contrast }
					onChange={ v => set( 'contrast', v ) } />
				<NumberField label={ __( 'Navigation issues', 'trailproof' ) } value={ form.navigation }
					onChange={ v => set( 'navigation', v ) } />
				<NumberField label={ __( 'Image issues', 'trailproof' ) } value={ form.images }
					onChange={ v => set( 'images', v ) } />
			</div>

			<button
				className="button button-primary"
				onClick={ () => onSave( form ) }
				disabled={ saving || form.errors === '' }
				style={ { fontSize: 13 } }
			>
				{ saving ? __( 'Saving…', 'trailproof' ) : __( 'Record scan results', 'trailproof' ) }
			</button>
		</div>
	);
}

// ─── Comparison result ────────────────────────────────────────────────────────

function ComparisonResult( { before, after, onReset } ) {
	const totalBefore = ( before.errors ?? 0 ) + ( before.contrast ?? 0 ) + ( before.navigation ?? 0 ) + ( before.images ?? 0 );
	const totalAfter  = ( after.errors  ?? 0 ) + ( after.contrast  ?? 0 ) + ( after.navigation  ?? 0 ) + ( after.images  ?? 0 );
	const reduced     = Math.max( 0, totalBefore - totalAfter );
	const pct         = totalBefore > 0 ? Math.round( ( reduced / totalBefore ) * 100 ) : 0;

	const categories = [
		{ key: 'errors',     label: __( 'Errors',     'trailproof' ) },
		{ key: 'contrast',   label: __( 'Contrast',   'trailproof' ) },
		{ key: 'navigation', label: __( 'Navigation', 'trailproof' ) },
		{ key: 'images',     label: __( 'Images',     'trailproof' ) },
	];

	return (
		<div>
			{/* Hero comparison */}
			<div style={ { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 20, alignItems: 'center', marginBottom: 24 } }>
				{/* Before */}
				<div style={ { background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '20px', textAlign: 'center' } }>
					<div style={ { fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 } }>
						{ __( 'Before TrailProof', 'trailproof' ) }
					</div>
					{ before.tool && (
						<div style={ { fontSize: 11, color: '#94A3B8', marginBottom: 8 } }>{ before.tool.toUpperCase() }</div>
					) }
					<div style={ { fontSize: 44, fontWeight: 800, color: '#DC2626', lineHeight: 1 } }>{ totalBefore }</div>
					<div style={ { fontSize: 12, color: '#64748B', marginTop: 4 } }>{ __( 'accessibility issues', 'trailproof' ) }</div>
				</div>

				{/* Arrow + improvement */}
				<div style={ { textAlign: 'center' } }>
					<div style={ { fontSize: 24, color: '#CBD5E1', marginBottom: 8 } } aria-hidden="true">→</div>
					{ pct > 0 && (
						<div style={ { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 99, padding: '6px 12px', fontSize: 13, fontWeight: 700, color: '#15803D', whiteSpace: 'nowrap' } }>
							{ pct }% { __( 'improvement', 'trailproof' ) }
						</div>
					) }
				</div>

				{/* After */}
				<div style={ { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '20px', textAlign: 'center' } }>
					<div style={ { fontSize: 10, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 } }>
						{ __( 'After TrailProof', 'trailproof' ) }
					</div>
					{ after.tool && (
						<div style={ { fontSize: 11, color: '#94A3B8', marginBottom: 8 } }>{ after.tool.toUpperCase() }</div>
					) }
					<div style={ { fontSize: 44, fontWeight: 800, color: '#15803D', lineHeight: 1 } }>{ totalAfter }</div>
					<div style={ { fontSize: 12, color: '#64748B', marginTop: 4 } }>{ __( 'accessibility issues', 'trailproof' ) }</div>
				</div>
			</div>

			{/* Issue reduction summary */}
			{ reduced > 0 && (
				<div style={ { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 } }>
					<span style={ { fontSize: 24 } } aria-hidden="true">🎉</span>
					<div>
						<div style={ { fontSize: 15, fontWeight: 700, color: '#15803D' } }>
							{ reduced } { __( 'issues reduced', 'trailproof' ) }
						</div>
						<div style={ { fontSize: 12, color: '#166534', marginTop: 2 } }>
							{ __( 'Remediation progress documented. This comparison can be included in your accessibility report.', 'trailproof' ) }
						</div>
					</div>
				</div>
			) }

			{/* Category breakdown */}
			<div style={ { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 } }>
				{ categories.map( ( { key, label } ) => {
					const b     = before[ key ] ?? 0;
					const a     = after[ key ]  ?? 0;
					const diff  = b - a;
					return (
						<div key={ key } style={ { ...card, padding: '14px 16px' } }>
							<div style={ { fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 } }>
								{ label }
							</div>
							<div style={ { display: 'flex', alignItems: 'center', gap: 8 } }>
								<span style={ { fontSize: 20, fontWeight: 800, color: '#94A3B8' } }>{ b }</span>
								<span style={ { color: '#CBD5E1' } } aria-hidden="true">→</span>
								<span style={ { fontSize: 20, fontWeight: 800, color: a < b ? '#15803D' : '#1A2742' } }>{ a }</span>
								{ diff > 0 && (
									<span style={ { fontSize: 11, background: '#F0FDF4', color: '#15803D', borderRadius: 99, padding: '2px 8px', fontWeight: 700, marginLeft: 4 } }>
										−{ diff }
									</span>
								) }
							</div>
						</div>
					);
				} ) }
			</div>

			{/* Disclaimer */}
			<div style={ { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '12px 16px', fontSize: 12, color: '#92400E', lineHeight: 1.6, marginBottom: 20 } }>
				<strong>{ __( 'Note:', 'trailproof' ) }</strong>{ ' ' }
				{ __( 'This comparison reflects remediation progress recorded from external scan results. TrailProof does not claim to make your site fully compliant. Accessibility is an ongoing process.', 'trailproof' ) }
			</div>

			<button className="button button-secondary" onClick={ onReset } style={ { fontSize: 12 } }>
				{ __( 'Start a new comparison', 'trailproof' ) }
			</button>
		</div>
	);
}

// ─── Workflow step card ───────────────────────────────────────────────────────

function StepCard( { number, title, active, done, children } ) {
	return (
		<div style={ {
			...card,
			padding:    '20px 24px',
			opacity:    ! active && ! done ? 0.5 : 1,
			borderLeft: `4px solid ${ done ? '#22C55E' : active ? '#2563EB' : '#E2E8F0' }`,
			transition: 'opacity 0.2s',
		} }>
			<div style={ { display: 'flex', alignItems: 'center', gap: 10, marginBottom: active ? 16 : 0 } }>
				<div style={ {
					width:          28,
					height:         28,
					borderRadius:   '50%',
					flexShrink:     0,
					background:     done ? '#22C55E' : active ? '#2563EB' : '#E2E8F0',
					color:          '#fff',
					fontSize:       13,
					fontWeight:     700,
					display:        'flex',
					alignItems:     'center',
					justifyContent: 'center',
				} } aria-hidden="true">
					{ done ? '✓' : number }
				</div>
				<div style={ { fontSize: 14, fontWeight: 700, color: '#1A2742' } }>{ title }</div>
			</div>
			{ active && children }
		</div>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ImpactComparison( { navigate } ) {
	const [ state,   setState ]   = useState( null );
	const [ loading, setLoading ] = useState( true );
	const [ saving,  setSaving ]  = useState( false );
	const [ error,   setError ]   = useState( null );

	const fetchState = useCallback( () => {
		apiFetch( { path: '/trailproof/v1/comparison' } )
			.then( setState )
			.catch( () => {} )
			.finally( () => setLoading( false ) );
	}, [] );

	useEffect( () => { fetchState(); }, [ fetchState ] );

	const savePhase = useCallback( ( phase, snapshot ) => {
		setSaving( true );
		setError( null );
		apiFetch( {
			path:   '/trailproof/v1/comparison',
			method: 'PUT',
			data:   { phase, snapshot },
		} )
			.then( setState )
			.catch( err => setError( err.message ?? __( 'Failed to save.', 'trailproof' ) ) )
			.finally( () => setSaving( false ) );
	}, [] );

	const reset = useCallback( () => {
		apiFetch( { path: '/trailproof/v1/comparison/reset', method: 'DELETE' } )
			.then( setState )
			.catch( () => {} );
	}, [] );

	if ( loading ) return (
		<div style={ { padding: '48px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 } }>
			{ __( 'Loading…', 'trailproof' ) }
		</div>
	);

	const step          = state?.step ?? 'start';
	const hasBefore     = !! state?.before;
	const hasAfter      = !! state?.after;
	const showResult    = step === 'after_recorded' && hasBefore && hasAfter;

	return (
		<div style={ { maxWidth: 720 } }>

			{/* Heading */}
			<div style={ { marginBottom: 24 } }>
				<div style={ { fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 } }>
					{ __( 'Analysis', 'trailproof' ) }
				</div>
				<h2 style={ { margin: 0, fontSize: 20, fontWeight: 700, color: '#1A2742' } }>
					{ __( 'Accessibility Impact Test', 'trailproof' ) }
				</h2>
				<p style={ { fontSize: 13, color: '#64748B', margin: '6px 0 0', lineHeight: 1.6 } }>
					{ __( 'Use an external accessibility scanner (WAVE, axe, Lighthouse) before and after enabling TrailProof to measure real improvement.', 'trailproof' ) }
				</p>
			</div>

			{ error && (
				<div style={ { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#B91C1C', marginBottom: 16 } }>
					{ error }
				</div>
			) }

			{ showResult ? (
				<div style={ { ...card, padding: '24px 28px' } }>
					<ComparisonResult before={ state.before } after={ state.after } onReset={ reset } />
				</div>
			) : (
				<div style={ { display: 'flex', flexDirection: 'column', gap: 16 } }>

					{/* Step 1 */}
					<StepCard
						number={ 1 }
						title={ __( 'Run a scan with TrailProof disabled', 'trailproof' ) }
						active={ ! hasBefore }
						done={ hasBefore }
					>
						<div style={ { marginBottom: 16 } }>
							<div style={ { background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#92400E', marginBottom: 12 } }>
								{ __( 'First, disable TrailProof to see your website\'s baseline accessibility.', 'trailproof' ) }{ ' ' }
								<button
									className="button-link"
									onClick={ () => navigate( 'remediationSettings' ) }
									style={ { color: '#92400E', fontWeight: 600, textDecoration: 'underline' } }
								>
									{ __( 'Go to Remediation Control →', 'trailproof' ) }
								</button>
							</div>
							<p style={ { fontSize: 13, color: '#475569', margin: '0 0 16px', lineHeight: 1.5 } }>
								{ __( 'Then run your external accessibility scan and enter the results below:', 'trailproof' ) }
							</p>
						</div>
						<SnapshotForm
							title={ __( 'Enter results from your "Before TrailProof" scan', 'trailproof' ) }
							onSave={ snap => savePhase( 'before', snap ) }
							saving={ saving }
						/>
					</StepCard>

					{/* Step 2 */}
					<StepCard
						number={ 2 }
						title={ __( 'Enable TrailProof', 'trailproof' ) }
						active={ hasBefore && ! hasAfter }
						done={ hasAfter }
					>
						<p style={ { fontSize: 13, color: '#475569', margin: '0 0 14px', lineHeight: 1.5 } }>
							{ __( 'Enable TrailProof so all approved corrections are active on your website.', 'trailproof' ) }
						</p>
						<button
							className="button button-primary"
							onClick={ () => navigate( 'remediationSettings' ) }
							style={ { fontSize: 13 } }
						>
							{ __( 'Go to Remediation Control →', 'trailproof' ) }
						</button>
					</StepCard>

					{/* Step 3 */}
					<StepCard
						number={ 3 }
						title={ __( 'Run the scan again and record results', 'trailproof' ) }
						active={ hasBefore && ! hasAfter }
						done={ hasAfter }
					>
						<p style={ { fontSize: 13, color: '#475569', margin: '0 0 16px', lineHeight: 1.5 } }>
							{ __( 'Run the same accessibility tool on the same pages and enter the new results:', 'trailproof' ) }
						</p>
						<SnapshotForm
							title={ __( 'Enter results from your "After TrailProof" scan', 'trailproof' ) }
							onSave={ snap => savePhase( 'after', snap ) }
							saving={ saving }
						/>
					</StepCard>

				</div>
			) }

		</div>
	);
}
