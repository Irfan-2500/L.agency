const { KEY_ID, enabled, send } = require("./_pay.js");
/* keyType: sirf ye batata hai ki Key ID sahi shuru hoti hai ya nahi (key khud nahi dikhati) */
module.exports = (req, res) => send(res, 200, { ok: true, payments: enabled(),
  keyType: /^rzp_live_/.test(KEY_ID) ? "live" : /^rzp_test_/.test(KEY_ID) ? "test" : KEY_ID ? "galat" : "khaali" });
