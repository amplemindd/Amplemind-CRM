// Admin ke notices - employees ko unke dashboard par dikhte hain
const db = require('../config/db');
module.exports = require('../utils/crud')('announcements', { beforeCreate: async d => { d.posted_on = d.posted_on || db.today; } });
