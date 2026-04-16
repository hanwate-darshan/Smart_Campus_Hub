const Joi = require('joi');

const createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().min(8).required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).optional().allow('').messages({
    'string.pattern.base': 'Phone must be exactly 10 digits',
  }),
  role: Joi.string().valid('teacher', 'security').required().messages({
    'any.only': 'Role must be either teacher or security',
  }),
});

const rejectUserSchema = Joi.object({
  reason: Joi.string().max(500).optional().allow(''),
});

const listUsersSchema = Joi.object({
  role: Joi.string().valid('student', 'teacher', 'admin', 'security').optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'suspended').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = {
  createUserSchema,
  rejectUserSchema,
  listUsersSchema,
};
