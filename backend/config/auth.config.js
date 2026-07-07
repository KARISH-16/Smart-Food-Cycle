// In a production deployment this secret must come from a secure environment
// variable. A fallback is provided here only so the demo runs instantly in
// sandboxes like StackBlitz without any extra configuration steps.
const JWT_SECRET = process.env.JWT_SECRET || 'smart-food-cycle-demo-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

module.exports = { JWT_SECRET, JWT_EXPIRES_IN };
