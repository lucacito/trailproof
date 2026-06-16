import { useState, useEffect } from '@wordpress/element';
import { Button, TextControl, Notice, Spinner } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

export default function ClientPortal() {
	const [ tokens, setTokens ]     = useState( [] );
	const [ loading, setLoading ]   = useState( true );
	const [ creating, setCreating ] = useState( false );
	const [ label, setLabel ]       = useState( '' );
	const [ expiresAt, setExpiresAt ] = useState( '' );
	const [ newToken, setNewToken ] = useState( null );
	const [ error, setError ]       = useState( null );
	const [ copied, setCopied ]     = useState( null );

	function fetchTokens() {
		setLoading( true );
		apiFetch( { path: '/trailproof/v1/client-tokens' } )
			.then( ( data ) => { setTokens( data ); setLoading( false ); } )
			.catch( () => setLoading( false ) );
	}

	useEffect( fetchTokens, [] );

	async function handleCreate( e ) {
		e.preventDefault();
		if ( ! label.trim() ) return;
		setCreating( true );
		setError( null );
		setNewToken( null );
		try {
			const res = await apiFetch( {
				path: '/trailproof/v1/client-tokens',
				method: 'POST',
				data: { label: label.trim(), expires_at: expiresAt || null },
			} );
			setNewToken( res.portal_url );
			setLabel( '' );
			setExpiresAt( '' );
			fetchTokens();
		} catch ( err ) {
			setError( err?.message || 'Failed to create token.' );
		} finally {
			setCreating( false );
		}
	}

	async function handleRevoke( id ) {
		if ( ! window.confirm( 'Revoke this link? Anyone with the URL will lose access.' ) ) return;
		try {
			await apiFetch( { path: `/trailproof/v1/client-tokens/${ id }`, method: 'DELETE' } );
			fetchTokens();
		} catch ( err ) {
			setError( err?.message || 'Failed to revoke token.' );
		}
	}

	function copyUrl( url, id ) {
		navigator.clipboard.writeText( url ).then( () => {
			setCopied( id );
			setTimeout( () => setCopied( null ), 2000 );
		} );
	}

	const active = tokens.filter( ( t ) => ! t.revoked );
	const revoked = tokens.filter( ( t ) => t.revoked );

	return (
		<div style={ { maxWidth: 760 } }>
			<h2 style={ { marginTop: 0 } }>Client Portal</h2>
			<p style={ { color: '#50575e', marginBottom: 24 } }>
				Generate a read-only link for your client. Anyone with the URL can view the site&rsquo;s
				accessibility health score, issue summary, and accessibility statement — no login required.
				Links are revocable at any time.
			</p>

			{ error && (
				<Notice status="error" isDismissible onRemove={ () => setError( null ) }>
					{ error }
				</Notice>
			) }

			{ newToken && (
				<Notice status="success" isDismissible onRemove={ () => setNewToken( null ) }
					style={ { marginBottom: 16 } }
				>
					<strong>Link created.</strong> Share this URL with your client:
					<div style={ { display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 } }>
						<code style={ { flex: 1, background: '#f0f0f1', padding: '4px 8px', borderRadius: 3, fontSize: 12, wordBreak: 'break-all' } }>
							{ newToken }
						</code>
						<Button variant="secondary" onClick={ () => copyUrl( newToken, 'new' ) }>
							{ copied === 'new' ? 'Copied!' : 'Copy' }
						</Button>
					</div>
				</Notice>
			) }

			{/* Create form */}
			<div style={ { background: '#f6f7f7', border: '1px solid #ddd', borderRadius: 4, padding: 20, marginBottom: 32 } }>
				<h3 style={ { marginTop: 0, fontSize: 14 } }>Create a new client link</h3>
				<form onSubmit={ handleCreate }>
					<div style={ { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' } }>
						<div style={ { flex: 2, minWidth: 200 } }>
							<TextControl
								label="Label"
								value={ label }
								onChange={ setLabel }
								placeholder="e.g. Acme Corp Q3 review"
								required
							/>
						</div>
						<div style={ { flex: 1, minWidth: 160 } }>
							<TextControl
								label="Expires (optional)"
								type="date"
								value={ expiresAt }
								onChange={ setExpiresAt }
							/>
						</div>
						<Button
							variant="primary"
							type="submit"
							disabled={ creating || ! label.trim() }
						>
							{ creating ? <Spinner /> : 'Generate link' }
						</Button>
					</div>
				</form>
			</div>

			{/* Active tokens */}
			<h3 style={ { fontSize: 14 } }>Active links ({ active.length })</h3>
			{ loading && <Spinner /> }
			{ ! loading && active.length === 0 && (
				<p style={ { color: '#888', fontStyle: 'italic' } }>No active links yet.</p>
			) }
			{ active.map( ( t ) => (
				<TokenRow key={ t.id } token={ t } onCopy={ copyUrl } onRevoke={ handleRevoke } copied={ copied } />
			) ) }

			{ revoked.length > 0 && (
				<>
					<h3 style={ { fontSize: 14, color: '#888', marginTop: 32 } }>Revoked ({ revoked.length })</h3>
					{ revoked.map( ( t ) => (
						<TokenRow key={ t.id } token={ t } onCopy={ copyUrl } onRevoke={ null } copied={ copied } />
					) ) }
				</>
			) }
		</div>
	);
}

function TokenRow( { token, onCopy, onRevoke, copied } ) {
	const isRevoked = token.revoked;
	return (
		<div style={ {
			display:       'flex',
			gap:           12,
			alignItems:    'center',
			padding:       '12px 16px',
			border:        '1px solid #ddd',
			borderRadius:  4,
			marginBottom:  8,
			background:    isRevoked ? '#f9f9f9' : '#fff',
			opacity:       isRevoked ? 0.6 : 1,
			flexWrap:      'wrap',
		} }>
			<div style={ { flex: 1, minWidth: 160 } }>
				<strong style={ { fontSize: 13 } }>{ token.label }</strong>
				<div style={ { fontSize: 11, color: '#888', marginTop: 2 } }>
					Created { token.created_at }
					{ token.expires_at && ` · Expires ${ token.expires_at }` }
					{ isRevoked && ' · Revoked' }
				</div>
			</div>
			<code style={ {
				flex:         2,
				minWidth:     200,
				fontSize:     11,
				background:   '#f0f0f1',
				padding:      '4px 8px',
				borderRadius: 3,
				wordBreak:    'break-all',
				color:        isRevoked ? '#aaa' : 'inherit',
			} }>
				{ token.portal_url }
			</code>
			{ ! isRevoked && (
				<Button
					variant="secondary"
					onClick={ () => onCopy( token.portal_url, token.id ) }
					style={ { flexShrink: 0 } }
				>
					{ copied === token.id ? 'Copied!' : 'Copy' }
				</Button>
			) }
			{ onRevoke && ! isRevoked && (
				<Button
					variant="tertiary"
					isDestructive
					onClick={ () => onRevoke( token.id ) }
					style={ { flexShrink: 0 } }
				>
					Revoke
				</Button>
			) }
		</div>
	);
}
