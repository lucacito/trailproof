import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import Dashboard from '../pages/Dashboard';
import Scan from '../pages/Scan';
import Worklist from '../pages/Worklist';
import DecisionQueue from '../pages/DecisionQueue';
import Checklist from '../pages/Checklist';
import Statement from '../pages/Statement';
import Reports from '../pages/Reports';

const NAV = [
	{ id: 'dashboard',  label: __( 'Dashboard', 'trailproof' ) },
	{ id: 'scan',       label: __( 'Scan', 'trailproof' ) },
	{ id: 'worklist',   label: __( 'Worklist', 'trailproof' ) },
	{ id: 'decisions',  label: __( 'Decisions', 'trailproof' ) },
	{ id: 'checklist',  label: __( 'Checklist', 'trailproof' ) },
	{ id: 'statement',  label: __( 'Statement', 'trailproof' ) },
	{ id: 'reports',    label: __( 'Reports', 'trailproof' ) },
];

const PAGES = {
	dashboard:  Dashboard,
	scan:       Scan,
	worklist:   Worklist,
	decisions:  DecisionQueue,
	checklist:  Checklist,
	statement:  Statement,
	reports:    Reports,
};

const whiteLabel = !! window.trailproofData?.whiteLabel;

export default function App() {
	const [ page, setPage ] = useState( 'dashboard' );
	const Page = PAGES[ page ] ?? Dashboard;

	return (
		<div style={ { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' } }>
			{ /* Header */ }
			<div style={ { display: 'flex', alignItems: 'center', gap: '1.5rem', borderBottom: '1px solid #e0e0e0', paddingBottom: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' } }>
				{ ! whiteLabel && (
					<strong style={ { fontSize: 18, color: '#1d2327' } }>Trailproof</strong>
				) }
				<nav aria-label={ __( 'Trailproof navigation', 'trailproof' ) }>
					{ NAV.map( ( item ) => (
						<button
							key={ item.id }
							onClick={ () => setPage( item.id ) }
							aria-current={ page === item.id ? 'page' : undefined }
							style={ {
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								padding: '6px 12px',
								fontSize: 14,
								fontWeight: page === item.id ? 600 : 400,
								color: page === item.id ? '#2271b1' : '#50575e',
								borderBottom: page === item.id ? '2px solid #2271b1' : '2px solid transparent',
								marginRight: 4,
							} }
						>
							{ item.label }
						</button>
					) ) }
				</nav>
			</div>

			{ /* Page content */ }
			<div>
				<Page navigate={ setPage } />
			</div>
		</div>
	);
}
