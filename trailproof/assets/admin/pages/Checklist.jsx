import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import ChecklistItem from '../components/ChecklistItem';

const STATUS_ORDER = [ 'pending', 'fail', 'defer', 'na', 'pass' ];

export default function Checklist() {
	const [ items, setItems ]     = useState( [] );
	const [ loading, setLoading ] = useState( true );

	const fetchItems = useCallback( () => {
		setLoading( true );
		apiFetch( { path: '/trailproof/v1/checklist' } )
			.then( setItems )
			.catch( () => setItems( [] ) )
			.finally( () => setLoading( false ) );
	}, [] );

	useEffect( () => { fetchItems(); }, [ fetchItems ] );

	function handleUpdate( updatedItem ) {
		setItems( ( prev ) => prev.map( ( i ) => i.key === updatedItem.key ? updatedItem : i ) );
	}

	const counts = items.reduce( ( acc, i ) => {
		acc[ i.status ] = ( acc[ i.status ] || 0 ) + 1;
		return acc;
	}, {} );

	const allDone = items.length > 0 && items.every( ( i ) => i.status !== 'pending' );

	// Sort: pending/fail first, then defer, na, pass
	const sorted = [ ...items ].sort( ( a, b ) =>
		STATUS_ORDER.indexOf( a.status ) - STATUS_ORDER.indexOf( b.status )
	);

	return (
		<div>
			<div style={ { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' } }>
				<h1 style={ { margin: 0 } }>{ __( 'Manual Checklist', 'trailproof' ) }</h1>
				{ allDone && (
					<span style={ { color: '#1a7f37', fontWeight: 600, fontSize: 13 } }>
						✓ { __( 'All items signed off', 'trailproof' ) }
					</span>
				) }
			</div>

			<p style={ { color: '#50575e', fontSize: 13, marginBottom: 12 } }>
				{ __( 'These Bucket C items cannot be detected automatically. Manually review each one and record your finding. Each sign-off is saved to the audit log.', 'trailproof' ) }
			</p>

			{ /* Progress summary */ }
			{ ! loading && items.length > 0 && (
				<div style={ { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 } }>
					{ [ 'pass', 'fail', 'defer', 'na', 'pending' ].map( ( s ) => (
						counts[ s ] ? (
							<ProgressPill key={ s } status={ s } count={ counts[ s ] } total={ items.length } />
						) : null
					) ) }
				</div>
			) }

			{ loading ? (
				<p>{ __( 'Loading…', 'trailproof' ) }</p>
			) : (
				sorted.map( ( item ) => (
					<ChecklistItem key={ item.key } item={ item } onUpdate={ handleUpdate } />
				) )
			) }
		</div>
	);
}

const PILL_META = {
	pass:    { label: 'Pass',    bg: '#dafbe1', color: '#1a7f37' },
	fail:    { label: 'Fail',    bg: '#ffeef0', color: '#cf222e' },
	defer:   { label: 'Defer',  bg: '#fff3cd', color: '#856404' },
	na:      { label: 'N/A',     bg: '#e2e3e5', color: '#383d41' },
	pending: { label: 'Pending', bg: '#f0f0f0', color: '#666' },
};

function ProgressPill( { status, count, total } ) {
	const m = PILL_META[ status ] || PILL_META.pending;
	const pct = Math.round( ( count / total ) * 100 );
	return (
		<span style={ {
			padding: '3px 12px',
			borderRadius: 99,
			fontSize: 12,
			fontWeight: 600,
			background: m.bg,
			color: m.color,
		} }>
			{ m.label }: { count } ({ pct }%)
		</span>
	);
}
