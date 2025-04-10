async function loadAssets() {
    try {
        const response = await fetch('/api/assets');
        if (!response.ok) {
            throw new Error('Failed to fetch assets');
        }
        const assets = await response.json();
        displayAssets(assets);
    } catch (error) {
        console.error('Error loading assets:', error);
        document.getElementById('assetTableBody').innerHTML =
            '<tr><td colspan="8" class="text-center">Error loading assets. Please try again later.</td></tr>';
    }
}

function displayAssets(assets) {
    const tableBody = document.getElementById('assetTableBody');
    if (!assets || assets.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No assets found</td></tr>';
        return;
    }
    tableBody.innerHTML = '';
    assets.forEach(asset => {
        const row = document.createElement('tr');
        const description = asset.description || 'Unknown Asset';
        const assetId = asset.id || asset['id:'] || '';
        const roomName = asset.room_name || `Room Id: ${asset.room_id}` || 'N/A';
        const assigneeName = asset.assignee_name || 'Unassigned';
        const brandModel = `${asset.brand || ''} ${asset.model || ''}`.trim() || 'N/A';
        row.innerHTML = `
            <td>${description}</td>
            <td>${assetId}</td>
            <td>${brandModel}</td>
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

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
            return dateString.split(' ')[0];
        }
        return dateString;
    }
}

function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#assetTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function sortTable(columnIndex) {
    const table = document.querySelector('.inventory-table table');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const icons = table.querySelectorAll('th i.bi');
    icons.forEach((icon, index) => {
        if (index !== columnIndex) {
            icon.classList.remove('bi-sort-up');
            icon.classList.add('bi-sort-down');
        }
    });
    const icon = icons[columnIndex];
    const isCurrentlyAscending = icon.classList.contains('bi-sort-up');
    const isAscending = !isCurrentlyAscending;
    if (isAscending) {
        icon.classList.remove('bi-sort-down');
        icon.classList.add('bi-sort-up');
    } else {
        icon.classList.remove('bi-sort-up');
        icon.classList.add('bi-sort-down');
    }
    rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent.trim();
        const bValue = b.cells[columnIndex].textContent.trim();
        if (columnIndex === 6) {
            const dateA = new Date(aValue);
            const dateB = new Date(bValue);
            if (!isNaN(dateA) && !isNaN(dateB)) {
                return isAscending ? dateA - dateB : dateB - dateA;
            }
        }
        return isAscending
            ? aValue.localeCompare(bValue, undefined, {numeric: true, sensitivity: 'base'})
            : bValue.localeCompare(aValue, undefined, {numeric: true, sensitivity: 'base'});
    });
    rows.forEach(row => tbody.appendChild(row));
}

async function loadRoomsForModal() {
    const selectElement = document.getElementById('addAssetRoomSelect');
    selectElement.innerHTML = '<option value="" selected disabled>Loading rooms...</option>';
    try {
        const response = await fetch('/api/rooms/all');
        if (!response.ok) throw new Error('Failed to fetch rooms');
        const rooms = await response.json();
        selectElement.innerHTML = '<option value="" selected disabled>Select Assigned Room *</option>';
        if (rooms && rooms.length > 0) {
            rooms.forEach(room => {
                const option = document.createElement('option');
                option.value = room.room_id;
                option.textContent = room.room_name;
                selectElement.appendChild(option);
            });
        } else {
             selectElement.innerHTML = '<option value="" selected disabled>No rooms found</option>';
        }
    } catch (error) {
        console.error('Error loading rooms for modal:', error);
        selectElement.innerHTML = '<option value="" selected disabled>Error loading rooms</option>';
    }
}

function clearAddAssetForm() {
    document.getElementById('addAssetForm').reset();
    document.getElementById('addAssetError').classList.add('d-none');
    document.getElementById('addAssetError').textContent = '';
}

function showStatusMessage(title, message, type) {
    if (typeof bootstrap === 'undefined' || typeof bootstrap.Modal === 'undefined') {
        console.error("Bootstrap Modal is not available.");
        alert(`${title}: ${message}`);
        return;
    }
    let statusModalInstance = bootstrap.Modal.getInstance(document.getElementById('statusModal'));
    if (!statusModalInstance) {
        statusModalInstance = new bootstrap.Modal(document.getElementById('statusModal'));
    }
    const statusTitle = document.getElementById('statusTitle');
    const statusMessage = document.getElementById('statusMessage');
    statusTitle.textContent = title;
    statusMessage.innerHTML = message;
    statusMessage.className = 'modal-body';
    if (type === 'success') {
        statusMessage.classList.add('text-success');
    } else if (type === 'danger') {
        statusMessage.classList.add('text-danger');
    } else if (type === 'warning') {
        statusMessage.classList.add('text-warning');
    } else {
         statusMessage.classList.add('text-info');
    }
    statusModalInstance.show();
}

async function saveNewAsset() {
    const form = document.getElementById('addAssetForm');
    const errorDiv = document.getElementById('addAssetError');
    errorDiv.classList.add('d-none');
    const assetId = document.getElementById('addAssetId').value.trim();
    const description = document.getElementById('addAssetDescription').value.trim();
    const roomId = document.getElementById('addAssetRoomSelect').value;
    const assigneeName = document.getElementById('addAssetAssigneeInput').value.trim();
    if (!assetId || !description || !roomId || !assigneeName) {
        errorDiv.textContent = 'Please fill in all required fields (*).';
        errorDiv.classList.remove('d-none');
        return;
    }
    const assetData = {
        id: assetId,
        description: description,
        brand: document.getElementById('addAssetBrand').value.trim(),
        model: document.getElementById('addAssetModel').value.trim(),
        serial_number: document.getElementById('addAssetSerialNumber').value.trim(),
        room_id: roomId,
        assignee_name: assigneeName,
        notes: document.getElementById('addAssetNotes').value.trim(),
    };
    try {
        const response = await fetch('/api/asset/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(assetData)
        });
        const result = await response.json();
        if (response.ok && result.success) {
            const addModalInstance = bootstrap.Modal.getInstance(document.getElementById('addAssetModal'));
            if (addModalInstance) {
                addModalInstance.hide();
            }
            showStatusMessage('Success', `Asset "${result.asset.description}" (${result.asset.id}) added successfully.`, 'success');
            loadAssets();
        } else {
            errorDiv.textContent = result.message || 'An unknown error occurred.';
            errorDiv.classList.remove('d-none');
        }
    } catch (error) {
        console.error('Error saving asset:', error);
        errorDiv.textContent = 'A network or server error occurred. Please try again.';
        errorDiv.classList.remove('d-none');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadAssets();
    const searchButton = document.querySelector('.search-button');
    searchButton.addEventListener('click', handleSearch);
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keyup', event => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    });
    const addAssetModal = document.getElementById('addAssetModal');
    if (addAssetModal) {
        addAssetModal.addEventListener('show.bs.modal', event => {
            loadRoomsForModal();
        });
        addAssetModal.addEventListener('hidden.bs.modal', event => {
            clearAddAssetForm();
        });
    }
    const saveBtn = document.getElementById('saveNewAssetBtn');
    if(saveBtn) {
        saveBtn.addEventListener('click', saveNewAsset);
    }
});