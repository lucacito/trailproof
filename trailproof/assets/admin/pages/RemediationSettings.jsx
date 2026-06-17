import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';

const SITEWIDE_ENHANCEMENTS = [
	{
		key:       'focus_style_enabled',
		colorKey:  'focus_style_color',
		icon:      '⌨️',
		title:     __( 'Focus Indicators', 'trailproof' ),
		wcag:      'WCAG 2.4.11',
		desc:      __( 'Adds a visible :focus-visible outline to all interactive elements. Keyboard-only users cannot navigate without knowing where focus is.', 'trailproof' ),
		hasColor:  true,
	},
	{
		key:  'touch_target_enabled',
		icon: '👆',
		title: __( 'Touch Target Size', 'trailproof' ),
		wcag:  'WCAG 2.5.8',
		desc:  __( 'Enforces a 44 × 44 px minimum on buttons and links. Small targets are difficult or impossible to activate for users with motor impairments.', 'trailproof' ),
	},
	{
		key:  'reduced_motion_enabled',
		icon: '🎞️',
		title: __( 'Respect Reduced Motion', 'trailproof' ),
		wcag:  'WCAG 2.3.3',
		desc:  __( 'Disables CSS animations and transitions for users who have enabled "Reduce Motion" in their OS accessibility settings.', 'trailproof' ),
	},
];

const card = {
	background:   '#fff',
	borderRadius: 8,
	boxShadow:    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
	border:       '1px solid #E8ECF2',
};

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill( { active } ) {
	return (
		<span style={ {
			display:      'inline-flex',
			alignItems:   'center',
			gap:          6,
			background:   active ? '#F0FDF4' : '#FEF2F2',
			color:        active ? '#15803D' : '#B91C1C',
			border:       `1px solid ${ active ? '#BBF7D0' : '#FECACA' }`,
			borderRadius: 99,
			padding:      '4px 12px',
			fontSize:     12,
			fontWeight:   700,
		} }>
			<span style={ {
				width:        8,
				height:       8,
				borderRadius: '50%',
				background:   active ? '#22C55E' : '#EF4444',
				display:      'inline-block',
				flexShrink:   0,
				boxShadow:    active ? '0 0 0 2px rgba(34,197,94,0.3)' : 'none',
			} } aria-hidden="true" />
			{ active ? __( 'Active', 'trailproof' ) : __( 'Disabled', 'trailproof' ) }
		</span>
	);
}

// ─── Safety notice ────────────────────────────────────────────────────────────

