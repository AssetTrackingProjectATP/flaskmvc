// CRUD Operations for Floors
async function saveFloor() {
    const buildingId = document.getElementById('modalBuildingSelect').value;
    const floorName = document.getElementById('floorName').value.trim();
    
    if (!buildingId || !floorName) {
        showStatusMessage('Error', 'Building and floor name are required.', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/api/floor/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                building_id: buildingId,
                floor_name: floorName
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Close the modal
            bootstrap.Modal.getInstance(document.getElementById('addFloorModal')).hide();
            // Clear the form
            document.getElementById('floorName').value = '';
            // Show success message
            showStatusMessage('Success', 'Floor added successfully.', 'success');
            // Reload floors if the current building is selected
            if (document.getElementById('buildingSelect').value === buildingId) {
                loadFloors(buildingId);
            }
            // Update floor selects if needed
            if (document.getElementById('floorBuildingSelect').value === buildingId) {
                loadFloorsForSelect(buildingId, document.getElementById('floorSelect'));
            }
        } else {
            showStatusMessage('Error', result.message || 'Failed to add floor.', 'danger');
        }
    } catch (error) {
        console.error('Error adding floor:', error);
        showStatusMessage('Error', 'An error occurred while adding the floor.', 'danger');
    }
}

function editFloor(floorId, floorName, buildingId) {
    // This would normally open the edit modal
    // For simplicity, we'll just use the same modal as adding
    document.getElementById('floorName').value = floorName;
    document.getElementById('addFloorModalLabel').textContent = 'Edit Floor';
    
    // Set the building in the modal
    const buildingName = document.getElementById('buildingSelect').options[document.getElementById('buildingSelect').selectedIndex].text;
    document.getElementById('modalBuildingSelect').innerHTML = `<option value="${buildingId}" selected>${buildingName}</option>`;
    
    // Change save button to update the floor
    const saveBtn = document.getElementById('saveFloorBtn');
    saveBtn.textContent = 'Update Floor';
    saveBtn.onclick = function() {
        updateFloor(floorId, buildingId);
    };
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('addFloorModal'));
    modal.show();
}

