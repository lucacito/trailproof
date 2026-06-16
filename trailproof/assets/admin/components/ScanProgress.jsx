import { __ } from '@wordpress/i18n';
import { Spinner } from '@wordpress/components';

/**
 * Progress indicator for the iframe-based axe-core scan.
 * Props: { pages: [{url, title}], currentIndex: number, done: boolean, errors: string[] }
 */
export default function ScanProgress( { pages, currentIndex, done, errors } ) {
	const total   = pages.length;
	const pct     = total > 0 ? Math.round( ( currentIndex / total ) * 100 ) : 0;
	const current = pages[ currentIndex ];

	return (
		<div style={ { margin: '1.5rem 0' } }>
			{ /* Progress bar */ }
			<div
				role="progressbar"
				aria-valuenow={ pct }
				aria-valuemin={ 0 }
				aria-valuemax={ 100 }
				aria-label={ __( 'Scan progress', 'trailproof' ) }
				style={ {
					height: 8,
					background: '#e0e0e0',
					borderRadius: 4,
					overflow: 'hidden',
					marginBottom: '0.75rem',
				} }
			>
				<div style={ {
					height: '100%',
					width: `${ pct }%`,
					background: done ? '#00a32a' : '#2271b1',
					transition: 'width 0.3s ease',
					borderRadius: 4,
				} } />
			</div>

			{ ! done && (
				<p style={ { display: 'flex', alignItems: 'center', gap: 8, margin: 0 } }>
					<Spinner />
					{ current
						? <>{ __( 'Scanning', 'trailproof' ) } <strong>{ current.title || current.url }</strong> ({ currentIndex + 1 }/{ total })</>
						: __( 'Preparing scan…', 'trailproof' )
					}
				</p>
			) }

			{ done && (
				<p style={ { color: '#00a32a', fontWeight: 600, margin: 0 } }>
					{ __( '✓ Scan complete.', 'trailproof' ) } { total } { __( 'pages scanned.', 'trailproof' ) }
				</p>
			) }

			{ errors.length > 0 && (
				<ul style={ { marginTop: '0.75rem', color: '#cc1818' } }>
					{ errors.map( ( e, i ) => <li key={ i }>{ e }</li> ) }
				</ul>
			) }
		</div>
	);
}
