// Global variables
let allDiscrepancies = [];
let currentFilter = 'all';
let allRooms = []; // To store available rooms for relocation
let selectedAssets = new Set(); // Store IDs of selected assets

// --- (populateRoomSelect, loadDiscrepancies, loadRooms remain the same) ---
function populateRoomSelect(selectElement, rooms, defaultRoomId = null, isReassignMode = false) {
    selectElement.innerHTML = '<option value="">Select a room...</option>'; // Clear existing options

    if (!rooms || rooms.length === 0) {
        console.warn("No rooms available to populate select dropdown.");
        selectElement.innerHTML = '<option value="">No rooms available</option>';
        return;
    }

    rooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room.room_id; // Ensure you use the correct property name ('room_id')

        let optionText = room.room_name; // Default text

        // Check if this is the default room AND we are in reassign mode
        if (isReassignMode && defaultRoomId != null && room.room_id == defaultRoomId) {
            optionText = `${room.room_name} (Confirm reassignment)`;
            option.selected = true; // Ensure it's selected
        }

        option.textContent = optionText; // Set the potentially modified text
        selectElement.appendChild(option);
    });
}


// Function to load discrepancies from API
async function loadDiscrepancies() {
    try {
        const response = await fetch('/api/discrepancies');
        if (!response.ok) {
            throw new Error('Failed to fetch discrepancies');
        }

        allDiscrepancies = await response.json();
        clearSelection(); // Clear selection on reload
        renderDiscrepancies(allDiscrepancies);
        updateCounters();
        updateBulkActionUI(); // New function to update the entire UI
    } catch (error) {
        console.error('Error loading discrepancies:', error);
        const discrepancyList = document.getElementById('discrepancy-list');
        discrepancyList.innerHTML = `
            <div class="alert alert-danger">
                <strong>Error:</strong> Failed to load discrepancies. Please try again later.
            </div>
        `;
        // Hide toolbar in case of error
        document.getElementById('bulk-actions-toolbar').style.display = 'none';
    }
}

// Function to load all rooms (for relocation dropdown)
async function loadRooms() {
    try {
        const response = await fetch('/api/rooms/all');
        if (!response.ok) {
            throw new Error('Failed to fetch rooms');
        }

        allRooms = await response.json();
    } catch (error) {
        console.error('Error loading rooms:', error);
        showStatusMessage(
            'Error',
            'Failed to load rooms for relocation. Some features may not work properly.',
            'warning'
        );
    }
}

