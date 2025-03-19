// Global variables
let allDiscrepancies = [];
let currentFilter = 'all';

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
        
        // Prepare actions based on status
        let actionButtons = `
            <a href="/asset/${assetId}" class="btn btn-primary action-button">Asset Record</a>
        `;
        
        // Add additional action buttons for Missing assets
        if (status === 'Missing') {
            actionButtons = `
                <div class="btn-group">
                    <button class="btn btn-success mark-found-btn" data-asset-id="${assetId}" data-asset-name="${description}">
                        <i class="bi bi-check-circle"></i> Mark as Found
                    </button>
                    <button class="btn btn-danger mark-lost-btn" data-asset-id="${assetId}" data-asset-name="${description}">
                        <i class="bi bi-x-circle"></i> Mark as Lost
                    </button>
                    <a href="/asset/${assetId}" class="btn btn-primary">
                        <i class="bi bi-info-circle"></i> Asset Record
                    </a>
                </div>
            `;
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
                ${actionButtons}
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
async function markAssetAsFound(assetId, assetName, returnToRoom) {
    try {
        const response = await fetch(`/api/asset/${assetId}/mark-found`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                return_to_assigned_room: returnToRoom
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showStatusMessage(
                'Asset Marked as Found', 
                `${assetName} (${assetId}) has been marked as Found${returnToRoom ? ' and returned to its assigned room' : ''}.`,
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
    // Load discrepancies when page loads
    loadDiscrepancies();
    
    // Set up the Found modal
    const foundModal = new bootstrap.Modal(document.getElementById('foundModal'));
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
            currentAssetId = button.dataset.assetId;
            currentAssetName = button.dataset.assetName;
            
            // Update modal with asset info
            document.querySelector('#foundModal .asset-info').textContent = 
                `Asset: ${currentAssetName} (${currentAssetId})`;
            
            // Show the modal
            foundModal.show();
        }
    });
    
    // Confirm button in Found modal
    document.getElementById('confirmFoundBtn').addEventListener('click', function() {
        if (currentAssetId) {
            const returnToRoom = document.getElementById('returnToRoom').checked;
            markAssetAsFound(currentAssetId, currentAssetName, returnToRoom);
            foundModal.hide();
        }
    });
});