import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, TextControl, Notice, Spinner } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import { getGrade } from '../components/HealthGauge';

// ─── Design tokens ────────────────────────────────────────────────────────────

const card = {
	background:   '#fff',
	borderRadius: 8,
	boxShadow:    '0 1px 3px rgba(0,0,0,0.08)',
	border:       '1px solid #E8ECF2',
};

// ─── Portal preview card ──────────────────────────────────────────────────────

function PortalPreviewCard( { siteStatus } ) {
	const score   = siteStatus?.health_score?.score;
	const grade   = score != null ? getGrade( score ) : null;
	const openA   = siteStatus?.unique_by_bucket?.A ?? 0;
	const openB   = siteStatus?.unique_by_bucket?.B ?? 0;
	const openC   = siteStatus?.unique_by_bucket?.C ?? 0;
	const total   = siteStatus?.unique_total    ?? 0;
	const fixed   = siteStatus?.unique_addressed ?? 0;
	const scanDate = siteStatus?.last_scan_at
		? new Date( siteStatus.last_scan_at ).toLocaleDateString( undefined, { month: 'long', day: 'numeric', year: 'numeric' } )
		: null;

	if ( ! grade ) {
		return (
			<div style={ { ...card, padding: '20px 24px' } }>
				<div style={ { fontSize: 12, fontWeight: 600, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 } }>
					{ __( 'Client portal preview', 'trailproof' ) }
				</div>
				<p style={ { color: '#94A3B8', fontSize: 13, margin: 0 } }>
					{ __( 'Run a scan first to see what your clients will see.', 'trailproof' ) }
				</p>
			</div>
		);
	}

	return (
		<div style={ { ...card, padding: '20px 24px' } }>
			<div style={ { fontSize: 12, fontWeight: 600, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }>
				{ __( 'Client portal preview', 'trailproof' ) }
			</div>
			<p style={ { fontSize: 12, color: '#64748B', margin: '0 0 16px' } }>
				{ __( 'This is what your client sees at their portal link.', 'trailproof' ) }
			</p>

			{/* Preview frame */}
			<div style={ { background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '24px', maxWidth: 420 } }>
				<div style={ { fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 } }>
					Trailproof — Accessibility Progress Report
				</div>

				{/* Grade + score */}
				<div style={ { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 } }>
					<div style={ {
						width:          56,
						height:         56,
						borderRadius:   '50%',
						background:     '#fff',
						border:         `3px solid ${ grade?.color ?? '#E2E8F0' }`,
						display:        'flex',
						alignItems:     'center',
						justifyContent: 'center',
						fontSize:       26,
						fontWeight:     800,
						color:          grade?.color ?? '#94A3B8',
						flexShrink:     0,
					} }>
						{ grade?.letter ?? '—' }
					</div>
					<div>
						<div style={ { fontSize: 18, fontWeight: 700, color: '#1A2742' } }>
							{ __( 'Accessibility Grade', 'trailproof' ) }
						</div>
						<div style={ { fontSize: 13, color: '#64748B' } }>{ grade?.label } · { score }/100</div>
						{ scanDate && (
							<div style={ { fontSize: 11, color: '#94A3B8', marginTop: 2 } }>
								{ __( 'Last review:', 'trailproof' ) } { scanDate }
							</div>
						) }
					</div>
				</div>

				{/* Progress bars */}
				<div style={ { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 } }>
					{ [
						{ label: __( 'Improvements completed', 'trailproof' ), value: fixed, total: total, color: '#16A34A' },
						{ label: __( 'Improvements remaining', 'trailproof' ), value: openA + openB + openC, total: total, color: '#D97706' },
					].map( ( item ) => (
						<div key={ item.label }>
							<div style={ { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 } }>
								<span style={ { color: '#475569' } }>{ item.label }</span>
								<span style={ { fontWeight: 600, color: '#1A2742' } }>{ item.value }</span>
							</div>
							<div style={ { background: '#E2E8F0', borderRadius: 99, height: 6, overflow: 'hidden' } }>
								<div style={ {
									width:        total > 0 ? `${ ( item.value / total ) * 100 }%` : '0%',
									height:       '100%',
									background:   item.color,
									borderRadius: 99,
								} } />
							</div>
						</div>
					) ) }
				</div>

				<div style={ { fontSize: 11, color: '#94A3B8', lineHeight: 1.5, borderTop: '1px solid #E2E8F0', paddingTop: 12 } }>
					{ __( 'This report reflects documented remediation progress. Powered by Trailproof.', 'trailproof' ) }
				</div>
			</div>
		</div>
	);
}

// ─── Token row ────────────────────────────────────────────────────────────────

function TokenRow( { token, onCopy, onRevoke, copied } ) {
	const isRevoked = token.revoked;
	const isExpired = token.expires_at && new Date( token.expires_at ) < new Date();

	return (
		<div style={ {
			display:      'flex',
			gap:          12,
			alignItems:   'center',
			padding:      '12px 16px',
			border:       '1px solid #E8ECF2',
			borderRadius: 8,
			marginBottom: 8,
			background:   isRevoked || isExpired ? '#F8FAFC' : '#fff',
			opacity:      isRevoked || isExpired ? 0.65 : 1,
			flexWrap:     'wrap',
		} }>
			<div style={ { flex: 1, minWidth: 160 } }>
				<div style={ { display: 'flex', alignItems: 'center', gap: 8 } }>
					<strong style={ { fontSize: 13, color: '#1A2742' } }>{ token.label }</strong>
					{ isRevoked && (
						<span style={ { fontSize: 10, background: '#F1F5F9', color: '#64748B', borderRadius: 99, padding: '1px 7px', fontWeight: 600 } }>
							{ __( 'Revoked', 'trailproof' ) }
						</span>
					) }
					{ ! isRevoked && isExpired && (
						<span style={ { fontSize: 10, background: '#FFF7ED', color: '#C2410C', borderRadius: 99, padding: '1px 7px', fontWeight: 600 } }>
							{ __( 'Expired', 'trailproof' ) }
						</span>
					) }
				</div>
				<div style={ { fontSize: 11, color: '#94A3B8', marginTop: 2 } }>
					{ __( 'Created', 'trailproof' ) } { token.created_at }
					{ token.expires_at && ` · ${ __( 'Expires', 'trailproof' ) } ${ token.expires_at }` }
				</div>
			</div>
			<code style={ {
				flex:         2,
				minWidth:     200,
				fontSize:     11,
				background:   '#F8FAFC',
				padding:      '4px 8px',
				borderRadius: 4,
				wordBreak:    'break-all',
				color:        isRevoked ? '#94A3B8' : '#475569',
				border:       '1px solid #E8ECF2',
			} }>
				{ token.portal_url }
			</code>
			{ ! isRevoked && (
				<Button
					variant="secondary"
					onClick={ () => onCopy( token.portal_url, token.id ) }
					style={ { flexShrink: 0, fontSize: 12 } }
				>
					{ copied === token.id ? __( 'Copied!', 'trailproof' ) : __( 'Copy link', 'trailproof' ) }
				</Button>
			) }
			{ onRevoke && ! isRevoked && (
				<Button
					variant="tertiary"
					isDestructive
					onClick={ () => onRevoke( token.id ) }
					style={ { flexShrink: 0, fontSize: 12 } }
				>
					{ __( 'Revoke', 'trailproof' ) }
				</Button>
			) }
		</div>
	);
}

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateLinkForm( { onCreated } ) {
	const [ label, setLabel ]       = useState( '' );
	const [ expiresAt, setExpires ] = useState( '' );
	const [ creating, setCreating ] = useState( false );
	const [ newUrl, setNewUrl ]     = useState( null );
	const [ error, setError ]       = useState( null );
	const [ copied, setCopied ]     = useState( false );

	async function handleCreate( e ) {
		e.preventDefault();
		if ( ! label.trim() ) return;
		setCreating( true );
		setError( null );
		setNewUrl( null );
		try {
			const res = await apiFetch( {
				path:   '/trailproof/v1/client-tokens',
				method: 'POST',
				data:   { label: label.trim(), expires_at: expiresAt || null },
			} );
			setNewUrl( res.portal_url );
			setLabel( '' );
			setExpires( '' );
			onCreated?.();
		} catch ( err ) {
			setError( err?.message || __( 'Failed to create link.', 'trailproof' ) );
		} finally {
			setCreating( false );
		}
	}

	function copyUrl() {
		if ( ! newUrl ) return;
		navigator.clipboard.writeText( newUrl ).then( () => {
			setCopied( true );
			setTimeout( () => setCopied( false ), 2000 );
		} );
	}

	return (
		<div style={ { ...card, padding: '20px 24px' } }>
			<div style={ { fontSize: 12, fontWeight: 600, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }>
				{ __( 'Create a client link', 'trailproof' ) }
			</div>
			<p style={ { fontSize: 12, color: '#64748B', margin: '0 0 16px', lineHeight: 1.5 } }>
				{ __( 'Generate a read-only, token-protected link for your client. No login required. Revocable at any time.', 'trailproof' ) }
			</p>

			{ error && (
				<Notice status="error" isDismissible onRemove={ () => setError( null ) } style={ { marginBottom: 12 } }>
					{ error }
				</Notice>
			) }

			{ newUrl && (
				<div style={ { background: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: 8, padding: '14px 16px', marginBottom: 16 } }>
					<div style={ { fontSize: 12, fontWeight: 700, color: '#16A34A', marginBottom: 6 } }>
						{ __( 'Link created — share this with your client:', 'trailproof' ) }
					</div>
					<div style={ { display: 'flex', gap: 8, alignItems: 'center' } }>
						<code style={ { flex: 1, background: '#fff', border: '1px solid #DCFCE7', borderRadius: 4, padding: '6px 10px', fontSize: 12, wordBreak: 'break-all', color: '#1A2742' } }>
							{ newUrl }
						</code>
						<Button variant="secondary" onClick={ copyUrl } style={ { flexShrink: 0, fontSize: 12 } }>
							{ copied ? __( 'Copied!', 'trailproof' ) : __( 'Copy', 'trailproof' ) }
						</Button>
					</div>
				</div>
			) }

			<form onSubmit={ handleCreate }>
				<div style={ { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' } }>
					<div style={ { flex: 2, minWidth: 200 } }>
						<TextControl
							label={ __( 'Client label', 'trailproof' ) }
							value={ label }
							onChange={ setLabel }
							placeholder={ __( 'e.g. Acme Corp — Q3 review', 'trailproof' ) }
							required
						/>
					</div>
					<div style={ { flex: 1, minWidth: 160 } }>
						<TextControl
							label={ __( 'Expires (optional)', 'trailproof' ) }
							type="date"
							value={ expiresAt }
							onChange={ setExpires }
						/>
					</div>
					<Button
						variant="primary"
						type="submit"
						disabled={ creating || ! label.trim() }
						style={ { marginBottom: 8 } }
					>
						{ creating ? <><Spinner />{ ' ' }{ __( 'Creating…', 'trailproof' ) }</> : __( 'Generate link', 'trailproof' ) }
					</Button>
				</div>
			</form>
		</div>
	);
}

// ─── Main ClientPortal page ───────────────────────────────────────────────────

export default function ClientPortal() {
	const [ tokens, setTokens ]         = useState( [] );
	const [ siteStatus, setSiteStatus ] = useState( null );
	const [ loading, setLoading ]       = useState( true );
	const [ error, setError ]           = useState( null );
	const [ copied, setCopied ]         = useState( null );

	function fetchTokens() {
		setLoading( true );
		Promise.all( [
			apiFetch( { path: '/trailproof/v1/client-tokens' } ).catch( () => [] ),
			apiFetch( { path: '/trailproof/v1/dashboard' } ).catch( () => null ),
		] ).then( ( [ t, s ] ) => {
			setTokens( t );
			setSiteStatus( s );
		} ).finally( () => setLoading( false ) );
	}

	useEffect( () => { fetchTokens(); }, [] );

	async function handleRevoke( id ) {
		if ( ! window.confirm( __( 'Revoke this link? Anyone with the URL will lose access.', 'trailproof' ) ) ) return;
		try {
			await apiFetch( { path: `/trailproof/v1/client-tokens/${ id }`, method: 'DELETE' } );
			fetchTokens();
		} catch ( err ) {
			setError( err?.message || __( 'Failed to revoke link.', 'trailproof' ) );
		}
	}

	function copyUrl( url, id ) {
		navigator.clipboard.writeText( url ).then( () => {
			setCopied( id );
			setTimeout( () => setCopied( null ), 2000 );
		} );
	}

	const active  = tokens.filter( t => ! t.revoked );
	const revoked = tokens.filter( t => t.revoked );

	return (
		<div style={ { maxWidth: 860 } }>
			{ error && (
				<Notice status="error" isDismissible onRemove={ () => setError( null ) } style={ { marginBottom: 16 } }>
					{ error }
				</Notice>
			) }

			<div style={ { display: 'flex', flexDirection: 'column', gap: 24 } }>

				{/* Portal preview */}
				{ ! loading && <PortalPreviewCard siteStatus={ siteStatus } /> }

				{/* Create link form */}
				<CreateLinkForm onCreated={ fetchTokens } />

				{/* Active links */}
				<div style={ { ...card, padding: '20px 24px' } }>
					<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } }>
						<div style={ { fontSize: 12, fontWeight: 600, color: '#1A2742', textTransform: 'uppercase', letterSpacing: '0.06em' } }>
							{ __( 'Active links', 'trailproof' ) }
						</div>
						{ ! loading && (
							<span style={ { fontSize: 11, background: '#F1F5F9', color: '#475569', borderRadius: 99, padding: '2px 8px', fontWeight: 600 } }>
								{ active.length }
							</span>
						) }
					</div>

					{ loading && <Spinner /> }

					{ ! loading && active.length === 0 && (
						<p style={ { color: '#94A3B8', fontSize: 13, margin: 0, fontStyle: 'italic' } }>
							{ __( 'No active links yet. Create one above to share with a client.', 'trailproof' ) }
						</p>
					) }

					{ active.map( t => (
						<TokenRow key={ t.id } token={ t } onCopy={ copyUrl } onRevoke={ handleRevoke } copied={ copied } />
					) ) }
				</div>

				{/* Revoked links */}
				{ revoked.length > 0 && (
					<div style={ { ...card, padding: '20px 24px' } }>
						<div style={ { fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 } }>
							{ __( 'Revoked links', 'trailproof' ) } ({ revoked.length })
						</div>
						{ revoked.map( t => (
							<TokenRow key={ t.id } token={ t } onCopy={ copyUrl } onRevoke={ null } copied={ copied } />
						) ) }
					</div>
				) }

			</div>
		</div>
	);
}
