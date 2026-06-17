<?php

declare(strict_types=1);

namespace Trailproof\Report;

use Trailproof\Repository\IssueRepository;
use Trailproof\Repository\ScanRepository;

class AccessibilityStatement {

	public function __construct(
		private readonly ScanRepository  $scan_repo,
		private readonly IssueRepository $issue_repo
	) {}

	/**
	 * Generate an HTML accessibility statement string.
	 * Intended to be exported to a WordPress page or downloaded as HTML.
	 *
	 * Language deliberately avoids "ADA", "fully compliant", or "lawsuit-proof".
	 */
	public function generate(): string {
		$site_name    = get_bloginfo( 'name' );
		$site_url     = esc_url( home_url() );
		$contact      = get_option( 'admin_email', '' );
		$date         = wp_date( 'F j, Y' );
		$last_scan    = $this->scan_repo->get_last_scan_at();
		$scan_date    = $last_scan ? wp_date( 'F j, Y', strtotime( $last_scan ) ) : __( 'Not yet scanned', 'trailproof' );
		$by_bucket    = $this->issue_repo->count_by_bucket();
		$by_status    = $this->issue_repo->count_by_status();
		$open         = (int) ( $by_status['open'] ?? 0 ) + (int) ( $by_status['regressed'] ?? 0 );
		$fixed        = (int) ( $by_status['fixed'] ?? 0 );
		$total        = array_sum( $by_bucket );
		$settings     = (array) get_option( 'trailproof_settings', [] );
		$white_label  = ! empty( $settings['white_label'] );

		ob_start();
		?>
<!DOCTYPE html>
<html lang="<?php echo esc_attr( get_bloginfo( 'language' ) ); ?>">
<head>
<meta charset="UTF-8">
<title><?php
		/* translators: %s: site name */
		printf( esc_html__( 'Accessibility Statement — %s', 'trailproof' ), esc_html( $site_name ) ); ?></title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1d2327; line-height: 1.6; }
  h1 { border-bottom: 2px solid #e0e0e0; padding-bottom: .5rem; }
  h2 { margin-top: 2rem; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid #ccc; padding: .5rem .75rem; text-align: left; }
  th { background: #f6f7f7; }
  .meta { color: #646970; font-size: .875rem; }
</style>
</head>
<body>

<h1><?php
/* translators: %s: site name */
printf( esc_html__( 'Accessibility Statement for %s', 'trailproof' ), esc_html( $site_name ) ); ?></h1>

<p><?php
/* translators: %s: site name */
printf(
	esc_html__( '%s is committed to ensuring digital accessibility for people of all abilities, including those with visual, auditory, motor, and cognitive disabilities. We actively work to improve our website in accordance with the Web Content Accessibility Guidelines (WCAG) 2.1, Level AA.', 'trailproof' ),
	esc_html( $site_name )
); ?></p>

<h2><?php esc_html_e( 'Conformance Status', 'trailproof' ); ?></h2>
<p><?php
/* translators: 1: site name, 2: conformance status wrapped in <strong> tags */
printf(
	esc_html__( '%1$s is %2$s with WCAG 2.1 Level AA. "Partially conformant" means that some parts of the content do not fully conform to the accessibility standard.', 'trailproof' ),
	esc_html( $site_name ),
	'<strong>' . esc_html__( 'partially conformant', 'trailproof' ) . '</strong>'
); ?></p>
<p><?php esc_html_e( 'We are engaged in systematic, documented remediation to increase conformance. This statement documents that ongoing effort.', 'trailproof' ); ?></p>

<h2><?php esc_html_e( 'Technical Specifications', 'trailproof' ); ?></h2>
<p><?php esc_html_e( 'Accessibility of this website relies on the following technologies:', 'trailproof' ); ?></p>
<ul>
  <li>HTML</li>
  <li>CSS</li>
  <li>JavaScript</li>
</ul>
<p><?php esc_html_e( 'These technologies are relied upon for conformance with the accessibility standard used.', 'trailproof' ); ?></p>

<h2><?php esc_html_e( 'Assessment Approach', 'trailproof' ); ?></h2>
<p><?php
/* translators: %s: site name */
printf(
	esc_html__( '%s assessed the accessibility of this website through:', 'trailproof' ),
	esc_html( $site_name )
); ?></p>
<ul>
  <li><?php esc_html_e( 'Automated evaluation using axe-core (Deque Systems)', 'trailproof' ); ?></li>
  <li><?php esc_html_e( 'Automated structural analysis (DOMDocument pass)', 'trailproof' ); ?></li>
  <li><?php esc_html_e( 'Manual review of detected issues requiring human judgment', 'trailproof' ); ?></li>
</ul>
<p class="meta"><?php esc_html_e( 'Note: automated testing typically detects approximately one-third of WCAG success criteria. Manual evaluation addresses the remainder.', 'trailproof' ); ?></p>

<h2><?php esc_html_e( 'Remediation Summary', 'trailproof' ); ?></h2>
<p><?php
/* translators: %s: date of most recent accessibility evaluation */
printf(
	esc_html__( 'Most recent evaluation: %s', 'trailproof' ),
	'<strong>' . esc_html( $scan_date ) . '</strong>'
); ?></p>

<table>
  <thead><tr>
    <th><?php esc_html_e( 'Category', 'trailproof' ); ?></th>
    <th><?php esc_html_e( 'Count', 'trailproof' ); ?></th>
    <th><?php esc_html_e( 'Description', 'trailproof' ); ?></th>
  </tr></thead>
  <tbody>
    <tr>
      <td><?php esc_html_e( 'Auto-fixable (Bucket A)', 'trailproof' ); ?></td>
      <td><?php echo (int) $by_bucket['A']; ?></td>
      <td><?php esc_html_e( 'Machine-detectable issues with a safe, derivable fix.', 'trailproof' ); ?></td>
    </tr>
    <tr>
      <td><?php esc_html_e( 'Decision required (Bucket B)', 'trailproof' ); ?></td>
      <td><?php echo (int) $by_bucket['B']; ?></td>
      <td><?php esc_html_e( 'Machine-detected issues where the correct fix is a human judgment call (e.g. color contrast, heading hierarchy).', 'trailproof' ); ?></td>
    </tr>
    <tr>
      <td><?php esc_html_e( 'Manual review (Bucket C)', 'trailproof' ); ?></td>
      <td><?php echo (int) $by_bucket['C']; ?></td>
      <td><?php esc_html_e( 'Issues requiring manual verification (e.g. keyboard operability, captions, reading order).', 'trailproof' ); ?></td>
    </tr>
    <tr>
      <td><strong><?php esc_html_e( 'Currently open', 'trailproof' ); ?></strong></td>
      <td><strong><?php echo (int) $open; ?></strong></td>
      <td><?php esc_html_e( 'Known open issues under active remediation.', 'trailproof' ); ?></td>
    </tr>
    <tr>
      <td><?php esc_html_e( 'Remediated', 'trailproof' ); ?></td>
      <td><?php echo (int) $fixed; ?></td>
      <td><?php esc_html_e( 'Issues corrected and confirmed.', 'trailproof' ); ?></td>
    </tr>
  </tbody>
</table>

<h2><?php esc_html_e( 'Known Limitations', 'trailproof' ); ?></h2>
<p><?php esc_html_e( 'The following areas are outside the automated detection and correction scope of this tool and are addressed through manual review:', 'trailproof' ); ?></p>
<ul>
  <li><?php esc_html_e( 'Content within third-party embedded iframes (e.g. maps, social media widgets)', 'trailproof' ); ?></li>
  <li><?php esc_html_e( 'Third-party form plugin internals', 'trailproof' ); ?></li>
  <li><?php esc_html_e( 'PDF documents (require separate remediation)', 'trailproof' ); ?></li>
  <li><?php esc_html_e( 'Video captions and audio transcripts (require manual authoring)', 'trailproof' ); ?></li>
</ul>

<h2><?php esc_html_e( 'Feedback and Contact', 'trailproof' ); ?></h2>
<p><?php esc_html_e( 'We welcome feedback on the accessibility of this website. If you encounter barriers or have difficulty accessing content, please contact us:', 'trailproof' ); ?></p>
<?php if ( $contact ) : ?>
<p><?php
/* translators: %s: email address as a mailto hyperlink */
printf( esc_html__( 'Email: %s', 'trailproof' ), '<a href="mailto:' . esc_attr( $contact ) . '">' . esc_html( $contact ) . '</a>' ); ?></p>
<?php endif; ?>
<p><?php esc_html_e( 'We aim to respond to accessibility feedback within 2 business days.', 'trailproof' ); ?></p>

<h2><?php esc_html_e( 'Enforcement Procedure', 'trailproof' ); ?></h2>
<p><?php esc_html_e( 'If you are not satisfied with our response, you may contact the relevant authority in your jurisdiction. In the United States, the U.S. Department of Justice enforces Title III of the ADA.', 'trailproof' ); ?></p>

<hr>
<p class="meta">
  <?php
  /* translators: %s: date the accessibility statement was prepared */
  printf( esc_html__( 'Statement prepared: %s', 'trailproof' ), esc_html( $date ) ); ?><br>
  <?php
  /* translators: %s: date of the last accessibility evaluation */
  printf( esc_html__( 'Last evaluated: %s', 'trailproof' ), esc_html( $scan_date ) ); ?>
  <?php if ( ! $white_label ) : ?><br>
  <?php esc_html_e( 'Accessibility monitoring powered by Trailproof.', 'trailproof' ); ?>
  <?php endif; ?>
</p>

</body>
</html>
		<?php
		return (string) ob_get_clean();
	}
}
