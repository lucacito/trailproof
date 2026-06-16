import { __ } from '@wordpress/i18n';
import BucketBadge from './BucketBadge';
import StatusBadge from './StatusBadge';

const SEVERITY_COLORS = {
	critical: '#cc1818',
	serious:  '#d63638',
	moderate: '#dba617',
	minor:    '#646970',
};

function SeverityDot( { severity } ) {
	return (
		<span
			aria-label={ severity }
			title={ severity }
			style={ {
				display:       'inline-block',
				width:         10,
				height:        10,
				borderRadius:  '50%',
				background:    SEVERITY_COLORS[ severity ] ?? '#646970',
				marginRight:   6,
				verticalAlign: 'middle',
				flexShrink:    0,
			} }
		/>
	);
}

/**
 * Issue list table (flat individual-row view).
 * Props:
 *   issues         {array}
 *   loading        {boolean}
 *   renderActions  {(issue) => ReactNode}  optional action column
 *   onRowClick     {(issue) => void}       optional row click handler
 */
export default function IssueTable( { issues, loading, renderActions, onRowClick } ) {
	if ( loading ) {
		return <p style={ { color: '#646970' } }>{ __( 'Loading…', 'trailproof' ) }</p>;
	}

	if ( ! issues || issues.length === 0 ) {
		return (
			<p style={ { color: '#646970' } }>
				{ __( 'No issues match this filter.', 'trailproof' ) }
			</p>
		);
	}

	const clickable = !! onRowClick;

	return (
		<table className="wp-list-table widefat fixed striped" style={ { marginTop: '0.5rem' } }>
			<thead>
				<tr>
					<th scope="col" style={ { width: 100 } }>{ __( 'Type', 'trailproof' ) }</th>
					<th scope="col" style={ { width: 80 } }>{ __( 'Impact', 'trailproof' ) }</th>
					<th scope="col">{ __( 'What\'s wrong', 'trailproof' ) }</th>
					<th scope="col" style={ { width: 60 } }>{ __( 'Standard', 'trailproof' ) }</th>
					<th scope="col">{ __( 'Element', 'trailproof' ) }</th>
					<th scope="col" style={ { width: 120 } }>{ __( 'Status', 'trailproof' ) }</th>
					{ renderActions && <th scope="col" style={ { width: 110 } }>{ __( 'Action', 'trailproof' ) }</th> }
				</tr>
			</thead>
			<tbody>
				{ issues.map( ( issue ) => (
					<tr
						key={ issue.id }
						style={ clickable ? { cursor: 'pointer' } : {} }
						onClick={ clickable ? () => onRowClick( issue ) : undefined }
					>
						<td><BucketBadge bucket={ issue.bucket } /></td>
						<td>
							<span style={ { display: 'flex', alignItems: 'center', fontSize: 12 } }>
								<SeverityDot severity={ issue.severity } />
								{ issue.severity }
							</span>
						</td>
						<td style={ { fontSize: 13 } }>{ issue.description ?? <code style={ { fontSize: 11 } }>{ issue.rule_id }</code> }</td>
						<td>
							{ issue.wcag_sc
								? (
									<a
										href={ `https://www.w3.org/WAI/WCAG21/Understanding/${ issue.wcag_sc.replace( /\./g, '' ) }` }
										target="_blank"
										rel="noopener noreferrer"
										onClick={ ( e ) => e.stopPropagation() }
									>
										{ issue.wcag_sc }
									</a>
								) : '—'
							}
						</td>
						<td>
							<code style={ { fontSize: 11, wordBreak: 'break-all' } }>
								{ issue.selector }
							</code>
						</td>
						<td>
							<StatusBadge status={ issue.status } bucket={ issue.bucket } size="sm" />
						</td>
						{ renderActions && (
							<td onClick={ ( e ) => e.stopPropagation() }>
								{ renderActions( issue ) }
							</td>
						) }
					</tr>
				) ) }
			</tbody>
		</table>
	);
}
