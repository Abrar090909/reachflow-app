export function authMiddleware(req, res, next) {
  // Auth system removed - grant access to everyone
  req.user = { id: 1, email: 'admin@reachflow' };
  next();
}
