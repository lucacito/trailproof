import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, TextareaControl, TextControl, Notice, Spinner } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import ContrastPicker from './ContrastPicker';

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

	// Per-rule payload state
	const [ contrastData, setContrastData ] = useState( null );
	const [ altText, setAltText ]           = useState( nodeData?.alt || '' );
	const [ linkText, setLinkText ]         = useState( '' );
	const [ ariaLabel, setAriaLabel ]       = useState( '' );
	const [ pageTitle, setPageTitle ]       = useState( nodeData?.title || '' );

	const ruleId = issue.rule_id;

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
			onDecision?.( { ...issue, status: action === 'apply' ? 'fixed' : action === 'na' ? 'na' : 'deferred' } );
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
					transform_type: 'add_aria_label',   // placeholder — contrast fix is CSS, Phase 3
					payload: { fg: contrastData.fg, bg: contrastData.bg },
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
							style={ { fontSize: 12, color: '#2563EB', fontWeight: 600, textDecoration: 'none', fontFamily: 'monospace' } }
						>
							{ pagePath }
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

			{/* Before panel */}
			<div style={ { display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' } }>
				<Panel title={ __( 'What it looks like now', 'trailproof' ) } accent="#cf222e">
					<BeforeContent ruleId={ ruleId } nodeData={ nodeData } />
				</Panel>

				{/* After / fix input */}
				<Panel title={ __( 'What the fix will do', 'trailproof' ) } accent="#1a7f37">
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
				<Button variant="primary" onClick={ handleApply } disabled={ saving }>
					{ __( 'Apply this fix', 'trailproof' ) }
				</Button>
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

function badgeStyle( bucket ) {
	const colors = { A: [ '#d1ecf1', '#0c5460' ], B: [ '#fff3cd', '#856404' ], C: [ '#e2e3e5', '#383d41' ] };
	const [ bg, color ] = colors[ bucket ] || colors.C;
	return {
		display: 'inline-block',
		padding: '1px 8px',
		borderRadius: 99,
		fontSize: 11,
		fontWeight: 700,
		background: bg,
		color,
		marginLeft: 6,
	};
}

function tryParse( v ) {
	if ( ! v ) return null;
	try { return JSON.parse( v ); } catch { return null; }
}

function tryParseUrl( v ) {
	try { return new URL( v ); } catch { return null; }
}
