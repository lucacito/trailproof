<?php

declare(strict_types=1);

namespace Trailproof\Admin;

class SettingsPage {

	private const OPTION_KEY    = 'trailproof_settings';
	private const SETTINGS_GROUP = 'trailproof_settings_group';
	private const PAGE_SLUG     = 'trailproof-settings';

	public function register_settings(): void {
		register_setting(
			self::SETTINGS_GROUP,
			self::OPTION_KEY,
			[
				'type'              => 'array',
				'sanitize_callback' => [ $this, 'sanitize_settings' ],
				'default'           => $this->defaults(),
			]
		);

		add_settings_section( 'trailproof_scan_scope', __( 'Scan Scope', 'trailproof' ), null, self::PAGE_SLUG );
		add_settings_section( 'trailproof_schedule', __( 'Schedule', 'trailproof' ), null, self::PAGE_SLUG );
		add_settings_section( 'trailproof_integrations', __( 'Integrations', 'trailproof' ), null, self::PAGE_SLUG );
		add_settings_section( 'trailproof_notifications', __( 'Notifications', 'trailproof' ), null, self::PAGE_SLUG );

		add_settings_field( 'post_types', __( 'Post Types to Scan', 'trailproof' ), [ $this, 'render_post_types_field' ], self::PAGE_SLUG, 'trailproof_scan_scope' );
		add_settings_field( 'url_include', __( 'URL Include Pattern', 'trailproof' ), [ $this, 'render_url_include_field' ], self::PAGE_SLUG, 'trailproof_scan_scope' );
		add_settings_field( 'url_exclude', __( 'URL Exclude Pattern', 'trailproof' ), [ $this, 'render_url_exclude_field' ], self::PAGE_SLUG, 'trailproof_scan_scope' );
		add_settings_field( 'scan_schedule', __( 'Scan Frequency', 'trailproof' ), [ $this, 'render_schedule_field' ], self::PAGE_SLUG, 'trailproof_schedule' );
		add_settings_field( 'white_label', __( 'White-Label Mode', 'trailproof' ), [ $this, 'render_white_label_field' ], self::PAGE_SLUG, 'trailproof_integrations' );
		add_settings_field( 'wave_api_key', __( 'WAVE API Key (optional)', 'trailproof' ), [ $this, 'render_wave_api_key_field' ], self::PAGE_SLUG, 'trailproof_integrations' );
		add_settings_field( 'claude_api_key', __( 'Claude API Key (AI Suggestions)', 'trailproof' ), [ $this, 'render_claude_api_key_field' ], self::PAGE_SLUG, 'trailproof_integrations' );
		add_settings_field( 'notification_email', __( 'Notification Email', 'trailproof' ), [ $this, 'render_notification_email_field' ], self::PAGE_SLUG, 'trailproof_notifications' );
		add_settings_field( 'notify_on_regression', __( 'Regression Alerts', 'trailproof' ), [ $this, 'render_notify_on_regression_field' ], self::PAGE_SLUG, 'trailproof_notifications' );
	}

	public function render(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
			<form method="post" action="options.php">
				<?php
				settings_fields( self::SETTINGS_GROUP );
				do_settings_sections( self::PAGE_SLUG );
				submit_button( __( 'Save Settings', 'trailproof' ) );
				?>
			</form>
		</div>
		<?php
	}

	public function render_post_types_field(): void {
		$settings   = $this->get_settings();
		$post_types = get_post_types( [ 'public' => true ], 'objects' );
		$selected   = (array) ( $settings['post_types'] ?? [] );

		foreach ( $post_types as $pt ) {
			printf(
				'<label><input type="checkbox" name="%1$s[post_types][]" value="%2$s" %3$s> %4$s</label><br>',
				esc_attr( self::OPTION_KEY ),
				esc_attr( $pt->name ),
				checked( in_array( $pt->name, $selected, true ), true, false ),
				esc_html( $pt->label )
			);
		}
	}

	public function render_url_include_field(): void {
		$settings = $this->get_settings();
		printf(
			'<input type="text" name="%1$s[url_include]" value="%2$s" class="regular-text" placeholder="/blog/*">
			<p class="description">%3$s</p>',
			esc_attr( self::OPTION_KEY ),
			esc_attr( $settings['url_include'] ),
			esc_html__( 'Glob-style pattern. Leave blank to include all in-scope URLs.', 'trailproof' )
		);
	}

	public function render_url_exclude_field(): void {
		$settings = $this->get_settings();
		printf(
			'<input type="text" name="%1$s[url_exclude]" value="%2$s" class="regular-text" placeholder="/thank-you/*">
			<p class="description">%3$s</p>',
			esc_attr( self::OPTION_KEY ),
			esc_attr( $settings['url_exclude'] ),
			esc_html__( 'Glob-style pattern for URLs to skip during scans.', 'trailproof' )
		);
	}

	public function render_schedule_field(): void {
		$settings  = $this->get_settings();
		$schedules = [
			'off'     => __( 'Off', 'trailproof' ),
			'daily'   => __( 'Daily', 'trailproof' ),
			'weekly'  => __( 'Weekly', 'trailproof' ),
			'monthly' => __( 'Monthly', 'trailproof' ),
		];
		echo '<select name="' . esc_attr( self::OPTION_KEY ) . '[scan_schedule]">';
		foreach ( $schedules as $value => $label ) {
			printf(
				'<option value="%1$s" %2$s>%3$s</option>',
				esc_attr( $value ),
				selected( $settings['scan_schedule'], $value, false ),
				esc_html( $label )
			);
		}
		echo '</select>';
	}