async function updateFloor(floorId, buildingId) {
    const floorName = document.getElementById('floorName').value.trim();
    
    if (!floorName) {
        showStatusMessage('Error', 'Floor name is required.', 'danger');
        return;
    }
    
    try {
        const response = await fetch(`/api/floor/${floorId}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                building_id: buildingId,
                floor_name: floorName
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Close the modal
            bootstrap.Modal.getInstance(document.getElementById('addFloorModal')).hide();
            // Reset the modal for adding
            document.getElementById('floorName').value = '';
            document.getElementById('addFloorModalLabel').textContent = 'Add New Floor';
            document.getElementById('saveFloorBtn').textContent = 'Save Floor';
            document.getElementById('saveFloorBtn').onclick = saveFloor;
            // Show success message
            showStatusMessage('Success', 'Floor updated successfully.', 'success');
            // Reload floors if the current building is selected
            if (document.getElementById('buildingSelect').value === buildingId) {
                loadFloors(buildingId);
            }
            // Update floor selects if needed
            if (document.getElementById('floorBuildingSelect').value === buildingId) {
                loadFloorsForSelect(buildingId, document.getElementById('floorSelect'));
            }
        } else {
            showStatusMessage('Error', result.message || 'Failed to update floor.', 'danger');
        }
    } catch (error) {
        console.error('Error updating floor:', error);
        showStatusMessage('Error', 'An error occurred while updating the floor.', 'danger');
    }
}

async function deleteFloor(floorId, floorName) {
    if (!confirm(`Are you sure you want to delete floor "${floorName}"? This will also delete all associated rooms.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/floor/${floorId}/delete`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showStatusMessage('Success', 'Floor deleted successfully.', 'success');
            // Reload floors for the current building if selected
            const currentBuildingId = document.getElementById('buildingSelect').value;
            if (currentBuildingId) {
                loadFloors(currentBuildingId);
            }
            // Update floor selects if needed
            const floorBuildingId = document.getElementById('floorBuildingSelect').value;
            if (floorBuildingId) {
                loadFloorsForSelect(floorBuildingId, document.getElementById('floorSelect'));
            }
        } else {
            showStatusMessage('Error', result.message || 'Failed to delete floor.', 'danger');
        }
    } catch (error) {
        console.error('Error deleting floor:', error);
        showStatusMessage('Error', 'An error occurred while deleting the floor.', 'danger');
    }
}

// CRUD Operations for Rooms
async function saveRoom() {
    const floorId = document.getElementById('modalFloorSelect').value;
    const roomName = document.getElementById('roomName').value.trim();
    
    if (!floorId || !roomName) {
        showStatusMessage('Error', 'Floor and room name are required.', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/api/room/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                floor_id: floorId,
                room_name: roomName
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Close the modal
            bootstrap.Modal.getInstance(document.getElementById('addRoomModal')).hide();
            // Clear the form
            document.getElementById('roomName').value = '';
            // Show success message
            showStatusMessage('Success', 'Room added successfully.', 'success');
            // Reload rooms if the current floor is selected
            if (document.getElementById('floorSelect').value === floorId) {
                loadRooms(floorId);
            }
        } else {
            showStatusMessage('Error', result.message || 'Failed to add room.', 'danger');
        }
    } catch (error) {
        console.error('Error adding room:', error);
        showStatusMessage('Error', 'An error occurred while adding the room.', 'danger');
    }
}

function editRoom(roomId, roomName, floorId) {
    // This would normally open the edit modal
    // For simplicity, we'll just use the same modal as adding
    document.getElementById('roomName').value = roomName;
    document.getElementById('addRoomModalLabel').textContent = 'Edit Room';
    
    // Set the building and floor in the modal
    const buildingId = document.getElementById('floorBuildingSelect').value;
    const buildingName = document.getElementById('floorBuildingSelect').options[document.getElementById('floorBuildingSelect').selectedIndex].text;
    document.getElementById('modalFloorBuildingSelect').innerHTML = `<option value="${buildingId}" selected>${buildingName}</option>`;
    
    const floorName = document.getElementById('floorSelect').options[document.getElementById('floorSelect').selectedIndex].text;
    document.getElementById('modalFloorSelect').innerHTML = `<option value="${floorId}" selected>${floorName}</option>`;
    
    // Change save button to update the room
    const saveBtn = document.getElementById('saveRoomBtn');
    saveBtn.textContent = 'Update Room';
    saveBtn.onclick = function() {
        updateRoom(roomId, floorId);
    };
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('addRoomModal'));
    modal.show();
}

async function updateRoom(roomId, floorId) {
    const roomName = document.getElementById('roomName').value.trim();
    
    if (!roomName) {
        showStatusMessage('Error', 'Room name is required.', 'danger');
        return;
    }
    
    try {
        const response = await fetch(`/api/room/${roomId}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                floor_id: floorId,
                room_name: roomName
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Close the modal
            bootstrap.Modal.getInstance(document.getElementById('addRoomModal')).hide();
            // Reset the modal for adding
            document.getElementById('roomName').value = '';
            document.getElementById('addRoomModalLabel').textContent = 'Add New Room';
            document.getElementById('saveRoomBtn').textContent = 'Save Room';
            document.getElementById('saveRoomBtn').onclick = saveRoom;
            // Show success message
            showStatusMessage('Success', 'Room updated successfully.', 'success');
            // Reload rooms if the current floor is selected
            if (document.getElementById('floorSelect').value === floorId) {
                loadRooms(floorId);
            }
        } else {
            showStatusMessage('Error', result.message || 'Failed to update room.', 'danger');
        }
    } catch (error) {
        console.error('Error updating room:', error);
        showStatusMessage('Error', 'An error occurred while updating the room.', 'danger');
    }
}

async function deleteRoom(roomId, roomName) {
    if (!confirm(`Are you sure you want to delete room "${roomName}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/room/${roomId}/delete`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showStatusMessage('Success', 'Room deleted successfully.', 'success');
            // Reload rooms for the current floor if selected
            const currentFloorId = document.getElementById('floorSelect').value;
            if (currentFloorId) {
                loadRooms(currentFloorId);
            }
        } else {
            showStatusMessage('Error', result.message || 'Failed to delete room.', 'danger');
        }
    } catch (error) {
        console.error('Error deleting room:', error);
        showStatusMessage('Error', 'An error occurred while deleting the room.', 'danger');
    }
}

// Utility Functions
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
}// Settings Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initAccountSettings();
    initCSVUploads();
    initLocationManagement();
});

// ==========================================
// Account Settings Functions
// ==========================================
function initAccountSettings() {
    const accountForm = document.getElementById('accountSettingsForm');
    
    if (accountForm) {
        accountForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateUserAccount();
        });
    }
}

