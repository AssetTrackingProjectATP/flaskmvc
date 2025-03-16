// Function to filter discrepancy items
function filterDiscrepancies(type) {
    // Reset all filters
    document.querySelectorAll('.filter-badge').forEach(badge => {
        badge.classList.remove('Good');
    });
    
    // Activate selected filter
    document.getElementById(`filter-${type}`).classList.add('Good');
    
    // Apply filtering
    const discrepancyItems = document.querySelectorAll('.discrepancy-item');
    
    if (type === 'all') {
        discrepancyItems.forEach(item => {
            item.style.display = 'flex';
        });
        return;
    }
    
    discrepancyItems.forEach(item => {
        if (item.classList.contains(`${type}-item`)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Event listeners for action buttons
document.addEventListener('DOMContentLoaded', function() {
    // Asset Record action
    document.querySelectorAll('.action-button').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const item = this.closest('.discrepancy-item');
            const itemTitle = item.querySelector('.discrepancy-title').textContent;
            const assetId = itemTitle.split(' - ')[1];
            
            // In a real implementation, this would navigate to the asset details page
            console.log(`Viewing asset record for ID: ${assetId}`);
            window.location.href = `/asset/${assetId}`;
        });
    });
    
    // Initialize counters
    updateCounters();
});

// Function to update the counters in the filter badges
function updateCounters() {
    const missingCount = document.querySelectorAll('.missing-item').length;
    const misplacedCount = document.querySelectorAll('.misplaced-item').length;
    const lostCount = document.querySelectorAll('.lost-item').length;
    const totalCount = missingCount + misplacedCount + lostCount;
    
    document.querySelector('#filter-all .count-badge').textContent = totalCount;
    document.querySelector('#filter-missing .count-badge').textContent = missingCount;
    document.querySelector('#filter-misplaced .count-badge').textContent = misplacedCount;
    document.querySelector('#filter-lost .count-badge').textContent = lostCount;
    
    // If there are no discrepancies at all, show a message
    if (totalCount === 0) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'alert alert-success';
        messageDiv.textContent = 'No discrepancies found. All assets are accounted for.';
        
        const discrepancyList = document.getElementById('discrepancy-list');
        discrepancyList.innerHTML = '';
        discrepancyList.appendChild(messageDiv);
    }
}