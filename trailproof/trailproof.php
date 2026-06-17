<?php
/**
 * Plugin Name: Trailproof
 * Plugin URI:  https://trailproof.io
 * Description: Accessibility remediation and audit trail for Divi. Applies real source-level fixes as a non-destructive, fully revertable layer and produces a dated evidence package.
 * Version:     0.1.0
 * Author:      Trailproof
 * Author URI:  https://trailproof.io
 * Text Domain: trailproof
 * Domain Path: /languages
 * Requires at least: 6.4
 * Requires PHP: 8.1
 * License:     GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'TRAILPROOF_VERSION', '0.1.0' );
define( 'TRAILPROOF_FILE', __FILE__ );
define( 'TRAILPROOF_DIR', plugin_dir_path( __FILE__ ) );
define( 'TRAILPROOF_URL', plugin_dir_url( __FILE__ ) );

require_once TRAILPROOF_DIR . 'vendor/autoload.php';

register_activation_hook( TRAILPROOF_FILE, [ \Trailproof\Activator::class, 'activate' ] );
register_deactivation_hook( TRAILPROOF_FILE, [ \Trailproof\Deactivator::class, 'deactivate' ] );

add_action( 'plugins_loaded', [ \Trailproof\Plugin::class, 'init' ] );
