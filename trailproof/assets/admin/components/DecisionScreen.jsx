import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, TextareaControl, TextControl, Notice, Spinner } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import ContrastPicker from './ContrastPicker';

// How-to copy per rule_id — shown above the input in the "What the fix will do" panel
const RULE_HOW = {
	'color-contrast':          'You choose replacement foreground and background colours that meet the 4.5:1 ratio. The new colours are stored by Trailproof and applied at render time — your saved content is never changed.',
	'color-contrast-enhanced': 'You choose colours that meet the 7:1 AAA ratio. Applied at render time — your saved content is never changed.',
	'image-alt':               'For meaningful images, provide descriptive alt text. For decorative images, leave it blank — Trailproof will mark it with alt="" so screen readers skip it entirely.',
	'input-image-alt':         'Provide a short, action-oriented alt text such as "Search" or "Submit order".',
	'area-alt':                'Provide descriptive alt text for this image map area, describing where it links.',
	'link-name':               'Supply an accessible name that makes sense on its own — e.g. "Read our accessibility statement" instead of "Read more".',
	'button-name':             'Supply a descriptive label. Trailproof adds aria-label to the rendered button element — your saved content is not changed.',
	'label':                   'Provide label text. Trailproof associates it with the input via aria-labelledby at render time — your saved content is not changed.',
	'document-title':          'Provide a descriptive page title. It appears in browser tabs and bookmarks. Include your site name, e.g. "About Us | Acme Co".',
	'frame-title':             'Provide a brief, descriptive title. Trailproof adds it as a title attribute to the rendered iframe.',
	'heading-order':           'Heading hierarchy reflects content meaning — review and set the correct level so the document outline is logical and sequential.',
};

/**
 * Before/after decision screen for Bucket B issues.
 *
 * Props:
 *   issue       {object}   Issue row from the REST API (includes node_data_json fields)
 *   onDecision  {function} Called with the updated issue after a decision is saved
 *   onCancel    {function} Called when the user dismisses without deciding
 */
