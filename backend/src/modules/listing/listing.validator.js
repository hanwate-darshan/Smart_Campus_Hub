const Joi = require('joi');

const createListingSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).required(),
  price: Joi.number().min(0).required(),
  category: Joi.string().valid("books", "electronics", "stationery", "hostel_items", "cycles", "clothing", "other").required(),
  condition: Joi.string().valid('new','like_new','used','heavily_used').required()
    .messages({ 'any.required': 'Please select item condition' })
});

const validateCreateListing = (req, res, next) => {
  const { error } = createListingSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }
  next();
};

module.exports = { validateCreateListing, createListingSchema };