async function updateUserAccount() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Basic validation
    if (!username || !email) {
        showStatusMessage('Error', 'Username and email are required.', 'danger');
        return;
    }
    
    // Password validation
    if (newPassword) {
        if (!currentPassword) {
            showStatusMessage('Error', 'Current password is required to set a new password.', 'danger');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showStatusMessage('Error', 'New password and confirmation do not match.', 'danger');
            return;
        }
    }
    
    try {
        const response = await fetch('/api/user/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                email: email,
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showStatusMessage('Success', 'Account settings updated successfully.', 'success');
            // Clear password fields after successful update
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            showStatusMessage('Error', result.message || 'Failed to update account settings.', 'danger');
        }
    } catch (error) {
        console.error('Error updating account:', error);
        showStatusMessage('Error', 'An error occurred while updating account settings.', 'danger');
    }
}

// ==========================================
// CSV Upload Functions
// ==========================================
function initCSVUploads() {
    // Asset CSV upload handling
    setupCSVUploader('asset');
    
    // Location CSV upload handling
    setupCSVUploader('location');
}

function setupCSVUploader(type) {
    const fileInput = document.getElementById(`${type}CsvFile`);
    const dropZone = document.getElementById(`${type}CsvDropZone`);
    const fileNameContainer = document.getElementById(`${type}CsvFileName`);
    const selectedFileName = document.getElementById(`${type}SelectedFileName`);
    const clearFileBtn = document.getElementById(`${type}ClearFileBtn`);
    const uploadForm = document.getElementById(`${type}CsvUploadForm`);
    
    if (!fileInput || !dropZone || !fileNameContainer || !selectedFileName || !clearFileBtn || !uploadForm) {
        console.error(`Missing elements for ${type} CSV uploader`);
        return;
    }
    
    // Handle file selection
    fileInput.addEventListener('change', function() {
        if (fileInput.files.length > 0) {
            selectedFileName.textContent = fileInput.files[0].name;
            fileNameContainer.classList.remove('d-none');
        } else {
            fileNameContainer.classList.add('d-none');
        }
    });
    
    // Handle clearing the file
    clearFileBtn.addEventListener('click', function() {
        fileInput.value = '';
        fileNameContainer.classList.add('d-none');
    });
    
    // Handle form submission
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!fileInput.files.length) {
            showStatusMessage('Error', 'Please select a CSV file first.', 'danger');
            return;
        }
        
        uploadCSV(type, fileInput.files[0]);
    });
    
    // Setup drag & drop functionality
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.classList.add('border-primary');
    });
    
    dropZone.addEventListener('dragleave', function() {
        dropZone.classList.remove('border-primary');
    });
    
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('border-primary');
        
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            
            // Trigger change event manually
            const event = new Event('change');
            fileInput.dispatchEvent(event);
        }
    });
}

async function uploadCSV(type, file) {
    const formData = new FormData();
    formData.append('csvFile', file);
    
    let endpoint = '';
    if (type === 'asset') {
        endpoint = '/api/upload/assets-csv';
    } else if (type === 'location') {
        endpoint = '/api/upload/locations-csv';
    }
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showStatusMessage('Success', `${type === 'asset' ? 'Assets' : 'Locations'} imported successfully.`, 'success');
            // Clear the file input
            document.getElementById(`${type}ClearFileBtn`).click();
        } else {
            showStatusMessage('Error', result.message || `Failed to import ${type} data.`, 'danger');
        }
    } catch (error) {
        console.error(`Error uploading ${type} CSV:`, error);
        showStatusMessage('Error', `An error occurred while uploading the ${type} CSV file.`, 'danger');
    }
}