export default function DecisionScreen( { issue, onDecision, onCancel } ) {
	const nodeData = tryParse( issue.node_data_json );
	const [ saving, setSaving ]   = useState( false );
	const [ error, setError ]     = useState( null );
	const [ note, setNote ]       = useState( '' );
	const [ applied, setApplied ] = useState( false );

	// Per-rule payload state
	const [ contrastData, setContrastData ] = useState( null );
	const [ altText, setAltText ]           = useState( nodeData?.alt || '' );
	const [ linkText, setLinkText ]         = useState( '' );
	const [ ariaLabel, setAriaLabel ]       = useState( '' );
	const [ pageTitle, setPageTitle ]       = useState( nodeData?.title || '' );

	const ruleId  = issue.rule_id;
	const ruleHow = RULE_HOW[ ruleId ] ?? null;

	async function decide( action, extra = {} ) {
		setSaving( true );
		setError( null );
		try {
			const body = { action, note, ...extra };
			await apiFetch( {
				path: `/trailproof/v1/issues/${ issue.id }/decide`,
				method: 'POST',
				data: body,
			} );
			if ( action === 'apply' ) {
				// Stay on screen to show the confirmation view before returning to the queue
				setApplied( true );
			} else {
				onDecision?.( { ...issue, status: action === 'na' ? 'na' : 'deferred' } );
			}
		} catch ( err ) {
			setError( err?.message || 'Request failed.' );
		} finally {
			setSaving( false );
		}
	}

	function buildApplyPayload() {
		switch ( ruleId ) {
			case 'document-title':
				if ( ! pageTitle.trim() ) return null;
				return {
					transform_type: 'set_title',
					payload: { title: pageTitle.trim() },
					original: { title: nodeData?.title || '' },
				};

			case 'color-contrast':
			case 'color-contrast-enhanced':
				if ( ! contrastData?.passesAA ) return null;
				return {
					transform_type: 'set_text_color',
					payload: { selector: issue.selector, color: contrastData.fg },
					original: { fg: nodeData?.fg_color, bg: nodeData?.bg_color },
				};

			case 'image-alt':
			case 'input-image-alt':
			case 'area-alt':
				if ( ! altText.trim() ) return null;
				return {
					transform_type: 'set_alt',
					payload: { alt: altText.trim() },
					original: { alt: nodeData?.alt || '' },
				};

			case 'link-name':
			case 'button-name':
				if ( ! linkText.trim() ) return null;
				return {
					transform_type: 'rewrite_link_text',
					payload: { text: linkText.trim() },
					original: { text: nodeData?.html || '' },
				};

			case 'label':
				if ( ! ariaLabel.trim() ) return null;
				return {
					transform_type: 'associate_label',
					payload: { label_text: ariaLabel.trim() },
					original: {},
				};

			default:
				if ( ! ariaLabel.trim() ) return null;
				return {
					transform_type: 'add_aria_label',
					payload: { aria_label: ariaLabel.trim() },
					original: {},
				};
		}
	}

	function handleApply() {
		const extra = buildApplyPayload();
		if ( ! extra ) {
			setError( 'Please fill in the required field before applying.' );
			return;
		}
		decide( 'apply', extra );
	}

	// Post-apply confirmation screen
	if ( applied ) {
		return (
			<AppliedView
				issue={ issue }
				onDone={ () => onDecision?.( { ...issue, status: 'fixed' } ) }
			/>
		);
	}

	const isLargeText = parseFloat( nodeData?.font_size ) >= 18 ||
		( parseFloat( nodeData?.font_size ) >= 14 && nodeData?.font_weight >= 700 );

	const pageUrl  = issue.url ? tryParseUrl( issue.url ) : null;
	const pagePath = pageUrl ? pageUrl.pathname + ( pageUrl.search || '' ) : issue.url || null;

	return (
		<div style={ { background: '#fff', border: '1px solid #c3c4c7', borderRadius: 4, padding: 24, maxWidth: 760 } }>
			{/* Header */}
			<div style={ { marginBottom: 16 } }>
				{ pagePath && (
					<div style={ { display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8, background: '#F1F5F9', borderRadius: 4, padding: '3px 10px' } }>
						<span style={ { fontSize: 11, color: '#64748B', fontWeight: 500 } }>
							{ __( 'Page:', 'trailproof' ) }
						</span>
						<a
							href={ issue.url }
							target="_blank"
							rel="noreferrer"
							style={ { fontSize: 12, color: '#2563EB', fontWeight: 600, textDecoration: 'none', ...( issue.page_title ? {} : { fontFamily: 'monospace' } ) } }
						>
							{ issue.page_title || pagePath }
						</a>
					</div>
				) }
				<div style={ { fontWeight: 700, fontSize: 16, color: '#1d2327', marginBottom: 6 } }>{ issue.description }</div>
				<div style={ { fontSize: 12, color: '#8c959f' } }>
					{ __( 'This issue needs your input — review the before/after below and choose what to do.', 'trailproof' ) }
					{ issue.wcag_sc && (
						<span style={ { marginLeft: 8 } }>
							{ __( 'Standard:', 'trailproof' ) }{ ' ' }
							<a
								href={ `https://www.w3.org/WAI/WCAG21/Understanding/${ issue.wcag_sc.replace( /\./g, '' ) }` }
								target="_blank"
								rel="noreferrer"
								style={ { color: '#8c959f' } }
							>
								WCAG { issue.wcag_sc }
							</a>
						</span>
					) }
				</div>
			</div>

			{/* Non-destructive guarantee bar */}
			<HowItWorksBar />

			{/* Before/after panels */}
			<div style={ { display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' } }>
				<Panel title={ __( 'What it looks like now', 'trailproof' ) } accent="#cf222e">
					<BeforeContent ruleId={ ruleId } nodeData={ nodeData } />
				</Panel>

				<Panel title={ __( 'What the fix will do', 'trailproof' ) } accent="#1a7f37">
					{ ruleHow && (
						<p style={ { fontSize: 12, color: '#374151', lineHeight: 1.6, margin: '0 0 12px', padding: '8px 10px', background: '#f6f8fa', borderRadius: 4, borderLeft: '3px solid #1a7f37' } }>
							{ ruleHow }
						</p>
					) }
					<AfterInput
						issueId={ issue.id }
						ruleId={ ruleId }
						nodeData={ nodeData }
						isLargeText={ isLargeText }
						contrastData={ contrastData }
						setContrastData={ setContrastData }
						altText={ altText }
						setAltText={ setAltText }
						linkText={ linkText }
						setLinkText={ setLinkText }
						ariaLabel={ ariaLabel }
						setAriaLabel={ setAriaLabel }
						pageTitle={ pageTitle }
						setPageTitle={ setPageTitle }
					/>
				</Panel>
			</div>

			{ /* Note */ }
			<TextareaControl
				label={ __( 'Add a note (optional)', 'trailproof' ) }
				value={ note }
				onChange={ setNote }
				rows={ 2 }
				help={ __( 'Your note will be saved alongside this decision in the audit log.', 'trailproof' ) }
			/>

			{ error && <Notice status="error" isDismissible={ false }>{ error }</Notice> }

			{/* Actions */}
			<div style={ { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' } }>
				<div>
					<Button variant="primary" onClick={ handleApply } disabled={ saving }>
						{ __( 'Confirm & apply fix', 'trailproof' ) }
					</Button>
					<div style={ { fontSize: 11, color: '#8c959f', marginTop: 3 } }>
						{ __( 'Applied at render time — revertible anytime', 'trailproof' ) }
					</div>
				</div>
				<Button variant="secondary" onClick={ () => decide( 'defer' ) } disabled={ saving } title={ __( "Skip for now — come back to it later. It will stay in your list.", 'trailproof' ) }>
					{ __( 'Skip for now', 'trailproof' ) }
				</Button>
				<Button variant="secondary" onClick={ () => decide( 'na' ) } disabled={ saving } title={ __( "This issue doesn't apply to your site — dismiss it permanently.", 'trailproof' ) }>
					{ __( "Doesn't apply to my site", 'trailproof' ) }
				</Button>
				<Button variant="tertiary" onClick={ onCancel } disabled={ saving }>
					{ __( 'Cancel', 'trailproof' ) }
				</Button>
			</div>
			<p style={ { fontSize: 11, color: '#8c959f', marginTop: 10, marginBottom: 0 } }>
				{ __( 'Your choice is saved to the audit log and can be reviewed at any time.', 'trailproof' ) }
			</p>
		</div>
	);
}

// ----- Sub-components -----

function HowItWorksBar() {
	const [ expanded, setExpanded ] = useState( false );

	return (
		<div style={ { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '10px 14px', marginBottom: 20 } }>
			<div style={ { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } }>
				<span style={ { fontSize: 13, color: '#1a7f37', fontWeight: 700 } }>
					{ __( 'Non-destructive:', 'trailproof' ) }
				</span>
				<span style={ { fontSize: 13, color: '#374151', flexGrow: 1 } }>
					{ __( 'Your saved content is never changed. This fix is applied at render time by Trailproof\'s correction layer. You can revert it anytime from the Corrections screen.', 'trailproof' ) }
				</span>
				<button
					onClick={ () => setExpanded( ( v ) => ! v ) }
					aria-expanded={ expanded }
					style={ { background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#0073aa', padding: 0, textDecoration: 'underline', whiteSpace: 'nowrap' } }
				>
					{ expanded ? __( 'Hide details', 'trailproof' ) : __( 'How does this work?', 'trailproof' ) }
				</button>
			</div>

			{ expanded && (
				<div style={ { marginTop: 12, paddingTop: 12, borderTop: '1px solid #bbf7d0' } }>
					<div style={ { fontSize: 12, fontWeight: 700, color: '#1a7f37', marginBottom: 8 } }>
						{ __( 'How Trailproof applies fixes without touching your content:', 'trailproof' ) }
					</div>
					<ol style={ { fontSize: 12, color: '#374151', lineHeight: 1.8, margin: '0 0 0 18px', padding: 0 } }>
						<li>
							<strong>{ __( 'WordPress fires the template_redirect hook', 'trailproof' ) }</strong>
							{ __( ' before any HTML is sent to the browser — this is where Trailproof steps in.', 'trailproof' ) }
						</li>
						<li>
							<strong>{ __( 'Output buffering starts', 'trailproof' ) }</strong>
							{ __( ' (PHP\'s ob_start). WordPress renders the full page HTML as normal, but instead of sending it to the browser, PHP hands it to Trailproof\'s CorrectionEngine.', 'trailproof' ) }
						</li>
						<li>
							<strong>{ __( 'The HTML is parsed into a DOM tree', 'trailproof' ) }</strong>
							{ __( ' using PHP\'s DOMDocument — the same way a browser parses a page, but in memory on the server.', 'trailproof' ) }
						</li>
						<li>
							<strong>{ __( 'Each stored correction is looked up', 'trailproof' ) }</strong>
							{ __( ' by its CSS selector (e.g. "img.et-pb-image"). symfony/css-selector converts this to an XPath query and locates the exact element in the DOM tree.', 'trailproof' ) }
						</li>
						<li>
							<strong>{ __( 'A typed transform runs', 'trailproof' ) }</strong>
							{ __( ' (e.g. SetAltTransform, AddAriaLabelTransform) and modifies the DOM node in memory — setting an attribute, injecting an element, or rewriting text.', 'trailproof' ) }
						</li>
						<li>
							<strong>{ __( 'The corrected HTML string is sent to the browser.', 'trailproof' ) }</strong>
							{ __( ' Your post_content, Divi shortcodes, and all database rows are completely untouched.', 'trailproof' ) }
						</li>
					</ol>
					<div style={ { marginTop: 10, fontSize: 12, color: '#6e7781', fontStyle: 'italic', borderTop: '1px solid #bbf7d0', paddingTop: 10 } }>
						{ __( 'To revert: go to Corrections, find this fix, and toggle it off. The page immediately returns to its original output — no undo needed because nothing was ever saved differently.', 'trailproof' ) }
					</div>
				</div>
			) }
		</div>
	);
}

function AppliedView( { issue, onDone } ) {
	return (
		<div style={ { background: '#fff', border: '1px solid #c3c4c7', borderRadius: 4, padding: 24, maxWidth: 760 } }>
			<div style={ { textAlign: 'center', padding: '32px 16px' } }>
				<div
					aria-hidden="true"
					style={ { width: 48, height: 48, borderRadius: '50%', background: '#dafbe1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22, color: '#1a7f37' } }
				>
					✓
				</div>
				<div style={ { fontSize: 18, fontWeight: 700, color: '#1a7f37', marginBottom: 8 } }>
					{ __( 'Fix applied', 'trailproof' ) }
				</div>
				<p style={ { fontSize: 13, color: '#1d2327', maxWidth: 460, margin: '0 auto 6px', fontWeight: 600 } }>
					{ issue.description }
				</p>
				<p style={ { fontSize: 13, color: '#50575e', maxWidth: 460, margin: '6px auto 24px', lineHeight: 1.6 } }>
					{ __( 'The correction is now active on this page. Your saved content was not changed — the fix lives entirely in Trailproof\'s correction layer and can be reverted at any time from the Corrections screen.', 'trailproof' ) }
				</p>
				<Button variant="primary" onClick={ onDone }>
					{ __( 'Back to queue', 'trailproof' ) }
				</Button>
			</div>
		</div>
	);
}

function BeforeContent( { ruleId, nodeData } ) {
	if ( ! nodeData ) return <em style={ { color: '#666' } }>No node data captured.</em>;

	if ( [ 'color-contrast', 'color-contrast-enhanced' ].includes( ruleId ) ) {
		const fg = nodeData.fg_color || '#000';
		const bg = nodeData.bg_color || '#fff';
		return (
			<>
				<div style={ { background: bg, color: fg, padding: '8px 12px', borderRadius: 4, marginBottom: 8, border: '1px solid #ddd' } }>
					Sample text
				</div>
				<code style={ { fontSize: 12 } }>FG: { fg } / BG: { bg }</code>
				{ nodeData.contrast_ratio && (
					<div style={ { fontSize: 12, color: '#cf222e', marginTop: 4 } }>
						Current ratio: { parseFloat( nodeData.contrast_ratio ).toFixed( 2 ) } : 1
					</div>
				) }
			</>
		);
	}

	if ( nodeData.html ) {
		return (
			<pre style={ { fontSize: 12, overflowX: 'auto', background: '#f6f8fa', padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 } }>
				{ nodeData.html }
			</pre>
		);
	}

	return <em style={ { color: '#666' } }>No preview available.</em>;
}

const AI_SUGGEST_RULES = [ 'image-alt', 'input-image-alt', 'area-alt', 'link-name', 'button-name', 'label' ];

function SuggestButton( { issueId, onSuggestion } ) {
	const [ loading, setLoading ] = useState( false );
	const [ error, setError ]     = useState( null );
	const claudeEnabled = window.trailproofData?.claudeEnabled;

	if ( ! claudeEnabled ) return null;

	async function handleSuggest() {
		setLoading( true );
		setError( null );
		try {
			const res = await apiFetch( {
				path: `/trailproof/v1/issues/${ issueId }/suggest`,
				method: 'POST',
			} );
			onSuggestion( res.suggestion );
		} catch ( err ) {
			setError( err?.message || 'AI suggestion unavailable.' );
		} finally {
			setLoading( false );
		}
	}

	return (
		<div style={ { marginBottom: 8 } }>
			<Button
				variant="secondary"
				onClick={ handleSuggest }
				disabled={ loading }
				style={ { fontSize: 12 } }
			>
				{ loading ? <><Spinner /> Suggesting…</> : '✦ Suggest with AI' }
			</Button>
			{ error && (
				<span style={ { marginLeft: 8, fontSize: 12, color: '#cf222e' } }>{ error }</span>
			) }
		</div>
	);
}

function AfterInput( { issueId, ruleId, nodeData, isLargeText, contrastData, setContrastData, altText, setAltText, linkText, setLinkText, ariaLabel, setAriaLabel, pageTitle, setPageTitle } ) {
	const canSuggest = AI_SUGGEST_RULES.includes( ruleId );

	if ( ruleId === 'document-title' ) {
		return (
			<TextControl
				label={ __( 'Page title', 'trailproof' ) }
				value={ pageTitle }
				onChange={ setPageTitle }
				placeholder="e.g. About Us | My Company"
				help={ __( "This appears in the browser tab and bookmarks. Keep it descriptive and include your site name. Example: \"Contact | Acme Co\"", 'trailproof' ) }
			/>
		);
	}

	if ( [ 'color-contrast', 'color-contrast-enhanced' ].includes( ruleId ) ) {
		return (
			<ContrastPicker
				initialFg={ nodeData?.fg_color || '#000000' }
				initialBg={ nodeData?.bg_color || '#ffffff' }
				isLargeText={ isLargeText }
				onChange={ setContrastData }
			/>
		);
	}

	if ( [ 'image-alt', 'input-image-alt', 'area-alt' ].includes( ruleId ) ) {
		return (
			<>
				{ canSuggest && <SuggestButton issueId={ issueId } onSuggestion={ setAltText } /> }
				<TextControl
					label="Alt text"
					value={ altText }
					onChange={ setAltText }
					help={ altText && altText !== ( nodeData?.alt || '' ) ? 'AI suggestion — review before applying.' : 'Describe the image for screen reader users. Leave blank to mark as decorative instead.' }
				/>
			</>
		);
	}

	if ( [ 'link-name', 'button-name' ].includes( ruleId ) ) {
		return (
			<>
				{ canSuggest && <SuggestButton issueId={ issueId } onSuggestion={ setLinkText } /> }
				<TextControl
					label="Accessible name"
					value={ linkText }
					onChange={ setLinkText }
					help={ linkText ? 'AI suggestion — review before applying.' : 'A clear, descriptive label for this link or button.' }
				/>
			</>
		);
	}

	if ( ruleId === 'label' ) {
		return (
			<>
				{ canSuggest && <SuggestButton issueId={ issueId } onSuggestion={ setAriaLabel } /> }
				<TextControl
					label="Label text"
					value={ ariaLabel }
					onChange={ setAriaLabel }
					help={ ariaLabel ? 'AI suggestion — review before applying.' : 'The visible or hidden label for this form field.' }
				/>
			</>
		);
	}

	return (
		<TextControl
			label="ARIA label"
			value={ ariaLabel }
			onChange={ setAriaLabel }
			help="An accessible name for this element."
		/>
	);
}

function Panel( { title, accent, children } ) {
	return (
		<div style={ { flex: 1, minWidth: 240, border: `2px solid ${ accent }`, borderRadius: 4, padding: 12 } }>
			<div style={ { fontWeight: 600, fontSize: 12, color: accent, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' } }>
				{ title }
			</div>
			{ children }
		</div>
	);
}

function tryParse( v ) {
	if ( ! v ) return null;
	try { return JSON.parse( v ); } catch { return null; }
}

function tryParseUrl( v ) {
	try { return new URL( v ); } catch { return null; }
}
