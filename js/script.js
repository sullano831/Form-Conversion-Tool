// --- VERSION SYSTEM ---
let currentVersion = 'bootstrap'; // Default to bootstrap version

// Function to sync required status from DOM to storage
function syncRequiredStatusFromDOM() {
    const fieldItems = document.querySelectorAll('.field-item');
    fieldItems.forEach((item, index) => {
        const requiredBtn = item.querySelector('.required-btn');
        if (requiredBtn) {
            const isRequired = requiredBtn.classList.contains('required');
            fieldRequiredStatus.set(index, isRequired);
        }
    });
}

function switchVersion(version) {
    currentVersion = version;

    // Update button states
    document.getElementById('bootstrapVersion').classList.toggle('active', version === 'bootstrap');
    document.getElementById('version3').classList.toggle('active', version === 'version3');

    // Update body class for CSS theming
    document.body.classList.remove('bootstrap', 'version3');
    document.body.classList.add(version);

    // Show/hide validation section based on version
    const validationSection = document.querySelector('.validation-section');
    if (validationSection) {
        validationSection.style.display = version === 'version3' ? 'block' : 'none';
    }

    // Update generated code if there's any content
    const generatedCode = document.getElementById('generatedCodeOutput');
    if (generatedCode.value.trim()) {
        // Sync required status before updating
        syncRequiredStatusFromDOM();
        updateGeneratedCode();
    }

    // Generate validation code if switching to Version 3 and there are fields
    if (version === 'version3') {
        const fieldItems = document.querySelectorAll('.field-item');
        if (fieldItems.length > 0) {
            generateValidationCode();
        }
    }
}

// --- COLUMN MERGE FEATURE ---
let lastMerged = null;
let lastMergedSelection = null;

function getSelectedCodeBlocks() {
    const textarea = document.getElementById('generatedCodeOutput');
    const value = textarea.value;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    if (selectionStart === selectionEnd) return null;

    // Check if we're in Version 3 mode
    if (currentVersion === 'version3') {
        return getSelectedFormBoxBlocksVersion3();
    }

    // Find all row blocks in the code
    const rowRegex = /<div class=\"row[\s\S]*?<\/div>/g;
    let match, blocks = [],
        blockRanges = [];
    while ((match = rowRegex.exec(value)) !== null) {
        const blockStart = match.index;
        const blockEnd = match.index + match[0].length;
        blocks.push(match[0]);
        blockRanges.push({ start: blockStart, end: blockEnd });
    }
    // Find which blocks are at least partially selected
    let selectedBlocks = [];
    let selectedRanges = [];
    for (let i = 0; i < blockRanges.length; i++) {
        const { start, end } = blockRanges[i];
        // If the block overlaps with the selection
        if (end > selectionStart && start < selectionEnd) {
            selectedBlocks.push(blocks[i]);
            selectedRanges.push({ start, end });
        }
    }
    if (selectedBlocks.length < 2 || selectedBlocks.length > 4) return null;
    // The new selection range is from the start of the first selected block to the end of the last
    const selStart = selectedRanges[0].start;
    const selEnd = selectedRanges[selectedRanges.length - 1].end;
    const selectedText = value.substring(selStart, selEnd);
    return { start: selStart, end: selEnd, selectedText, blockCount: selectedBlocks.length };
}

function getSelectedFormBoxBlocksVersion3() {
    const textarea = document.getElementById('generatedCodeOutput');
    const value = textarea.value;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    if (selectionStart === selectionEnd) return null;

    // Find all form_box blocks in the code
    const formBoxRegex = /<div class="form_box">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
    let match, blocks = [],
        blockRanges = [];
    while ((match = formBoxRegex.exec(value)) !== null) {
        const blockStart = match.index;
        const blockEnd = match.index + match[0].length;
        blocks.push(match[0]);
        blockRanges.push({ start: blockStart, end: blockEnd });
    }

    // Find which blocks are at least partially selected
    let selectedBlocks = [];
    let selectedRanges = [];
    for (let i = 0; i < blockRanges.length; i++) {
        const { start, end } = blockRanges[i];
        // If the block overlaps with the selection
        if (end > selectionStart && start < selectionEnd) {
            selectedBlocks.push(blocks[i]);
            selectedRanges.push({ start, end });
        }
    }

    if (selectedBlocks.length < 2 || selectedBlocks.length > 4) return null;

    // The new selection range is from the start of the first selected block to the end of the last
    const selStart = selectedRanges[0].start;
    const selEnd = selectedRanges[selectedRanges.length - 1].end;
    const selectedText = value.substring(selStart, selEnd);
    return { start: selStart, end: selEnd, selectedText, blockCount: selectedBlocks.length };
}

function showColumnMergePrompt() {
    if (document.getElementById('columnMergePrompt')) return;
    const container = document.createElement('div');
    container.id = 'columnMergePrompt';
    container.className = 'column-merge-modal';
    container.innerHTML = `
        <div class="modal-title">Merge selected fields into columns?</div>
        <button id="mergeColumnsYes" class="modal-btn modal-btn-yes">Yes</button>
        <button id="mergeColumnsNo" class="modal-btn modal-btn-no">No</button>
    `;
    document.body.appendChild(container);
    document.getElementById('mergeColumnsYes').onclick = () => {
        mergeSelectedBlocksToColumns();
        document.body.removeChild(container);
    };
    document.getElementById('mergeColumnsNo').onclick = () => {
        document.body.removeChild(container);
    };
}

function mergeSelectedBlocksToColumns() {
    const textarea = document.getElementById('generatedCodeOutput');
    const value = textarea.value;

    // Check if we're in Version 3 mode
    if (currentVersion === 'version3') {
        return mergeSelectedBlocksToColumnsVersion3();
    }

    const selection = getSelectedCodeBlocks();
    if (!selection) return;
    lastMerged = value;
    lastMergedSelection = { start: selection.start, end: selection.end };

    // Use a more reliable approach to extract column blocks
    const colBlocks = [];
    let remainingText = selection.selectedText;

    console.log('Selected text for merging:', remainingText);

    // Use regex to find all column blocks with their content (including additional classes and attributes)
    const colBlockRegex = /<div class="col-md-\d+[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
    let match;

    while ((match = colBlockRegex.exec(selection.selectedText)) !== null) {
        const fullMatch = match[0];
        console.log('Extracted column block:', fullMatch);
        colBlocks.push(fullMatch);
    }

    if (![2, 3, 4].includes(colBlocks.length) || 12 % colBlocks.length !== 0) return;
    const colWidth = 12 / colBlocks.length;

    // Debug: Log the captured column blocks
    console.log('Captured column blocks:', colBlocks);
    console.log('Column width:', colWidth);

    // Simply replace the col-md-X class in each block without regenerating the PHP code
    const mergedCols = colBlocks.map((col, index) => {
        console.log(`Processing column ${index}:`, col);

        // Check if this is a header field (has fieldheader class)
        if (col.includes('fieldheader')) {
            // Headers should always be full width
            const result = col.replace(/col-md-\d+/, 'col-md-12');
            console.log(`Header field result:`, result);
            return result;
        } else {
            // For all other fields, just change the column width while preserving other classes and attributes
            const result = col.replace(/col-md-\d+/, `col-md-${colWidth}`);
            console.log(`Regular field result:`, result);
            return result;
        }
    }).join('\n  ');

    // Remove any trailing closing </div> that may have been accidentally appended
    let mergedRow = `<div class="row g-3 mb-3">\n  ${mergedCols}\n</div>`;
    mergedRow = mergedRow.replace(/(<\/div>\s*)+$/, '</div>');
    const newValue = value.substring(0, selection.start) + mergedRow + value.substring(selection.end);
    textarea.value = newValue;
    textarea.setSelectionRange(selection.start, selection.start + mergedRow.length);
}

function mergeSelectedBlocksToColumnsVersion3() {
    const textarea = document.getElementById('generatedCodeOutput');
    const value = textarea.value;
    const selection = getSelectedFormBoxBlocksVersion3();
    if (!selection) return;
    lastMerged = value;
    lastMergedSelection = { start: selection.start, end: selection.end };

    console.log('Selected text for Version 3 merging:', selection.selectedText);

    // Extract form_box blocks
    const formBoxRegex = /<div class="form_box">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
    const formBoxes = [];
    let match;

    while ((match = formBoxRegex.exec(selection.selectedText)) !== null) {
        const fullMatch = match[0];
        console.log('Extracted form_box:', fullMatch);
        formBoxes.push(fullMatch);
    }

    if (![2, 3, 4].includes(formBoxes.length)) return;

    // Extract the group content from each form_box
    const groupContents = formBoxes.map(formBox => {
        const groupMatch = formBox.match(/<div class="group">([\s\S]*?)<\/div>/);
        return groupMatch ? groupMatch[1] : '';
    });

    // Create the merged structure
    const colClass = `form_box_col${formBoxes.length}`;
    const mergedGroups = groupContents.map(content =>
        `      <div class="group">\n${content.trim()}\n      </div>`
    ).join('\n');

    const mergedFormBox = `<div class="form_box">\n   <div class="${colClass}">\n${mergedGroups}\n   </div>\n</div>`;

    console.log('Merged form_box:', mergedFormBox);

    const newValue = value.substring(0, selection.start) + mergedFormBox + value.substring(selection.end);
    textarea.value = newValue;
    textarea.setSelectionRange(selection.start, selection.start + mergedFormBox.length);
}

function undoColumnMerge() {
    if (!lastMerged) return;
    const textarea = document.getElementById('generatedCodeOutput');
    textarea.value = lastMerged;
    lastMerged = null;
}

// Listen for selection in generatedCodeOutput
document.addEventListener('DOMContentLoaded', function() {
    const textarea = document.getElementById('generatedCodeOutput');
    if (!textarea) return;
    textarea.addEventListener('mouseup', function() {
        setTimeout(() => {
            const selection = getSelectedCodeBlocks();
            if (selection) showColumnMergePrompt();
        }, 10);
    });

    // Sync required status from DOM when page loads
    syncRequiredStatusFromDOM();
});

