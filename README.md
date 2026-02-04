# Fast Fast Forms

A powerful form builder that transforms text into PHP form fields with support for multiple output formats.

## Features

### Version Switching
- **Bootstrap Version**: Modern, responsive Bootstrap-based form layouts
- **Version 3**: Legacy form layout with `form_box` structure

### Field Types Supported
- 📝 Normal Text Fields
- 📄 Field Headers
- 🔘 Radio Buttons
- 📋 Dropdown/Select
- ☑️ Checkboxes
- 🔒 Privacy Policy Checkboxes
- 📅 Date Pickers (with future/past restrictions)
- 📞 Phone Numbers
- 📧 Email Fields
- 💰 Amount Fields
- 📄 Textareas
- 📁 File Uploads
- ✍️ Signatures
- 📊 Tables
- ⏰ Time Fields
- 🔢 Number Only
- 🎂 Age Only
- 📝 Letter Only
- ✍️ Initials Only

### Key Features
- **Text Transformation**: Convert plain text to form field names
- **Underscore Prefixing**: Add custom underscore prefixes to field names
- **Auto Field Detection**: Automatically detects field types based on text content
- **Custom Field Types**: Override auto-detection with custom field types
- **Required Field Marking**: Mark fields as required with visual indicators
- **Column Merging**: Merge multiple fields into responsive columns
- **Real-time Preview**: See generated code as you type
- **Copy to Clipboard**: One-click copying of generated code

## Usage

### 1. Select Version Format
Choose between Bootstrap Version (modern) or Version 3 (legacy) using the version selector buttons at the top.

### 2. Configure Underscore Prefix
Set the number of underscores to prefix field names (e.g., "4" + "Name" = "____Name").

### 3. Input Field Names
Paste or type your field names in the input area. Each line becomes a separate field.

### 4. Customize Field Types
- Click the field type icons to change field types
- Add options for radio, select, and checkbox fields
- Mark fields as required using the "Required" button

### 5. Generate Code
The form code is generated automatically and displayed in the output area.

### 6. Copy Code
Click the "Copy" button to copy the generated code to your clipboard.

## Version Differences

### Bootstrap Version
- Uses Bootstrap 5 classes (`row`, `col-md-*`, `form-control`, etc.)
- Modern, responsive design
- Clean, professional appearance

### Version 3
- Uses legacy `form_box` structure
- Compatible with older systems
- Uses `form_field` classes

## File Structure

```
FastFastForms/
├── index.html              # Main application file
├── css/
│   ├── styles.css          # Source CSS file
│   └── styles.min.css      # Minified CSS file
├── js/
│   ├── script.js           # Source JavaScript file
│   └── script.min.js       # Minified JavaScript file
├── dist/
│   └── index.min.html      # Minified HTML file for production
└── README.md               # Project documentation
```

## Examples

### Bootstrap Version Output
```html
<div class="row g-3 mb-3">
  <div class="col-md-6">
    <?php $input->fields('Full_Name', 'form-control', 'Full_Name', ''); ?>
  </div>
</div>
```

### Version 3 Output
```html
<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('Full_Name', '');
            $input->fields('Full_Name', 'form_field', 'Full_Name', 'placeholder="Enter full name here"');
         ?>
      </div>
   </div>
</div>
```

## Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge

## License
This project is open source and available under the MIT License. # Form-Conversion-Tool