// Function to render discrepancies
function renderDiscrepancies(discrepancies) {
    const discrepancyList = document.getElementById('discrepancy-list');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const toolbar = document.getElementById('bulk-actions-toolbar');

    // Clear the list
    discrepancyList.innerHTML = '';

    // Reset select all checkbox
    if (selectAllCheckbox) selectAllCheckbox.checked = false;

    // Handle empty state
    if (!discrepancies || discrepancies.length === 0) {
        // Show empty message
        discrepancyList.innerHTML = `
            <div class="alert alert-success">
                No discrepancies found with the current filter.
            </div>
        `;
        
        // Hide toolbar when no items
        if (toolbar) toolbar.style.display = 'none';
        return;
    } else {
        // Show toolbar when items exist
        if (toolbar) toolbar.style.display = 'flex';
    }

    // Sort discrepancies - missing first, then misplaced
    discrepancies.sort((a, b) => {
        if (a.status === "Missing" && b.status !== "Missing") return -1;
        if (a.status !== "Missing" && b.status === "Missing") return 1;
        return 0; // Keep original order if statuses are the same
    });

    // Create a discrepancy item for each asset
    discrepancies.forEach(asset => {
        const description = asset.description || 'Unknown Asset';
        const assetId = asset.id || asset['id:'] || '';
        const status = asset.status || 'Unknown';

        // Generate details text based on status
        let detailsText = '';
        if (status === 'Missing') {
            detailsText = `Expected in ${asset.room_name || 'Unknown location'}, not found`;
        } else if (status === 'Misplaced') {
            detailsText = `Expected in ${asset.room_name || 'Unknown location'}, found in ${asset.last_located_name || asset.last_located || 'Unknown location'}`;
        }

        // Create the HTML for the discrepancy item
        const discrepancyItem = document.createElement('div');
        discrepancyItem.className = `discrepancy-item ${status.toLowerCase()}-item`;
        discrepancyItem.dataset.status = status.toLowerCase();
        discrepancyItem.dataset.assetId = assetId;

        // --- Action buttons HTML generation (same as before) ---
        let actionButtonsHTML = '';
         if (status === 'Missing') {
            // For Missing assets - show all buttons including "Mark as Lost"
            actionButtonsHTML = `
            <div class="btn-group action-group">
                <!-- Primary Actions -->
                <button class="btn btn-success btn-sm mark-found-btn d-flex align-items-center"
                        data-tooltip="Mark Found in Original Location"
                        data-asset-id="${assetId}"
                        data-asset-name="${description}">
                    <i class="bi bi-check-circle me-1"></i>
                    <span class="d-none d-md-inline">Found</span>
                </button>

                <button class="btn btn-primary btn-sm found-relocate-btn d-flex align-items-center"
                        data-tooltip="Find & Move to New Location"
                        data-asset-id="${assetId}"
                        data-asset-name="${description}">
                    <i class="bi bi-geo-alt me-1"></i>
                    <span class="d-none d-md-inline">Reassign</span>
                </button>

                <!-- Dropdown for Less Common Actions -->
                <div class="dropdown">
                    <button class="btn btn-outline-secondary btn-sm dropdown-toggle d-flex align-items-center"
                            type="button"
                            data-tooltip="More Actions"
                            data-bs-toggle="dropdown">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <button class="dropdown-item mark-lost-btn text-danger"
                                    data-asset-id="${assetId}"
                                    data-asset-name="${description}">
                                <i class="bi bi-x-circle me-2"></i>Mark Lost
                            </button>
                        </li>
                        <li>
                            <a href="/asset/${assetId}" class="dropdown-item">
                                <i class="bi bi-info-circle me-2"></i>Details
                            </a>
                        </li>
                    </ul>
                </div>
            </div>`;
        } else if (status === 'Misplaced') {
            // For Misplaced assets - no "Mark as Lost" button and different behavior for "Relocate"
            actionButtonsHTML = `
            <div class="btn-group action-group">
                <!-- Primary Actions -->
                <button class="btn btn-success btn-sm mark-found-btn d-flex align-items-center"
                        data-tooltip="Mark Found in Original Location"
                        data-asset-id="${assetId}"
                        data-asset-name="${description}">
                    <i class="bi bi-check-circle me-1"></i>
                    <span class="d-none d-md-inline">Found</span>
                </button>

                <button class="btn btn-primary btn-sm misplaced-reassign-btn d-flex align-items-center"
                        data-tooltip="Update Record to Match Current Location"
                        data-asset-id="${assetId}"
                        data-asset-name="${description}"
                        data-current-location="${asset.last_located}">
                    <i class="bi bi-geo-alt me-1"></i>
                    <span class="d-none d-md-inline">Reassign</span>
                </button>

                <!-- Dropdown for Less Common Actions -->
                <div class="dropdown">
                    <button class="btn btn-outline-secondary btn-sm dropdown-toggle d-flex align-items-center"
                            type="button"
                            data-tooltip="More Actions"
                            data-bs-toggle="dropdown">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <a href="/asset/${assetId}" class="dropdown-item">
                                <i class="bi bi-info-circle me-2"></i>Details
                            </a>
                        </li>
                    </ul>
                </div>
            </div>`;
        }


        // Add checkbox container
        discrepancyItem.innerHTML = `
            <div class="discrepancy-checkbox-container">
                 <input class="form-check-input discrepancy-checkbox" type="checkbox" value="${assetId}" id="check-${assetId}" data-asset-id="${assetId}">
            </div>
            <div class="discrepancy-icon ${status.toLowerCase()}-icon">
                <i class="bi ${status === 'Missing' ? 'bi-exclamation-circle-fill' : 'bi-geo-alt-fill'}"></i>
            </div>
            <div class="discrepancy-content">
                <h5 class="discrepancy-title">${description} - ${assetId}</h5>
                <p class="discrepancy-details">${detailsText}</p>
            </div>
            <div class="action-buttons">
                ${actionButtonsHTML}
            </div>
        `;

        discrepancyList.appendChild(discrepancyItem);

        // Add listener to the newly created checkbox
        const checkbox = discrepancyItem.querySelector('.discrepancy-checkbox');
        checkbox.addEventListener('change', handleCheckboxChange);
    });
     // Re-check selected items after rendering
    selectedAssets.forEach(id => {
        const checkbox = discrepancyList.querySelector(`#check-${id}`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
    checkSelectAllState(); // Update select all checkbox based on current view
}

// Function to update the complete bulk action UI based on data state
function updateBulkActionUI() {
    const toolbar = document.getElementById('bulk-actions-toolbar');
    
    // Should the toolbar be visible at all?
    if (!allDiscrepancies || allDiscrepancies.length === 0) {
        // No discrepancies, hide toolbar
        toolbar.style.display = 'none';
        return;
    }
    
    // We have discrepancies, show toolbar
    toolbar.style.display = 'flex';
    
    // Now update the selection-related elements
    updateBulkActionButtons();
}

// Function to handle individual checkbox changes
function handleCheckboxChange(event) {
    const checkbox = event.target;
    const assetId = checkbox.value;

    if (checkbox.checked) {
        selectedAssets.add(assetId);
    } else {
        selectedAssets.delete(assetId);
    }
    updateBulkActionButtons();
    checkSelectAllState();
}

// Function to handle Select All checkbox change
function handleSelectAllChange(event) {
    const isChecked = event.target.checked;
    const visibleCheckboxes = document.querySelectorAll('.discrepancy-checkbox:not([style*="display: none"])');

    visibleCheckboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
        const assetId = checkbox.value;
        if (isChecked) {
            selectedAssets.add(assetId);
        } else {
            selectedAssets.delete(assetId);
        }
    });
    updateBulkActionButtons();
}

// Function to update the bulk action buttons state
function updateBulkActionButtons() {
    // Get the selection count
    const numSelected = selectedAssets.size;
    
    // Update the selection counter
    const selectionCount = document.getElementById('selection-count');
    if (selectionCount) {
        selectionCount.textContent = numSelected === 1 ? "1 selected" : `${numSelected} selected`;
        
        // Show/hide the selection count based on selection
        if (numSelected > 0) {
            selectionCount.classList.add('active');
        } else {
            selectionCount.classList.remove('active');
        }
    }
    
    // Update the toolbar highlight
    const toolbar = document.getElementById('bulk-actions-toolbar');
    if (toolbar) {
        if (numSelected > 0) {
            toolbar.classList.add('active');
        } else {
            toolbar.classList.remove('active');
        }
    }
    
    // Enable/disable action buttons
    const bulkMarkFoundBtn = document.getElementById('bulkMarkFoundBtn');
    const bulkRelocateBtn = document.getElementById('bulkRelocateBtn');
    const cancelSelectionBtn = document.getElementById('cancelSelectionBtn');
    
    const hasSelection = numSelected > 0;
    
    if (bulkMarkFoundBtn) bulkMarkFoundBtn.disabled = !hasSelection;
    if (bulkRelocateBtn) bulkRelocateBtn.disabled = !hasSelection;
    if (cancelSelectionBtn) cancelSelectionBtn.disabled = !hasSelection;
}

// Function to update the state of the "Select All" checkbox
function checkSelectAllState() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (!selectAllCheckbox) return;

    const visibleCheckboxes = document.querySelectorAll('.discrepancy-checkbox'); // Get all checkboxes in the list
    const visibleItems = Array.from(visibleCheckboxes).filter(cb => cb.closest('.discrepancy-item').style.display !== 'none'); // Filter by visibility of parent item

    if (visibleItems.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        return;
    }

    const allVisibleSelected = visibleItems.every(checkbox => checkbox.checked);
    const someVisibleSelected = visibleItems.some(checkbox => checkbox.checked);

    if (allVisibleSelected) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else if (someVisibleSelected) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true; // Indicate partial selection
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
}