	public function render_white_label_field(): void {
		$settings = $this->get_settings();
		printf(
			'<label><input type="checkbox" name="%1$s[white_label]" value="1" %2$s> %3$s</label>
			<p class="description">%4$s</p>',
			esc_attr( self::OPTION_KEY ),
			checked( $settings['white_label'], true, false ),
			esc_html__( 'Hide Trailproof branding from exported reports', 'trailproof' ),
			esc_html__( 'Available in Agency tier.', 'trailproof' )
		);
	}

	public function render_wave_api_key_field(): void {
		$settings = $this->get_settings();
		$has_key  = ! empty( $settings['wave_api_key'] );
		printf(
			'<input type="password" name="%1$s[wave_api_key]" value="%2$s" class="regular-text" autocomplete="off">
			<p class="description">%3$s</p>',
			esc_attr( self::OPTION_KEY ),
			esc_attr( $has_key ? $settings['wave_api_key'] : '' ),
			esc_html__( 'Optional. Your own WebAIM WAVE API key for second-opinion scans. You are billed directly by WebAIM for usage.', 'trailproof' )
		);
	}

	public function render_claude_api_key_field(): void {
		$settings = $this->get_settings();
		$has_key  = ! empty( $settings['claude_api_key'] );
		printf(
			'<input type="password" name="%1$s[claude_api_key]" value="%2$s" class="regular-text" autocomplete="off">
			<p class="description">%3$s</p>',
			esc_attr( self::OPTION_KEY ),
			esc_attr( $has_key ? $settings['claude_api_key'] : '' ),
			esc_html__( 'Optional. Anthropic API key. When set, a "Suggest" button appears in the Bucket B decision screen to pre-fill alt text and link text using Claude. You are billed directly by Anthropic for usage.', 'trailproof' )
		);
	}

	public function render_notification_email_field(): void {
		$settings = $this->get_settings();
		printf(
			'<input type="email" name="%1$s[notification_email]" value="%2$s" class="regular-text" placeholder="%3$s">
			<p class="description">%4$s</p>',
			esc_attr( self::OPTION_KEY ),
			esc_attr( $settings['notification_email'] ),
			esc_attr( get_option( 'admin_email' ) ),
			esc_html__( 'Email address for scan notifications. Defaults to site admin email.', 'trailproof' )
		);
	}

	public function render_notify_on_regression_field(): void {
		$settings = $this->get_settings();
		printf(
			'<label><input type="checkbox" name="%1$s[notify_on_regression]" value="1" %2$s> %3$s</label>
			<p class="description">%4$s</p>',
			esc_attr( self::OPTION_KEY ),
			checked( $settings['notify_on_regression'], true, false ),
			esc_html__( 'Send an email when a scheduled scan detects accessibility regressions', 'trailproof' ),
			esc_html__( 'Requires a scan schedule other than "Off".', 'trailproof' )
		);
	}

	public function sanitize_settings( mixed $input ): array {
		$clean = $this->defaults();

		if ( ! is_array( $input ) ) {
			return $clean;
		}

		$valid_pts           = array_keys( get_post_types( [ 'public' => true ] ) );
		$submitted_pts       = is_array( $input['post_types'] ?? null ) ? $input['post_types'] : [];
		$clean['post_types'] = array_values( array_intersect( array_map( 'sanitize_key', $submitted_pts ), $valid_pts ) );

		$clean['url_include'] = sanitize_text_field( $input['url_include'] ?? '' );
		$clean['url_exclude'] = sanitize_text_field( $input['url_exclude'] ?? '' );

		$clean['scan_schedule'] = in_array( $input['scan_schedule'] ?? '', [ 'off', 'daily', 'weekly', 'monthly' ], true )
			? $input['scan_schedule']
			: 'weekly';

		$clean['white_label'] = ! empty( $input['white_label'] );

		// Keep any previously stored key when the field is submitted empty (browser doesn't send password field value on re-render).
		$submitted_key = sanitize_text_field( $input['wave_api_key'] ?? '' );
		if ( '' !== $submitted_key ) {
			$clean['wave_api_key'] = substr( $submitted_key, 0, 256 );
		} else {
			$existing              = (array) get_option( self::OPTION_KEY, [] );
			$clean['wave_api_key'] = $existing['wave_api_key'] ?? '';
		}

		$submitted_claude_key = sanitize_text_field( $input['claude_api_key'] ?? '' );
		if ( '' !== $submitted_claude_key ) {
			$clean['claude_api_key'] = substr( $submitted_claude_key, 0, 256 );
		} else {
			$existing                = (array) get_option( self::OPTION_KEY, [] );
			$clean['claude_api_key'] = $existing['claude_api_key'] ?? '';
		}

		$clean['notification_email']   = sanitize_email( $input['notification_email'] ?? '' );
		$clean['notify_on_regression'] = ! empty( $input['notify_on_regression'] );

		// fixes_enabled is toggled exclusively via REST API; preserve the stored value on HTML form saves.
		$existing_for_fixes         = (array) get_option( self::OPTION_KEY, [] );
		$clean['fixes_enabled']     = $existing_for_fixes['fixes_enabled'] ?? true;

		return $clean;
	}

	public function get_settings(): array {
		return wp_parse_args( (array) get_option( self::OPTION_KEY, [] ), $this->defaults() );
	}

	private function defaults(): array {
		return [
			'post_types'           => [ 'post', 'page' ],
			'url_include'          => '',
			'url_exclude'          => '',
			'scan_schedule'        => 'weekly',
			'white_label'          => false,
			'wave_api_key'         => '',
			'claude_api_key'       => '',
			'notification_email'   => '',
			'notify_on_regression' => true,
			'fixes_enabled'        => true,
		];
	}
}
