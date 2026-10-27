const { enabled, send } = require("./_pay.js");
module.exports = (req, res) => send(res, 200, { ok: true, payments: enabled() });
