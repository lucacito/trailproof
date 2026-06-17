<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';

// ---------------------------------------------------------------------------
// Minimal WordPress function stubs for unit tests.
// These are the only WP functions used by the classes under test.
// Real integration tests against a WP install would not need these.
// ---------------------------------------------------------------------------

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(string $str): string {
        return trim(strip_tags($str));
    }
}

if (!function_exists('sanitize_key')) {
    function sanitize_key(string $key): string {
        return strtolower(preg_replace('/[^a-z0-9_\-]/i', '', strtolower($key)));
    }
}

if (!function_exists('sanitize_html_class')) {
    function sanitize_html_class(string $class): string {
        return preg_replace('/[^a-zA-Z0-9_\-]/', '', $class);
    }
}

if (!function_exists('wp_parse_url')) {
    function wp_parse_url(string $url, int $component = -1): mixed {
        return parse_url($url, $component);
    }
}

if (!function_exists('wp_json_encode')) {
    function wp_json_encode(mixed $data, int $flags = 0): string|false {
        return json_encode($data, $flags);
    }
}

if (!function_exists('get_locale')) {
    function get_locale(): string {
        return 'en_US';
    }
}

if (!function_exists('__')) {
    function __(string $text, string $domain = 'default'): string {
        return $text;
    }
}

if (!function_exists('esc_html')) {
    function esc_html(string $text): string {
        return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}

if (!function_exists('current_user_can')) {
    function current_user_can(string $capability): bool {
        return true;
    }
}

if (!function_exists('get_current_user_id')) {
    function get_current_user_id(): int {
        return 1;
    }
}

if (!function_exists('current_time')) {
    function current_time(string $type): string {
        return date('Y-m-d H:i:s');
    }
}

if (!function_exists('register_rest_route')) {
    function register_rest_route(string $namespace, string $route, array $args = []): bool {
        return true;
    }
}

// ---------------------------------------------------------------------------
// Minimal WordPress class stubs for REST API tests.
// ---------------------------------------------------------------------------

if (!class_exists('WP_REST_Server')) {
    class WP_REST_Server {
        const READABLE  = 'GET';
        const CREATABLE = 'POST';
        const EDITABLE  = 'POST, PUT, PATCH';
        const DELETABLE = 'DELETE';
        const ALLMETHODS = 'GET, POST, PUT, PATCH, DELETE';
    }
}

if (!class_exists('WP_REST_Request')) {
    class WP_REST_Request {
        private array $params = [];
        private array $json_params = [];

        public function get_param(string $key): mixed {
            return $this->params[$key] ?? null;
        }

        public function get_json_params(): array {
            return $this->json_params;
        }

        public function set_param(string $key, mixed $value): void {
            $this->params[$key] = $value;
        }

        public function set_json_params(array $params): void {
            $this->json_params = $params;
        }
    }
}

if (!class_exists('WP_REST_Response')) {
    class WP_REST_Response {
        private mixed $data;
        private int $status;

        public function __construct(mixed $data = null, int $status = 200) {
            $this->data   = $data;
            $this->status = $status;
        }

        public function get_data(): mixed {
            return $this->data;
        }

        public function get_status(): int {
            return $this->status;
        }
    }
}
