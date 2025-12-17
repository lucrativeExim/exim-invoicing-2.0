const express = require('express');
const router = express.Router();
const { FieldsMaster } = require('../models');
const { authenticate, requireRole } = require('../middleware/accessControl');

// All routes require authentication
router.use(authenticate);

// Get Fields Master by multiple field names (bulk fetch) - All authenticated users can access (for job form fields)
// IMPORTANT: This route must come before /by-name/:fieldName to avoid route conflicts
router.post('/by-names', async (req, res) => {
  try {
    console.log('POST /api/fields-master/by-names - Request received');
    const { fieldNames } = req.body;
    
    if (!Array.isArray(fieldNames) || fieldNames.length === 0) {
      console.log('No field names provided, returning empty map');
      return res.json({});
    }
    
    console.log(`Fetching fields master for ${fieldNames.length} field names:`, fieldNames);
    const fields = await FieldsMaster.findByFieldNames(fieldNames);
    console.log(`Found ${fields.length} fields in database`);
    
    // Parse JSON fields for response and create a map by field_name
    const fieldsMap = {};
    fields.forEach(field => {
      fieldsMap[field.field_name] = {
        ...field,
        treatment: field.treatment ? (field.treatment.startsWith('[') ? JSON.parse(field.treatment) : field.treatment.split(',').filter(Boolean)) : [],
        dropdown_options: field.dropdown_options ? (field.dropdown_options.startsWith('[') ? JSON.parse(field.dropdown_options) : field.dropdown_options.split(',').filter(Boolean)) : [],
      };
    });
    
    console.log(`Returning fields map with ${Object.keys(fieldsMap).length} entries`);
    res.json(fieldsMap);
  } catch (error) {
    console.error('Error fetching Fields by names:', error);
    res.status(500).json({ error: 'Failed to fetch Fields', details: error.message });
  }
});

// Get Fields Master by field name - All authenticated users can access (for job form fields)
router.get('/by-name/:fieldName', async (req, res) => {
  try {
    const { fieldName } = req.params;
    const field = await FieldsMaster.findByFieldName(fieldName);
    
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }
    
    // Parse JSON fields for response
    const parsedField = {
      ...field,
      treatment: field.treatment ? (field.treatment.startsWith('[') ? JSON.parse(field.treatment) : field.treatment.split(',').filter(Boolean)) : [],
      dropdown_options: field.dropdown_options ? (field.dropdown_options.startsWith('[') ? JSON.parse(field.dropdown_options) : field.dropdown_options.split(',').filter(Boolean)) : [],
    };
    
    res.json(parsedField);
  } catch (error) {
    console.error('Error fetching Field by name:', error);
    res.status(500).json({ error: 'Failed to fetch Field' });
  }
});

// Get all Fields Master records - Only Super Admin and Admin can access
router.get('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const fields = await FieldsMaster.findAll();
    // Parse JSON fields for response
    const parsedFields = fields.map(field => ({
      ...field,
      treatment: field.treatment ? (field.treatment.startsWith('[') ? JSON.parse(field.treatment) : field.treatment.split(',').filter(Boolean)) : [],
      dropdown_options: field.dropdown_options ? (field.dropdown_options.startsWith('[') ? JSON.parse(field.dropdown_options) : field.dropdown_options.split(',').filter(Boolean)) : [],
    }));
    res.json(parsedFields);
  } catch (error) {
    console.error('Error fetching Fields Master:', error);
    res.status(500).json({ error: 'Failed to fetch Fields Master records' });
  }
});

// Get Fields Master by ID - Only Super Admin and Admin can access
router.get('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const field = await FieldsMaster.findById(id);
    
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }
    
    // Parse JSON fields for response
    const parsedField = {
      ...field,
      treatment: field.treatment ? (field.treatment.startsWith('[') ? JSON.parse(field.treatment) : field.treatment.split(',').filter(Boolean)) : [],
      dropdown_options: field.dropdown_options ? (field.dropdown_options.startsWith('[') ? JSON.parse(field.dropdown_options) : field.dropdown_options.split(',').filter(Boolean)) : [],
    };
    
    res.json(parsedField);
  } catch (error) {
    console.error('Error fetching Field:', error);
    res.status(500).json({ error: 'Failed to fetch Field' });
  }
});

