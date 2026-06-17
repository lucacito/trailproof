import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import StatusBadge from './StatusBadge';
import BucketBadge from './BucketBadge';

// Curated educational content per axe rule_id
const RULE_META = {
	'color-contrast': {
		why: 'Low contrast between text and background makes content unreadable for people with low vision or colour blindness. WCAG 1.4.3 requires a 4.5:1 ratio for normal text (3:1 for large text).',
		how: 'You choose replacement foreground and background colours that meet the ratio. The fix is applied at render time — your saved content is never changed.',
	},
	'color-contrast-enhanced': {
		why: 'Enhanced contrast (7:1 ratio) is required for AAA conformance and significantly improves readability for a broader range of visual impairments.',
		how: 'Same as colour-contrast — choose passing colours via the contrast picker in the decision screen.',
	},
	'image-alt': {
		why: 'Images without alt text are invisible to screen readers. Users relying on assistive technology receive no information about what the image conveys.',
		how: 'For meaningful images, you provide descriptive alt text. For decorative images, an empty alt="" tells screen readers to skip the element entirely.',
	},
	'input-image-alt': {
		why: 'Image-type form inputs (e.g. graphical submit buttons) must have alt text so keyboard and AT users understand their purpose.',
		how: 'You provide a short, action-oriented alt text such as "Search" or "Submit order".',
	},
	'area-alt': {
		why: 'Image map areas without alt text leave keyboard and screen reader users unable to navigate the map or understand its links.',
		how: 'You provide descriptive alt text for each <area> element, describing where that area links to.',
	},
	'link-name': {
		why: '"Click here" and "Read more" links are meaningless when announced out of context by a screen reader. Every link must have a descriptive accessible name.',
		how: 'You supply an accessible name that makes sense on its own, e.g. "Read our accessibility statement" instead of "Read more".',
	},
	'button-name': {
		why: 'Buttons without a discernible name are announced only as "button" — users with screen readers have no idea what the button does.',
		how: 'You supply a descriptive label. The fix adds aria-label to the rendered button element at output time.',
	},
	'label': {
		why: 'Form inputs without associated labels force screen reader users to guess what information to enter, and break voice-control software that targets fields by label.',
		how: 'You provide label text. Trailproof associates it with the input via aria-labelledby at render time.',
	},
	'frame-title': {
		why: 'Iframes without a title are announced only as "frame" — users cannot tell what content is inside without exploring it blind.',
		how: 'You provide a brief, descriptive title. The fix adds it as a title attribute to the rendered iframe.',
	},
	'html-has-lang': {
		why: 'Without a language attribute, screen readers guess the language and apply the wrong pronunciation rules — especially harmful for non-English content.',
		how: 'Trailproof adds the correct lang attribute to the <html> element at render time, derived from your WordPress language setting.',
	},
	'bypass': {
		why: 'Without a skip link, keyboard users must tab through the entire navigation on every page load before reaching the main content.',
		how: 'Trailproof injects a "Skip to main content" link as the first focusable element on every page at render time.',
	},
	'landmark-one-main': {
		why: 'Without a <main> landmark, screen reader users cannot jump directly to the page\'s primary content using their AT\'s landmark navigation.',
		how: 'Trailproof wraps the main content area in a <main> element at render time.',
	},
	'landmark-main-is-top-level': {
		why: 'A <main> element nested inside other landmarks confuses navigation — assistive technology expects it at the document\'s top level.',
		how: 'Trailproof restructures the landmark hierarchy at render time so <main> is a direct child of <body>.',
	},
	'region': {
		why: 'Content outside landmark regions is invisible to screen reader users navigating by landmarks — they may never find sections of the page.',
		how: 'Trailproof adds appropriate landmark roles (e.g. role="region" with aria-label) around orphaned content blocks.',
	},
	'heading-order': {
		why: 'Skipped heading levels (e.g. h1 → h3) break the document outline that screen reader users rely on to navigate and understand page structure quickly.',
		how: 'This requires human judgment — heading hierarchy reflects content meaning, so you review and correct the level for each heading in the decision screen.',
	},
	'page-has-heading-one': {
		why: 'Screen reader users navigate pages by jumping between headings. Without an h1, there is no clear primary topic anchor — users have no efficient way to confirm they are on the right page or skip to the main content.',
		how: 'Add an h1 to the page that names the primary topic. If one already exists, confirm it is not hidden from the accessibility tree (e.g. via display:none or aria-hidden). Re-scan after adding it to clear this issue.',
	},

	'input-no-autocomplete': {
		why: 'Form fields for email, phone, and name without autocomplete attributes force users to type the same information repeatedly. For users with cognitive disabilities, motor impairments, or who rely on autofill software, this can make forms unusable.',
		how: 'Trailproof adds the appropriate autocomplete attribute (email, tel, given-name, family-name, or name) to each matching input at render time, derived from the field\'s type and name attributes.',
	},

	// Divi module patterns
	'divi-accordion': {
		why: 'Divi accordion panels lack aria-expanded and aria-controls attributes. Screen reader users cannot tell whether a panel is open or closed, and cannot navigate between panels using AT keyboard shortcuts.',
		how: 'Trailproof adds role="button", aria-expanded, aria-controls to each title and role="region", id to each content panel at render time. No saved content is changed.',
	},
	'divi-tabs': {
		why: 'Divi tab widgets are missing role="tablist", role="tab", and aria-selected. Screen reader users navigate them as plain links rather than a tab interface and cannot use arrow-key navigation between tabs.',
		how: 'Trailproof adds the full ARIA tab pattern (tablist, tab, tabpanel, aria-selected) to the rendered markup at output time. No saved content is changed.',
	},
	'divi-toggle': {
		why: 'Divi toggle widgets lack aria-expanded and aria-controls. Screen reader users hear the title as plain text with no indication that activating it reveals or hides content.',
		how: 'Trailproof adds role="button", aria-expanded, and aria-controls to each toggle title and an id/role to each content panel at render time.',
	},
	'divi-menu': {
		why: 'Divi menu items with sub-menus do not declare aria-haspopup or aria-expanded. Screen reader users activate the parent item expecting navigation, then discover the sub-menu unexpectedly — a disorientating experience.',
		how: 'Trailproof adds aria-haspopup="true" and aria-expanded="false" to all parent menu links that have child menus, at render time.',
	},
	'divi-gallery': {
		why: 'Divi gallery grids are not marked as lists. Screen reader users cannot tell how many images are in the gallery or use list-navigation shortcuts to move between items efficiently.',
		how: 'Trailproof adds role="list" to the gallery grid and role="listitem" to each image wrapper at render time.',
	},
};

