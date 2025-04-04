// Global variables
let allDiscrepancies = [];
let currentFilter = 'all';
let allRooms = []; // To store available rooms for relocation

// Function to load discrepancies from API
async function loadDiscrepancies() {
    try {
        const response = await fetch('/api/discrepancies');
        if (!response.ok) {
            throw new Error('Failed to fetch discrepancies');
        }
        
        allDiscrepancies = await response.json();
        renderDiscrepancies(allDiscrepancies);
        updateCounters();
    } catch (error) {
        console.error('Error loading discrepancies:', error);
        const discrepancyList = document.getElementById('discrepancy-list');
        discrepancyList.innerHTML = `
            <div class="alert alert-danger">
                <strong>Error:</strong> Failed to load discrepancies. Please try again later.
            </div>
        `;
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
    
    // Clear the list
    discrepancyList.innerHTML = '';
    
    if (discrepancies.length === 0) {
        discrepancyList.innerHTML = `
            <div class="alert alert-success">
                No discrepancies found. All assets are accounted for.
            </div>
        `;
        return;
    }
    
    // Sort discrepancies - missing first, then misplaced
    discrepancies.sort((a, b) => {
        if (a.status === "Missing" && b.status !== "Missing") return -1;
        if (a.status !== "Missing" && b.status === "Missing") return 1;
        return 0;
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
        
        // Create different action buttons based on asset status
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
                        data-tooltip="Relocate to New Room"
                        data-asset-id="${assetId}" 
                        data-asset-name="${description}">
                    <i class="bi bi-geo-alt me-1"></i> 
                    <span class="d-none d-md-inline">Relocate</span>
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
                        data-tooltip="Reassign to Current Location"
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
        
        discrepancyItem.innerHTML = `
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
    });
}

// Function to filter discrepancy items
function filterDiscrepancies(type) {
    // Reset all filters
    document.querySelectorAll('.filter-badge').forEach(badge => {
        badge.classList.remove('Good');
    });
    
    // Activate selected filter
    document.getElementById(`filter-${type}`).classList.add('Good');
    currentFilter = type;
    
    // Apply filtering
    if (type === 'all') {
        renderDiscrepancies(allDiscrepancies);
        return;
    }
    
    // Filter by status
    const filteredDiscrepancies = allDiscrepancies.filter(asset => 
        asset.status && asset.status.toLowerCase() === type
    );
    
    renderDiscrepancies(filteredDiscrepancies);
}

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

// Function to handle marking an asset as lost
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

// Function to handle marking an asset as found and relocated
async function markAssetAsFoundAndRelocated(assetId, assetName, newRoomId) {
    try {
        const response = await fetch(`/api/asset/${assetId}/relocate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                roomId: newRoomId
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showStatusMessage(
                'Asset Relocated', 
                `${assetName} (${assetId}) has been marked as Found and relocated to the new room.`,
                'success'
            );
            
            // Reload discrepancies after action
            loadDiscrepancies();
        } else {
            showStatusMessage(
                'Error', 
                result.message || 'Failed to relocate asset. Please try again.',
                'danger'
            );
        }
    } catch (error) {
        console.error('Error relocating asset:', error);
        showStatusMessage(
            'Error', 
            'An error occurred while trying to relocate the asset. Please try again.',
            'danger'
        );
    }
}

// New function to handle automatically reassigning a misplaced asset to its current location
async function reassignMisplacedAsset(assetId, assetName, currentLocationId) {
    try {
        // Confirmation message for users to understand what's happening
        if (confirm(`Reassign ${assetName} (${assetId}) to its current location? This will update the asset's assigned room to match where it was found.`)) {
            const response = await fetch(`/api/asset/${assetId}/relocate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomId: currentLocationId
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showStatusMessage(
                    'Asset Reassigned', 
                    `${assetName} (${assetId}) has been reassigned to its current location. The asset is no longer misplaced.`,
                    'success'
                );
                
                // Reload discrepancies after action
                loadDiscrepancies();
            } else {
                showStatusMessage(
                    'Error', 
                    result.message || 'Failed to reassign asset. Please try again.',
                    'danger'
                );
            }
        }
    } catch (error) {
        console.error('Error reassigning misplaced asset:', error);
        showStatusMessage(
            'Error', 
            'An error occurred while trying to reassign the asset. Please try again.',
            'danger'
        );
    }
}

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

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Load discrepancies and rooms when page loads
    loadDiscrepancies();
    loadRooms();
    
    // Set up the Relocation modal
    const relocationModal = new bootstrap.Modal(document.getElementById('relocationModal'));
    let currentAssetId = null;
    let currentAssetName = null;
    
    // Event listeners for action buttons
    document.addEventListener('click', function(e) {
        // Mark as Lost button
        if (e.target.closest('.mark-lost-btn')) {
            const button = e.target.closest('.mark-lost-btn');
            const assetId = button.dataset.assetId;
            const assetName = button.dataset.assetName;
            
            if (confirm(`Are you sure you want to mark ${assetName} (${assetId}) as Lost? This action cannot be undone.`)) {
                markAssetAsLost(assetId, assetName);
            }
        }
        
        // Mark as Found button
        if (e.target.closest('.mark-found-btn')) {
            const button = e.target.closest('.mark-found-btn');
            const assetId = button.dataset.assetId;
            const assetName = button.dataset.assetName;
            
            if (confirm(`Mark ${assetName} (${assetId}) as Found and return to its assigned room?`)) {
                markAssetAsFound(assetId, assetName);
            }
        }
        
        // Misplaced Reassign button - automatically reassigns to current location
        if (e.target.closest('.misplaced-reassign-btn')) {
            const button = e.target.closest('.misplaced-reassign-btn');
            const assetId = button.dataset.assetId;
            const assetName = button.dataset.assetName;
            const currentLocation = button.dataset.currentLocation;
            
            reassignMisplacedAsset(assetId, assetName, currentLocation);
        }
        
        // Found and Relocated button (for missing assets)
        if (e.target.closest('.found-relocate-btn')) {
            const button = e.target.closest('.found-relocate-btn');
            currentAssetId = button.dataset.assetId;
            currentAssetName = button.dataset.assetName;
            
            // Update modal with asset info and populate room dropdown
            document.querySelector('#relocationModal .asset-info').textContent = 
                `Asset: ${currentAssetName} (${currentAssetId})`;
            
            const roomSelect = document.getElementById('roomSelect');
            roomSelect.innerHTML = '<option value="">Select a room...</option>';
            
            allRooms.forEach(room => {
                const option = document.createElement('option');
                option.value = room.room_id;
                option.textContent = room.room_name;
                roomSelect.appendChild(option);
            });
            
            // Show the modal
            relocationModal.show();
        }
    });
    
    // Confirm button in Relocation modal
    document.getElementById('confirmRelocationBtn').addEventListener('click', function() {
        const roomSelect = document.getElementById('roomSelect');
        const selectedRoomId = roomSelect.value;
        
        if (!selectedRoomId) {
            alert('Please select a room for relocation');
            return;
        }
        
        if (currentAssetId) {
            markAssetAsFoundAndRelocated(currentAssetId, currentAssetName, selectedRoomId);
            relocationModal.hide();
        }
    });
});