
const allowedIps = ['127.0.0.1', '::ffff:127.0.0.1','::1','62.72.31.215']; 

const whitelistMiddleware = (req, res, next) => {
  const requestIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
  console.log("Request IP:", requestIp);

  if (allowedIps.includes(requestIp)) {
    next();
  } else {
    res.status(403).json({ status: false, message: "Forbidden: IP not allowed" });
  }
};

module.exports = whitelistMiddleware;