// ==========================================
// Location Management Functions
// ==========================================
function initLocationManagement() {
    // Load buildings initially
    loadBuildings();
    
    // Setup tab change events to load appropriate data
    const locationTabs = document.getElementById('locationTabs');
    if (locationTabs) {
        locationTabs.addEventListener('shown.bs.tab', function(event) {
            const targetTab = event.target.getAttribute('id');
            
            if (targetTab === 'buildings-tab') {
                loadBuildings();
            } else if (targetTab === 'floors-tab') {
                populateBuildingSelect('buildingSelect');
            } else if (targetTab === 'rooms-tab') {
                populateBuildingSelect('floorBuildingSelect');
            }
        });
    }
    
    // Setup building selection for floors tab
    const buildingSelect = document.getElementById('buildingSelect');
    if (buildingSelect) {
        buildingSelect.addEventListener('change', function() {
            const buildingId = buildingSelect.value;
            if (buildingId) {
                loadFloors(buildingId);
                document.getElementById('addFloorBtn').disabled = false;
                
                // Update the hidden building select in the modal
                const modalBuildingSelect = document.getElementById('modalBuildingSelect');
                modalBuildingSelect.innerHTML = `<option value="${buildingId}" selected>${buildingSelect.options[buildingSelect.selectedIndex].text}</option>`;
            } else {
                document.getElementById('floorsTree').innerHTML = '<div class="text-center py-4"><p>Please select a building to view its floors</p></div>';
                document.getElementById('addFloorBtn').disabled = true;
            }
        });
    }
    
    // Setup building selection for rooms tab
    const floorBuildingSelect = document.getElementById('floorBuildingSelect');
    if (floorBuildingSelect) {
        floorBuildingSelect.addEventListener('change', function() {
            const buildingId = floorBuildingSelect.value;
            const floorSelect = document.getElementById('floorSelect');
            
            if (buildingId) {
                loadFloorsForSelect(buildingId, floorSelect);
                floorSelect.disabled = false;
                
                // Update the hidden building select in the modal
                const modalFloorBuildingSelect = document.getElementById('modalFloorBuildingSelect');
                modalFloorBuildingSelect.innerHTML = `<option value="${buildingId}" selected>${floorBuildingSelect.options[floorBuildingSelect.selectedIndex].text}</option>`;
            } else {
                floorSelect.innerHTML = '<option value="">First select a building...</option>';
                floorSelect.disabled = true;
                document.getElementById('roomsTree').innerHTML = '<div class="text-center py-4"><p>Please select a floor to view its rooms</p></div>';
                document.getElementById('addRoomBtn').disabled = true;
            }
        });
    }
    
    // Setup floor selection for rooms tab
    const floorSelect = document.getElementById('floorSelect');
    if (floorSelect) {
        floorSelect.addEventListener('change', function() {
            const floorId = floorSelect.value;
            
            if (floorId) {
                loadRooms(floorId);
                document.getElementById('addRoomBtn').disabled = false;
                
                // Update the hidden floor select in the modal
                const modalFloorSelect = document.getElementById('modalFloorSelect');
                modalFloorSelect.innerHTML = `<option value="${floorId}" selected>${floorSelect.options[floorSelect.selectedIndex].text}</option>`;
            } else {
                document.getElementById('roomsTree').innerHTML = '<div class="text-center py-4"><p>Please select a floor to view its rooms</p></div>';
                document.getElementById('addRoomBtn').disabled = true;
            }
        });
    }
    
    // Setup save buttons for location modals
    document.getElementById('saveBuildingBtn').addEventListener('click', saveBuilding);
    document.getElementById('saveFloorBtn').addEventListener('click', saveFloor);
    document.getElementById('saveRoomBtn').addEventListener('click', saveRoom);
}

// Load buildings function
async function loadBuildings() {
    const buildingsTree = document.getElementById('buildingsTree');
    
    try {
        buildingsTree.innerHTML = `
            <div class="text-center py-4" id="buildingsLoading">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
        
        const response = await fetch('/api/buildings');
        
        if (!response.ok) {
            throw new Error('Failed to fetch buildings');
        }
        
        const buildings = await response.json();
        
        if (buildings.length === 0) {
            buildingsTree.innerHTML = '<div class="text-center py-4"><p>No buildings found. Add your first building.</p></div>';
            return;
        }
        
        // Render buildings list
        let buildingsHtml = '';
        
        buildings.forEach(building => {
            buildingsHtml += `
                <div class="location-item" data-id="${building.building_id}">
                    <div class="location-name">${building.building_name}</div>
                    <div class="location-actions">
                        <button class="btn btn-sm btn-outline-primary edit-building-btn" data-id="${building.building_id}" data-name="${building.building_name}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-building-btn" data-id="${building.building_id}" data-name="${building.building_name}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        buildingsTree.innerHTML = buildingsHtml;
        
        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-building-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                editBuilding(this.getAttribute('data-id'), this.getAttribute('data-name'));
            });
        });
        
        document.querySelectorAll('.delete-building-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteBuilding(this.getAttribute('data-id'), this.getAttribute('data-name'));
            });
        });
        
    } catch (error) {
        console.error('Error loading buildings:', error);
        buildingsTree.innerHTML = '<div class="alert alert-danger">Error loading buildings. Please try again.</div>';
    }
}

