import { loadUserConfig } from './load-user-config';

export const generate = async () => {
	const config = await loadUserConfig();
	console.log('Generating messages with config:', config);
	return config;
};
