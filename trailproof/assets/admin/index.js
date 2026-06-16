import apiFetch from '@wordpress/api-fetch';
import { render } from '@wordpress/element';
import App from './components/App';

// Configure REST nonce once for all apiFetch calls in this app
if ( window.trailproofData?.nonce ) {
	apiFetch.use( apiFetch.createNonceMiddleware( window.trailproofData.nonce ) );
}

const root = document.getElementById( 'trailproof-app' );
if ( root ) {
	render( <App />, root );
}
