const Joi = require('joi');

const createComplaintSchema = Joi.object({
  title: Joi.string().trim().min(5).max(100).required().messages({
    'string.min': 'Title must be at least 5 characters long.',
    'string.max': 'Title cannot exceed 100 characters.',
    'any.required': 'Title is required.'
  }),
  description: Joi.string().trim().min(20).max(1000).required().messages({
    'string.min': 'Description must be at least 20 characters long.',
    'string.max': 'Description cannot exceed 1000 characters.',
    'any.required': 'Description is required.'
  }),
  category: Joi.string().valid('maintenance', 'hostel', 'food', 'wifi', 'academic', 'ragging', 'other').required().messages({
    'any.only': 'Invalid category selected.',
    'any.required': 'Category is required.'
  }),
  isAnonymous: Joi.boolean().default(false)
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('submitted', 'in_review', 'in_progress', 'resolved', 'closed').required().messages({
    'any.only': 'Invalid status selected.',
    'any.required': 'Status is required.'
  }),
  comment: Joi.string().trim().max(500).allow('').messages({
    'string.max': 'Comment cannot exceed 500 characters.'
  })
});

const addCommentSchema = Joi.object({
  text: Joi.string().trim().min(1).max(500).required().messages({
    'string.empty': 'Comment cannot be empty.',
    'string.max': 'Comment cannot exceed 500 characters.',
    'any.required': 'Comment text is required.'
  })
});

module.exports = {
  createComplaintSchema,
  updateStatusSchema,
  addCommentSchema
};