// Create new Fields Master record - Only Super Admin and Admin can create
router.post('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const {
      field_name,
      field_type,
      default_value,
      treatment,
      dropdown_options,
    } = req.body;
    
    if (!field_name) {
      return res.status(400).json({ error: 'Field name is required' });
    }

    if (!field_type) {
      return res.status(400).json({ error: 'Field type is required' });
    }

    // Check if field name already exists
    const fieldExists = await FieldsMaster.fieldNameExists(field_name);
    if (fieldExists) {
      return res.status(400).json({ error: 'Field with this name already exists' });
    }

    // Validate field_type enum
    const validFieldTypes = ['Text', 'Date', 'Dropdown', 'Attachment', 'Number'];
    if (!validFieldTypes.includes(field_type)) {
      return res.status(400).json({ error: 'Invalid field type' });
    }

    // If field_type is Dropdown, dropdown_options is required
    if (field_type === 'Dropdown' && (!dropdown_options || (Array.isArray(dropdown_options) && dropdown_options.length === 0))) {
      return res.status(400).json({ error: 'Dropdown options are required when field type is Dropdown' });
    }

    const field = await FieldsMaster.create({
      field_name,
      field_type,
      default_value,
      treatment,
      dropdown_options: field_type === 'Dropdown' ? dropdown_options : null,
      added_by: req.user.id,
    });
    
    // Parse JSON fields for response
    const parsedField = {
      ...field,
      treatment: field.treatment ? (field.treatment.startsWith('[') ? JSON.parse(field.treatment) : field.treatment.split(',').filter(Boolean)) : [],
      dropdown_options: field.dropdown_options ? (field.dropdown_options.startsWith('[') ? JSON.parse(field.dropdown_options) : field.dropdown_options.split(',').filter(Boolean)) : [],
    };
    
    res.status(201).json({ 
      ...parsedField,
      message: 'Field created successfully' 
    });
  } catch (error) {
    console.error('Error creating Field:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Field name already exists' });
    }
    res.status(500).json({ error: 'Failed to create Field' });
  }
});

// Update Fields Master record - Only Super Admin and Admin can update
router.put('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      field_name,
      field_type,
      default_value,
      treatment,
      dropdown_options,
    } = req.body;
    
    // Check if Field exists
    const existingField = await FieldsMaster.findById(id);
    if (!existingField) {
      return res.status(404).json({ error: 'Field not found' });
    }

    // Check if field name is being changed and already exists
    if (field_name && field_name !== existingField.field_name) {
      const fieldExists = await FieldsMaster.fieldNameExists(field_name, id);
      if (fieldExists) {
        return res.status(400).json({ error: 'Field name already in use' });
      }
    }

    // Validate field_type enum if provided
    if (field_type) {
      const validFieldTypes = ['Text', 'Date', 'Dropdown', 'Attachment', 'Number'];
      if (!validFieldTypes.includes(field_type)) {
        return res.status(400).json({ error: 'Invalid field type' });
      }
    }

    // Determine the final field type (use provided or existing)
    const finalFieldType = field_type !== undefined ? field_type : existingField.field_type;
    
    // Prepare update data
    const updateData = {
      field_name,
      field_type,
      default_value,
      treatment,
    };
    
    // Handle dropdown_options based on final field type
    // IMPORTANT: Always set dropdown_options - either to the provided value or null
    if (finalFieldType === 'Dropdown') {
      // If field type is Dropdown, dropdown_options is required
      if (!dropdown_options || (Array.isArray(dropdown_options) && dropdown_options.length === 0)) {
        return res.status(400).json({ error: 'Dropdown options are required when field type is Dropdown' });
      }
      updateData.dropdown_options = dropdown_options;
    } else {
      // If field type is NOT Dropdown, ALWAYS clear dropdown_options (set to null)
      // This ensures dropdown_options are cleared even if they were sent in the request
      updateData.dropdown_options = null;
    }
    
    const field = await FieldsMaster.update(id, updateData);
    
    // Parse JSON fields for response
    const parsedField = {
      ...field,
      treatment: field.treatment ? (field.treatment.startsWith('[') ? JSON.parse(field.treatment) : field.treatment.split(',').filter(Boolean)) : [],
      dropdown_options: field.dropdown_options ? (field.dropdown_options.startsWith('[') ? JSON.parse(field.dropdown_options) : field.dropdown_options.split(',').filter(Boolean)) : [],
    };
    
    res.json({ 
      ...parsedField,
      message: 'Field updated successfully' 
    });
  } catch (error) {
    console.error('Error updating Field:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Field name already exists' });
    }
    res.status(500).json({ error: 'Failed to update Field' });
  }
});

// Delete Fields Master record - Only Super Admin can delete
router.delete('/:id', requireRole(['Super_Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if Field exists
    const existingField = await FieldsMaster.findById(id);
    if (!existingField) {
      return res.status(404).json({ error: 'Field not found' });
    }

    await FieldsMaster.delete(id);
    
    res.json({ message: 'Field deleted successfully' });
  } catch (error) {
    console.error('Error deleting Field:', error);
    res.status(500).json({ error: 'Failed to delete Field' });
  }
});

module.exports = router;

