<?php

declare(strict_types=1);

namespace Trailproof\Ai;

class SuggestionService {

	private const API_URL        = 'https://api.anthropic.com/v1/messages';
	private const MODEL          = 'claude-haiku-4-5-20251001';
	private const MAX_TOKENS     = 150;
	private const API_VERSION    = '2023-06-01';

	public function __construct( private readonly string $api_key ) {}

	/**
	 * Generate an accessible text suggestion for a Bucket B issue.
	 *
	 * @param array $issue     Row from tp_issues (rule_id, description, selector).
	 * @param array $node_data Decoded node_data_json (html, alt, fg_color, etc.).
	 * @return string          Suggested text to pre-fill the decision input.
	 * @throws \RuntimeException On API error or unexpected response.
	 */
	public function suggest( array $issue, array $node_data ): string {
		$prompt = $this->build_prompt( $issue['rule_id'], $node_data );

		$response = wp_remote_post(
			self::API_URL,
			[
				'timeout' => 15,
				'headers' => [
					'x-api-key'         => $this->api_key,
					'anthropic-version' => self::API_VERSION,
					'content-type'      => 'application/json',
				],
				'body' => wp_json_encode( [
					'model'      => self::MODEL,
					'max_tokens' => self::MAX_TOKENS,
					'messages'   => [
						[ 'role' => 'user', 'content' => $prompt ],
					],
				] ),
			]
		);

		if ( is_wp_error( $response ) ) {
			throw new \RuntimeException( 'API request failed: ' . $response->get_error_message() ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
		}

		$code = wp_remote_retrieve_response_code( $response );
		if ( $code !== 200 ) {
			throw new \RuntimeException( 'API returned HTTP ' . $code ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		$text = $body['content'][0]['text'] ?? '';

		if ( $text === '' ) {
			throw new \RuntimeException( 'Empty suggestion returned from API.' );
		}

		return trim( $text );
	}

	private function build_prompt( string $rule_id, array $node_data ): string {
		$html = $node_data['html'] ?? '';

		return match ( true ) {
			in_array( $rule_id, [ 'image-alt', 'input-image-alt', 'area-alt' ], true ) =>
				"Write a concise, descriptive alt attribute (under 100 characters) for the following HTML image element. " .
				"Return only the alt text itself — no quotes, no extra words.\n\nElement: " . $html,

			in_array( $rule_id, [ 'link-name', 'button-name' ], true ) =>
				"Write a clear, descriptive accessible name for the following HTML link or button. " .
				"Return only the accessible name — no quotes, no extra words.\n\nElement: " . $html,

			$rule_id === 'label' =>
				"Write a concise, human-readable form field label for the following HTML input. " .
				"Return only the label text — no quotes, no extra words.\n\nElement: " . $html,

			default =>
				"Write a concise, descriptive aria-label attribute value for the following HTML element. " .
				"Return only the aria-label text — no quotes, no extra words.\n\nElement: " . $html,
		};
	}
}
