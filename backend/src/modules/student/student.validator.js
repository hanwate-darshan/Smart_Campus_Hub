const Joi = require('joi');

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).optional().allow('').messages({
    'string.pattern.base': 'Phone must be exactly 10 digits',
  }),
  bio: Joi.string().max(200).optional().allow(''),
  department: Joi.string().trim().max(100).optional().allow(''),
  year: Joi.string().valid('1st', '2nd', '3rd', '4th').optional().allow(''),
});

module.exports = {
  updateProfileSchema,
};