// Function to clear selection
function clearSelection() {
    selectedAssets.clear();
    document.querySelectorAll('.discrepancy-checkbox').forEach(cb => cb.checked = false);
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
    updateBulkActionButtons();
}

// Function to filter discrepancy items
function filterDiscrepancies(type) {
    // Reset all filters visually
    document.querySelectorAll('.filter-badge').forEach(badge => {
        badge.classList.remove('Good'); // Assuming 'Good' is the active class
    });

    // Activate selected filter visually
    const activeFilter = document.getElementById(`filter-${type}`);
    if (activeFilter) {
        activeFilter.classList.add('Good');
    }
    currentFilter = type;

    clearSelection(); // Clear selection when filter changes

    let filteredDiscrepancies;
    if (type === 'all') {
        filteredDiscrepancies = allDiscrepancies;
    } else {
        // Filter by status
        filteredDiscrepancies = allDiscrepancies.filter(asset =>
            asset.status && asset.status.toLowerCase() === type
        );
    }

    renderDiscrepancies(filteredDiscrepancies); // Render the filtered list
}

// --- (updateCounters remains the same) ---
// Function to update the counters in the filter badges
function updateCounters() {
    const missingCount = allDiscrepancies.filter(asset =>
        asset.status && asset.status === 'Missing'
    ).length;

    const misplacedCount = allDiscrepancies.filter(asset =>
        asset.status && asset.status === 'Misplaced'
    ).length;

    const totalCount = missingCount + misplacedCount;

    document.querySelector('#filter-all .count-badge').textContent = totalCount;
    document.querySelector('#filter-missing .count-badge').textContent = missingCount;
    document.querySelector('#filter-misplaced .count-badge').textContent = misplacedCount;
}