function SafetyNotice() {
	return (
		<div style={ {
			background:   '#EFF6FF',
			border:       '1px solid #BFDBFE',
			borderRadius: 6,
			padding:      '12px 16px',
			fontSize:     12,
			color:        '#1E40AF',
			lineHeight:   1.6,
		} }>
			<strong>{ __( 'Safe testing mode', 'trailproof' ) }</strong>
			<ul style={ { margin: '6px 0 0', paddingLeft: 18 } }>
				<li>{ __( 'Disabling TrailProof does not remove your settings or data.', 'trailproof' ) }</li>
				<li>{ __( 'All saved corrections and decisions are preserved.', 'trailproof' ) }</li>
				<li>{ __( 'You can enable improvements again at any time.', 'trailproof' ) }</li>
			</ul>
		</div>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RemediationSettings() {
	const [ enabled, setEnabled ]   = useState( !! window.trailproofData?.fixesEnabled );
	const [ loading, setLoading ]   = useState( true );
	const [ saving,  setSaving ]    = useState( false );
	const [ error,   setError ]     = useState( null );
	const [ saved,   setSaved ]     = useState( false );
	const [ resetting, setResetting ]   = useState( false );
	const [ resetDone, setResetDone ]   = useState( false );
	const [ resetError, setResetError ] = useState( null );
	const [ confirmReset, setConfirmReset ] = useState( false );

	const [ enhancements, setEnhancements ] = useState( {
		focus_style_enabled:    false,
		focus_style_color:      '#0066CC',
		touch_target_enabled:   false,
		reduced_motion_enabled: false,
	} );
	const [ enhSaving, setEnhSaving ] = useState( {} );

	useEffect( () => {
		apiFetch( { path: '/trailproof/v1/settings' } )
			.then( data => {
				setEnabled( !! data.fixes_enabled );
				setEnhancements( {
					focus_style_enabled:    !! data.focus_style_enabled,
					focus_style_color:      data.focus_style_color ?? '#0066CC',
					touch_target_enabled:   !! data.touch_target_enabled,
					reduced_motion_enabled: !! data.reduced_motion_enabled,
				} );
			} )
			.catch( () => {} )
			.finally( () => setLoading( false ) );
	}, [] );

	const resetData = useCallback( () => {
		setResetting( true );
		setResetError( null );
		setResetDone( false );

		apiFetch( {
			path:   '/trailproof/v1/reset-data',
			method: 'POST',
		} )
			.then( () => {
				setResetDone( true );
				setConfirmReset( false );
			} )
			.catch( err => {
				setResetError( err.message ?? __( 'Reset failed.', 'trailproof' ) );
			} )
			.finally( () => setResetting( false ) );
	}, [] );

	const saveEnhancement = useCallback( ( patch ) => {
		const key = Object.keys( patch )[ 0 ];
		setEnhSaving( s => ( { ...s, [ key ]: true } ) );
		apiFetch( { path: '/trailproof/v1/settings', method: 'PUT', data: patch } )
			.then( data => {
				setEnhancements( prev => ( {
					...prev,
					focus_style_enabled:    !! data.focus_style_enabled,
					focus_style_color:      data.focus_style_color ?? '#0066CC',
					touch_target_enabled:   !! data.touch_target_enabled,
					reduced_motion_enabled: !! data.reduced_motion_enabled,
				} ) );
			} )
			.catch( () => {} )
			.finally( () => setEnhSaving( s => ( { ...s, [ key ]: false } ) ) );
	}, [] );

	const toggle = useCallback( () => {
		const next = ! enabled;
		setSaving( true );
		setError( null );
		setSaved( false );

		apiFetch( {
			path:   '/trailproof/v1/settings',
			method: 'PUT',
			data:   { fixes_enabled: next },
		} )
			.then( data => {
				setEnabled( !! data.fixes_enabled );
				setSaved( true );
				setTimeout( () => setSaved( false ), 3000 );
			} )
			.catch( err => {
				setError( err.message ?? __( 'Failed to save.', 'trailproof' ) );
			} )
			.finally( () => setSaving( false ) );
	}, [ enabled ] );

	return (
		<div style={ { maxWidth: 680 } }>

			{/* Page heading */}
			<div style={ { marginBottom: 24 } }>
				<div style={ { fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 } }>
					{ __( 'Settings', 'trailproof' ) }
				</div>
				<h2 style={ { margin: 0, fontSize: 20, fontWeight: 700, color: '#1A2742' } }>
					{ __( 'Remediation Control', 'trailproof' ) }
				</h2>
				<p style={ { fontSize: 13, color: '#64748B', margin: '6px 0 0', lineHeight: 1.6 } }>
					{ __( 'Instantly compare your website with and without TrailProof improvements — useful for QA, client demos, or external audits.', 'trailproof' ) }
				</p>
			</div>

			{/* Main toggle card */}
			<div style={ { ...card, padding: '24px 28px', marginBottom: 20 } }>
				<div style={ { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 } }>
					<div style={ { flex: 1 } }>
						<div style={ { fontSize: 15, fontWeight: 700, color: '#1A2742', marginBottom: 6 } }>
							{ __( 'TrailProof Accessibility Improvements', 'trailproof' ) }
						</div>

						{ loading ? (
							<p style={ { color: '#94A3B8', fontSize: 13, margin: 0 } }>{ __( 'Loading…', 'trailproof' ) }</p>
						) : (
							<>
								<div style={ { marginBottom: 16 } }>
									<StatusPill active={ enabled } />
								</div>

								<p style={ { fontSize: 13, color: '#475569', margin: '0 0 20px', lineHeight: 1.6 } }>
									{ enabled
										? __( 'TrailProof accessibility improvements are currently active. All approved corrections are being applied to your website in real time.', 'trailproof' )
										: __( 'TrailProof fixes are temporarily disabled. Your original website behavior is restored. No corrections are being injected.', 'trailproof' )
									}
								</p>

								{ error && (
									<div style={ { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#B91C1C', marginBottom: 16 } }>
										{ error }
									</div>
								) }

								{ saved && (
									<div style={ { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#15803D', marginBottom: 16 } }>
										{ __( 'Setting saved.', 'trailproof' ) }
									</div>
								) }

								<button
									className={ `button ${ enabled ? 'button-secondary' : 'button-primary' }` }
									onClick={ toggle }
									disabled={ saving }
									style={ { fontSize: 13 } }
								>
									{ saving
										? __( 'Saving…', 'trailproof' )
										: enabled
											? __( 'Disable all TrailProof fixes', 'trailproof' )
											: __( 'Enable TrailProof improvements', 'trailproof' )
									}
								</button>
							</>
						) }
					</div>

					{/* Visual status indicator */}
					<div style={ {
						width:        80,
						height:       80,
						borderRadius: 12,
						flexShrink:   0,
						background:   enabled ? '#F0FDF4' : '#F8FAFC',
						border:       `2px solid ${ enabled ? '#86EFAC' : '#E2E8F0' }`,
						display:      'flex',
						alignItems:   'center',
						justifyContent: 'center',
						fontSize:     32,
					} } aria-hidden="true">
						{ enabled ? '🛡️' : '⏸' }
					</div>
				</div>
			</div>

			<SafetyNotice />

			{/* Sitewide Enhancements */}
			<div style={ { ...card, padding: '20px 24px', marginTop: 20 } }>
				<div style={ { fontSize: 12, fontWeight: 700, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }>
					{ __( 'Sitewide Accessibility Enhancements', 'trailproof' ) }
				</div>
				<p style={ { fontSize: 12, color: '#64748B', margin: '0 0 16px', lineHeight: 1.5 } }>
					{ __( 'CSS-only improvements injected into every page. Each is independently toggleable and fully reversible.', 'trailproof' ) }
				</p>
				<div style={ { display: 'flex', flexDirection: 'column', gap: 12 } }>
					{ SITEWIDE_ENHANCEMENTS.map( enh => {
						const isOn = enhancements[ enh.key ];
						const isBusy = enhSaving[ enh.key ] || enhSaving[ enh.colorKey ];
						return (
							<div key={ enh.key } style={ {
								display:      'flex',
								alignItems:   'flex-start',
								gap:          14,
								padding:      '14px 16px',
								borderRadius: 6,
								background:   isOn ? '#F0FDF4' : '#F8FAFC',
								border:       `1px solid ${ isOn ? '#BBF7D0' : '#E2E8F0' }`,
								transition:   'background 0.15s, border-color 0.15s',
							} }>
								<span style={ { fontSize: 20, lineHeight: 1, marginTop: 1, flexShrink: 0 } } aria-hidden="true">{ enh.icon }</span>
								<div style={ { flex: 1, minWidth: 0 } }>
									<div style={ { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 } }>
										<span style={ { fontSize: 13, fontWeight: 700, color: '#1A2742' } }>{ enh.title }</span>
										<span style={ {
											fontSize: 10, fontWeight: 700, color: '#2563EB',
											background: '#EFF6FF', border: '1px solid #BFDBFE',
											borderRadius: 99, padding: '1px 7px',
										} }>{ enh.wcag }</span>
									</div>
									<p style={ { fontSize: 12, color: '#475569', margin: '0 0 10px', lineHeight: 1.5 } }>{ enh.desc }</p>
									<div style={ { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } }>
										<button
											className={ `button ${ isOn ? 'button-secondary' : 'button-primary' }` }
											style={ { fontSize: 12 } }
											disabled={ isBusy }
											onClick={ () => saveEnhancement( { [ enh.key ]: ! isOn } ) }
										>
											{ isBusy
												? __( 'Saving…', 'trailproof' )
												: isOn
													? __( 'Disable', 'trailproof' )
													: __( 'Enable', 'trailproof' )
											}
										</button>
										{ enh.hasColor && isOn && (
											<label style={ { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' } }>
												{ __( 'Outline color', 'trailproof' ) }
												<input
													type="color"
													value={ enhancements[ enh.colorKey ] ?? '#0066CC' }
													disabled={ isBusy }
													onChange={ e => setEnhancements( prev => ( { ...prev, [ enh.colorKey ]: e.target.value } ) ) }
													onBlur={ e => saveEnhancement( { [ enh.colorKey ]: e.target.value } ) }
													style={ { width: 32, height: 28, padding: 0, border: '1px solid #CBD5E1', borderRadius: 4, cursor: 'pointer' } }
												/>
											</label>
										) }
									</div>
								</div>
							</div>
						);
					} ) }
				</div>
			</div>

			{/* Danger Zone */}
			<div style={ { ...card, padding: '20px 24px', marginTop: 20, borderColor: '#FECACA' } }>
				<div style={ { fontSize: 12, fontWeight: 700, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 } }>
					{ __( 'Danger Zone', 'trailproof' ) }
				</div>
				<div style={ { fontSize: 14, fontWeight: 600, color: '#1A2742', marginBottom: 6 } }>
					{ __( 'Reset all plugin data', 'trailproof' ) }
				</div>
				<p style={ { fontSize: 13, color: '#64748B', margin: '0 0 14px', lineHeight: 1.6 } }>
					{ __( 'Permanently deletes all scans, issues, and corrections. Your settings and decision log are preserved. Use this when reimporting pages to start fresh.', 'trailproof' ) }
				</p>

				{ resetDone && (
					<div style={ { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#15803D', marginBottom: 14 } }>
						{ __( 'All scan data, issues, and corrections have been deleted.', 'trailproof' ) }
					</div>
				) }

				{ resetError && (
					<div style={ { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#B91C1C', marginBottom: 14 } }>
						{ resetError }
					</div>
				) }

				{ ! confirmReset ? (
					<button
						className="button button-secondary"
						onClick={ () => setConfirmReset( true ) }
						style={ { fontSize: 13, color: '#B91C1C', borderColor: '#FECACA' } }
					>
						{ __( 'Reset plugin data…', 'trailproof' ) }
					</button>
				) : (
					<div style={ { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } }>
						<span style={ { fontSize: 13, color: '#B91C1C', fontWeight: 600 } }>
							{ __( 'This cannot be undone. Are you sure?', 'trailproof' ) }
						</span>
						<button
							className="button"
							onClick={ resetData }
							disabled={ resetting }
							style={ { fontSize: 13, background: '#B91C1C', color: '#fff', border: 'none' } }
						>
							{ resetting ? __( 'Resetting…', 'trailproof' ) : __( 'Yes, delete everything', 'trailproof' ) }
						</button>
						<button
							className="button button-secondary"
							onClick={ () => setConfirmReset( false ) }
							disabled={ resetting }
							style={ { fontSize: 13 } }
						>
							{ __( 'Cancel', 'trailproof' ) }
						</button>
					</div>
				) }
			</div>

			{/* What gets toggled */}
			<div style={ { ...card, padding: '20px 24px', marginTop: 20 } }>
				<div style={ { fontSize: 12, fontWeight: 700, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 } }>
					{ __( 'What this toggle controls', 'trailproof' ) }
				</div>
				<div style={ { display: 'flex', flexDirection: 'column', gap: 8 } }>
					{ [
						{ icon: '🏷️', text: __( 'Injected accessibility attributes (aria-label, role, alt text)', 'trailproof' ) },
						{ icon: '🔗', text: __( 'Rewritten link text and button labels', 'trailproof' ) },
						{ icon: '🏗️', text: __( 'Added landmarks and skip navigation links', 'trailproof' ) },
						{ icon: '📋', text: __( 'Form label and autocomplete associations', 'trailproof' ) },
						{ icon: '🌐', text: __( 'Language attribute corrections', 'trailproof' ) },
						{ icon: '⌨️', text: __( 'Sitewide focus indicators, touch targets, and motion preferences (when enabled above)', 'trailproof' ) },
					].map( ( item, i ) => (
						<div key={ i } style={ { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#475569' } }>
							<span style={ { fontSize: 16, flexShrink: 0 } } aria-hidden="true">{ item.icon }</span>
							{ item.text }
						</div>
					) ) }
				</div>
				<div style={ { marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F5F9', fontSize: 12, color: '#94A3B8' } }>
					{ __( 'None of these changes affect your saved content. They are applied at render time and are fully reversible.', 'trailproof' ) }
				</div>
			</div>

		</div>
	);
}