const BUCKET_HOW = {
	A: 'This is a safe automatic fix. Trailproof applies it at render time via output buffering — your saved content is never changed. You can revert anytime from the Corrections screen.',
	B: 'This fix requires your judgment. The decision screen shows the current element and lets you author the correction before committing it. Every decision is logged to the immutable audit trail.',
	C: 'This issue cannot be verified automatically. The checklist walks you through what to check manually, and records your sign-off with a timestamp and user ID.',
};

const ACTION_LABEL = {
	decision_apply:    'Fix applied',
	decision_defer:    'Deferred',
	decision_na:       'Marked N/A',
	checklist_signoff: 'Checked off',
	scan_detected:     'Detected by scan',
};

function SectionHead( { children } ) {
	return (
		<div style={ {
			fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
			textTransform: 'uppercase', color: '#8c959f',
			marginBottom: 6, marginTop: 20, paddingBottom: 4,
			borderBottom: '1px solid #f0f0f0',
		} }>
			{ children }
		</div>
	);
}

function HistoryRow( { entry } ) {
	const date   = new Date( entry.ts ).toLocaleDateString( undefined, { month: 'short', day: 'numeric', year: 'numeric' } );
	const time   = new Date( entry.ts ).toLocaleTimeString( undefined, { hour: '2-digit', minute: '2-digit' } );
	const after  = tryParse( entry.after_json );
	const label  = ACTION_LABEL[ entry.action ] ?? entry.action;

	return (
		<div style={ { borderLeft: '3px solid #e0e7ef', paddingLeft: 10, marginBottom: 12 } }>
			<div style={ { fontSize: 12, fontWeight: 600, color: '#1e293b' } }>{ label }</div>
			<div style={ { fontSize: 11, color: '#8c959f', marginTop: 1 } }>
				{ date } at { time }
				{ entry.user_id ? ` · User #${ entry.user_id }` : '' }
			</div>
			{ entry.note && (
				<div style={ { fontSize: 12, color: '#50575e', marginTop: 3, fontStyle: 'italic' } }>
					"{ entry.note }"
				</div>
			) }
			{ after?.transform_type && (
				<div style={ { fontSize: 11, color: '#50575e', marginTop: 2 } }>
					Transform: <code style={ { fontSize: 10 } }>{ after.transform_type }</code>
				</div>
			) }
		</div>
	);
}

