const crypto = require('crypto');

function uuid() {
  return crypto.randomUUID();
}

function validate(obj, rules) {
  const errors = [];
  for (const [key, rule] of Object.entries(rules)) {
    const val = obj[key];
    if (rule.required && (val === undefined || val === null || val === '')) {
      errors.push(`${key} is required`);
      continue;
    }
    if (val === undefined || val === null) continue;
    if (rule.type === 'number' && typeof val !== 'number') errors.push(`${key} must be number`);
    if (rule.type === 'string' && typeof val !== 'string') errors.push(`${key} must be string`);
    if (rule.enum && !rule.enum.includes(val)) errors.push(`${key} must be one of ${rule.enum.join(',')}`);
    if (rule.min !== undefined && val < rule.min) errors.push(`${key} must be >= ${rule.min}`);
    if (rule.max !== undefined && val > rule.max) errors.push(`${key} must be <= ${rule.max}`);
  }
  return errors;
}

module.exports = { uuid, validate };
