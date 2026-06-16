import { useState, useEffect } from '@wordpress/element';
import {
	contrastRatio,
	passesAA,
	passesAAA,
	nearestCompliantShade,
	formatRatio,
} from '../utils/contrast';

/**
 * Color contrast picker for Bucket B color-contrast decisions.
 *
 * Props:
 *   initialFg     {string}   Starting foreground hex (from node_data_json)
 *   initialBg     {string}   Starting background hex (from node_data_json)
 *   isLargeText   {boolean}  Whether the text qualifies as WCAG large text (≥18pt or bold ≥14pt)
 *   onChange      {function} Called with { fg, bg, ratio, passesAA } whenever colors change
 */
export default function ContrastPicker( { initialFg = '#000000', initialBg = '#ffffff', isLargeText = false, onChange } ) {
	const [ fg, setFg ] = useState( initialFg );
	const [ bg, setBg ] = useState( initialBg );

	const ratio    = contrastRatio( fg, bg );
	const aa       = passesAA( ratio, isLargeText );
	const aaa      = passesAAA( ratio, isLargeText );
	const suggestion = ! aa ? nearestCompliantShade( fg, bg, isLargeText ) : null;

	useEffect( () => {
		onChange?.( { fg, bg, ratio, passesAA: aa } );
	}, [ fg, bg ] );

	const statusColor = aa ? '#1a7f37' : '#cf222e';
	const aaThreshold = isLargeText ? '3.0' : '4.5';

	return (
		<div style={ { border: '1px solid #ddd', borderRadius: 4, padding: 16, background: '#fafafa' } }>
			<div style={ { display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' } }>
				{/* Color pickers */}
				<div>
					<label style={ { display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 } }>
						Foreground
					</label>
					<div style={ { display: 'flex', alignItems: 'center', gap: 8 } }>
						<input
							type="color"
							value={ fg }
							onChange={ ( e ) => setFg( e.target.value ) }
							style={ { width: 40, height: 36, cursor: 'pointer', border: '1px solid #ccc', borderRadius: 3 } }
						/>
						<input
							type="text"
							value={ fg }
							onChange={ ( e ) => {
								const v = e.target.value;
								if ( /^#[0-9a-fA-F]{6}$/.test( v ) ) setFg( v );
							} }
							style={ { width: 90, fontFamily: 'monospace', fontSize: 13 } }
							maxLength={ 7 }
						/>
					</div>
				</div>

				<div>
					<label style={ { display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 } }>
						Background
					</label>
					<div style={ { display: 'flex', alignItems: 'center', gap: 8 } }>
						<input
							type="color"
							value={ bg }
							onChange={ ( e ) => setBg( e.target.value ) }
							style={ { width: 40, height: 36, cursor: 'pointer', border: '1px solid #ccc', borderRadius: 3 } }
						/>
						<input
							type="text"
							value={ bg }
							onChange={ ( e ) => {
								const v = e.target.value;
								if ( /^#[0-9a-fA-F]{6}$/.test( v ) ) setBg( v );
							} }
							style={ { width: 90, fontFamily: 'monospace', fontSize: 13 } }
							maxLength={ 7 }
						/>
					</div>
				</div>

				{/* Result */}
				<div style={ { flexGrow: 1 } }>
					<div style={ { fontWeight: 600, fontSize: 13, marginBottom: 4 } }>Result</div>

					{/* Live preview swatch */}
					<div style={ {
						background: bg,
						color: fg,
						padding: '8px 12px',
						borderRadius: 4,
						fontSize: 15,
						fontWeight: isLargeText ? 700 : 400,
						border: '1px solid #ddd',
						marginBottom: 8,
						minWidth: 160,
					} }>
						Sample text
					</div>

					<div style={ { fontSize: 22, fontWeight: 700, color: statusColor, lineHeight: 1 } }>
						{ formatRatio( ratio ) }
					</div>

					<div style={ { display: 'flex', gap: 8, marginTop: 6 } }>
						<Badge pass={ aa } label={ `AA (${ aaThreshold }:1)` } />
						<Badge pass={ aaa } label={ `AAA (${ isLargeText ? '4.5' : '7.0' }:1)` } />
					</div>
				</div>
			</div>

			{/* Nearest compliant shade suggestion */}
			{ suggestion && (
				<div style={ { marginTop: 12, padding: '8px 12px', background: '#fff8c5', border: '1px solid #d4a017', borderRadius: 4, fontSize: 13 } }>
					<strong>Nearest compliant foreground:</strong>{ ' ' }
					<code style={ { fontFamily: 'monospace' } }>{ suggestion }</code>
					{ ' ' }
					(ratio{ ' ' }
					{ formatRatio( contrastRatio( suggestion, bg ) ) })
					{ ' ' }
					<button
						type="button"
						className="button button-small"
						onClick={ () => setFg( suggestion ) }
						style={ { marginLeft: 8 } }
					>
						Use this
					</button>
				</div>
			) }
		</div>
	);
}

function Badge( { pass, label } ) {
	return (
		<span style={ {
			display: 'inline-block',
			padding: '2px 8px',
			borderRadius: 99,
			fontSize: 12,
			fontWeight: 600,
			background: pass ? '#dafbe1' : '#ffeef0',
			color: pass ? '#1a7f37' : '#cf222e',
			border: `1px solid ${ pass ? '#a7f3c0' : '#ffc1c5' }`,
		} }>
			{ pass ? '✓' : '✗' } { label }
		</span>
	);
}