function PanelAction( { issue, onAction, onClose, navigate } ) {
	const isOpen = [ 'open', 'regressed' ].includes( issue.status );

	if ( ! isOpen ) {
		return (
			<p style={ { fontSize: 13, color: '#8c959f', margin: 0 } }>
				Status is <strong>{ issue.status }</strong> — no action needed right now.
			</p>
		);
	}

	if ( issue.bucket === 'A' ) {
		return (
			<div>
				<p style={ { fontSize: 13, color: '#50575e', marginTop: 0, lineHeight: 1.5 } }>
					This fix can be applied automatically. Use the worklist row button to apply it to all instances of this rule at once, or click below to fix this specific instance.
				</p>
				<Button variant="primary" onClick={ () => { onAction?.( issue ); onClose(); } }>
					{ __( 'Apply fix', 'trailproof' ) }
				</Button>
			</div>
		);
	}

	if ( issue.bucket === 'B' ) {
		return (
			<div>
				<p style={ { fontSize: 13, color: '#50575e', marginTop: 0, lineHeight: 1.5 } }>
					This fix needs your judgment. The decision screen shows the current element and lets you craft the correction before committing it to the audit log.
				</p>
				<Button variant="secondary" onClick={ () => { onAction?.( issue ); onClose(); } }>
					{ __( 'Review & decide', 'trailproof' ) }
				</Button>
			</div>
		);
	}

	if ( issue.bucket === 'C' ) {
		return (
			<div>
				<p style={ { fontSize: 13, color: '#50575e', marginTop: 0, lineHeight: 1.5 } }>
					This issue requires a manual hands-on check. The checklist walks you through what to verify and records your sign-off.
				</p>
				<Button variant="tertiary" onClick={ () => { navigate?.( 'checklist' ); onClose(); } }>
					{ __( 'Open checklist →', 'trailproof' ) }
				</Button>
			</div>
		);
	}

	return null;
}

/**
 * Slide-over detail panel for a single issue.
 *
 * Props:
 *   issueId   {number}    Issue id to load
 *   onClose   {function}  Called to dismiss the panel
 *   onAction  {function}  Called with (issue) when user triggers an action from within the panel
 *   navigate  {function}  Tab-navigate function passed down from App
 */
