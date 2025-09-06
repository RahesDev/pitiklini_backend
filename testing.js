const axios = require('axios');
const sodium = require('libsodium-wrappers');
require('dotenv').config();
async function getSignedPrivateKeyShare(url) {
    await sodium.ready;  // Ensure sodium is ready

    // Debugging: Log URL to make sure it reaches here
    console.log('Signing URL:', url);

    // Generate the signature
    const message = Buffer.from(url);  // URL to be signed
    const privateKey = Buffer.from(process.env.LIBSODIUMPRIVATE_KEY, 'hex');  // Replace with your private key
    
    // Debugging: Log the private key (masked)
    console.log('Private Key (masked):', privateKey.toString('hex').slice(0, 8) + '...');

    const signature = sodium.crypto_sign_detached(message, privateKey);

    // Debugging: Log the generated signature
    console.log('X-Signature:', Buffer.from(signature).toString('hex'));

    // Send GET request with the signature as a header
    const response = await axios.get(url, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.AUTH_TOKEN}`,
            'X-Signature': Buffer.from(signature).toString('hex')  // Attach signature here
        }
    });

    return response.data;  // Return response from API
}

// Test function (you can call it for testing)
(async () => {
    try {
        const data = await getSignedPrivateKeyShare('http://localhost:3001/api/v1/privateKeyShare/getPrivateKeyShare/1');
        console.log('Response Data:', data);
    } catch (error) {
        console.error('Error:', error.message);
    }
})();