// --- (markAssetAsLost, markAssetAsFound remain similar, but use the new API endpoints if needed for single items) ---
async function markAssetAsLost(assetId, assetName) {
    try {
        const response = await fetch(`/api/asset/${assetId}/mark-lost`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok) {
            showStatusMessage(
                'Asset Marked as Lost',
                `${assetName} (${assetId}) has been marked as Lost. This asset will be moved to the Lost Assets report.`,
                'success'
            );

            // Reload discrepancies after action
            loadDiscrepancies();
        } else {
            showStatusMessage(
                'Error',
                result.message || 'Failed to mark asset as lost. Please try again.',
                'danger'
            );
        }
    } catch (error) {
        console.error('Error marking asset as lost:', error);
        showStatusMessage(
            'Error',
            'An error occurred while trying to mark the asset as lost. Please try again.',
            'danger'
        );
    }
}

// Function to handle marking an asset as found
async function markAssetAsFound(assetId, assetName) {
    try {
        const response = await fetch(`/api/asset/${assetId}/mark-found`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok) {
            showStatusMessage(
                'Asset Marked as Found',
                `${assetName} (${assetId}) has been marked as Found and returned to its assigned room.`,
                'success'
            );

            // Reload discrepancies after action
            loadDiscrepancies();
        } else {
            showStatusMessage(
                'Error',
                result.message || 'Failed to mark asset as found. Please try again.',
                'danger'
            );
        }
    } catch (error) {
        console.error('Error marking asset as found:', error);
        showStatusMessage(
            'Error',
            'An error occurred while trying to mark the asset as found. Please try again.',
            'danger'
        );
    }
}


