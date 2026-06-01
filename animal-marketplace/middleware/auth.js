const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

const isSeller = (req, res, next) => {
  if (req.isAuthenticated() && req.user.isSeller) {
    return next();
  }
  res.status(403).json({ error: 'Seller access required' });
};

module.exports = { isAuthenticated, isSeller };