// Load floors function
async function loadFloors(buildingId) {
    const floorsTree = document.getElementById('floorsTree');
    
    try {
        floorsTree.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
        
        const response = await fetch(`/api/floors/${buildingId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch floors');
        }
        
        const floors = await response.json();
        
        if (floors.length === 0) {
            floorsTree.innerHTML = '<div class="text-center py-4"><p>No floors found for this building. Add your first floor.</p></div>';
            return;
        }
        
        // Render floors list
        let floorsHtml = '';
        
        floors.forEach(floor => {
            floorsHtml += `
                <div class="location-item" data-id="${floor.floor_id}">
                    <div class="location-name">${floor.floor_name}</div>
                    <div class="location-actions">
                        <button class="btn btn-sm btn-outline-primary edit-floor-btn" 
                            data-id="${floor.floor_id}" 
                            data-name="${floor.floor_name}"
                            data-building="${floor.building_id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-floor-btn" 
                            data-id="${floor.floor_id}" 
                            data-name="${floor.floor_name}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        floorsTree.innerHTML = floorsHtml;
        
        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-floor-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                editFloor(
                    this.getAttribute('data-id'), 
                    this.getAttribute('data-name'),
                    this.getAttribute('data-building')
                );
            });
        });
        
        document.querySelectorAll('.delete-floor-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteFloor(this.getAttribute('data-id'), this.getAttribute('data-name'));
            });
        });
        
    } catch (error) {
        console.error('Error loading floors:', error);
        floorsTree.innerHTML = '<div class="alert alert-danger">Error loading floors. Please try again.</div>';
    }
}