// Function to handle marking an asset as found and relocated (single item version - called by modal)
async function markAssetAsFoundAndRelocated(assetId, assetName, newRoomId, notes) {
    try {
        const response = await fetch(`/api/asset/${assetId}/relocate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                roomId: newRoomId,
                notes: notes
            })
        });

        const result = await response.json();

        if (response.ok) {
            showStatusMessage(
                'Asset Relocated',
                `${assetName} (${assetId}) has been marked as Found and relocated/reassigned.`,
                'success'
            );

            // Reload discrepancies after action
            loadDiscrepancies();
        } else {
            showStatusMessage(
                'Error',
                result.message || 'Failed to relocate/reassign asset. Please try again.',
                'danger'
            );
        }
    } catch (error) {
        console.error('Error relocating/reassigning asset:', error);
        showStatusMessage(
            'Error',
            'An error occurred while trying to relocate/reassign the asset. Please try again.',
            'danger'
        );
    }
}

// --- (showStatusMessage remains the same) ---
// Function to show status messages in modal
function showStatusMessage(title, message, type) {
    const statusModal = new bootstrap.Modal(document.getElementById('statusModal'));
    const statusTitle = document.getElementById('statusTitle');
    const statusMessage = document.getElementById('statusMessage');

    statusTitle.textContent = title;
    statusMessage.innerHTML = message;

    // Set the appropriate class based on the message type
    statusMessage.className = '';
    if (type === 'success') {
        statusMessage.classList.add('text-success');
    } else if (type === 'danger') {
        statusMessage.classList.add('text-danger');
    } else if (type === 'warning') {
        statusMessage.classList.add('text-warning');
    }

    statusModal.show();
}


// --- NEW Bulk Action Functions ---

// Function to handle bulk "Mark Found" action
async function bulkMarkFound() {
    const assetIds = Array.from(selectedAssets);
    if (assetIds.length === 0) return;

    if (!confirm(`Mark ${assetIds.length} selected asset(s) as Found and return to their assigned rooms?`)) {
        return;
    }

    try {
        const response = await fetch('/api/assets/bulk-mark-found', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assetIds: assetIds }) // Send only IDs for this action
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showStatusMessage(
                'Bulk Action Success',
                `${result.processed_count || assetIds.length} asset(s) marked as Found.`,
                'success'
            );
            loadDiscrepancies(); // Reload list
        } else {
            showStatusMessage(
                'Bulk Action Failed',
                result.message || `Failed to mark ${assetIds.length} asset(s) as Found.`,
                'danger'
            );
        }
    } catch (error) {
        console.error('Error during bulk mark found:', error);
        showStatusMessage('Error', 'An error occurred during the bulk action.', 'danger');
    }
}

// Function to handle bulk "Found & Relocate" action (opens modal)
function bulkRelocate() {
    const assetIds = Array.from(selectedAssets);
    if (assetIds.length === 0) return;

    const relocationModal = new bootstrap.Modal(document.getElementById('relocationModal'));
    const roomSelect = document.getElementById('roomSelect');

    // Update modal title and info text for bulk action
    document.getElementById('relocationModalLabel').textContent = 'Bulk Found & Relocate Assets';
    document.querySelector('#relocationModal .asset-info').textContent =
        `${assetIds.length} asset(s) selected.`;
    document.getElementById('relocationInfoText').textContent =
        'Select a single new location where all selected assets were found.';
    document.getElementById('locationUpdateText').textContent =
        'All selected assets will be marked as Found and their assigned location updated to the selected room.';


    populateRoomSelect(roomSelect, allRooms); // Populate room dropdown
    document.getElementById('relocationNotes').value = ''; // Clear notes
    document.getElementById('confirmRelocationBtn').textContent = 'Confirm Bulk Relocation'; // Update button text

    // Add a flag or data attribute to indicate bulk mode for the confirm handler
    document.getElementById('confirmRelocationBtn').dataset.mode = 'bulk';

    relocationModal.show();
}

// Function to execute the bulk relocation API call (called by modal confirm)
async function executeBulkRelocate(newRoomId, notes) {
    const assetIds = Array.from(selectedAssets);
    if (assetIds.length === 0 || !newRoomId) return;


    try {
        const response = await fetch('/api/assets/bulk-relocate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                assetIds: assetIds,
                roomId: newRoomId,
                notes: notes
            })
        });

        const result = await response.json();
        const relocationModal = bootstrap.Modal.getInstance(document.getElementById('relocationModal'));
        relocationModal.hide(); // Hide modal regardless of outcome

        if (response.ok && result.success) {
             showStatusMessage(
                'Bulk Action Success',
                `${result.processed_count || assetIds.length} asset(s) marked as Found and relocated.`,
                'success'
            );
            loadDiscrepancies(); // Reload list
        } else {
            showStatusMessage(
                'Bulk Action Failed',
                result.message || `Failed to relocate ${assetIds.length} asset(s).`,
                'danger'
            );
        }
    } catch (error) {
        console.error('Error during bulk relocate:', error);
        showStatusMessage('Error', 'An error occurred during the bulk relocation.', 'danger');
    }
}


// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Load discrepancies and rooms when page loads
    loadDiscrepancies();
    loadRooms();

    // Set up the Relocation modal
    const relocationModal = new bootstrap.Modal(document.getElementById('relocationModal'));
    const roomSelect = document.getElementById('roomSelect');
    let currentAssetId = null; // Used for single item actions
    let currentAssetName = null; // Used for single item actions

    // Event listeners for SINGLE action buttons (delegated)
    document.addEventListener('click', function(e) {
        // Mark as Lost button (Single)
        if (e.target.closest('.mark-lost-btn')) {
            const button = e.target.closest('.mark-lost-btn');
            const assetId = button.dataset.assetId;
            const assetName = button.dataset.assetName;

            if (confirm(`Are you sure you want to mark ${assetName} (${assetId}) as Lost? This action cannot be undone.`)) {
                markAssetAsLost(assetId, assetName);
            }
        }

        // Mark as Found button (Single)
        if (e.target.closest('.mark-found-btn')) {
            const button = e.target.closest('.mark-found-btn');
            const assetId = button.dataset.assetId;
            const assetName = button.dataset.assetName;

            if (confirm(`Mark ${assetName} (${assetId}) as Found and return to its assigned room?`)) {
                markAssetAsFound(assetId, assetName);
            }
        }

        // Misplaced Reassign button (Single) - Opens modal for confirmation/notes
        if (e.target.closest('.misplaced-reassign-btn')) {
            const button = e.target.closest('.misplaced-reassign-btn');
            currentAssetId = button.dataset.assetId;
            currentAssetName = button.dataset.assetName;
            const currentLocation = button.dataset.currentLocation;

            document.getElementById('relocationModalLabel').textContent = 'Reassign Asset to Current Location';
            document.querySelector('#relocationModal .asset-info').textContent =
                `Asset: ${currentAssetName} (${currentAssetId})`;
            document.getElementById('relocationInfoText').textContent =
                 'The asset was found here. Confirm reassignment to this location.';
            document.getElementById('locationUpdateText').textContent =
                'The asset\'s assigned location will be updated to match its current found location.';


            populateRoomSelect(roomSelect, allRooms, currentLocation, true); // Pre-select current location
            document.getElementById('relocationNotes').value = '';
            document.getElementById('confirmRelocationBtn').textContent = 'Confirm Reassignment';
            document.getElementById('confirmRelocationBtn').dataset.mode = 'single'; // Set mode for confirm handler
            relocationModal.show();
        }

        // Found and Relocated button (Single - for missing assets)
        if (e.target.closest('.found-relocate-btn')) {
            const button = e.target.closest('.found-relocate-btn');
            currentAssetId = button.dataset.assetId;
            currentAssetName = button.dataset.assetName;

            document.getElementById('relocationModalLabel').textContent = 'Find Asset & Move to New Location';
            document.querySelector('#relocationModal .asset-info').textContent =
                `Asset: ${currentAssetName} (${currentAssetId})`;
             document.getElementById('relocationInfoText').textContent =
                 'Select the new location where the asset was found.';
            document.getElementById('locationUpdateText').textContent =
                'The asset will be marked as Found and its assigned location updated.';

            populateRoomSelect(roomSelect, allRooms);
            document.getElementById('relocationNotes').value = '';
            document.getElementById('confirmRelocationBtn').textContent = 'Confirm Move & Update';
            document.getElementById('confirmRelocationBtn').dataset.mode = 'single'; // Set mode for confirm handler
            relocationModal.show();
        }
    });

    // Event listeners for BULK action buttons - Updated to use new button IDs
    const bulkMarkFoundBtn = document.getElementById('bulkMarkFoundBtn');
    if (bulkMarkFoundBtn) {
        bulkMarkFoundBtn.addEventListener('click', bulkMarkFound);
    }

    const bulkRelocateBtn = document.getElementById('bulkRelocateBtn');
    if (bulkRelocateBtn) {
        bulkRelocateBtn.addEventListener('click', bulkRelocate);
    }

    const cancelSelectionBtn = document.getElementById('cancelSelectionBtn');
    if (cancelSelectionBtn) {
        cancelSelectionBtn.addEventListener('click', clearSelection);
    }

    // Confirm button in Relocation modal (Handles both single and bulk)
    document.getElementById('confirmRelocationBtn').addEventListener('click', function(event) {
        const selectedRoomId = roomSelect.value;
        const notes = document.getElementById('relocationNotes').value;
        const mode = event.target.dataset.mode; // Get mode ('single' or 'bulk')

        if (!selectedRoomId) {
            alert('Please select a room');
            return;
        }

        if (mode === 'bulk') {
            executeBulkRelocate(selectedRoomId, notes);
        } else if (mode === 'single' && currentAssetId) {
            // For single items, call the original function
            markAssetAsFoundAndRelocated(currentAssetId, currentAssetName, selectedRoomId, notes);
        } else {
             console.error("Relocation mode not set or invalid.");
        }

        // Reset mode after execution
        event.target.dataset.mode = '';
    });

    // Select All checkbox listener
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', handleSelectAllChange);
    }
    
    // Initialize the buttons state
    updateBulkActionButtons();
    
    // Initially hide the toolbar until we have data
    const toolbar = document.getElementById('bulk-actions-toolbar');
    if (toolbar) toolbar.style.display = 'none';
});