// JWT secret: .env me JWT_SECRET do. Khali hai to har start par naya random banta hai (sab logout ho jate hain).
const crypto = require('crypto');
if (!process.env.JWT_SECRET) console.warn('Note: JWT_SECRET .env me khali hai. Deploy karte waqt zaroor bharo.');
module.exports = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
