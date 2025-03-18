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
        
        discrepancyItem.innerHTML = `
            <div class="discrepancy-icon ${status.toLowerCase()}-icon">
                <i class="bi ${status === 'Missing' ? 'bi-exclamation-circle-fill' : 'bi-geo-alt-fill'}"></i>
            </div>
            <div class="discrepancy-content">
                <h5 class="discrepancy-title">${description} - ${assetId}</h5>
                <p class="discrepancy-details">${detailsText}</p>
            </div>
            <a href="/asset/${assetId}" class="btn btn-primary action-button">Asset Record</a>
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

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Load discrepancies when page loads
    loadDiscrepancies();
    
    // Event listeners for action buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.action-button')) {
            e.preventDefault();
            const button = e.target.closest('.action-button');
            const url = button.getAttribute('href');
            if (url) {
                window.location.href = url;
            }
        }
    });
});