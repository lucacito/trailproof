import { __ } from '@wordpress/i18n';

const card = {
	background:   '#fff',
	borderRadius: 8,
	boxShadow:    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
	border:       '1px solid #E8ECF2',
};

const TOOLS = [
	{
		key:     'wave',
		name:    'WAVE',
		tagline: __( 'WebAIM — visual overlay of errors, alerts, and structure', 'trailproof' ),
		color:   '#1D4ED8',
		bg:      '#EFF6FF',
		border:  '#BFDBFE',
		icon:    '〰️',
		url:     ( siteUrl ) => `https://wave.webaim.org/report#/${ encodeURIComponent( siteUrl ) }`,
	},
	{
		key:     'lighthouse',
		name:    'Google Lighthouse',
		tagline: __( 'PageSpeed Insights — accessibility score + audit breakdown', 'trailproof' ),
		color:   '#065F46',
		bg:      '#ECFDF5',
		border:  '#A7F3D0',
		icon:    '💡',
		url:     ( siteUrl ) => `https://pagespeed.web.dev/report?url=${ encodeURIComponent( siteUrl ) }`,
	},
	{
		key:     'achecker',
		name:    'AChecker',
		tagline: __( 'ATAG-based validator — detailed WCAG guideline-by-guideline results', 'trailproof' ),
		color:   '#7C3AED',
		bg:      '#F5F3FF',
		border:  '#DDD6FE',
		icon:    '✔️',
		url:     ( siteUrl ) => `https://achecker.achecks.ca/checker/index.php?uri=${ encodeURIComponent( siteUrl ) }`,
	},
];

export default function ImpactComparison() {
	const siteUrl = window.trailproofData?.siteUrl ?? '';

	return (
		<div style={ { maxWidth: 680 } }>

			{/* Heading */}
			<div style={ { marginBottom: 24 } }>
				<div style={ { fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 } }>
					{ __( 'Analysis', 'trailproof' ) }
				</div>
				<h2 style={ { margin: 0, fontSize: 20, fontWeight: 700, color: '#1A2742' } }>
					{ __( 'Accessibility Impact Test', 'trailproof' ) }
				</h2>
				<p style={ { fontSize: 13, color: '#64748B', margin: '6px 0 0', lineHeight: 1.6 } }>
					{ __( 'Run your site through these external tools before and after enabling TrailProof to measure real improvement. Each link opens the checker with your site URL already filled in.', 'trailproof' ) }
				</p>
			</div>

			<div style={ { display: 'flex', flexDirection: 'column', gap: 14 } }>
				{ TOOLS.map( tool => (
					<div key={ tool.key } style={ {
						...card,
						padding:     '20px 24px',
						display:     'flex',
						alignItems:  'center',
						gap:         20,
						background:  tool.bg,
						borderColor: tool.border,
					} }>
						<span style={ { fontSize: 28, flexShrink: 0 } } aria-hidden="true">{ tool.icon }</span>
						<div style={ { flex: 1, minWidth: 0 } }>
							<div style={ { fontSize: 15, fontWeight: 700, color: '#1A2742', marginBottom: 3 } }>
								{ tool.name }
							</div>
							<div style={ { fontSize: 12, color: '#475569', lineHeight: 1.5 } }>
								{ tool.tagline }
							</div>
						</div>
						<a
							href={ tool.url( siteUrl ) }
							target="_blank"
							rel="noopener noreferrer"
							className="button button-primary"
							style={ {
								flexShrink:      0,
								fontSize:        13,
								background:      tool.color,
								borderColor:     tool.color,
								color:           '#fff',
								textDecoration:  'none',
								whiteSpace:      'nowrap',
							} }
						>
							{ __( 'Run check →', 'trailproof' ) }
						</a>
					</div>
				) ) }
			</div>

			<div style={ {
				marginTop:    20,
				background:   '#FFFBEB',
				border:       '1px solid #FDE68A',
				borderRadius: 6,
				padding:      '12px 16px',
				fontSize:     12,
				color:        '#92400E',
				lineHeight:   1.6,
			} }>
				<strong>{ __( 'Tip:', 'trailproof' ) }</strong>{ ' ' }
				{ __( 'Run each tool once with TrailProof disabled and once with it enabled to see the before/after difference. Screenshot or export both reports to include in your accessibility documentation.', 'trailproof' ) }
			</div>

		</div>
	);
}
