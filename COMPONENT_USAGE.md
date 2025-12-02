# Component Usage Guide

Quick reference for using the form and common components in the EXIM Invoicing System.

## Form Components

### Button

```jsx
import { Button } from '../components/forms';

// Basic usage
<Button onClick={handleClick}>Click Me</Button>

// With variant and size
<Button variant="primary" size="lg">Large Primary Button</Button>

// With loading state
<Button isLoading={isLoading} onClick={handleSubmit}>
  Submit
</Button>

// Submit button
<Button type="submit" variant="success">Save</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'outline'
- `size`: 'sm' | 'md' | 'lg'
- `type`: 'button' | 'submit' | 'reset'
- `isLoading`: boolean
- `disabled`: boolean
- `onClick`: function

### Input

```jsx
import { Input } from '../components/forms';

// Basic usage
<Input
  label="Email"
  name="email"
  type="email"
  value={formData.email}
  onChange={handleChange}
/>

// With validation
<Input
  label="Password"
  name="password"
  type="password"
  value={formData.password}
  error={errors.password}
  required
  onChange={handleChange}
/>

// Disabled
<Input
  label="Read Only"
  name="readonly"
  value="Cannot edit"
  disabled
/>
```

**Props:**
- `label`: string (optional)
- `name`: string (required)
- `type`: string (default: 'text')
- `value`: string | number
- `placeholder`: string
- `error`: string (error message)
- `required`: boolean
- `disabled`: boolean
- `onChange`: function
- `onBlur`: function

### Select

```jsx
import { Select } from '../components/forms';

// Basic single select
<Select
  label="Country"
  name="country"
  options={[
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'in', label: 'India' }
  ]}
  value={formData.country}
  onChange={handleChange}
/>

// Multi-select
<Select
  label="Select Multiple"
  name="tags"
  isMulti
  options={tagOptions}
  value={formData.tags}
  onChange={handleChange}
/>

// With error
<Select
  label="State"
  name="state"
  options={stateOptions}
  value={formData.state}
  error={errors.state}
  required
  onChange={handleChange}
/>
```

**Props:**
- `label`: string (optional)
- `name`: string (required)
- `options`: array of { value, label }
- `value`: string | number | array (for multi-select)
- `placeholder`: string (default: 'Select...')
- `error`: string (error message)
- `required`: boolean
- `disabled`: boolean
- `isMulti`: boolean
- `isClearable`: boolean (default: true)
- `isSearchable`: boolean (default: true)
- `onChange`: function (receives { target: { name, value } })
- `onBlur`: function

## Common Components

### Alert

```jsx
import { Alert } from '../components/common';

// Basic alert
<Alert variant="success" message="Operation successful!" />

// Dismissible alert
<Alert
  variant="danger"
  message="Error occurred!"
  dismissible
  onDismiss={() => setAlert(null)}
/>

// With custom content
<Alert variant="warning">
  <strong>Warning!</strong> Please check your input.
</Alert>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
- `message`: string
- `dismissible`: boolean
- `onDismiss`: function
- `children`: React node (alternative to message)

### LoadingSpinner

```jsx
import { LoadingSpinner } from '../components/common';

// Basic spinner
<LoadingSpinner />

// With size and text
<LoadingSpinner size="lg" text="Loading data..." />

// Small spinner
<LoadingSpinner size="sm" />
```

**Props:**
- `size`: 'sm' | 'md' | 'lg'
- `text`: string (optional)
- `className`: string

### ProtectedRoute

```jsx
import ProtectedRoute from '../components/common/ProtectedRoute';

// In your router
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

Automatically redirects to `/login` if user is not authenticated.

## Example: Complete Form

```jsx
import React, { useState } from 'react';
import { Button, Input, Select } from '../components/forms';
import { Alert } from '../components/common';

const MyForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    country: null,
  });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Validation and submission logic
    try {
      // API call
      setAlert({ variant: 'success', message: 'Form submitted!' });
    } catch (error) {
      setAlert({ variant: 'danger', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {alert && (
        <Alert
          variant={alert.variant}
          message={alert.message}
          dismissible
          onDismiss={() => setAlert(null)}
        />
      )}

      <Input
        label="Name"
        name="name"
        value={formData.name}
        error={errors.name}
        required
        onChange={handleChange}
      />

      <Input
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        error={errors.email}
        required
        onChange={handleChange}
      />

      <Select
        label="Country"
        name="country"
        options={[
          { value: 'us', label: 'United States' },
          { value: 'uk', label: 'United Kingdom' },
        ]}
        value={formData.country}
        error={errors.country}
        required
        onChange={handleChange}
      />

      <Button
        type="submit"
        variant="primary"
        isLoading={isLoading}
      >
        Submit
      </Button>
    </form>
  );
};

export default MyForm;
```

## Styling Notes

- All components use Bootstrap 5 classes
- Tailwind CSS utilities can be added via `className` prop
- Components are responsive by default
- Error states are styled with Bootstrap's `is-invalid` class
- Loading states use Bootstrap spinners



