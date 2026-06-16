import { __ } from '@wordpress/i18n';

const LABELS = {
	A: __( 'Auto-fix', 'trailproof' ),
	B: __( 'Decision', 'trailproof' ),
	C: __( 'Manual', 'trailproof' ),
};

const COLORS = {
	A: { background: '#d1fae5', color: '#065f46' },
	B: { background: '#fef3c7', color: '#92400e' },
	C: { background: '#e0e7ff', color: '#3730a3' },
};

export default function BucketBadge( { bucket } ) {
	const style = {
		...( COLORS[ bucket ] ?? { background: '#f3f4f6', color: '#374151' } ),
		display: 'inline-block',
		padding: '2px 8px',
		borderRadius: '3px',
		fontSize: '11px',
		fontWeight: 600,
		letterSpacing: '.3px',
		textTransform: 'uppercase',
	};

	return (
		<span style={ style } aria-label={ `Bucket ${ bucket }` }>
			{ LABELS[ bucket ] ?? bucket }
		</span>
	);
}
