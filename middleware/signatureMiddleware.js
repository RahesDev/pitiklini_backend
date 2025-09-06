const sodium = require('libsodium-wrappers');

(async () => {
await sodium.ready;
})();

const verifySignature = async (req, res, next) => {
const receivedSignature = req.headers['x-signature'];
console.log('Received Signature:', receivedSignature);
const publicKeyHex = process.env.WALLET_TO_GEN_PUBLIC_KEY;
const publicKey = Buffer.from(publicKeyHex, 'hex');

if (!receivedSignature) {
return res.status(401).json({ status: false, message: "Signature required" });
}

try {
const message = Buffer.from(JSON.stringify(req.body), 'utf8');
const signature = Buffer.from(receivedSignature, 'hex');
console.log('Message:', message.toString('utf8'));
console.log('Signature:', signature.toString('hex'));
console.log('Public Key:', publicKey.toString('hex'));
const isValid = sodium.crypto_sign_verify_detached(signature, message, publicKey);

if (isValid) {
console.log("verified");
next();
} else {
console.log("Invalid signature");
return res.status(401).json({ status: false, message: "Invalid signature" });
}
} catch (error) {
console.error("Signature verification error:", error);
return res.status(500).json({ status: false, message: "Signature verification error", error });
}
};

module.exports = verifySignature;