export default function IssueDetailPanel( { issueId, onClose, onAction, navigate } ) {
	const [ issue, setIssue ]     = useState( null );
	const [ history, setHistory ] = useState( [] );
	const [ loading, setLoading ] = useState( true );

	useEffect( () => {
		if ( ! issueId ) return;
		setLoading( true );
		setIssue( null );
		setHistory( [] );

		Promise.all( [
			apiFetch( { path: `/trailproof/v1/issues/${ issueId }` } ),
			apiFetch( { path: `/trailproof/v1/issues/${ issueId }/history` } ),
		] )
			.then( ( [ iss, hist ] ) => {
				setIssue( iss );
				setHistory( Array.isArray( hist ) ? hist : [] );
			} )
			.catch( () => {} )
			.finally( () => setLoading( false ) );
	}, [ issueId ] );

	const nodeData = issue ? tryParse( issue.node_data_json ) : null;
	const ruleMeta = issue ? ( RULE_META[ issue.rule_id ] ?? null ) : null;

	return (
		<>
			{/* Backdrop */}
			<div
				onClick={ onClose }
				style={ {
					position: 'fixed', inset: 0,
					background: 'rgba(0,0,0,0.22)',
					zIndex: 99998,
				} }
			/>

			{/* Drawer */}
			<div
				role="dialog"
				aria-modal="true"
				aria-label={ issue?.description ?? __( 'Issue detail', 'trailproof' ) }
				style={ {
					position: 'fixed', top: 0, right: 0, bottom: 0,
					width: 440, maxWidth: '90vw',
					background: '#fff',
					boxShadow: '-6px 0 32px rgba(0,0,0,0.16)',
					zIndex: 99999,
					overflowY: 'auto',
					padding: '24px 24px 40px',
					boxSizing: 'border-box',
				} }
			>
				{/* Close */}
				<button
					onClick={ onClose }
					aria-label={ __( 'Close panel', 'trailproof' ) }
					style={ {
						position: 'absolute', top: 16, right: 16,
						background: 'none', border: 'none',
						cursor: 'pointer', fontSize: 18,
						color: '#646970', lineHeight: 1, padding: 4,
					} }
				>
					✕
				</button>

				{ loading && (
					<p style={ { color: '#646970', marginTop: 8 } }>
						{ __( 'Loading…', 'trailproof' ) }
					</p>
				) }

				{ ! loading && ! issue && (
					<p style={ { color: '#cf222e' } }>
						{ __( 'Issue not found.', 'trailproof' ) }
					</p>
				) }

				{ ! loading && issue && (
					<>
						{/* ── Header ── */}
						<div style={ { paddingRight: 32 } }>
							<code style={ {
								fontSize: 11, background: '#f3f4f6',
								padding: '2px 7px', borderRadius: 3,
								color: '#374151', display: 'inline-block', marginBottom: 6,
							} }>
								{ issue.rule_id }
							</code>
							<h2 style={ { fontSize: 16, fontWeight: 700, margin: '0 0 8px', lineHeight: 1.3 } }>
								{ issue.description || issue.rule_id }
							</h2>
							<div style={ { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } }>
								<BucketBadge bucket={ issue.bucket } />
								<StatusBadge status={ issue.status } bucket={ issue.bucket } size="sm" />
								{ issue.wcag_sc && (
									<a
										href={ `https://www.w3.org/WAI/WCAG21/Understanding/${ issue.wcag_sc.replace( /\./g, '' ) }` }
										target="_blank"
										rel="noopener noreferrer"
										style={ { fontSize: 11, color: '#0073aa' } }
									>
										WCAG { issue.wcag_sc } ↗
									</a>
								) }
							</div>
						</div>

						{/* ── What this is ── */}
						<SectionHead>What this is</SectionHead>
						<div style={ { fontSize: 13, color: '#374151', lineHeight: 1.5 } }>
							<div style={ { marginBottom: 5 } }>
								<span style={ { color: '#8c959f', fontSize: 11, display: 'inline-block', width: 54 } }>Element</span>
								<code style={ { fontSize: 11, wordBreak: 'break-all' } }>{ issue.selector }</code>
							</div>
							{ issue.url && (
								<div style={ { marginBottom: 5 } }>
									<span style={ { color: '#8c959f', fontSize: 11, display: 'inline-block', width: 54 } }>Page</span>
									<a
										href={ issue.url }
										target="_blank"
										rel="noopener noreferrer"
										style={ { fontSize: 11, wordBreak: 'break-all' } }
									>
										{ issue.url }
									</a>
								</div>
							) }
							{ issue.severity && (
								<div>
									<span style={ { color: '#8c959f', fontSize: 11, display: 'inline-block', width: 54 } }>Impact</span>
									<span style={ { fontSize: 12 } }>{ issue.severity }</span>
								</div>
							) }
							{ nodeData?.html && (
								<pre style={ {
									fontSize: 11, background: '#f6f8fa',
									padding: '8px 10px', borderRadius: 4,
									overflowX: 'auto', whiteSpace: 'pre-wrap',
									wordBreak: 'break-all', margin: '10px 0 0',
									border: '1px solid #e8eaed',
								} }>
									{ nodeData.html }
								</pre>
							) }
						</div>

						{/* ── Why it matters ── */}
						{ ( ruleMeta?.why ) && (
							<>
								<SectionHead>Why it matters</SectionHead>
								<p style={ { fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 } }>
									{ ruleMeta.why }
								</p>
							</>
						) }

						{/* ── How we fix it ── */}
						<SectionHead>How we fix it</SectionHead>
						<p style={ { fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 } }>
							{ ruleMeta?.how || BUCKET_HOW[ issue.bucket ] }
						</p>

						{/* ── Action area ── */}
						<SectionHead>Action</SectionHead>
						<PanelAction
							issue={ issue }
							onAction={ onAction }
							onClose={ onClose }
							navigate={ navigate }
						/>

						{/* ── History ── */}
						<SectionHead>History</SectionHead>
						{ history.length === 0 ? (
							<p style={ { fontSize: 12, color: '#8c959f', margin: 0 } }>
								{ __( 'No decisions logged yet.', 'trailproof' ) }
							</p>
						) : (
							history.map( ( entry ) => (
								<HistoryRow key={ entry.id } entry={ entry } />
							) )
						) }
					</>
				) }
			</div>
		</>
	);
}

function tryParse( v ) {
	if ( ! v ) return null;
	try { return JSON.parse( v ); } catch { return null; }
}
