const { Users } = require("../lib/store");

function currentUser(req) {
  if (!req.session || !req.session.userId) return null;
  const user = Users.findById(req.session.userId);
  if (!user) return null;
  return user;
}

function requireCustomer(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: "Bitte melde dich an." });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = currentUser(req);
  if (!user || user.role !== "admin") return res.status(401).json({ error: "Admin-Anmeldung erforderlich." });
  req.user = user;
  next();
}

function publicUser(user) {
  if (!user) return null;
  return { name: user.name, email: user.email, createdAt: user.created_at, role: user.role };
}

module.exports = { currentUser, requireCustomer, requireAdmin, publicUser };