// Set up undo merge button
document.addEventListener('DOMContentLoaded', function() {
    const undoBtn = document.getElementById('undoColumnMergeBtn');
    if (undoBtn) {
        undoBtn.onclick = undoColumnMerge;
    }

    // Set up field type search functionality
    const searchInput = document.getElementById('fieldTypeSearch');
    const fieldTypeButtons = document.getElementById('fieldTypeButtons');

    if (searchInput && fieldTypeButtons) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            const buttons = fieldTypeButtons.querySelectorAll('.btn-tool');

            buttons.forEach(button => {
                const buttonText = button.textContent.toLowerCase();
                const fieldType = button.getAttribute('data-field-type');

                if (searchTerm === '' ||
                    buttonText.includes(searchTerm) ||
                    fieldType.includes(searchTerm)) {
                    button.style.display = 'inline-flex';
                    button.style.opacity = '1';
                } else {
                    button.style.display = 'none';
                    button.style.opacity = '0';
                }
            });
        });

        // Clear search when clicking outside
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !fieldTypeButtons.contains(e.target)) {
                searchInput.value = '';
                const buttons = fieldTypeButtons.querySelectorAll('.btn-tool');
                buttons.forEach(button => {
                    button.style.display = 'inline-flex';
                    button.style.opacity = '1';
                });
            }
        });
    }
});
// --- END COLUMN MERGE FEATURE ---
function generateCode(type) {
    let code = '';

    switch (type) {
        case 'Field Header':
            code = `<p class="fieldheader text-center text-uppercase fw-bold py-2 mb-3">Applicant Information</p>
<input type="hidden" name="Applicant Information" value=":" />`;
            break;

        case 'Number Only':
            code = `<div class="row g-3 mb-3">
  <div class="col-md-4">
    <?php $input->fields('Field Name', 'numberOnly', 'Field_Name', ''); ?>
  </div>
</div>`;
            break;

        case 'Age Only':
            code = `<div class="row g-3 mb-3">
  <div class="col-md-2">
    <?php $input->fields('Age', 'ageOnly', 'Age', ''); ?>
  </div>
</div>`;
            break;

        case 'Letter Only':
            code = `<div class="row g-3 mb-3">
  <div class="col-md-6">
    <?php $input->fields('Name', 'letterOnly', 'Name', ''); ?>
  </div>
</div>`;
            break;

        case 'Normal Text':
            code = `<div class="row g-3 mb-3">
  <div class="col-md-6">
    <?php $input->fields('Field Name', 'form-control', 'Field_Name', ''); ?>
  </div>
</div>`;
            break;

        case 'Initial Only':
            code = `<div class="row g-3 mb-3">
  <div class="col-md-3">
    <?php $input->fields('Initials', 'initialOnly', 'Initials', ''); ?>
  </div>
</div>`;
            break;

        case 'Date Picker (Disable Future)':
            code = `<div class="row g-3 mb-3">
  <div class="col-md-4">
    <?php $input->datepicker('Start_Date', 'Start_Date', '', 'Date1 DisableFuture', '', 'Start Date'); ?>
  </div>
</div>`;
            break;

        case 'Dropdown':
            code = `$state = array('Please select state.', 'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District Of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Puerto Rico', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virgin Islands', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming');
            
           <div class="col-md-4">
					<?php
					$input->select('State', 'form-select', $state, 'State', 'required', 'State', '', 'State');
					?>
				</div>`;
            break;

        case 'Phone':
            code = `<div class="row g-3 mb-3">
  <div class="col-md-6">
    <?php $input->phoneInput('Phone Number', '', 'Phone', ''); ?>
  </div>
</div>`;
            break;

        case 'Email':
            code = `<div class="row g-3 mb-3">
  <div class="col-md-6">
    <?php $input->email('Email_Address', '', 'Email_Address', '', '', '', 'example@domain.com'); ?>
  </div>
</div>`;
            break;

        case 'Checkbox':
            code = `<div class="row g-3 mb-3">
  <div class="col-md-12 group" data-limit="7">
    <?php
      $input->label('Select Interests', '');
      $input->chkboxVal('Interests', array('Music', 'Sports', 'Reading'), 'Interests', 'required', '3');
    ?>
  </div>
</div>`;
            break;

        case 'Radio':
            code = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <?php
      $input->label('Marital Status', '');
      $input->radio('Marital_Status', array('Single', 'Married', 'Widowed'), 'Marital_Status', 'required', '3');
    ?>
  </div>
</div>`;
            break;

        case 'Date Picker (Disable Past)':
            code = `<div class="row g-3 mb-3">
  <div class="col-md-4">
    <?php $input->datepicker('End_Date', 'End_Date', '', 'Date1 DisablePast', '', 'End Date'); ?>
  </div>
</div>`;
            break;

        case 'Amount':
            code = `<div class="row g-3 mb-3">
  <div class="col-md-3">
    <?php $input->amount('Monthly Salary', 'Salary', ''); ?>
  </div>
</div>`;
            break;

        case 'Time':
            code = `<div class="row g-3 mb-3">
  <div class="col-md-4">
    <?php $input->time('Start Time', 'Start_Time', ''); ?>
  </div>
</div>`;
            break;

        case 'Textarea':
            code = `<div class="row g-3 mb-3">
                <div class="col-md-12">
                    <?php
                    // @param field name, class, id and attribute
                    $input->textarea('Question_or_Comment', 'form-control', 'Question_or_Comment', 'style="height: 100px;" required', '', ' ', 'Suggestions');
                    ?>
                </div>
            </div>`;
            break;

        case 'Upload File':
            code = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <?php
      $input->label('Upload File <span style=\"font-style: italic; font-size: 13px; text-transform: lowercase; color:#b1b1b1;\">(accepted file formats: .doc, .docx, .pdf | Max: 10MB)</span>', '');
      $input->files('', 'file', '', '', 'doc,docx,pdf,zip', '10MB');
    ?>
  </div>
</div>`;
            break;

        case 'Table':
            code = `<div class="row g-3 mb-3">
        <div class="col-md-12">
          <div class="employment-history-section">
            <h4 class="section-title">Employment History</h4>
            <p class="section-subtitle">Please provide your employment history (starting with most recent)</p>
            
            <div class="table-responsive">
              <table class="table employment-table" id="employmentTable">
                <thead>
                  <tr>
                    <th scope="col">Company Name</th>
                    <th scope="col">Position</th>
                    <th scope="col">Start Date</th>
                    <th scope="col">End Date</th>
                    <th scope="col">Supervisor</th>
                    <th scope="col">Reason for Leaving</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- Row 1 -->
                  <tr>
                    <td data-label="Company Name">
                      <input type="text" class="form-control table-input" name="Company_Name_1" placeholder="Company Name">
                    </td>
                    <td data-label="Position">
                      <input type="text" class="form-control table-input" name="Position_1" placeholder="Position/Title">
                    </td>
                    <td data-label="Start Date">
                      <input type="date" class="form-control table-input" name="Start_Date_1">
                    </td>
                    <td data-label="End Date">
                      <input type="date" class="form-control table-input" name="End_Date_1">
                    </td>
                    <td data-label="Supervisor">
                      <input type="text" class="form-control table-input" name="Supervisor_1" placeholder="Supervisor Name">
                    </td>
                    <td data-label="Reason for Leaving">
                      <input type="text" class="form-control table-input" name="Reason_Leaving_1" placeholder="Reason for leaving">
                    </td>
                  </tr>
                  <!-- Row 2 -->
                  <tr>
                    <td data-label="Company Name">
                      <input type="text" class="form-control table-input" name="Company_Name_2" placeholder="Company Name">
                    </td>
                    <td data-label="Position">
                      <input type="text" class="form-control table-input" name="Position_2" placeholder="Position/Title">
                    </td>
                    <td data-label="Start Date">
                      <input type="date" class="form-control table-input" name="Start_Date_2">
                    </td>
                    <td data-label="End Date">
                      <input type="date" class="form-control table-input" name="End_Date_2">
                    </td>
                    <td data-label="Supervisor">
                      <input type="text" class="form-control table-input" name="Supervisor_2" placeholder="Supervisor Name">
                    </td>
                    <td data-label="Reason for Leaving">
                      <input type="text" class="form-control table-input" name="Reason_Leaving_2" placeholder="Reason for leaving">
                    </td>
                  </tr>
                  <!-- Row 3 -->
                  <tr>
                    <td data-label="Company Name">
                      <input type="text" class="form-control table-input" name="Company_Name_3" placeholder="Company Name">
                    </td>
                    <td data-label="Position">
                      <input type="text" class="form-control table-input" name="Position_3" placeholder="Position/Title">
                    </td>
                    <td data-label="Start Date">
                      <input type="date" class="form-control table-input" name="Start_Date_3">
                    </td>
                    <td data-label="End Date">
                      <input type="date" class="form-control table-input" name="End_Date_3">
                    </td>
                    <td data-label="Supervisor">
                      <input type="text" class="form-control table-input" name="Supervisor_3" placeholder="Supervisor Name">
                    </td>
                    <td data-label="Reason for Leaving">
                      <input type="text" class="form-control table-input" name="Reason_Leaving_3" placeholder="Reason for leaving">
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="table-note">
              <small class="text-muted">
                <i class="fas fa-info-circle"></i>
                Note: Please fill in at least your most recent employment. Additional rows are optional.
              </small>
            </div>
          </div>
        </div>
      </div>`;
            break;

        case 'Signature':
            code = `<div class="row g-3 mb-3">
        <div class="col-md-12">
          <div class="signature-section">
            <h5 class="signature-title">Signature of Parent/Guardian Required</h5>
            <div class="row">
              <div class="col-md-8">
                <div class="sigPad signature-pad-container" id="signaturePad">
                  <div class="sig sigWrapper current">
                    <div class="typed"></div>
                    <canvas class="pad" width="100%" height="200"></canvas>
                    <input type="hidden" name="Signature_of_Parent_or_Legal_Guardian" class="output">
                  </div>
                  <div class="signature-controls d-flex justify-content-between align-items-center mt-2">
                    <p class="clearButton mb-0">
                      <a href="#clear" class="btn btn-outline-danger btn-sm">
                        <i class="fas fa-eraser"></i> Clear Signature
                      </a>
                    </p>
                    <small class="text-muted">
                      <i class="fas fa-pen"></i> Draw your signature above
                    </small>
                  </div>
                </div>
                <div class="invalid-feedback signature-invalid-feedback" style="display: none;">
                  Please provide your signature before submitting the form.
                </div>
              </div>
              <div class="col-md-4">
                <?php $input->dateToday('Date_Signed', 'Date_Signed', '', 'Date'); ?>
                <div class="signature-note mt-3">
                  <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <strong>Instructions:</strong><br>
                    • Use your mouse or finger to sign<br>
                    • Sign clearly within the box<br>
                    • Click "Clear" to start over
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
            break;

        case 'Privacy Policy':
            code = `
      }else if($key == "Privacy_Policy"){
          $body .= '<tr><td colspan="3" line-height:30px">

          <input type="checkbox" checked disabled /> I consent to the collection and processing of my personal information and, where applicable, health-related information, including any data I submit on behalf of others. This is for the purpose of evaluating or fulfilling my request, in accordance with the Privacy Policy.

          </td></tr>';
      
      <div class="disclaimer">
        <p><input type="checkbox" name="Privacy_Policy" style="-webkit-appearance:checkbox" /> &nbsp;<b>I consent to the collection and processing of my personal information and, where applicable, health-related information, including any data I submit on behalf of others. This is for the purpose of evaluating or fulfilling my request, in accordance with the <a href="<?php echo get_home_url(); ?>/privacy-policy" target="_blank">Privacy Policy</a>.</b> </p>
      </div>`;
            break;
    }

    const output = document.getElementById('codeOutput');
    output.textContent = code;

    navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = "Copy", 1500);
    });
}

function generateCodeForVersion(type) {
    let code = '';

    if (currentVersion === 'bootstrap') {
        // Use existing Bootstrap code generation
        return generateCode(type);
    } else {
        // Version 3 code generation
        switch (type) {
            case 'Field Header':
                code = `<p class="fieldheader">OTHER FUNCTIONS</p>
<input type="hidden" name="OTHER FUNCTIONS" value=":">`;
                break;

            case 'Number Only':
                code = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('Field Name', '');
            $input->fields('Field_Name', 'form_field', 'Field_Name', '');
         ?>
      </div>
   </div>
</div>`;
                break;

            case 'Age Only':
                code = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('Age', '');
            $input->fields('Age', 'form_field', 'Age', '');
         ?>
      </div>
   </div>
</div>`;
                break;

            case 'Letter Only':
                code = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('Name', '');
            $input->fields('Name', 'form_field', 'Name', '');
         ?>
      </div>
   </div>
</div>`;
                break;

            case 'Normal Text':
                code = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('Field Name', '');
            $input->fields('Field_Name', 'form_field', 'Field_Name', '');
         ?>
      </div>
   </div>
</div>`;
                break;

            case 'Initial Only':
                code = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('Initials', '');
            $input->fields('Initials', 'form_field', 'Initials', '');
         ?>
      </div>
   </div>
</div>`;
                break;

            case 'Date Picker (Disable Future)':
                code = `<div class="form_box">
   <div class="form_box_col2">
      <div class="group">
         <?php
            $input->label('Date', '*');
            $input->fields('Date', 'form_field Date', 'Date', 'placeholder="Enter date here"');
         ?>
      </div>
   </div>
</div>`;
                break;

            case 'Dropdown':
                code = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('Marital Status', '');
            $input->select('Marital_Status', 'form_field', $choices, 'Marital_Status');
         ?>
      </div>
   </div>
</div>`;
                break;

            case 'Phone':
                code = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('Phone Number', '*');
            $input->phoneInput('Phone_Number', 'form_field','Phone_Number','placeholder="Enter phone number here" onkeypress="return isNumberKey(evt)"');
         ?>
      </div>
   </div>
</div>`;
                break;

            case 'Email':
                code = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('Email Address', '');
            $input->fields('Email_Address', 'form_field', 'Email_Address', '');
         ?>
      </div>
   </div>
</div>`;
                break;

            case 'Checkbox':
                code = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('Available Time', '');
            $input->chkboxVal('Available_Time', array('8:00 am','9:00 am','10:00 am','Other'), '', '', '4');
         ?>
      </div>
   </div>
</div>`;
                break;

            case 'Radio':
                code = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('Would you be available to work overtime, if necessary?', '');
            $input->radio('Available_to_work_overtime', array('Yes', 'No', 'Maybe'), '', '', '3');
         ?>
      </div>
   </div>
</div>`;
                break;

            case 'Date Picker (Disable Past)':
                code = `<div class="form_box">
   <div class="form_box_col2">
      <div class="group">
         <?php
            $input->label('Date', '*');
            $input->fields('Date', 'form_field Date', 'Date', 'placeholder="Enter date here"');
         ?>
      </div>
   </div>
</div>`;
                break;

            case 'Amount':
                code = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('Monthly Salary', '');
            $input->amount('Salary', 'Salary', '');
         ?>
      </div>
   </div>
</div>`;
                break;

            case 'Time':
                code = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('Start Time', '');
            $input->fields('Start_Time', 'form_field', 'Start_Time', '');
         ?>
      </div>
   </div>
</div>`;
                break;

            case 'Textarea':
                code = `<div class="form_box">
                           <div class="form_box_col1">
                              <div class="group">
                                 <?php
                                    // @param label-name, if required
                                    $input->label('Question / Comment');
                                    // @param field name, class, id and attribute
                                    $input->textarea('Question_or_Comment', 'text form_field','Question_or_Comment','placeholder="Enter your question or comment here"');
                                    ?>
                              </div>
                           </div>
                        </div>`;
                break;

            case 'Upload File':
                code = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('Attach Resume', '*');
         ?>
         <input type="file" name="attachment[]" id="file" class="form_field" multiple>
      </div>
   </div>
</div>`;
                break;

            case 'Table':
                code = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('Employment History', '');
         ?>
         <!-- Table content would go here -->
      </div>
   </div>
</div>`;
                break;

            case 'Signature':
                code = `<div class="form_box my_signature">
   <div class="form_box_col2">
      <div class="group">
         <?php
            $input->label('Signature', '');
         ?>
         <div class="sigPad" style="margin-top:5px;">
            <div class="sig sigWrapper">
               <div class="typed"></div>
               <canvas class="pad" width="196" height="50"></canvas>
               <input type="hidden" name="Signature" class="output">
            </div>
            <p class="clearButton"><a style="color:#2f2f2f;" href="#clear">Clear</a></p>
         </div>
      </div>
      <div class="group">
         <?php
            $input->label('Date', '');
         ?>
         <input type="text" class="form_field"  name="Date_" value="<?php echo date('F d, Y'); ?>" style="background: #f1f1f1;" readonly />
      </div>
   </div>
</div>`;
                break;

            case 'Privacy Policy':
                code = `<div class="disclaimer">
   <p><input type="checkbox" name="Privacy_Policy" style="-webkit-appearance:checkbox" /> &nbsp;<b>I consent to the collection and processing of my personal information and, where applicable, health-related information, including any data I submit on behalf of others. This is for the purpose of evaluating or fulfilling my request, in accordance with the <a href="<?php echo get_home_url(); ?>/privacy-policy" target="_blank">Privacy Policy</a>.</b> </p>
</div>`;
                break;
        }
    }

    const output = document.getElementById('codeOutput');
    output.textContent = code;

    navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = "Copy", 1500);
    });
}

function copyCode() {
    const output = document.getElementById('codeOutput');
    navigator.clipboard.writeText(output.textContent).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = "Copy", 1500);
    });
}

// Global variables for field type selection
let currentFieldIndex = -1;
let fieldTypeOverrides = new Map(); // Store custom field types for specific fields
let fieldOptions = new Map(); // Store field options for radio, select, and checkbox
let fieldRequiredStatus = new Map(); // Store required status for all fields
let otherFieldCounter = 0; // Counter for "Other" field IDs

function transformText() {
    const input = document.getElementById('transformInput').value;
    const outputContainer = document.getElementById('transformOutputContainer');
    const underscoreCount = parseInt(document.getElementById('underscoreCount').value) || 0;

    if (input.trim() === '') {
        outputContainer.innerHTML = '<div style="color: #6c757d; font-style: italic; text-align: center; padding: 20px;">Transformed text will appear here...</div>';
        document.getElementById('generatedCodeOutput').value = '';
        return;
    }

    const lines = input.split('\n');
    const usedFieldNames = new Set(); // Track used field names to handle duplicates
    let outputHTML = '';

    lines.forEach((line, index) => {
                if (line.trim() === '') return;

                // Allow only letters, numbers, underscores, question marks, parentheses, and slashes
                let fieldName = line.trim()
                    .replace(/\//g, 'or') // Replace slashes with 'or'
                    .replace(/[^a-zA-Z0-9_?()]/g, '_') // Replace any non-alphanumeric, non-underscore, non-question mark, non-parentheses with underscore
                    .replace(/_+/g, '_') // Replace multiple consecutive underscores with single underscore
                    .replace(/^_|_$/g, ''); // Remove leading and trailing underscores

                // Add the specified number of underscores at the beginning
                if (underscoreCount > 0) {
                    fieldName = '_'.repeat(underscoreCount) + fieldName;
                }

                // Handle duplicate field names by adding underscores
                let finalFieldName = fieldName;
                let duplicateUnderscoreCount = 0;
                while (usedFieldNames.has(finalFieldName)) {
                    duplicateUnderscoreCount++;
                    finalFieldName = fieldName + '_'.repeat(duplicateUnderscoreCount);
                }
                usedFieldNames.add(finalFieldName);

                // Get current field type and options
                const currentFieldType = fieldTypeOverrides.get(index) || 'normal';
                const currentOptions = fieldOptions.get(index) || '';

                outputHTML += `
            <div class="field-item" data-field-name="${finalFieldName}" data-index="${index}">
                <span class="field-text">${finalFieldName}</span>
                <div class="field-controls">
                    <div class="field-type-buttons">
                        <button class="field-type-btn ${currentFieldType === 'normal' ? 'active' : ''}" onclick="setFieldType(${index}, 'normal')" title="Normal Text">
                            📝
                        </button>
                        <button class="field-type-btn ${currentFieldType === 'header' ? 'active' : ''}" onclick="setFieldType(${index}, 'header')" title="Field Header">
                            📄
                        </button>
                        <button class="field-type-btn ${currentFieldType === 'radio' ? 'active' : ''}" onclick="setFieldType(${index}, 'radio')" title="Radio Buttons">
                            🔘
                        </button>
                        <button class="field-type-btn ${currentFieldType === 'select' ? 'active' : ''}" onclick="setFieldType(${index}, 'select')" title="Dropdown">
                            📋
                        </button>
                        <button class="field-type-btn ${currentFieldType === 'checkbox' ? 'active' : ''}" onclick="setFieldType(${index}, 'checkbox')" title="Checkbox">
                            ☑️
                        </button>
                        <button class="field-type-btn ${currentFieldType === 'privacy' ? 'active' : ''}" onclick="setFieldType(${index}, 'privacy')" title="Docu Checkbox">
                            🔒
                        </button>
                        <button class="field-type-btn ${currentFieldType === 'textarea' ? 'active' : ''}" onclick="setFieldType(${index}, 'textarea')" title="Textarea">
                            <span class="textarea-icon">📝</span>
                        </button>
                    </div>
                    ${currentFieldType === 'radio' || currentFieldType === 'select' || currentFieldType === 'checkbox' ? `
                        <div class="options-input">
                            <input type="text" class="options-textbox" placeholder="option 1, option 2, option 3" 
                                   value="${currentOptions}" 
                                   oninput="setFieldOptions(${index}, this.value)" 
                                   onchange="setFieldOptions(${index}, this.value)" 
                                   onblur="setFieldOptions(${index}, this.value)">
                        </div>
                    ` : ''}
                    ${currentFieldType !== 'header' && currentFieldType !== 'privacy' ? `
                    <button class="required-btn ${fieldRequiredStatus.get(index) ? 'required' : 'not-required'}" onclick="toggleRequired(${index})" data-index="${index}">
                        ${fieldRequiredStatus.get(index) ? 'Required ✓' : 'Required'}
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    outputContainer.innerHTML = outputHTML;

    // Initialize required status for any new fields that don't have stored status
    const fieldItems = document.querySelectorAll('.field-item');
    fieldItems.forEach((item, index) => {
        if (!fieldRequiredStatus.has(index)) {
            fieldRequiredStatus.set(index, false);
        }
    });

    // Generate form code based on the original input
    generateFormCode(input);
    
    // Generate validation code for Version 3
    if (currentVersion === 'version3') {
        generateValidationCode();
    }
}



function setFieldType(index, type) {
    // Store the field type override
    fieldTypeOverrides.set(index, type);
    
    // Clear options if switching to normal text
    if (type === 'normal') {
        fieldOptions.delete(index);
    }
    
    // Regenerate the text transformation
    transformText();
    
    // Update the generated code to reflect any changes
    updateGeneratedCode();
}

function setFieldOptions(index, options) {
    // Store the field options
    fieldOptions.set(index, options);
    
    // Regenerate the form code to update the options immediately
    updateGeneratedCode();
    
    // Update the validation code
    generateValidationCode();
}

// Helper function to generate placeholder text based on label
function generatePlaceholder(label) {
    if (!label) return '';
    
    // Convert label to lowercase and create a placeholder
    let placeholder = label.toLowerCase();
    
    // Add "Enter" prefix and "here" suffix for better UX
    placeholder = `Enter ${placeholder} here`;
    
    return placeholder;
}

// Helper function to check if options contain "Other" and generate additional field for Bootstrap
function generateOtherFieldIfNeeded(optionsText, fieldName, requiredText, underscoreCount = 0, usedFieldNames = null) {
    if (!optionsText) return '';
    
    const options = optionsText.split(',').map(opt => opt.trim().toLowerCase());
    const hasOther = options.includes('other');
    
    if (hasOther) {
        otherFieldCounter++;
        const underscorePrefix = underscoreCount > 0 ? '_'.repeat(underscoreCount) : '';
        let otherFieldName = underscorePrefix + 'other';
        
        // Handle duplicate "other" field names by adding underscores (similar to regular fields)
        if (usedFieldNames) {
            let finalOtherFieldName = otherFieldName;
            let duplicateUnderscoreCount = 0;
            while (usedFieldNames.has(finalOtherFieldName)) {
                duplicateUnderscoreCount++;
                finalOtherFieldName = otherFieldName + '_'.repeat(duplicateUnderscoreCount);
            }
            usedFieldNames.add(finalOtherFieldName);
            otherFieldName = finalOtherFieldName;
        }
        
                return `
        <div class="row g-3 mb-3" id="${underscorePrefix}ifOther${otherFieldCounter}">
          <div class="col-md-12">
            <?php $input->fields('${otherFieldName}', 'form-control', '${otherFieldName}', ${requiredText}); ?>
          </div>
        </div>`;
    }
    
    return '';
}

// Helper function to check if options contain "Other" and generate additional field for Version 3
function generateOtherFieldIfNeededVersion3(optionsText, fieldName, requiredText, underscoreCount = 0, usedFieldNames = null) {
    if (!optionsText) return '';
    
    const options = optionsText.split(',').map(opt => opt.trim().toLowerCase());
    const hasOther = options.includes('other');
    
    if (hasOther) {
        otherFieldCounter++;
        const underscorePrefix = underscoreCount > 0 ? '_'.repeat(underscoreCount) : '';
        let otherFieldName = underscorePrefix + 'other';
        
        // Handle duplicate "other" field names by adding underscores (similar to regular fields)
        if (usedFieldNames) {
            let finalOtherFieldName = otherFieldName;
            let duplicateUnderscoreCount = 0;
            while (usedFieldNames.has(finalOtherFieldName)) {
                duplicateUnderscoreCount++;
                finalOtherFieldName = otherFieldName + '_'.repeat(duplicateUnderscoreCount);
            }
            usedFieldNames.add(finalOtherFieldName);
            otherFieldName = finalOtherFieldName;
        }
        
        const placeholder = generatePlaceholder('other');
        
        return `
        <div class="form_box" id="ifOther${otherFieldCounter}">
           <div class="form_box_col1">
              <div class="group">
                 <?php
                    $input->label('${otherFieldName}', '');
                    $input->fields('${otherFieldName}', 'form_field', '${otherFieldName}', 'placeholder="${placeholder}"');
                 ?>
              </div>
           </div>
        </div>`;
    }
    
    return '';
}



function generateFormCode(inputText) {
    if (currentVersion === 'bootstrap') {
        return generateFormCodeBootstrap(inputText);
    } else {
        return generateFormCodeVersion3(inputText);
    }
}

function generateFormCodeBootstrap(inputText) {
    const lines = inputText.split('\n').filter(line => line.trim() !== '');
    const codeOutput = document.getElementById('generatedCodeOutput');
    let generatedCode = '';
    const usedFieldNames = new Set(); // Track used field names to handle duplicates
    const underscoreCount = parseInt(document.getElementById('underscoreCount').value) || 0;
    
    // Reset the "Other" field counter for this generation
    otherFieldCounter = 0;
    
    // Counter for privacy policy fields (Docu01, Docu02, etc.)
    let privacyPolicyCounter = 0;

    lines.forEach((line, index) => {
        const originalText = line.trim();
        let fieldName = originalText
            .replace(/\//g, 'or') // Replace slashes with 'or'
            .replace(/[^a-zA-Z0-9_?()]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

        // Add the specified number of underscores at the beginning
        if (underscoreCount > 0) {
            fieldName = '_'.repeat(underscoreCount) + fieldName;
        }

        // Handle duplicate field names by adding underscores
        let finalFieldName = fieldName;
        let duplicateUnderscoreCount = 0;
        while (usedFieldNames.has(finalFieldName)) {
            duplicateUnderscoreCount++;
            finalFieldName = fieldName + '_'.repeat(duplicateUnderscoreCount);
        }
        usedFieldNames.add(finalFieldName);

        // Default to not required for initial generation
        const requiredText = "''";

        let fieldCode = '';
        const lowerText = originalText.toLowerCase();

        // Check if there's a custom field type override for this field
        const customFieldType = fieldTypeOverrides.get(index);
        const fieldOptionsText = fieldOptions.get(index) || '';

        // Use the original text for the label (without underscores)
        const labelText = originalText;

        // Analyze the text to determine the appropriate field type
        if (customFieldType) {
            // Use custom field type override
            if (customFieldType === 'header') {
                // Field header
                fieldCode = `<p class="fieldheader text-center text-uppercase fw-bold py-2 mb-3">${originalText}</p>
<input type="hidden" name="${finalFieldName}" value=":" />`;
            } else if (customFieldType === 'radio') {
                // Parse options from the input
                const options = fieldOptionsText ? fieldOptionsText.split(',').map(opt => `'${opt.trim()}'`).join(', ') : "'Option 1', 'Option 2', 'Option 3'";
                fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <?php
      $input->label('${labelText}', '');
      $input->radio('${finalFieldName}', array(${options}), '${finalFieldName}', ${requiredText}, '${fieldOptionsText ? fieldOptionsText.split(',').length : 3}');
    ?>
  </div>
</div>`;
                
                // Add "Other" field if needed
                fieldCode += generateOtherFieldIfNeeded(fieldOptionsText, finalFieldName, requiredText, underscoreCount, usedFieldNames);
            } else if (customFieldType === 'checkbox') {
                // Parse options from the input
                const options = fieldOptionsText ? fieldOptionsText.split(',').map(opt => `'${opt.trim()}'`).join(', ') : "'Option 1', 'Option 2', 'Option 3'";
                fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12 group" data-limit="7">
    <?php
      $input->label('${labelText}', '');
      $input->chkboxVal('${finalFieldName}', array(${options}), '${finalFieldName}', ${requiredText}, '${fieldOptionsText ? fieldOptionsText.split(',').length : 3}');
    ?>
  </div>
</div>`;
                
                // Add "Other" field if needed
                fieldCode += generateOtherFieldIfNeeded(fieldOptionsText, finalFieldName, requiredText, underscoreCount, usedFieldNames);
            } else if (customFieldType === 'select') {
                // Parse options from the input
                const options = fieldOptionsText ? fieldOptionsText.split(',').map(opt => `'${opt.trim()}'`).join(', ') : "'Option 1', 'Option 2', 'Option 3'";
                fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-4">
    <?php $input->select('${finalFieldName}', array(${options}), '${finalFieldName}', ${requiredText}); ?>
  </div>i clicked
</div>`;
                
                // Add "Other" field if needed
                fieldCode += generateOtherFieldIfNeeded(fieldOptionsText, finalFieldName, requiredText, underscoreCount, usedFieldNames);
            } else if (customFieldType === 'textarea') {
                // Textarea for longer text
                // Check if this field is marked as required in the DOM
                const fieldItem = document.querySelector(`.field-item[data-index="${index}"]`);
                const isRequired = fieldItem && fieldItem.querySelector('.required-btn') && fieldItem.querySelector('.required-btn').classList.contains('required');
                const requiredAttr = isRequired ? ' required' : '';
                fieldCode = `<div class="row g-3 mb-3">
                <div class="col-md-12">
                    <?php
                    // @param field name, class, id and attribute
                    $input->textarea('${finalFieldName}', 'form-control', '${finalFieldName}', 'style="height: 100px;"${requiredAttr}', '', ' ', '${originalText}');
                    ?>
                </div>
            </div>`;
            } else if (customFieldType === 'privacy') {
                // Docu Checkbox with custom text - use incremented naming
                // Check if this field is marked as required in the DOM
                const fieldItem = document.querySelector(`.field-item[data-index="${index}"]`);
                const isRequired = fieldItem && fieldItem.querySelector('.required-btn') && fieldItem.querySelector('.required-btn').classList.contains('required');
                privacyPolicyCounter++;
                const docuFieldName = `Docu${privacyPolicyCounter.toString().padStart(2, '0')}`;
                fieldCode = `<div class="disclaimer">
  <p><input type="checkbox" name="${docuFieldName}" style="-webkit-appearance:checkbox" ${isRequired ? 'required' : ''} /> &nbsp;<b>${originalText}</b> </p>
</div>`;
            } else {
                // Default to normal text with form-control
                fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <?php $input->fields('${finalFieldName}', 'form-control', '${finalFieldName}', ${requiredText}); ?>
  </div>
</div>`;
            }
        } else if (lowerText.includes('date') || lowerText.includes('birth') || lowerText.includes('dob')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-4">
    <?php $input->datepicker('${finalFieldName}', '${finalFieldName}', ${requiredText}, 'Date1 DisableFuture', '', '${labelText}'); ?>
  </div>
</div>`;
        } else if (lowerText.includes('email') || lowerText.includes('e-mail')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <?php $input->email('${finalFieldName}', '', '${finalFieldName}', ${requiredText}, '', '', '${labelText}'); ?>
  </div>
</div>`;
        } else if (lowerText.includes('phone') || lowerText.includes('mobile') || lowerText.includes('contact')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <?php $input->phoneInput('${finalFieldName}', '', '${finalFieldName}', ${requiredText}); ?>
  </div>
</div>`;
        } else if (lowerText.includes('initial') || lowerText.includes('initials')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-3">
    <?php $input->fields('${finalFieldName}', 'initialOnly', '${finalFieldName}', ${requiredText}); ?>
  </div>
</div>`;
        } else if (lowerText.includes('age')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-2">
    <?php $input->fields('${finalFieldName}', 'ageOnly', '${finalFieldName}', ${requiredText}); ?>
  </div>
</div>`;
        } else if (lowerText.includes('amount') || lowerText.includes('salary') || lowerText.includes('price') || lowerText.includes('cost')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-3">
    <?php $input->amount('${finalFieldName}', '${finalFieldName}', ${requiredText}); ?>
  </div>
</div>`;
        } else if (lowerText.includes('upload') || lowerText.includes('attach') || lowerText.includes('file') || lowerText.includes('document')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <?php
      $input->label('${labelText} <span style=\"font-style: italic; font-size: 13px; text-transform: lowercase; color:#b1b1b1;\">(accepted file formats: .doc, .docx, .pdf | Max: 10MB)</span>', '');
      $input->files('', 'file', '${finalFieldName}', ${requiredText}, 'doc,docx,pdf,zip', '10MB');
    ?>
  </div>
</div>`;
        } else if (lowerText.includes('signature') || lowerText.includes('sign')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <div class="signature-section">
      <h5 class="signature-title">${labelText}</h5>
      <div class="row">
        <div class="col-md-8">
          <div class="sigPad signature-pad-container" id="signaturePad">
            <div class="sig sigWrapper current">
              <div class="typed"></div>
              <canvas class="pad" width="100%" height="200"></canvas>
              <input type="hidden" name="${finalFieldName}" class="output">
            </div>
            <div class="signature-controls d-flex justify-content-between align-items-center mt-2">
              <p class="clearButton mb-0">
                <a href="#clear" class="btn btn-outline-danger btn-sm">
                  <i class="fas fa-eraser"></i> Clear Signature
                </a>
              </p>
              <small class="text-muted">
                <i class="fas fa-pen"></i> Draw your signature above
              </small>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <?php $input->dateToday('Date_Signed', 'Date_Signed', '', 'Date'); ?>
        </div>
      </div>
    </div>
  </div>
</div>`;
        } else if (lowerText.includes('number') || lowerText.includes('quantity') || lowerText.includes('count')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-4">
    <?php $input->fields('${finalFieldName}', 'numberOnly', '${finalFieldName}', ${requiredText}); ?>
  </div>
</div>`;
        } else if (lowerText.includes('yes') || lowerText.includes('no') || lowerText.includes('gender') || lowerText.includes('marital') || lowerText.includes('status')) {
            // Radio buttons for yes/no, gender, marital status
            let options = [];
            if (lowerText.includes('yes') || lowerText.includes('no')) {
                options = ['Yes', 'No'];
            } else if (lowerText.includes('gender')) {
                options = ['Male', 'Female'];
            } else if (lowerText.includes('marital')) {
                options = ['Single', 'Married', 'Widowed'];
            } else {
                options = ['Option 1', 'Option 2', 'Option 3'];
            }

            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <?php
      $input->label('${labelText}', '');
      $input->radio('${finalFieldName}', array('${options.join("', '")}'), '${finalFieldName}', ${requiredText}, '${options.length}');
    ?>
  </div>
</div>`;
        } else if (lowerText.includes('select') || lowerText.includes('choose') || lowerText.includes('category') || lowerText.includes('type')) {
            // Dropdown for selection fields
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-4">
    <?php $input->select('${finalFieldName}', array('Option 1', 'Option 2', 'Option 3'), '${finalFieldName}', ${requiredText}); ?>
  </div>
</div>`;
        } else if (lowerText.includes('check') || lowerText.includes('multiple') || lowerText.includes('interests') || lowerText.includes('hobbies')) {
            // Checkbox for multiple selection
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12 group" data-limit="7">
    <?php
      $input->label('${labelText}', '');
      $input->chkboxVal('${finalFieldName}', array('Option 1', 'Option 2', 'Option 3'), '${finalFieldName}', ${requiredText}, '3');
    ?>
  </div>
</div>`;
                    } else if (lowerText.includes('comment') || lowerText.includes('description') || lowerText.includes('explanation') || lowerText.includes('note') || lowerText.includes('detail')) {
                // Textarea for longer text
                // Check if this field is marked as required in the DOM
                const fieldItem = document.querySelector(`.field-item[data-index="${index}"]`);
                const isRequired = fieldItem && fieldItem.querySelector('.required-btn') && fieldItem.querySelector('.required-btn').classList.contains('required');
                const requiredAttr = isRequired ? ' required' : '';
                fieldCode = `<div class="row g-3 mb-3">
                <div class="col-md-12">
                    <?php
                    // @param field name, class, id and attribute
                    $input->textarea('${finalFieldName}', 'form-control', '${finalFieldName}', 'style="height: 100px;"${requiredAttr}', '', ' ', '${originalText}');
                    ?>
                </div>
            </div>`;
        } else if (lowerText.includes('header') || lowerText.includes('title') || lowerText.includes('section')) {
            // Field header
            fieldCode = `<p class="fieldheader text-center text-uppercase fw-bold py-2 mb-3">${originalText}</p>
<input type="hidden" name="${finalFieldName}" value=":" />`;
        } else if (lowerText.includes('name') || lowerText.includes('first') || lowerText.includes('last') || lowerText.includes('full')) {
            // Letter only for names
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <?php $input->fields('${finalFieldName}', 'letterOnly', '${finalFieldName}', ${requiredText}); ?>
  </div>
</div>`;
        } else if (lowerText.includes('privacy policy') || lowerText.includes('terms and conditions') || lowerText.includes('data consent') || lowerText.includes('personal information consent')) {
            // Docu Checkbox - only for specific privacy/consent related text - use original field name
            fieldCode = `<div class="disclaimer">
  <p><input type="checkbox" name="${finalFieldName}" style="-webkit-appearance:checkbox" ${isRequired ? 'required' : ''} /> &nbsp;<b>${originalText}</b> </p>
</div>`;
        } else {
            // Default to normal text field with form-control
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <?php $input->fields('${finalFieldName}', 'form-control', '${finalFieldName}', ${requiredText}); ?>
  </div>
</div>`;
        }

        generatedCode += fieldCode + '\n\n';
    });

    codeOutput.value = generatedCode.trim();
}

function generateFormCodeVersion3(inputText) {
    const lines = inputText.split('\n').filter(line => line.trim() !== '');
    const codeOutput = document.getElementById('generatedCodeOutput');
    let generatedCode = '';
    const usedFieldNames = new Set(); // Track used field names to handle duplicates
    const underscoreCount = parseInt(document.getElementById('underscoreCount').value) || 0;
    
    // Reset the "Other" field counter for this generation
    otherFieldCounter = 0;
    
    // Counter for privacy policy fields (Docu01, Docu02, etc.)
    let privacyPolicyCounter = 0;

    lines.forEach((line, index) => {
        const originalText = line.trim();
        let fieldName = originalText
            .replace(/\//g, 'or') // Replace slashes with 'or'
            .replace(/[^a-zA-Z0-9_?()]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

        // Add the specified number of underscores at the beginning
        if (underscoreCount > 0) {
            fieldName = '_'.repeat(underscoreCount) + fieldName;
        }

        // Handle duplicate field names by adding underscores
        let finalFieldName = fieldName;
        let duplicateUnderscoreCount = 0;
        while (usedFieldNames.has(finalFieldName)) {
            duplicateUnderscoreCount++;
            finalFieldName = fieldName + '_'.repeat(duplicateUnderscoreCount);
        }
        usedFieldNames.add(finalFieldName);

        // Check if this field is marked as required
        const fieldItem = document.querySelector(`.field-item[data-index="${index}"]`);
        const isRequired = fieldItem && fieldItem.querySelector('.required-btn') && fieldItem.querySelector('.required-btn').classList.contains('required');
        const requiredText = isRequired ? "'required'" : "''";

        let fieldCode = '';
        const lowerText = originalText.toLowerCase();

        // Check if there's a custom field type override for this field
        const customFieldType = fieldTypeOverrides.get(index);
        const fieldOptionsText = fieldOptions.get(index) || '';

        // Use the original text for the label (without underscores)
        const labelText = originalText;
        // Add asterisk to label if field is required
        const labelSuffix = isRequired ? '*' : '';

        // Analyze the text to determine the appropriate field type
        if (customFieldType) {
            // Use custom field type override
            if (customFieldType === 'header') {
                // Field header
                fieldCode = `<p class="fieldheader">${originalText}</p>
<input type="hidden" name="${finalFieldName}" value=":" />`;
            } else if (customFieldType === 'radio') {
                // Parse options from the input
                const options = fieldOptionsText ? fieldOptionsText.split(',').map(opt => `'${opt.trim()}'`).join(', ') : "'Option 1', 'Option 2', 'Option 3'";
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->radio('${finalFieldName}', array(${options}), '', '', '${fieldOptionsText ? fieldOptionsText.split(',').length : 3}');
         ?>
      </div>
   </div>
</div>`;
                
                // Add "Other" field if needed
                fieldCode += generateOtherFieldIfNeededVersion3(fieldOptionsText, finalFieldName, requiredText, underscoreCount, usedFieldNames);
            } else if (customFieldType === 'checkbox') {
                // Parse options from the input
                const options = fieldOptionsText ? fieldOptionsText.split(',').map(opt => `'${opt.trim()}'`).join(', ') : "'Option 1', 'Option 2', 'Option 3'";
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->chkboxVal('${finalFieldName}', array(${options}), '', '', '${fieldOptionsText ? fieldOptionsText.split(',').length : 3}');
         ?>
      </div>
   </div>
</div>`;
                
                // Add "Other" field if needed
                fieldCode += generateOtherFieldIfNeededVersion3(fieldOptionsText, finalFieldName, requiredText, underscoreCount, usedFieldNames);
            } else if (customFieldType === 'select') {
                // Parse options from the input
                const options = fieldOptionsText ? fieldOptionsText.split(',').map(opt => `'${opt.trim()}'`).join(', ') : "'Option 1', 'Option 2', 'Option 3'";
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->select('${finalFieldName}', 'form_field', array(${options}), '${finalFieldName}');
         ?>
      </div>
   </div>
</div>`;
                
                // Add "Other" field if needed
                fieldCode += generateOtherFieldIfNeededVersion3(fieldOptionsText, finalFieldName, requiredText, underscoreCount, usedFieldNames);
            } else if (customFieldType === 'textarea') {
                // Textarea for longer text
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            // @param label-name, if required
            $input->label('${labelText}', '${labelSuffix}');
            // @param field name, class, id and attribute
            $input->textarea('${finalFieldName}', 'text form_field','${finalFieldName}','placeholder="Enter your ${originalText.toLowerCase()} here"');
         ?>
      </div>
   </div>
</div>`;
            } else if (customFieldType === 'privacy') {
                // Docu Checkbox with custom text - use incremented naming
                privacyPolicyCounter++;
                const docuFieldName = `Docu${privacyPolicyCounter.toString().padStart(2, '0')}`;
                fieldCode = `<div class="disclaimer">
   <p><input type="checkbox" name="${docuFieldName}" style="-webkit-appearance:checkbox" /> &nbsp;<b>${originalText}</b> </p>
</div>`;
            } else {
                // Default to normal text field
                const placeholder = generatePlaceholder(originalText);
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->fields('${finalFieldName}', 'form_field', '${finalFieldName}', 'placeholder="${placeholder}"');
         ?>
      </div>
   </div>
</div>`;
            }
                    } else {
                // Auto-detect field type based on text content
                if (lowerText.includes('date') || lowerText.includes('birth') || lowerText.includes('dob')) {
                    fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->fields('${finalFieldName}', 'form_field Date', '${finalFieldName}', 'placeholder="Enter date here"');
         ?>
      </div>
   </div>
</div>`;
                            } else if (lowerText.includes('phone') || lowerText.includes('mobile') || lowerText.includes('contact')) {
                    fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->phoneInput('${finalFieldName}', 'form_field','${finalFieldName}','placeholder="Enter phone number here" onkeypress="return isNumberKey(evt)"');
         ?>
      </div>
   </div>
</div>`;
                            } else if (lowerText.includes('email') || lowerText.includes('e-mail')) {
                    fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->fields('${finalFieldName}', 'form_field', '${finalFieldName}', '');
         ?>
      </div>
   </div>
</div>`;
                            } else if (lowerText.includes('address') || lowerText.includes('street') || lowerText.includes('city') || lowerText.includes('state') || lowerText.includes('zip')) {
                    fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->fields('${finalFieldName}', 'form_field','${finalFieldName}','placeholder="Enter ${lowerText} here"');
         ?>
      </div>
   </div>
</div>`;
                            } else if (lowerText.includes('salary') || lowerText.includes('amount') || lowerText.includes('price') || lowerText.includes('cost')) {
                    fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->amount('${finalFieldName}', '${finalFieldName}', '');
         ?>
      </div>
   </div>
</div>`;
                            } else if (lowerText.includes('comment') || lowerText.includes('note') || lowerText.includes('description') || lowerText.includes('explanation')) {
                    fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            // @param label-name, if required
            $input->label('${labelText}', '${labelSuffix}');
            // @param field name, class, id and attribute
            $input->textarea('${finalFieldName}', 'text form_field','${finalFieldName}','placeholder="Enter your ${originalText.toLowerCase()} here"');
         ?>
      </div>
   </div>
</div>`;
                            } else if (lowerText.includes('file') || lowerText.includes('upload') || lowerText.includes('attachment') || lowerText.includes('resume')) {
                    fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
         ?>
         <input type="file" name="attachment[]" id="file" class="form_field" multiple>
      </div>
   </div>
</div>`;
                            } else if (lowerText.includes('signature') || lowerText.includes('sign')) {
                    fieldCode = `<div class="form_box my_signature">
   <div class="form_box_col2">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
         ?>
         <div class="sigPad" style="margin-top:5px;">
            <div class="sig sigWrapper">
               <div class="typed"></div>
               <canvas class="pad" width="196" height="50"></canvas>
            </div>
         </div>
      </div>
   </div>
</div>`;
                                        } else {
                // Default case for any other text
                const placeholder = generatePlaceholder(originalText);
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->fields('${finalFieldName}', 'form_field', '${finalFieldName}', 'placeholder="${placeholder}"');
         ?>
      </div>
   </div>
</div>`;
            }
        }

        generatedCode += fieldCode + '\n\n';
    });

    codeOutput.value = generatedCode.trim();
}

