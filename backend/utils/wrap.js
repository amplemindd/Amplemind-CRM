// Route ka error pakadta hai. wrap.err(400,'msg') se status code ke sath error fek sakte ho.
const wrap = fn => (req, res) => fn(req, res).catch(e => {
  if (!e.status) console.error(e);
  res.status(e.status || 500).send(e.message);
});
wrap.err = (status, message) => Object.assign(new Error(message), { status });
module.exports = wrap;
