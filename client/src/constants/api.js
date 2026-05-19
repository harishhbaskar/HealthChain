const protocolDefault =
	typeof window !== 'undefined' && window.location.protocol === 'https:'
		? 'https://localhost:3443/api'
		: 'http://localhost:3000/api';

export const API_URL = import.meta.env.VITE_API_URL || protocolDefault;