// Load floors for select dropdown
async function loadFloorsForSelect(buildingId, selectElement) {
    try {
        selectElement.disabled = true;
        selectElement.innerHTML = '<option value="">Loading floors...</option>';
        
        const response = await fetch(`/api/floors/${buildingId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch floors');
        }
        
        const floors = await response.json();
        
        if (floors.length === 0) {
            selectElement.innerHTML = '<option value="">No floors available</option>';
            return;
        }
        
        // Populate select element
        let optionsHtml = '<option value="">Select a floor...</option>';
        
        floors.forEach(floor => {
            optionsHtml += `<option value="${floor.floor_id}">${floor.floor_name}</option>`;
        });
        
        selectElement.innerHTML = optionsHtml;
        selectElement.disabled = false;
        
    } catch (error) {
        console.error('Error loading floors for select:', error);
        selectElement.innerHTML = '<option value="">Error loading floors</option>';
    }
}

// Load rooms function
async function loadRooms(floorId) {
    const roomsTree = document.getElementById('roomsTree');
    
    try {
        roomsTree.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
        
        const response = await fetch(`/api/rooms/${floorId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch rooms');
        }
        
        const rooms = await response.json();
        
        if (rooms.length === 0) {
            roomsTree.innerHTML = '<div class="text-center py-4"><p>No rooms found for this floor. Add your first room.</p></div>';
            return;
        }
        
        // Render rooms list
        let roomsHtml = '';
        
        rooms.forEach(room => {
            roomsHtml += `
                <div class="location-item" data-id="${room.room_id}">
                    <div class="location-name">${room.room_name}</div>
                    <div class="location-actions">
                        <button class="btn btn-sm btn-outline-primary edit-room-btn" 
                            data-id="${room.room_id}" 
                            data-name="${room.room_name}"
                            data-floor="${room.floor_id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-room-btn" 
                            data-id="${room.room_id}" 
                            data-name="${room.room_name}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        roomsTree.innerHTML = roomsHtml;
        
        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-room-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                editRoom(
                    this.getAttribute('data-id'), 
                    this.getAttribute('data-name'),
                    this.getAttribute('data-floor')
                );
            });
        });
        
        document.querySelectorAll('.delete-room-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteRoom(this.getAttribute('data-id'), this.getAttribute('data-name'));
            });
        });
        
    } catch (error) {
        console.error('Error loading rooms:', error);
        roomsTree.innerHTML = '<div class="alert alert-danger">Error loading rooms. Please try again.</div>';
    }
}

// Populate building select dropdowns
async function populateBuildingSelect(selectId) {
    const selectElement = document.getElementById(selectId);
    
    try {
        selectElement.disabled = true;
        selectElement.innerHTML = '<option value="">Loading buildings...</option>';
        
        const response = await fetch('/api/buildings');
        
        if (!response.ok) {
            throw new Error('Failed to fetch buildings');
        }
        
        const buildings = await response.json();
        
        if (buildings.length === 0) {
            selectElement.innerHTML = '<option value="">No buildings available</option>';
            return;
        }
        
        // Populate select element
        let optionsHtml = '<option value="">Select a building...</option>';
        
        buildings.forEach(building => {
            optionsHtml += `<option value="${building.building_id}">${building.building_name}</option>`;
        });
        
        selectElement.innerHTML = optionsHtml;
        selectElement.disabled = false;
        
    } catch (error) {
        console.error('Error loading buildings for select:', error);
        selectElement.innerHTML = '<option value="">Error loading buildings</option>';
    }
}

// CRUD Operations for Buildings
async function saveBuilding() {
    const buildingName = document.getElementById('buildingName').value.trim();
    
    if (!buildingName) {
        showStatusMessage('Error', 'Building name is required.', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/api/building/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                building_name: buildingName
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Close the modal
            bootstrap.Modal.getInstance(document.getElementById('addBuildingModal')).hide();
            // Clear the form
            document.getElementById('buildingName').value = '';
            // Show success message
            showStatusMessage('Success', 'Building added successfully.', 'success');
            // Reload buildings
            loadBuildings();
            // Update building selects
            populateBuildingSelect('buildingSelect');
            populateBuildingSelect('floorBuildingSelect');
        } else {
            showStatusMessage('Error', result.message || 'Failed to add building.', 'danger');
        }
    } catch (error) {
        console.error('Error adding building:', error);
        showStatusMessage('Error', 'An error occurred while adding the building.', 'danger');
    }
}

function editBuilding(buildingId, buildingName) {
    // This would normally open the edit modal
    // For simplicity, we'll just use the same modal as adding
    document.getElementById('buildingName').value = buildingName;
    document.getElementById('addBuildingModalLabel').textContent = 'Edit Building';
    
    // Change save button to update the building
    const saveBtn = document.getElementById('saveBuildingBtn');
    saveBtn.textContent = 'Update Building';
    saveBtn.onclick = function() {
        updateBuilding(buildingId);
    };
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('addBuildingModal'));
    modal.show();
}

async function updateBuilding(buildingId) {
    const buildingName = document.getElementById('buildingName').value.trim();
    
    if (!buildingName) {
        showStatusMessage('Error', 'Building name is required.', 'danger');
        return;
    }
    
    try {
        const response = await fetch(`/api/building/${buildingId}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                building_name: buildingName
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Close the modal
            bootstrap.Modal.getInstance(document.getElementById('addBuildingModal')).hide();
            // Reset the modal for adding
            document.getElementById('buildingName').value = '';
            document.getElementById('addBuildingModalLabel').textContent = 'Add New Building';
            document.getElementById('saveBuildingBtn').textContent = 'Save Building';
            document.getElementById('saveBuildingBtn').onclick = saveBuilding;
            // Show success message
            showStatusMessage('Success', 'Building updated successfully.', 'success');
            // Reload buildings
            loadBuildings();
            // Update building selects
            populateBuildingSelect('buildingSelect');
            populateBuildingSelect('floorBuildingSelect');
        } else {
            showStatusMessage('Error', result.message || 'Failed to update building.', 'danger');
        }
    } catch (error) {
        console.error('Error updating building:', error);
        showStatusMessage('Error', 'An error occurred while updating the building.', 'danger');
    }
}

async function deleteBuilding(buildingId, buildingName) {
    if (!confirm(`Are you sure you want to delete building "${buildingName}"? This will also delete all associated floors and rooms.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/building/${buildingId}/delete`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showStatusMessage('Success', 'Building deleted successfully.', 'success');
            // Reload buildings
            loadBuildings();
            // Update building selects
            populateBuildingSelect('buildingSelect');
            populateBuildingSelect('floorBuildingSelect');
        } else {
            showStatusMessage('Error', result.message || 'Failed to delete building.', 'danger');
        }
    } catch (error) {
        console.error('Error deleting building:', error);
        showStatusMessage('Error', 'An error occurred while deleting the building.', 'danger');
    }
}