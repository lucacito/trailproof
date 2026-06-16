import { useState } from '@wordpress/element';
import { Button, TextareaControl } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

const STATUS_LABELS = {
	pending: { label: 'Pending', color: '#666', bg: '#f0f0f0' },
	pass:    { label: 'Pass',    color: '#1a7f37', bg: '#dafbe1' },
	fail:    { label: 'Fail',    color: '#cf222e', bg: '#ffeef0' },
	na:      { label: 'N/A',     color: '#5a6370', bg: '#e2e3e5' },
	defer:   { label: 'Defer',   color: '#856404', bg: '#fff3cd' },
};

/**
 * A single Bucket C checklist item with sign-off controls.
 *
 * Props:
 *   item        {object}   Checklist item from GET /checklist
 *   onUpdate    {function} Called with updated item after sign-off saved
 */
export default function ChecklistItem( { item, onUpdate } ) {
	const [ expanded, setExpanded ]   = useState( false );
	const [ note, setNote ]           = useState( item.note || '' );
	const [ saving, setSaving ]       = useState( false );
	const [ currentStatus, setCurrentStatus ] = useState( item.status || 'pending' );
	const [ error, setError ]         = useState( null );

	const statusMeta = STATUS_LABELS[ currentStatus ] || STATUS_LABELS.pending;

	async function signOff( status ) {
		setSaving( true );
		setError( null );
		try {
			await apiFetch( {
				path: '/trailproof/v1/checklist/signoff',
				method: 'POST',
				data: { item_key: item.key, status, note },
			} );
			setCurrentStatus( status );
			onUpdate?.( { ...item, status, note } );
		} catch ( err ) {
			setError( err?.message || 'Save failed.' );
		} finally {
			setSaving( false );
		}
	}

	return (
		<div style={ {
			border: '1px solid #ddd',
			borderRadius: 4,
			marginBottom: 8,
			background: '#fff',
			borderLeft: `4px solid ${ statusMeta.color }`,
		} }>
			{/* Header row */}
			<div
				style={ { padding: '10px 14px', cursor: 'pointer' } }
				onClick={ () => setExpanded( ! expanded ) }
			>
				<div style={ { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } }>
					<StatusBadge meta={ statusMeta } />
					<span style={ { marginLeft: 'auto', fontSize: 11, color: '#888', whiteSpace: 'nowrap' } }>WCAG { item.wcag_sc }</span>
					<span style={ { color: '#888', fontSize: 12 } }>{ expanded ? '▲' : '▼' }</span>
				</div>
				<span style={ { fontWeight: 500, fontSize: 13 } }>{ item.description }</span>
			</div>

			{/* Expanded body */}
			{ expanded && (
				<div style={ { padding: '0 14px 14px' } }>
					<p style={ { color: '#444', fontSize: 13, marginTop: 0, lineHeight: 1.6 } }>
						{ item.guidance }
					</p>

					<TextareaControl
						label="Note"
						value={ note }
						onChange={ setNote }
						rows={ 2 }
						help="Optional. Saved to the audit log."
					/>

					{ error && (
						<div style={ { color: '#cf222e', fontSize: 12, marginBottom: 8 } }>{ error }</div>
					) }

					<div style={ { display: 'flex', gap: 6, flexWrap: 'wrap' } }>
						<Button
							variant="primary"
							style={ { background: '#1a7f37', borderColor: '#1a7f37' } }
							onClick={ () => signOff( 'pass' ) }
							disabled={ saving || currentStatus === 'pass' }
						>
							Pass
						</Button>
						<Button
							variant="primary"
							style={ { background: '#cf222e', borderColor: '#cf222e' } }
							onClick={ () => signOff( 'fail' ) }
							disabled={ saving || currentStatus === 'fail' }
						>
							Fail
						</Button>
						<Button
							variant="secondary"
							onClick={ () => signOff( 'na' ) }
							disabled={ saving || currentStatus === 'na' }
						>
							N/A
						</Button>
						<Button
							variant="secondary"
							onClick={ () => signOff( 'defer' ) }
							disabled={ saving || currentStatus === 'defer' }
						>
							Defer
						</Button>
						{ currentStatus !== 'pending' && (
							<Button
								variant="tertiary"
								onClick={ () => signOff( 'pending' ) }
								disabled={ saving }
							>
								Reset
							</Button>
						) }
					</div>

					{ item.decided_at && (
						<div style={ { marginTop: 10, fontSize: 11, color: '#888' } }>
							Last updated: { new Date( item.decided_at ).toLocaleString() }
						</div>
					) }
				</div>
			) }
		</div>
	);
}

function StatusBadge( { meta } ) {
	return (
		<span style={ {
			display: 'inline-block',
			padding: '2px 10px',
			borderRadius: 99,
			fontSize: 11,
			fontWeight: 700,
			background: meta.bg,
			color: meta.color,
			minWidth: 52,
			textAlign: 'center',
		} }>
			{ meta.label }
		</span>
	);
}
