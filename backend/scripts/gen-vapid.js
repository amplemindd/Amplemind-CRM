// Push notification ki keys banane ke liye (sirf ek baar): npm run vapid
// Jo 3 line dikhe unhe .env / GoDaddy environment variables me daal do.
const crypto = require('crypto');
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pj = publicKey.export({ format: 'jwk' }), vj = privateKey.export({ format: 'jwk' });
const pub = Buffer.concat([Buffer.from([4]), Buffer.from(pj.x, 'base64url'), Buffer.from(pj.y, 'base64url')]).toString('base64url');
console.log('\nYeh 3 line .env (aur GoDaddy ke environment variables) me daalo:\n');
console.log('VAPID_PUBLIC_KEY=' + pub);
console.log('VAPID_PRIVATE_KEY=' + vj.d);
console.log('VAPID_SUBJECT=mailto:aapka-email@example.com\n');
console.log('Dhyan: private key kisi ko mat dikhana aur GitHub par mat daalna.\n');
