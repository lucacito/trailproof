/**
 * Canonical status badge — used everywhere an issue status appears.
 *
 * Translates raw DB status values into plain-English labels with consistent
 * colors. Bucket context adjusts the label for "fixed" issues.
 *
 * Props:
 *   status  {string}  DB status: open | regressed | fixed | deferred | na
 *   bucket  {string}  A | B | C  (optional — adjusts label for fixed)
 *   size    {string}  'sm' | 'md' (default 'md')
 */

const STATUS_META = {
	open: {
		label: 'Needs action',
		bg:    '#ffeef0',
		color: '#cf222e',
		dot:   '#cf222e',
	},
	regressed: {
		label: 'Regressed',
		bg:    '#ffd7d5',
		color: '#82071e',
		dot:   '#82071e',
	},
	fixed: {
		label: 'Fixed',
		bg:    '#dafbe1',
		color: '#1a7f37',
		dot:   '#1a7f37',
	},
	deferred: {
		label: 'Deferred',
		bg:    '#fff8c5',
		color: '#7d4e00',
		dot:   '#d4a017',
	},
	na: {
		label: 'Not applicable',
		bg:    '#f0f0f0',
		color: '#57606a',
		dot:   '#8c959f',
	},
};

// When a Bucket B issue is "fixed", it means a human decision was applied.
// When a Bucket C issue is "fixed" (checklist sign-off), it means "Reviewed".
const FIXED_LABEL_BY_BUCKET = {
	B: 'Decided',
	C: 'Reviewed',
};

export default function StatusBadge( { status, bucket, size = 'md' } ) {
	const meta = STATUS_META[ status ] ?? STATUS_META.open;

	let label = meta.label;
	if ( status === 'fixed' && bucket && FIXED_LABEL_BY_BUCKET[ bucket ] ) {
		label = FIXED_LABEL_BY_BUCKET[ bucket ];
	}

	const pad    = size === 'sm' ? '1px 7px' : '3px 10px';
	const fsize  = size === 'sm' ? 11 : 12;

	return (
		<span style={ {
			display:      'inline-flex',
			alignItems:   'center',
			gap:          5,
			padding:      pad,
			borderRadius: 99,
			fontSize:     fsize,
			fontWeight:   600,
			background:   meta.bg,
			color:        meta.color,
			whiteSpace:   'nowrap',
		} }>
			<span style={ {
				width:        6,
				height:       6,
				borderRadius: '50%',
				background:   meta.dot,
				display:      'inline-block',
				flexShrink:   0,
			} } />
			{ label }
		</span>
	);
}

/**
 * Derive a single representative status from a grouped issue row.
 * Logic: if any regressed → 'regressed'; if any open → 'open';
 *         if any fixed → 'fixed'; if all deferred → 'deferred'; else 'na'.
 */
export function groupStatus( group ) {
	if ( group.regressed_count > 0 ) return 'regressed';
	if ( group.open_count      > 0 ) return 'open';
	if ( group.fixed_count     > 0 ) return 'fixed';
	if ( group.deferred_count  > 0 ) return 'deferred';
	return 'na';
}