function generateFormCodeWithRequiredVersion3(inputText, fieldData) {
    const lines = inputText.split('\n').filter(line => line.trim() !== '');
    const codeOutput = document.getElementById('generatedCodeOutput');
    let generatedCode = '';
    const usedFieldNames = new Set(); // Track used field names to handle duplicates
    const underscoreCount = parseInt(document.getElementById('underscoreCount').value) || 0;
    
    // Reset the "Other" field counter for this generation
    otherFieldCounter = 0;
    
    // Counter for privacy policy fields (Docu01, Docu02, etc.)
    let privacyPolicyCounter = 0;

    lines.forEach((line, index) => {
        const fieldInfo = fieldData[index];

        if (!fieldInfo) return;

        let fieldName = fieldInfo.name;
        
        // Add the specified number of underscores at the beginning if not already present
        if (underscoreCount > 0 && !fieldName.startsWith('_'.repeat(underscoreCount))) {
            fieldName = '_'.repeat(underscoreCount) + fieldName;
        }
        
        const isRequired = fieldInfo.required;
        const requiredText = isRequired ? "'required'" : "''";

        let fieldCode = '';
        const originalText = fieldInfo.originalText; // Use the original text from field data
        const lowerText = originalText.toLowerCase();

        // Check if there's a custom field type override for this field
        const customFieldType = fieldTypeOverrides.get(index);
        const fieldOptionsText = fieldOptions.get(index) || '';

        // Use the original text for the label (without underscores)
        const labelText = originalText;
        // Add asterisk to label if field is required
        const labelSuffix = isRequired ? '*' : '';

        // Analyze the text to determine the appropriate field type
        if (customFieldType) {
            // Use custom field type override
            if (customFieldType === 'header') {
                // Field header
                fieldCode = `<p class="fieldheader">${originalText}</p>
<input type="hidden" name="${fieldName}" value=":" />`;
            } else if (customFieldType === 'radio') {
                // Parse options from the input
                const options = fieldOptionsText ? fieldOptionsText.split(',').map(opt => `'${opt.trim()}'`).join(', ') : "'Option 1', 'Option 2', 'Option 3'";
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->radio('${fieldName}', array(${options}), '', '', '${fieldOptionsText ? fieldOptionsText.split(',').length : 3}');
         ?>
      </div>
   </div>
</div>`;
                
                // Add "Other" field if needed
                fieldCode += generateOtherFieldIfNeededVersion3(fieldOptionsText, fieldName, requiredText, underscoreCount, usedFieldNames);
            } else if (customFieldType === 'checkbox') {
                // Parse options from the input
                const options = fieldOptionsText ? fieldOptionsText.split(',').map(opt => `'${opt.trim()}'`).join(', ') : "'Option 1', 'Option 2', 'Option 3'";
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->chkboxVal('${fieldName}', array(${options}), '', '', '${fieldOptionsText ? fieldOptionsText.split(',').length : 3}');
         ?>
      </div>
   </div>
</div>`;
                
                // Add "Other" field if needed
                fieldCode += generateOtherFieldIfNeededVersion3(fieldOptionsText, fieldName, requiredText, underscoreCount, usedFieldNames);
            } else if (customFieldType === 'select') {
                // Parse options from the input
                const options = fieldOptionsText ? fieldOptionsText.split(',').map(opt => `'${opt.trim()}'`).join(', ') : "'Option 1', 'Option 2', 'Option 3'";
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->select('${fieldName}', 'form_field', array(${options}), '${fieldName}');
         ?>
      </div>
   </div>
</div>`;
                
                // Add "Other" field if needed
                fieldCode += generateOtherFieldIfNeededVersion3(fieldOptionsText, fieldName, requiredText, underscoreCount, usedFieldNames);
            } else if (customFieldType === 'textarea') {
                // Textarea for longer text
                const placeholder = generatePlaceholder(originalText);
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            // @param label-name, if required
            $input->label('${labelText}', '${labelSuffix}');
            // @param field name, class, id and attribute
            $input->textarea('${fieldName}', 'text form_field','${fieldName}','placeholder="Enter your ${originalText.toLowerCase()} here"');
         ?>
      </div>
   </div>
</div>`;
            } else if (customFieldType === 'privacy') {
                // Docu Checkbox with custom text - use incremented naming
                privacyPolicyCounter++;
                const docuFieldName = `Docu${privacyPolicyCounter.toString().padStart(2, '0')}`;
                fieldCode = `<div class="disclaimer">
   <p><input type="checkbox" name="${docuFieldName}" style="-webkit-appearance:checkbox" /> &nbsp;<b>${originalText}</b> </p>
</div>`;
            } else {
                // Default to normal text field
                const placeholder = generatePlaceholder(originalText);
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->fields('${fieldName}', 'form_field', '${fieldName}', 'placeholder="${placeholder}"');
         ?>
      </div>
   </div>
</div>`;
            }
        } else {
            // Auto-detect field type based on text content
            if (lowerText.includes('date') || lowerText.includes('birth') || lowerText.includes('dob')) {
                const placeholder = generatePlaceholder(originalText);
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->fields('${fieldName}', 'form_field Date', '${fieldName}', 'placeholder="${placeholder}"');
         ?>
      </div>
   </div>
</div>`;
            } else if (lowerText.includes('phone') || lowerText.includes('mobile') || lowerText.includes('contact')) {
                const placeholder = generatePlaceholder(originalText);
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->phoneInput('${fieldName}', 'form_field','${fieldName}','placeholder="${placeholder}" onkeypress="return isNumberKey(evt)"');
         ?>
      </div>
   </div>
</div>`;
            } else if (lowerText.includes('email') || lowerText.includes('e-mail')) {
                const placeholder = generatePlaceholder(originalText);
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->fields('${fieldName}', 'form_field', '${fieldName}', 'placeholder="${placeholder}"');
         ?>
      </div>
   </div>
</div>`;
            } else if (lowerText.includes('address') || lowerText.includes('street') || lowerText.includes('city') || lowerText.includes('state') || lowerText.includes('zip')) {
                const placeholder = generatePlaceholder(originalText);
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->fields('${fieldName}', 'form_field','${fieldName}','placeholder="${placeholder}"');
         ?>
      </div>
   </div>
</div>`;
            } else if (lowerText.includes('salary') || lowerText.includes('amount') || lowerText.includes('price') || lowerText.includes('cost')) {
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->amount('${fieldName}', '${fieldName}', '');
         ?>
      </div>
   </div>
</div>`;
            } else if (lowerText.includes('note') || lowerText.includes('description') || lowerText.includes('explanation')) {
                const placeholder = generatePlaceholder(originalText);
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            // @param label-name, if required
            $input->label('${labelText}', '${labelSuffix}');
            // @param field name, class, id and attribute
            $input->textarea('${fieldName}', 'text form_field','${fieldName}','placeholder="Enter your ${fieldName.toLowerCase()} here"');
         ?>
      </div>
   </div>
</div>`;
            } else if (lowerText.includes('file') || lowerText.includes('upload') || lowerText.includes('attachment') || lowerText.includes('resume')) {
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
         ?>
         <input type="file" name="attachment[]" id="file" class="form_field" multiple>
      </div>
   </div>
</div>`;
            } else if (lowerText.includes('signature') || lowerText.includes('sign')) {
                fieldCode = `<div class="form_box my_signature">
   <div class="form_box_col2">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
         ?>
         <div class="sigPad" style="margin-top:5px;">
            <div class="sig sigWrapper">
               <div class="typed"></div>
               <canvas class="pad" width="196" height="50"></canvas>
            </div>
         </div>
      </div>
   </div>
</div>`;
            } else {
                // Default to normal text field
                const placeholder = generatePlaceholder(originalText);
                fieldCode = `<div class="form_box">
   <div class="form_box_col1">
      <div class="group">
         <?php
            $input->label('${labelText}', '${labelSuffix}');
            $input->fields('${fieldName}', 'form_field', '${fieldName}', 'placeholder="${placeholder}"');
         ?>
      </div>
   </div>
</div>`;
            }
        }

        generatedCode += fieldCode + '\n\n';
    });

    codeOutput.value = generatedCode.trim();
}

