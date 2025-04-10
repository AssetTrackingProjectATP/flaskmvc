// Global variables to store state
let allAssets = [];
let filteredAssets = [];
let currentFilter = 'all';
let currentSearchColumn = 'all';

// Function to load assets from the backend
async function loadAssets() {
    try {
        const response = await fetch('/api/assets');
        if (!response.ok) {
            throw new Error('Failed to fetch assets');
        }
        
        allAssets = await response.json();
        filteredAssets = [...allAssets];
        applyFilters();
    } catch (error) {
        console.error('Error loading assets:', error);
        document.getElementById('assetTableBody').innerHTML = 
            '<tr><td colspan="8" class="text-center">Error loading assets. Please try again later.</td></tr>';
    }
}

// Function to apply both status filters and search
function applyFilters() {
    // First filter by status
    let statusFiltered = allAssets;
    
    if (currentFilter !== 'all') {
        statusFiltered = allAssets.filter(asset => asset.status === currentFilter);
    }
    
    // Then apply search within the status filtered results
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (searchTerm) {
        if (currentSearchColumn === 'all') {
            // Search in all columns
            filteredAssets = statusFiltered.filter(asset => {
                return Object.values(asset).some(value => 
                    value && value.toString().toLowerCase().includes(searchTerm)
                );
            });
        } else {
            // Search in specific column
            filteredAssets = statusFiltered.filter(asset => {
                return asset[currentSearchColumn] && 
                       asset[currentSearchColumn].toString().toLowerCase().includes(searchTerm);
            });
        }
    } else {
        // No search term, just use status filtered results
        filteredAssets = statusFiltered;
    }
    
    // Update the display
    displayAssets(filteredAssets);
    
    // Update filter button counts
    updateFilterCounts();
}

// Function to update the count badges on filter buttons
function updateFilterCounts() {
    const allCount = allAssets.length;
    const goodCount = allAssets.filter(asset => asset.status === 'Good').length;
    const misplacedCount = allAssets.filter(asset => asset.status === 'Misplaced').length;
    const missingCount = allAssets.filter(asset => asset.status === 'Missing').length;
    const lostCount = allAssets.filter(asset => asset.status === 'Lost').length;
    
    // Update the filter buttons if they have count badges
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const filter = btn.dataset.filter;
        let count = 0;
        
        switch(filter) {
            case 'all': count = allCount; break;
            case 'Good': count = goodCount; break;
            case 'Misplaced': count = misplacedCount; break;
            case 'Missing': count = missingCount; break;
            case 'Lost': count = lostCount; break;
        }
        
        // If the button already has a count badge, update it
        const badge = btn.querySelector('.count-badge');
        if (badge) {
            badge.textContent = count;
        } else if (count > 0) {
            // Add count in parentheses if not using badges
            const currentText = btn.textContent.split('(')[0].trim();
            btn.textContent = `${currentText} (${count})`;
        }
    });
}

// Function to display assets in the table
function displayAssets(assets) {
    const tableBody = document.getElementById('assetTableBody');
    
    if (!assets || assets.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No assets found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = '';
    
    assets.forEach(asset => {
        const row = document.createElement('tr');
        
        // Determine asset description
        const description = asset.description || 'Unknown Asset';
        
        // Determine asset ID
        const assetId = asset.id || asset['id:'] || '';
        
        // Get room name instead of ID
        const roomName = asset.room_name || `Room Id: ${asset.room_id}` || 'N/A';
        
        // Get assignee name instead of ID
        const assigneeName = asset.assignee_name || 'Unassigned';
        
        // Create row cells
        row.innerHTML = `
            <td>${description}</td>
            <td>${assetId}</td>
            <td>${asset.model || 'N/A'}</td>
            <td>${roomName}</td>
            <td>
                <span class="status-dot status-${
                    asset.status === 'Good' ? 'good' : 
                    asset.status === 'Misplaced' ? 'warning' : 
                    'poor'
                }"></span>
                ${asset.status || 'Unknown'}
            </td>
            <td>${assigneeName}</td>
            <td>${formatDate(asset.last_update)}</td>
            <td>
                <a href="/asset/${assetId}" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-pencil"></i>
                </a>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    } catch (e) {
        return dateString;
    }
}

// Function to handle search
function handleSearch() {
    applyFilters();
}

// Sort table function
function sortTable(columnIndex) {
    const table = document.querySelector('.inventory-table table');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // Get all the icon elements in the table headers
    const icons = table.querySelectorAll('th i.bi');
    
    // Reset all icons to the default state
    icons.forEach(icon => {
        icon.classList.remove('bi-sort-up');
        icon.classList.add('bi-sort-down');
    });
    
    // Get the icon for the clicked column
    const icon = icons[columnIndex];
    
    // Determine sort direction
    const isAscending = icon.classList.contains('bi-sort-down');
    
    // Update icon
    if (isAscending) {
        icon.classList.remove('bi-sort-down');
        icon.classList.add('bi-sort-up');
    } else {
        icon.classList.remove('bi-sort-up');
        icon.classList.add('bi-sort-down');
    }
    
    // Sort the rows
    rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent.trim();
        const bValue = b.cells[columnIndex].textContent.trim();
        
        return isAscending
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
    });
    
    // Reattach rows in the new order
    rows.forEach(row => tbody.appendChild(row));
}

// Function to clear search and filters
function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchColumn').value = 'all';
    currentSearchColumn = 'all';
    
    // Reset status filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === 'all') {
            btn.classList.add('active');
        }
    });
    
    currentFilter = 'all';
    applyFilters();
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Load assets when page loads
    loadAssets();
    
    // Set up search functionality
    const searchButton = document.querySelector('.search-button');
    searchButton.addEventListener('click', handleSearch);
    
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keyup', event => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Set up search column selection
    const searchColumn = document.getElementById('searchColumn');
    searchColumn.addEventListener('change', () => {
        currentSearchColumn = searchColumn.value;
        handleSearch();
    });
    
    // Set up clear search button
    const clearSearchButton = document.getElementById('clearSearch');
    clearSearchButton.addEventListener('click', clearSearch);
    
    // Set up filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Set current filter and apply filters
            currentFilter = btn.dataset.filter;
            applyFilters();
        });
    });
});