function toggleRequired(index) {
    const button = document.querySelector(`.required-btn[data-index="${index}"]`);
    
    // If button doesn't exist (e.g., for privacy fields), do nothing
    if (!button) return;
    
    const isRequired = button.classList.contains('required');

    if (isRequired) {
        button.classList.remove('required');
        button.classList.add('not-required');
        button.textContent = 'Required';
        fieldRequiredStatus.set(index, false);
    } else {
        button.classList.remove('not-required');
        button.classList.add('required');
        button.textContent = 'Required ✓';
        fieldRequiredStatus.set(index, true);
    }

    // Update the generated code with the new required status
    updateGeneratedCode();
    
    // Update the validation code for Version 3
    if (currentVersion === 'version3') {
        generateValidationCode();
    }
}

function updateGeneratedCode() {
    const input = document.getElementById('transformInput').value;
    if (input.trim() === '') return;

    // Sync required status from DOM before updating
    syncRequiredStatusFromDOM();

    // Get all field items and their required status
    const fieldItems = document.querySelectorAll('.field-item');
    const lines = input.split('\n');
    const underscoreCount = parseInt(document.getElementById('underscoreCount').value) || 0;
    const usedFieldNames = new Set(); // Track used field names to handle duplicates
    
    const fieldData = Array.from(fieldItems).map((item, index) => {
        // Get the field name from the DOM element to ensure consistency
        const fieldTextElement = item.querySelector('.field-text');
        let fieldName = fieldTextElement ? fieldTextElement.textContent : '';
        
        // If field name is not available from DOM, reconstruct it from input
        if (!fieldName) {
            let line = lines[index] ? lines[index].trim() : '';
            fieldName = line
                .replace(/\//g, 'or') // Replace slashes with 'or'
                .replace(/[^a-zA-Z0-9_?()]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            if (underscoreCount > 0) {
                fieldName = '_'.repeat(underscoreCount) + fieldName;
            }
            
            // Handle duplicate field names by adding underscores (same logic as transformText)
            let finalFieldName = fieldName;
            let duplicateUnderscoreCount = 0;
            while (usedFieldNames.has(finalFieldName)) {
                duplicateUnderscoreCount++;
                finalFieldName = fieldName + '_'.repeat(duplicateUnderscoreCount);
            }
            usedFieldNames.add(finalFieldName);
            fieldName = finalFieldName;
        }
        
        return {
            name: fieldName,
            originalText: lines[index] ? lines[index].trim() : '', // Store the original text for labels
            required: fieldRequiredStatus.get(index) || false
        };
    });

    // Update the generated code with required status
    generateFormCodeWithRequired(input, fieldData);
    
    // Update the validation code for Version 3
    if (currentVersion === 'version3') {
        generateValidationCode();
    }
}

function generateFormCodeWithRequired(inputText, fieldData) {
    if (currentVersion === 'bootstrap') {
        return generateFormCodeWithRequiredBootstrap(inputText, fieldData);
    } else {
        return generateFormCodeWithRequiredVersion3(inputText, fieldData);
    }
}

function generateFormCodeWithRequiredBootstrap(inputText, fieldData) {
    const lines = inputText.split('\n').filter(line => line.trim() !== '');
    const codeOutput = document.getElementById('generatedCodeOutput');
    let generatedCode = '';
    const usedFieldNames = new Set(); // Track used field names to handle duplicates
    const underscoreCount = parseInt(document.getElementById('underscoreCount').value) || 0;
    
    // Reset the "Other" field counter for this generation
    otherFieldCounter = 0;
    
    // Counter for privacy policy fields (Docu01, Docu02, etc.)
    let privacyPolicyCounter = 0;

    lines.forEach((line, index) => {
        const originalText = line.trim();
        const fieldInfo = fieldData[index];

        if (!fieldInfo) return;

        let fieldName = fieldInfo.name;
        
        // Add the specified number of underscores at the beginning if not already present
        if (underscoreCount > 0 && !fieldName.startsWith('_'.repeat(underscoreCount))) {
            fieldName = '_'.repeat(underscoreCount) + fieldName;
        }
        
        const isRequired = fieldInfo.required;
        const requiredText = isRequired ? "'required'" : "''";

        let fieldCode = '';
        const lowerText = originalText.toLowerCase();

        // Check if there's a custom field type override for this field
        const customFieldType = fieldTypeOverrides.get(index);
        const fieldOptionsText = fieldOptions.get(index) || '';

        // Analyze the text to determine the appropriate field type
        if (customFieldType) {
            // Use custom field type override
            if (customFieldType === 'header') {
                // Field header
                fieldCode = `<p class="fieldheader text-center text-uppercase fw-bold py-2 mb-3">${originalText}</p>
<input type="hidden" name="${fieldName}" value=":" />`;
            } else if (customFieldType === 'radio') {
                // Parse options from the input
                const options = fieldOptionsText ? fieldOptionsText.split(',').map(opt => `'${opt.trim()}'`).join(', ') : "'Option 1', 'Option 2', 'Option 3'";
                fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <?php
      $input->label('${originalText}', '');
      $input->radio('${fieldName}', array(${options}), '${fieldName}', ${requiredText}, '${fieldOptionsText ? fieldOptionsText.split(',').length : 3}');
    ?>
  </div>
</div>`;
                
                // Add "Other" field if needed
                fieldCode += generateOtherFieldIfNeeded(fieldOptionsText, fieldName, requiredText, underscoreCount, usedFieldNames);
            } else if (customFieldType === 'checkbox') {
                // Parse options from the input
                const options = fieldOptionsText ? fieldOptionsText.split(',').map(opt => `'${opt.trim()}'`).join(', ') : "'Option 1', 'Option 2', 'Option 3'";
                fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12 group" data-limit="7">
    <?php
      $input->label('${originalText}', '');
      $input->chkboxVal('${fieldName}', array(${options}), '${fieldName}', ${requiredText}, '${fieldOptionsText ? fieldOptionsText.split(',').length : 3}');
    ?>
  </div>
</div>`;
                
                // Add "Other" field if needed
                fieldCode += generateOtherFieldIfNeeded(fieldOptionsText, fieldName, requiredText, underscoreCount, usedFieldNames);
            } else if (customFieldType === 'select') {
                // Parse options from the input
                const options = fieldOptionsText ? fieldOptionsText.split(',').map(opt => `'${opt.trim()}'`).join(', ') : "'Option 1', 'Option 2', 'Option 3'";
                fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-4">
    <?php $input->select('${fieldName}', array(${options}), '${fieldName}', ${requiredText}); ?>
  </div>
</div>`;
                
                // Add "Other" field if needed
                fieldCode += generateOtherFieldIfNeeded(fieldOptionsText, fieldName, requiredText, underscoreCount, usedFieldNames);
            } else if (customFieldType === 'textarea') {
                // Textarea for longer text
                const requiredAttr = isRequired ? ' required' : '';
                fieldCode = `<div class="row g-3 mb-3">
                <div class="col-md-12">
                    <?php
                    // @param field name, class, id and attribute
                    $input->textarea('${fieldName}', 'form-control', '${fieldName}', 'style="height: 100px;"${requiredAttr}', '', ' ', '${originalText}');
                    ?>
                </div>
            </div>`;
            } else if (customFieldType === 'privacy') {
                // Docu Checkbox with custom text - use incremented naming
                privacyPolicyCounter++;
                const docuFieldName = `Docu${privacyPolicyCounter.toString().padStart(2, '0')}`;
                fieldCode = `<div class="disclaimer">
  <p><input type="checkbox" name="${docuFieldName}" style="-webkit-appearance:checkbox" ${isRequired ? 'required' : ''} /> &nbsp;<b>${originalText}</b> </p>
</div>`;
            } else {
                // Default to normal text
                fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-6">
    <?php $input->fields('${fieldName}', '', '${fieldName}', ${requiredText}); ?>
  </div>
</div>`;
            }
        } else if (lowerText.includes('date') || lowerText.includes('birth') || lowerText.includes('dob')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-4">
    <?php $input->datepicker('${fieldName}', '${fieldName}', ${requiredText}, 'Date1 DisableFuture', '', '${fieldName}'); ?>
  </div>
</div>`;
        } else if (lowerText.includes('email') || lowerText.includes('e-mail')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <?php $input->email('${fieldName}', '', '${fieldName}', ${requiredText}, '', '', '${fieldName}'); ?>
  </div>
</div>`;
        } else if (lowerText.includes('phone') || lowerText.includes('mobile') || lowerText.includes('contact')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <?php $input->phoneInput('${fieldName}', '', '${fieldName}', ${requiredText}); ?>
  </div>
</div>`;
        } else if (lowerText.includes('initial') || lowerText.includes('initials')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-3">
    <?php $input->fields('${fieldName}', 'initialOnly', '${fieldName}', ${requiredText}); ?>
  </div>
</div>`;
        } else if (lowerText.includes('age')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-2">
    <?php $input->fields('${fieldName}', 'ageOnly', '${fieldName}', ${requiredText}); ?>
  </div>
</div>`;
        } else if (lowerText.includes('amount') || lowerText.includes('salary') || lowerText.includes('price') || lowerText.includes('cost')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-3">
    <?php $input->amount('${fieldName}', '${fieldName}', ${requiredText}); ?>
  </div>
</div>`;
        } else if (lowerText.includes('upload') || lowerText.includes('attach') || lowerText.includes('file') || lowerText.includes('document')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <?php
      $input->label('${originalText} <span style=\"font-style: italic; font-size: 13px; text-transform: lowercase; color:#b1b1b1;\">(accepted file formats: .doc, .docx, .pdf | Max: 10MB)</span>', '');
      $input->files('', 'file', '${fieldName}', ${requiredText}, 'doc,docx,pdf,zip', '10MB');
    ?>
  </div>
</div>`;
        } else if (lowerText.includes('signature') || lowerText.includes('sign')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <div class="signature-section">
      <h5 class="signature-title">${originalText}</h5>
      <div class="row">
        <div class="col-md-8">
          <div class="sigPad signature-pad-container" id="signaturePad">
            <div class="sig sigWrapper current">
              <div class="typed"></div>
              <canvas class="pad" width="100%" height="200"></canvas>
              <input type="hidden" name="${fieldName}" class="output" ${isRequired ? 'required' : ''}>
            </div>
            <div class="signature-controls d-flex justify-content-between align-items-center mt-2">
              <p class="clearButton mb-0">
                <a href="#clear" class="btn btn-outline-danger btn-sm">
                  <i class="fas fa-eraser"></i> Clear Signature
                </a>
              </p>
              <small class="text-muted">
                <i class="fas fa-pen"></i> Draw your signature above
              </small>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <?php $input->dateToday('Date_Signed', 'Date_Signed', '', 'Date'); ?>
        </div>
      </div>
    </div>
  </div>
</div>`;
        } else if (lowerText.includes('number') || lowerText.includes('quantity') || lowerText.includes('count')) {
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-4">
    <?php $input->fields('${fieldName}', 'numberOnly', '${fieldName}', ${requiredText}); ?>
  </div>
</div>`;
        } else if (lowerText.includes('yes') || lowerText.includes('no') || lowerText.includes('gender') || lowerText.includes('marital') || lowerText.includes('status')) {
            // Radio buttons for yes/no, gender, marital status
            let options = [];
            if (lowerText.includes('yes') || lowerText.includes('no')) {
                options = ['Yes', 'No'];
            } else if (lowerText.includes('gender')) {
                options = ['Male', 'Female'];
            } else if (lowerText.includes('marital')) {
                options = ['Single', 'Married', 'Widowed'];
            } else {
                options = ['Option 1', 'Option 2', 'Option 3'];
            }

            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <?php
      $input->label('${originalText}', '');
      $input->radio('${fieldName}', array('${options.join("', '")}'), '${fieldName}', ${requiredText}, '${options.length}');
    ?>
  </div>
</div>`;
        } else if (lowerText.includes('select') || lowerText.includes('choose') || lowerText.includes('category') || lowerText.includes('type')) {
            // Dropdown for selection fields
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-4">
    <?php $input->select('${fieldName}', array('Option 1', 'Option 2', 'Option 3'), '${fieldName}', ${requiredText}); ?>
  </div>
</div>`;
        } else if (lowerText.includes('check') || lowerText.includes('multiple') || lowerText.includes('interests') || lowerText.includes('hobbies')) {
            // Checkbox for multiple selection
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12 group" data-limit="7">
    <?php
      $input->label('${originalText}', '');
      $input->chkboxVal('${fieldName}', array('Option 1', 'Option 2', 'Option 3'), '${fieldName}', ${requiredText}, '3');
    ?>
  </div>
</div>`;
        } else if (lowerText.includes('comment') || lowerText.includes('description') || lowerText.includes('explanation') || lowerText.includes('note') || lowerText.includes('detail')) {
            // Textarea for longer text
            const requiredAttr = isRequired ? ' required' : '';
            fieldCode = `<div class="row g-3 mb-3">
                <div class="col-md-12">
                    <?php
                    // @param field name, class, id and attribute
                    $input->textarea('${fieldName}', 'form-control', '${fieldName}', 'style="height: 100px;"${requiredAttr}', '', ' ', '${originalText}');
                    ?>
                </div>
            </div>`;
        } else if (lowerText.includes('header') || lowerText.includes('title') || lowerText.includes('section')) {
            // Field header
            fieldCode = `<p class="fieldheader text-center text-uppercase fw-bold py-2 mb-3">${originalText}</p>
<input type="hidden" name="${fieldName}" value=":" />`;
        } else if (lowerText.includes('name') || lowerText.includes('first') || lowerText.includes('last') || lowerText.includes('full')) {
            // Letter only for names
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <?php $input->fields('${fieldName}', 'letterOnly', '${fieldName}', ${requiredText}); ?>
  </div>
</div>`;
        } else if (lowerText.includes('privacy policy') || lowerText.includes('terms and conditions') || lowerText.includes('data consent') || lowerText.includes('personal information consent')) {
            // Docu Checkbox - only for specific privacy/consent related text - use original field name
            fieldCode = `<div class="disclaimer">
  <p><input type="checkbox" name="${fieldName}" style="-webkit-appearance:checkbox" ${isRequired ? 'required' : ''} /> &nbsp;<b>${originalText}</b> </p>
</div>`;
        } else {
            // Default to normal text field with form-control
            fieldCode = `<div class="row g-3 mb-3">
  <div class="col-md-12">
    <?php $input->fields('${fieldName}', 'form-control', '${fieldName}', ${requiredText}); ?>
  </div>
</div>`;
        }

        generatedCode += fieldCode + '\n\n';
    });

    codeOutput.value = generatedCode.trim();
}

function copyGeneratedCode() {
    const output = document.getElementById('generatedCodeOutput');

    if (output.value.trim() === '') {
        alert('No code to copy! Please enter some text first.');
        return;
    }

    navigator.clipboard.writeText(output.value).then(() => {
        const btn = document.getElementById('copyGeneratedBtn');
        btn.textContent = "Copied!";
        btn.style.backgroundColor = '#d63384';

        setTimeout(() => {
            btn.textContent = "Copy";
            btn.style.backgroundColor = '#f06292';
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy code: ', err);
        alert('Failed to copy code. Please try again.');
    });
}

function copyTransformedText() {
    // Sync required status from DOM before copying
    syncRequiredStatusFromDOM();
    
    const fieldItems = document.querySelectorAll('.field-item');

    if (fieldItems.length === 0) {
        alert('No text to copy! Please enter some text first.');
        return;
    }

    let textToCopy = '';
    fieldItems.forEach((item, index) => {
        const fieldName = item.querySelector('.field-text').textContent;
        const isRequired = fieldRequiredStatus.get(index) || false;
        textToCopy += fieldName + (isRequired ? ' (Required)' : '') + '\n';
    });

    navigator.clipboard.writeText(textToCopy.trim()).then(() => {
        const btn = document.getElementById('copyTransformBtn');
        btn.textContent = "Copied!";
        btn.style.backgroundColor = '#d63384';

        setTimeout(() => {
            btn.textContent = "Copy";
            btn.style.backgroundColor = '#f06292';
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy text. Please try again.');
    });
}

function generateValidationCode() {
    const fieldItems = document.querySelectorAll('.field-item');
    const validationOutput = document.getElementById('validationCodeOutput');

    if (fieldItems.length === 0) {
        validationOutput.value = '';
        return;
    }

    const requiredFields = [];
    const lines = document.getElementById('transformInput').value.split('\n');
    const underscoreCount = parseInt(document.getElementById('underscoreCount').value) || 0;

    fieldItems.forEach((item, index) => {
        // Use stored required status instead of reading from DOM
        const isRequired = fieldRequiredStatus.get(index) || false;
        
        if (isRequired) {
            // Get the field name from the DOM element to ensure consistency
            const fieldTextElement = item.querySelector('.field-text');
            let fieldName = fieldTextElement ? fieldTextElement.textContent : '';
            
            // If field name is not available from DOM, reconstruct it from input
            if (!fieldName) {
                const line = lines[index] ? lines[index].trim() : '';
                fieldName = line
                    .replace(/\//g, 'or') // Replace slashes with 'or'
                    .replace(/[^a-zA-Z0-9_?()]/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/^_|_$/g, '');
                
                if (underscoreCount > 0) {
                    fieldName = '_'.repeat(underscoreCount) + fieldName;
                }

                // Handle duplicate field names by adding underscores
                let finalFieldName = fieldName;
                let duplicateUnderscoreCount = 0;
                const usedFieldNames = new Set();
                for (let i = 0; i < index; i++) {
                    const prevLine = lines[i] ? lines[i].trim() : '';
                    let prevFieldName = prevLine
                        .replace(/\//g, 'or') // Replace slashes with 'or'
                        .replace(/[^a-zA-Z0-9_?()]/g, '_')
                        .replace(/_+/g, '_')
                        .replace(/^_|_$/g, '');
                    if (underscoreCount > 0) {
                        prevFieldName = '_'.repeat(underscoreCount) + prevFieldName;
                    }
                    usedFieldNames.add(prevFieldName);
                }
                while (usedFieldNames.has(finalFieldName)) {
                    duplicateUnderscoreCount++;
                    finalFieldName = fieldName + '_'.repeat(duplicateUnderscoreCount);
                }
                fieldName = finalFieldName;
            }

            // Handle special characters like apostrophes
            if (fieldName.includes("'")) {
                fieldName = `"${fieldName}"`;
            }

            requiredFields.push(fieldName);
        }
    });

    if (requiredFields.length === 0) {
        validationOutput.value = '';
        return;
    }

    // Generate jQuery Validate code
    const rules = requiredFields.map(field => `\t\t\t\t\t\t\t\t${field}: "required"`).join(',\n');
    const messages = requiredFields.map(field => `\t\t\t\t\t\t\t\t${field}: ""`).join(',\n');

    // Special handling for email fields
    const emailFields = [];
    fieldItems.forEach((item, index) => {
        const requiredBtn = item.querySelector('.required-btn');
        if (requiredBtn && requiredBtn.classList.contains('required')) {
            const line = lines[index] ? lines[index].trim() : '';
            const lowerText = line.toLowerCase();
            if (lowerText.includes('email') || lowerText.includes('e-mail')) {
                // Get the field name from the DOM element to ensure consistency
                const fieldTextElement = item.querySelector('.field-text');
                let fieldName = fieldTextElement ? fieldTextElement.textContent : '';
                
                // If field name is not available from DOM, reconstruct it from input
                if (!fieldName) {
                    fieldName = line
                        .replace(/\//g, 'or') // Replace slashes with 'or'
                        .replace(/[^a-zA-Z0-9_?()]/g, '_')
                        .replace(/_+/g, '_')
                        .replace(/^_|_$/g, '');
                    
                    if (underscoreCount > 0) {
                        fieldName = '_'.repeat(underscoreCount) + fieldName;
                    }

                    // Handle duplicate field names
                    let finalFieldName = fieldName;
                    let duplicateUnderscoreCount = 0;
                    const usedFieldNames = new Set();
                    for (let i = 0; i < index; i++) {
                        const prevLine = lines[i] ? lines[i].trim() : '';
                        let prevFieldName = prevLine
                            .replace(/\//g, 'or') // Replace slashes with 'or'
                            .replace(/[^a-zA-Z0-9_?()]/g, '_')
                            .replace(/_+/g, '_')
                            .replace(/^_|_$/g, '');
                        if (underscoreCount > 0) {
                            prevFieldName = '_'.repeat(underscoreCount) + prevFieldName;
                        }
                        usedFieldNames.add(prevFieldName);
                    }
                    while (usedFieldNames.has(finalFieldName)) {
                        duplicateUnderscoreCount++;
                        finalFieldName = fieldName + '_'.repeat(duplicateUnderscoreCount);
                    }
                    fieldName = finalFieldName;
                }

                if (fieldName.includes("'")) {
                    fieldName = `"${fieldName}"`;
                }

                emailFields.push(fieldName);
            }
        }
    });

    // Update rules for email fields
    let finalRules = rules;
    emailFields.forEach(emailField => {
        const emailRule = `\t\t\t\t\t\t\t\t${emailField}: { required: true, email: true }`;
        finalRules = finalRules.replace(`\t\t\t\t\t\t\t\t${emailField}: "required"`, emailRule);
    });

    const validationCode = `\t\t\t$("#submitform").validate({\n\n\t\t\t\t\t\t\trules: {\n\n\t\t\t\t\t\t\t\t${finalRules}\n\n\t\t\t\t\t\t\t},\n\n\t\t\t\t\t\t\tmessages: {\n\n\t\t\t\t\t\t\t\t${messages}\n\n\t\t\t\t\t\t\t}\n\n\t\t\t\t\t\t});`;

    validationOutput.value = validationCode;
    
    // Auto-adjust height after setting validation code
    setTimeout(function() {
        if (validationOutput) {
            validationOutput.style.height = 'auto';
            validationOutput.style.height = validationOutput.scrollHeight + 'px';
        }
    }, 0);
}

function copyValidationCode() {
    const output = document.getElementById('validationCodeOutput');

    if (output.value.trim() === '') {
        alert('No validation code to copy! Please set required fields first.');
        return;
    }

    navigator.clipboard.writeText(output.value).then(() => {
        const btn = document.getElementById('copyValidationBtn');
        btn.textContent = "Copied!";
        btn.style.backgroundColor = '#d63384';

        setTimeout(() => {
            btn.textContent = "Copy";
            btn.style.backgroundColor = '#f06292';
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy validation code: ', err);
        alert('Failed to copy validation code. Please try again.');
    });
}

// Initialize validation section visibility on page load
document.addEventListener('DOMContentLoaded', function() {
    // Hide validation section by default since bootstrap is the default version
    const validationSection = document.querySelector('.validation-section');
    if (validationSection) {
        validationSection.style.display = 'none';
    }
});

window.addEventListener('beforeunload', function(e) {
    e.preventDefault();
    e.returnValue = '';
    // Most browsers will show a default confirmation dialog
});

// ===== DUPLICATE FIELD NAMES DETECTION =====

// Global variables for duplicate handling
let duplicateData = {
    duplicates: {},
    originalCode: '',
    fixedCode: ''
};

// Function to detect duplicate field names in pasted code
function detectDuplicateFieldNames(code) {
    const fieldNames = [];
    
    // Pattern 1: HTML name attributes (name="fieldname" or name='fieldname')
    const htmlNameRegex = /name\s*=\s*["']([^"']+)["']/gi;
    let match;
    
    while ((match = htmlNameRegex.exec(code)) !== null) {
        const fieldName = match[1].trim();
        if (fieldName) {
            fieldNames.push(fieldName);
        }
    }
    
    // Pattern 2: PHP function parameters (like $input->chkboxVal('fieldname', ...))
    const phpFieldRegex = /\$input->\w+\(['"]([^'"]+)['"]/gi;
    
    while ((match = phpFieldRegex.exec(code)) !== null) {
        const fieldName = match[1].trim();
        if (fieldName) {
            fieldNames.push(fieldName);
        }
    }
    
    // Pattern 3: PHP label function parameters (like $input->label('fieldname', ...))
    // REMOVED: Label text should not be considered as field names for duplicate detection
    // Labels are display text, not actual field identifiers
    
    // Count occurrences of each field name
    const nameCounts = {};
    fieldNames.forEach(name => {
        nameCounts[name] = (nameCounts[name] || 0) + 1;
    });
    
    // Filter out names that appear only once
    const duplicates = {};
    Object.keys(nameCounts).forEach(name => {
        if (nameCounts[name] > 1) {
            duplicates[name] = nameCounts[name];
        }
    });
    
    return duplicates;
}

// Function to fix duplicate field names by adding underscores
function fixDuplicateFieldNames(code, duplicates) {
    let fixedCode = code;
    
    // Sort duplicates by name to ensure consistent replacement order
    const sortedDuplicates = Object.keys(duplicates).sort();
    
    sortedDuplicates.forEach(duplicateName => {
        let occurrenceCount = 0;
        
        // Pattern 1: HTML name attributes
        const htmlPattern = new RegExp(`name\\s*=\\s*["']${duplicateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'gi');
        fixedCode = fixedCode.replace(htmlPattern, (match) => {
            occurrenceCount++;
            if (occurrenceCount === 1) {
                return match; // Keep first occurrence unchanged
            } else {
                const underscores = '_'.repeat(occurrenceCount - 1);
                const newName = `${duplicateName}${underscores}`;
                return match.replace(duplicateName, newName);
            }
        });
        
        // Reset occurrence count for next pattern
        occurrenceCount = 0;
        
        // Pattern 2: PHP function parameters - but EXCLUDE label functions
        // This pattern matches $input->fields, $input->select, $input->radio, etc. but NOT $input->label
        const phpPattern = new RegExp(`\\$input->(?!label\\b)\\w+\\s*\\(\\s*['"]${duplicateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'gi');
        fixedCode = fixedCode.replace(phpPattern, (match) => {
            occurrenceCount++;
            if (occurrenceCount === 1) {
                return match; // Keep first occurrence unchanged
            } else {
                const underscores = '_'.repeat(occurrenceCount - 1);
                const newName = `${duplicateName}${underscores}`;
                return match.replace(duplicateName, newName);
            }
        });
    });
    
    return fixedCode;
}

// Function to show duplicate modal
function showDuplicateModal(duplicates) {
    const modal = document.getElementById('duplicateModal');
    const duplicateList = document.getElementById('duplicateList');
    
    // Clear previous content
    duplicateList.innerHTML = '';
    
    // Add duplicate items to the list
    Object.keys(duplicates).forEach(name => {
        const count = duplicates[name];
        const item = document.createElement('div');
        item.className = 'duplicate-item';
        item.innerHTML = `
            <span class="duplicate-name">${name}</span>
            <span class="duplicate-count">${count} occurrences</span>
        `;
        duplicateList.appendChild(item);
    });
    
    // Show the modal
    modal.style.display = 'block';
}

// Function to close duplicate modal
function closeDuplicateModal() {
    const modal = document.getElementById('duplicateModal');
    modal.style.display = 'none';
}

// Function to show "no duplicates found" modal
function showNoDuplicatesModal() {
    const modal = document.getElementById('noDuplicatesModal');
    modal.style.display = 'block';
}

// Function to close "no duplicates found" modal
function closeNoDuplicatesModal() {
    const modal = document.getElementById('noDuplicatesModal');
    modal.style.display = 'none';
}

// Function to fix duplicates and update the textarea
function fixDuplicateNames() {
    if (duplicateData.duplicates && Object.keys(duplicateData.duplicates).length > 0) {
        // Instead of just fixing the existing code, regenerate it from the original input
        // This ensures that labels use the correct original text without underscores
        const input = document.getElementById('transformInput').value;
        if (input.trim() !== '') {
            // Regenerate the code from the original input to ensure correct labels
            updateGeneratedCode();
        } else {
            // Fallback to the old method if no input is available
            const fixedCode = fixDuplicateFieldNames(duplicateData.originalCode, duplicateData.duplicates);
            const textarea = document.getElementById('generatedCodeOutput');
            textarea.value = fixedCode;
        }
    }
    
    closeDuplicateModal();
}

// Function to manually check for duplicates in the generated code
function checkDuplicates() {
    const textarea = document.getElementById('generatedCodeOutput');
    const code = textarea.value;
    
    if (!code.trim()) {
        alert('Please paste or generate some form code first.');
        return;
    }
    
    // Detect duplicates in the code
    const duplicates = detectDuplicateFieldNames(code);
    
    if (Object.keys(duplicates).length > 0) {
        // Store the data for later use
        duplicateData.duplicates = duplicates;
        duplicateData.originalCode = code;
        
        // Show the duplicate modal
        showDuplicateModal(duplicates);
    } else {
        // Show the "no duplicates found" modal
        showNoDuplicatesModal();
    }
}

// Add event listener to the generated code textarea for paste events
document.addEventListener('DOMContentLoaded', function() {
    const generatedCodeTextarea = document.getElementById('generatedCodeOutput');
    
    if (generatedCodeTextarea) {
        generatedCodeTextarea.addEventListener('paste', function(e) {
            // Use setTimeout to allow the paste to complete
            setTimeout(() => {
                const pastedCode = this.value;
                
                // Detect duplicates in the pasted code
                const duplicates = detectDuplicateFieldNames(pastedCode);
                
                if (Object.keys(duplicates).length > 0) {
                    // Store the data for later use
                    duplicateData.duplicates = duplicates;
                    duplicateData.originalCode = pastedCode;
                    
                    // Show the duplicate modal
                    showDuplicateModal(duplicates);
                }
            }, 100);
        });
    }
    
    // Close modals when clicking outside of them
    window.addEventListener('click', function(e) {
        const duplicateModal = document.getElementById('duplicateModal');
        const noDuplicatesModal = document.getElementById('noDuplicatesModal');
        
        if (e.target === duplicateModal) {
            closeDuplicateModal();
        }
        if (e.target === noDuplicatesModal) {
            closeNoDuplicatesModal();
        }
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDuplicateModal();
            closeNoDuplicatesModal();
        }
    });
    
    // Auto-adjust height for generated code textarea (very simple, non-intrusive)
    // Only adjusts visual height, never touches value or interferes with code generation
    (function() {
        const textarea = document.getElementById('generatedCodeOutput');
        if (!textarea) return;
        
        // Simple height adjustment function
        function adjustHeight() {
            if (textarea) {
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            }
        }
        
        // Only adjust on direct user input to the textarea
        textarea.addEventListener('input', function() {
            setTimeout(adjustHeight, 0);
        });
        
        // Very lightweight check for programmatic changes (only checks, never modifies)
        let lastVal = textarea.value;
        function checkForChanges() {
            if (textarea && textarea.value !== lastVal) {
                lastVal = textarea.value;
                setTimeout(adjustHeight, 50);
            }
        }
        
        // Use a longer interval to minimize any potential interference
        setInterval(checkForChanges, 300);
        
        // Initial adjustment after page loads
        setTimeout(adjustHeight, 500);
        
        // Adjust on resize
        window.addEventListener('resize', function() {
            setTimeout(adjustHeight, 0);
        });
    })();
    
    // Auto-adjust height for validation code textarea
    (function() {
        const validationTextarea = document.getElementById('validationCodeOutput');
        if (!validationTextarea) return;
        
        // Simple height adjustment function
        function adjustValidationHeight() {
            if (validationTextarea) {
                validationTextarea.style.height = 'auto';
                validationTextarea.style.height = validationTextarea.scrollHeight + 'px';
            }
        }
        
        // Adjust on input
        validationTextarea.addEventListener('input', function() {
            setTimeout(adjustValidationHeight, 0);
        });
        
        // Check for programmatic changes
        let lastValidationVal = validationTextarea.value;
        function checkValidationChanges() {
            if (validationTextarea && validationTextarea.value !== lastValidationVal) {
                lastValidationVal = validationTextarea.value;
                setTimeout(adjustValidationHeight, 50);
            }
        }
        
        // Use interval to check for changes
        setInterval(checkValidationChanges, 300);
        
        // Initial adjustment after page loads
        setTimeout(adjustValidationHeight, 500);
        
        // Adjust on resize
        window.addEventListener('resize', function() {
            setTimeout(adjustValidationHeight, 0);
        });
    })();
});

// --- SCROLL TO TOP BUTTON ---
(function() {
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    
    if (!scrollToTopBtn) return;
    
    // Show/hide button based on scroll position
    function toggleScrollToTopButton() {
        if (window.pageYOffset > 300) {
            scrollToTopBtn.classList.add('show');
        } else {
            scrollToTopBtn.classList.remove('show');
        }
    }
    
    // Scroll to top function
    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
    
    // Event listeners
    window.addEventListener('scroll', toggleScrollToTopButton);
    scrollToTopBtn.addEventListener('click', scrollToTop);
    
    // Initial check
    toggleScrollToTopButton();
})();