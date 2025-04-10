// Global state variables
let currentAuditMethod = 'manual';
let currentBuilding = null;
let currentFloor = null;
let currentRoom = null;
let expectedAssets = [];
let scannedAssets = [];
let isRoomAuditActive = false;

// Barcode scanner variables
let isScanning = false;
let scanBuffer = '';
let scanTimeout = null;
const SCAN_TIMEOUT_MS = 20;

// RFID and QR simulation variables
let rfidSimulationInterval = null;
let qrSimulationInterval = null;

/**
 * Building, Floor, and Room Selection Functions
 */
function loadFloors() {
    const buildingSelect = document.getElementById('buildingSelect');
    currentBuilding = buildingSelect.value;
    
    // Reset selections
    currentFloor = null;
    currentRoom = null;
    
    if (currentBuilding && currentBuilding !== 'Select Building') {
        document.getElementById('floorSelectContainer').style.display = 'block';
        const floorSelect = document.getElementById('floorSelect');
        
        floorSelect.innerHTML = '<option selected>Select Floor</option>';
        
        // Fetch floors for the selected building
        fetch(`/api/floors/${currentBuilding}`)
            .then(response => response.json())
            .then(floors => {
                floors.forEach(floor => {
                    const option = document.createElement('option');
                    option.value = floor.floor_id;
                    option.textContent = floor.floor_name;
                    floorSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error fetching floors:', error);
                showScanMessage('Error loading floors. Please try again.', 'danger');
            });
        
        hideElements(['roomSelectContainer', 'auditMethodButtons', 'searchContainer', 
                      'assetList', 'scannedAssetsList']);
    } else {
        hideElements(['floorSelectContainer', 'roomSelectContainer', 'auditMethodButtons',
                      'searchContainer', 'assetList', 'scannedAssetsList']);
    }
}

function loadRooms() {
    const floorSelect = document.getElementById('floorSelect');
    currentFloor = floorSelect.value;
    
    currentRoom = null;
    
    if (currentFloor && currentFloor !== 'Select Floor') {
        document.getElementById('roomSelectContainer').style.display = 'block';
        const roomSelect = document.getElementById('roomSelect');
        
        roomSelect.innerHTML = '<option selected>Select Room</option>';
        
        // Fetch rooms for the selected floor
        fetch(`/api/rooms/${currentFloor}`)
            .then(response => response.json())
            .then(rooms => {
                rooms.forEach(room => {
                    const option = document.createElement('option');
                    option.value = room.room_id;
                    option.textContent = room.room_name;
                    roomSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error fetching rooms:', error);
                showScanMessage('Error loading rooms. Please try again.', 'danger');
            });
        
        hideElements(['auditMethodButtons', 'searchContainer', 'assetList', 'scannedAssetsList']);
    } else {
        hideElements(['roomSelectContainer', 'auditMethodButtons', 'searchContainer', 
                      'assetList', 'scannedAssetsList']);
    }
}

function loadRoomAssets() {
    const roomSelect = document.getElementById('roomSelect');
    currentRoom = roomSelect.value;
    
    if (currentRoom && currentRoom !== 'Select Room') {
        showElements(['auditMethodButtons', 'searchContainer']);
        
        // Fetch assets for the selected room
        fetch(`/api/assets/${currentRoom}`)
            .then(response => response.json())
            .then(assets => {
                if (assets && assets.length > 0) {
                    expectedAssets = assets.map(asset => {
                        // Normalize asset properties
                        return {
                            id: asset.id || asset['id:'] || asset.asset_id || '',
                            description: asset.description || 'Unknown Asset',
                            model: asset.model || '',
                            brand: asset.brand || '',
                            serial_number: asset.serial_number || '',
                            room_id: asset.room_id || currentRoom,
                            last_located: asset.last_located || currentRoom,
                            assignee_id: asset.assignee_id || 'Unassigned',
                            last_update: asset.last_update || new Date().toISOString(),
                            notes: asset.notes || '',
                            status: asset.status || 'Active',
                            found: false
                        };
                    });
                } else {
                    expectedAssets = [];
                    showScanMessage('No assets found in this room.', 'info');
                }
                
                displayExpectedAssets();
                showElements(['assetList', 'scannedAssetsList']);
            })
            .catch(error => {
                console.error('Error fetching assets:', error);
                showScanMessage('Error loading assets. Please try again.', 'danger');
            });
    } else {
        hideElements(['auditMethodButtons', 'searchContainer', 'assetList', 'scannedAssetsList']);
    }
}

/**
 * Asset Display Functions
 */
function displayExpectedAssets() {
    const tableBody = document.getElementById('expectedAssetsTableBody');
    tableBody.innerHTML = '';
    
    if (expectedAssets.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No assets expected in this room</td></tr>';
        return;
    }
    
    expectedAssets.forEach(asset => {
        const row = document.createElement('tr');
        row.id = `expected-asset-${asset.id}`;
        
        // Asset Description
        appendCell(row, asset.description);
        
        // Asset ID
        appendCell(row, asset.id);
        
        // Brand/Model
        appendCell(row, `${asset.brand} ${asset.model}`);
        
        // Assignee
        appendCell(row, asset.assignee_id);
        
        // Status Cell
        const statusCell = document.createElement('td');
        const statusIndicator = document.createElement('span');
        
        if (asset.status === 'Missing') {
            statusIndicator.className = 'status-dot status-poor';
            statusCell.appendChild(statusIndicator);
            statusCell.appendChild(document.createTextNode(' Missing'));
        } else if (asset.status === 'Misplaced') {
            statusIndicator.className = 'status-dot status-warning';
            statusCell.appendChild(statusIndicator);
            statusCell.appendChild(document.createTextNode(' Misplaced'));
        } else {
            statusIndicator.className = 'status-dot status-good';
            statusCell.appendChild(statusIndicator);
            statusCell.appendChild(document.createTextNode(' Good'));
        }
        row.appendChild(statusCell);
        
        // Last Updated Cell
        const lastUpdatedCell = document.createElement('td');
        const date = new Date(asset.last_update);
        lastUpdatedCell.textContent = date.toLocaleDateString();
        row.appendChild(lastUpdatedCell);
        
        // Found Status Cell
        const foundCell = document.createElement('td');
        foundCell.id = `found-status-${asset.id}`;
        foundCell.className = asset.found ? 'found-yes' : 'found-no';
        foundCell.textContent = asset.found ? 'YES' : 'NO';
        row.appendChild(foundCell);
        
        tableBody.appendChild(row);
    });
    
    // Clear the scanned assets table
    document.getElementById('scannedAssetsTableBody').innerHTML = '';
    scannedAssets = [];
}

function updateScannedAssetsTable() {
    const scannedTableBody = document.getElementById('scannedAssetsTableBody');
    scannedTableBody.innerHTML = '';
    
    if (scannedAssets.length === 0) {
        scannedTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No assets scanned yet</td></tr>';
        return;
    }
    
    // Sort assets: misplaced or unexpected first, then by scan time (most recent first)
    const sortedAssets = [...scannedAssets].sort((a, b) => {
        if (a.status === 'Misplaced' && b.status !== 'Misplaced') return -1;
        if (a.status !== 'Misplaced' && b.status === 'Misplaced') return 1;
        if (a.status === 'Unexpected' && b.status !== 'Unexpected') return -1;
        if (a.status !== 'Unexpected' && b.status === 'Unexpected') return 1;
        
        // Sort by scan time (most recent first)
        return new Date(b.scanTime || b.last_update) - new Date(a.scanTime || a.last_update);
    });
    
    sortedAssets.forEach(asset => {
        const row = document.createElement('tr');
        
        // Apply classes based on asset status
        if (asset.status === 'Unexpected') {
            row.className = 'table-warning';
        } else if (asset.status === 'Misplaced') {
            row.className = 'table-warning';
        }
        
        // Asset Description
        appendCell(row, asset.description);
        
        // Asset ID
        appendCell(row, asset.id);
        
        // Brand/Model
        appendCell(row, `${asset.brand || ''} ${asset.model || ''}`);
        
        // Location Cell
        const locationCell = document.createElement('td');
        const roomSelect = document.getElementById('roomSelect');
        const currentRoomName = roomSelect ? 
            roomSelect.options[roomSelect.selectedIndex].textContent : 
            `Room ${currentRoom}`;
            
        if (asset.status === 'Misplaced') {
            locationCell.innerHTML = `<span class="text-warning">Current: ${currentRoomName}</span><br>
                                     <small>Assigned: Room ${asset.room_id}</small>`;
        } else {
            locationCell.textContent = currentRoomName;
        }
        row.appendChild(locationCell);
        
        // Status Cell
        const statusCell = document.createElement('td');
        const statusIndicator = document.createElement('span');
        
        if (asset.status === 'Unexpected') {
            statusIndicator.className = 'status-dot status-warning';
            statusCell.appendChild(statusIndicator);
            statusCell.appendChild(document.createTextNode(' Unexpected'));
        } else if (asset.status === 'Misplaced') {
            statusIndicator.className = 'status-dot status-warning';
            statusCell.appendChild(statusIndicator);
            statusCell.appendChild(document.createTextNode(' Misplaced'));
        } else if (asset.status === 'Good') {
            statusIndicator.className = 'status-dot status-good';
            statusCell.appendChild(statusIndicator);
            statusCell.appendChild(document.createTextNode(' Good'));
        } else {
            statusIndicator.className = 'status-dot status-poor';
            statusCell.appendChild(statusIndicator);
            statusCell.appendChild(document.createTextNode(' ' + asset.status));
        }
        row.appendChild(statusCell);
        
        // Assignee Cell
        appendCell(row, asset.assignee_id || 'Unassigned');
        
        // Last Updated Cell
        const lastUpdatedCell = document.createElement('td');
        const date = new Date(asset.scanTime || asset.last_update);
        lastUpdatedCell.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        row.appendChild(lastUpdatedCell);
        
        scannedTableBody.appendChild(row);
    });
    
    if (scannedAssets.length > 0) {
        document.getElementById('scannedAssetsList').style.display = 'block';
    }
}

/**
 * Audit Method Functions
 */
function setAuditMethod(method) {
    // Don't reset scanning if we're just changing methods
    if (method === currentAuditMethod) return;
    
    // Stop the current scanning method
    if (currentAuditMethod === 'barcode') {
        stopBarcodeScan();
    } else if (currentAuditMethod === 'rfid') {
        if (rfidSimulationInterval) {
            clearInterval(rfidSimulationInterval);
            rfidSimulationInterval = null;
        }
    } else if (currentAuditMethod === 'qrcode') {
        if (qrSimulationInterval) {
            clearInterval(qrSimulationInterval);
            qrSimulationInterval = null;
        }
    }
    
    currentAuditMethod = method;
    
    // Update UI to show active method
    document.querySelectorAll('.audit-method-btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-light');
    });

    const activeBtn = document.querySelector(`.audit-method-btn[onclick="setAuditMethod('${method}')"]`);
    if (activeBtn) {
        activeBtn.classList.remove('btn-light');
        activeBtn.classList.add('btn-primary');
    }

    // Update scanning interface for the new method
    updateScanningInterface();
    
    // If room audit is active, start the new scanning method
    if (isRoomAuditActive) {
        startScanningMethod(method);
    }
}

function updateScanningInterface() {
    const manualSearchGroup = document.getElementById('manualSearchGroup');
    
    // Hide all scanning indicators
    hideElements(['scanIndicator', 'rfidIndicator', 'qrIndicator']);
    
    if (currentAuditMethod === 'manual') {
        manualSearchGroup.style.display = 'flex';
        document.getElementById('searchInput').placeholder = "Enter asset ID or serial number...";
    } else {
        manualSearchGroup.style.display = 'none';
    }
    
    // If room audit is active, show the appropriate indicator
    if (isRoomAuditActive) {
        const indicatorId = {
            'barcode': 'scanIndicator',
            'rfid': 'rfidIndicator',
            'qrcode': 'qrIndicator'
        }[currentAuditMethod];
        
        if (indicatorId) {
            const indicator = document.getElementById(indicatorId) || createScanningIndicator(currentAuditMethod);
            if (indicator) indicator.style.display = 'block';
        }
    }
}

// Function to toggle room audit
function toggleRoomAudit() {
    // Toggle room audit state
    if (!isRoomAuditActive) {
        startRoomAudit();
    } else {
        // Show confirmation dialog with options
        if (confirm("Do you want to stop the audit? Unscanned assets will be marked as missing. Click Cancel to use the Cancel Audit option instead.")) {
            stopRoomAudit(true); // Stop with marking missing
        }
    }
}

// New function to cancel room audit
function cancelRoomAudit() {
    if (confirm("Are you sure you want to cancel the audit? No changes will be made to unscanned assets.")) {
        stopRoomAudit(false); // Stop without marking missing
        showScanMessage('Audit cancelled. No assets were marked as missing.', 'info');
    }
}

function startRoomAudit() {
    if (!currentRoom || currentRoom === 'Select Room') {
        showScanMessage('Please select a room first', 'warning');
        return;
    }
    
    // If already active, do nothing
    if (isRoomAuditActive) return;
    
    isRoomAuditActive = true;
    
    // Update Stop button
    const toggleButton = document.getElementById('toggleRoomAudit');
    toggleButton.textContent = 'Stop Room Audit';
    toggleButton.classList.remove('btn-success');
    toggleButton.classList.add('btn-danger');
    
    // Show Cancel button
    const cancelButton = document.getElementById('cancelRoomAudit');
    if (cancelButton) {
        cancelButton.style.display = 'block';
    }
    
    // Disable room selection while audit is active
    document.getElementById('buildingSelect').disabled = true;
    document.getElementById('floorSelect').disabled = true;
    document.getElementById('roomSelect').disabled = true;
    
    // Update the UI
    updateScanningInterface();
    
    // Ensure Enter key doesn't trigger any default actions on the page
    document.addEventListener('keydown', preventEnterDefault, true);
    
    // Start the selected scanning method
    startScanningMethod(currentAuditMethod);
    
    updateScanCounter();
    
    showScanMessage(`Audit started for room ${currentRoom}`, 'success');
}

function stopRoomAudit(markMissing = true) {
    // If not active, do nothing
    if (!isRoomAuditActive) return;
    
    console.log("Stopping room audit, markMissing:", markMissing);
    
    isRoomAuditActive = false;
    
    stopAllScanningMethods();
    
    // Remove the Enter key prevention handler
    document.removeEventListener('keydown', preventEnterDefault, true);
    
    // Update the toggle button
    const toggleButton = document.getElementById('toggleRoomAudit');
    toggleButton.textContent = 'Start Room Audit';
    toggleButton.classList.remove('btn-danger');
    toggleButton.classList.add('btn-success');
    
    // Hide Cancel button
    const cancelButton = document.getElementById('cancelRoomAudit');
    if (cancelButton) {
        cancelButton.style.display = 'none';
    }
    
    // Re-enable room selection
    document.getElementById('buildingSelect').disabled = false;
    document.getElementById('floorSelect').disabled = false;
    document.getElementById('roomSelect').disabled = false;
    
    updateScanningInterface();
    
    // Mark unscanned assets as missing if requested
    if (markMissing) {
        markUnscannedAssetsMissing();
        showScanMessage('Audit completed. Unscanned assets marked as missing.', 'info');
    }
}

// Function to prevent Enter key default actions except in search input
function preventEnterDefault(e) {
    // Allow Enter in search input for manual searching
    if (e.target.id === 'searchInput') {
        return true;
    }
    
    if (e.key === 'Enter') {
        e.preventDefault();
        return false;
    }
}

function startScanningMethod(method) {
    if (!isRoomAuditActive) return;
    
    if (method === 'barcode') {
        startBarcodeScan();
    } else if (method === 'rfid') {
        startRFIDScan();
    } else if (method === 'qrcode') {
        startQRCodeScan();
    }
}

function stopAllScanningMethods() {
    // Stop barcode scanning
    if (isScanning) {
        stopBarcodeScan();
    }
    
    // Stop RFID simulation
    if (rfidSimulationInterval) {
        clearInterval(rfidSimulationInterval);
        rfidSimulationInterval = null;
    }
    
    // Stop QR code simulation
    if (qrSimulationInterval) {
        clearInterval(qrSimulationInterval);
        qrSimulationInterval = null;
    }
}

/**
 * Barcode Scanning Functions
 */
function startBarcodeScan() {
    if (!isRoomAuditActive || currentAuditMethod !== 'barcode') return;
    
    if (isScanning) {
        // Already scanning, don't start again
        return;
    }
    
    isScanning = true;
    scanBuffer = '';
    
    // Create or show the scan indicator
    const scanIndicator = document.getElementById('scanIndicator') || createScanningIndicator('barcode');
    if (scanIndicator) scanIndicator.style.display = 'block';
    
    // Add event listener for keypress events
    document.addEventListener('keypress', handleScannerInput);
    
    console.log('Barcode scanning started');
}

function stopBarcodeScan() {
    if (!isScanning) return;
    
    // Set scanning flag to false
    isScanning = false;
    
    // Remove event listener
    document.removeEventListener('keypress', handleScannerInput);
    
    console.log('Barcode scanning stopped');
}

function handleScannerInput(e) {
    // Make sure scanning is still active
    if (!isScanning || !isRoomAuditActive) {
        return;
    }
    
    // Allow Enter key to work normally in search input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    // Reset timeout if already waiting
    if (scanTimeout) {
        clearTimeout(scanTimeout);
    }
    
    // Process on Enter key
    if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission
        processScanBuffer();
        return;
    }
    
    // Add character to buffer
    scanBuffer += e.key;
    
    // Set timeout to process buffer after delay (for barcode scanners that don't send Enter)
    scanTimeout = setTimeout(() => {
        if (scanBuffer.length > 0) {
            processScanBuffer();
        }
    }, SCAN_TIMEOUT_MS);
    
    e.preventDefault();
}

function processScanBuffer() {
    if (scanBuffer.length === 0) return;
    
    // Process the scanned barcode/ID
    processScannedAsset(scanBuffer);
    
    // Clear the buffer
    scanBuffer = '';
    
    // Make sure we're still scanning after processing
    if (currentAuditMethod === 'barcode' && !isScanning && isRoomAuditActive) {
        // If scanning got turned off somehow, turn it back on
        startBarcodeScan();
    }
}

/**
 * RFID Scanning Simulation
 */
function startRFIDScan() {
    if (!isRoomAuditActive || currentAuditMethod !== 'rfid') return;
    
    const rfidIndicator = document.getElementById('rfidIndicator') || createScanningIndicator('rfid');
    if (rfidIndicator) rfidIndicator.style.display = 'block';
    
    // Simulate RFID scanning at random intervals
    if (rfidSimulationInterval) clearInterval(rfidSimulationInterval);
    
    rfidSimulationInterval = setInterval(() => {
        if (expectedAssets.length > 0) {
            // Randomly select an asset to "scan" with higher probability for unscanned assets
            const unscannedAssets = expectedAssets.filter(asset => !asset.found);
            
            if (unscannedAssets.length > 0 && Math.random() > 0.2) {
                // 80% chance to scan an unscanned asset
                const randomIndex = Math.floor(Math.random() * unscannedAssets.length);
                processScannedAsset(unscannedAssets[randomIndex].id);
            } else if (expectedAssets.length > 0) {
                // 20% chance to scan any asset
                const randomIndex = Math.floor(Math.random() * expectedAssets.length);
                processScannedAsset(expectedAssets[randomIndex].id);
            }
            
            // 5% chance to scan an unexpected asset
            if (Math.random() < 0.05) {
                const randomId = 'RFID-' + Math.floor(Math.random() * 10000);
                processScannedAsset(randomId);
            }
        }
    }, 3000); // Simulate a scan every 3 seconds
}

/**
 * QR Code Scanning Simulation
 */
function startQRCodeScan() {
    if (!isRoomAuditActive || currentAuditMethod !== 'qrcode') return;
    
    const qrIndicator = document.getElementById('qrIndicator') || createScanningIndicator('qrcode');
    if (qrIndicator) qrIndicator.style.display = 'block';
    
    // Simulate QR scanning at random intervals (less frequent than RFID)
    if (qrSimulationInterval) clearInterval(qrSimulationInterval);
    
    qrSimulationInterval = setInterval(() => {
        if (expectedAssets.length > 0) {
            // Randomly select an asset to "scan" with higher probability for unscanned assets
            const unscannedAssets = expectedAssets.filter(asset => !asset.found);
            
            if (unscannedAssets.length > 0 && Math.random() > 0.3) {
                // 70% chance to scan an unscanned asset
                const randomIndex = Math.floor(Math.random() * unscannedAssets.length);
                processScannedAsset(unscannedAssets[randomIndex].id);
            } else if (expectedAssets.length > 0) {
                // 30% chance to scan any asset
                const randomIndex = Math.floor(Math.random() * expectedAssets.length);
                processScannedAsset(expectedAssets[randomIndex].id);
            }
            
            // 10% chance to scan an unexpected asset
            if (Math.random() < 0.1) {
                const randomId = 'QR-' + Math.floor(Math.random() * 10000);
                processScannedAsset(randomId);
            }
        }
    }, 5000); // Simulate a scan every 5 seconds
}

/**
 * Manual Asset Search
 */
async function manualSearchAsset() {
    if (!isRoomAuditActive) {
        showScanMessage('Please start a room audit first', 'warning');
        return;
    }
    
    const searchInput = document.getElementById('searchInput');
    const assetId = searchInput.value.trim();
   
    if (!assetId) {
        showScanMessage('Please enter an asset ID', 'warning');
        return;
    }

    try {
        await processScannedAsset(assetId);
        // Clear the input after successful processing
        searchInput.value = '';
        // Focus back on the input for the next scan
        searchInput.focus();
    } catch (error) {
        console.error('Error in manual search:', error);
        showScanMessage('Error processing asset', 'danger');
    }
}

/**
 * Process Scanned Assets
 */
async function processScannedAsset(assetId) {
    if (!isRoomAuditActive) return;
    
    // Check if the asset is in the expected assets list for this room
    const assetInRoom = expectedAssets.find(a => a.id === assetId);
    
    if (assetInRoom) {
        // Asset is expected in this room
        if (!assetInRoom.found) {
            // First time scanning this asset
            await updateAssetLocation(assetInRoom.id, currentRoom);
            markAssetAsFound(assetInRoom);
        } else {
            // Asset already scanned
            showScanMessage(`Asset already scanned: ${assetInRoom.description} (${assetInRoom.id})`, 'info');
        }
    } else {
        // Asset not in expected list, check if it exists elsewhere
        try {
            const response = await fetch(`/api/asset/${assetId}`);
            
            if (response.ok) {
                // Asset exists in database but not in this room
                const asset = await response.json();
                
                // Update asset location to current room and mark as misplaced
                await updateAssetLocation(assetId, currentRoom);
                addMisplacedAsset(asset);
            } else {
                // Asset not found in database
                showScanMessage(`Unknown asset: ${assetId}`, 'warning');
                if (confirm(`Asset "${assetId}" not found in system. Add as unexpected?`)) {
                    addUnexpectedAsset(assetId);
                }
            }
        } catch (error) {
            console.error('Error checking asset in database:', error);
            showScanMessage(`Error checking asset: ${assetId}`, 'danger');
        }
    }
}

async function updateAssetLocation(assetId, roomId) {
    try {
        const response = await fetch('api/update-asset-location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                assetId: assetId,
                roomId: roomId
            })
        });
        
        if (!response.ok) {
            console.error('Failed to update asset location:', await response.text());
        }
    } catch (error) {
        console.error('Error updating asset location:', error);
    }
}

function markAssetAsFound(asset) {
    asset.found = true;
    asset.status = 'Good';
    asset.last_located = currentRoom;
    asset.last_update = new Date().toISOString();
    asset.scanTime = new Date().toISOString();
    
    // Update the status in the Expected Assets table
    const foundCell = document.getElementById(`found-status-${asset.id}`);
    if (foundCell) {
        foundCell.className = 'found-yes';
        foundCell.textContent = 'YES';
    }
    
    // Highlight the row briefly to show it was found
    const row = document.getElementById(`expected-asset-${asset.id}`);
    if (row) {
        row.classList.add('table-success');
        setTimeout(() => {
            row.classList.remove('table-success');
        }, 2000);
    }
    
    // Add to scanned assets list if not already there
    if (!scannedAssets.find(a => a.id === asset.id)) {
        scannedAssets.push({...asset});
        updateScannedAssetsTable();
    }
    
    updateScanCounter();
    
    showScanMessage(`Asset found: ${asset.description} (${asset.id})`, 'success');
}

function addMisplacedAsset(asset) {
    // Format the asset data
    const assetId = asset.id || asset['id:'] || '';
    const formattedAsset = {
        id: assetId,
        description: asset.description || 'Unknown Asset',
        brand: asset.brand || 'Unknown',
        model: asset.model || 'Unknown',
        status: 'Misplaced',
        room_id: asset.room_id || 'Unknown',
        last_located: currentRoom,
        assignee_id: asset.assignee_id || 'Unassigned',
        last_update: asset.last_update || new Date().toISOString(),
        scanTime: new Date().toISOString(),
        found: true
    };
    
    // Add to scanned assets list if not already there
    if (!scannedAssets.find(a => a.id === assetId)) {
        scannedAssets.push(formattedAsset);
        updateScannedAssetsTable();
    }
    
    showScanMessage(
        `Asset found: ${formattedAsset.description} (${assetId}) - Not assigned to this room!`, 
        'warning'
    );
}

function addUnexpectedAsset(assetId) {
    const unexpectedAsset = {
        id: assetId,
        description: 'Unexpected Asset',
        brand: 'Unknown',
        model: 'Unknown',
        status: 'Unexpected',
        room_id: 'Unknown',
        last_located: currentRoom,
        assignee_id: 'Unassigned',
        last_update: new Date().toISOString(),
        scanTime: new Date().toISOString(),
        found: true
    };
    
    // Add to scanned assets list
    scannedAssets.push(unexpectedAsset);
    updateScannedAssetsTable();
    
    showScanMessage(`Unexpected asset added: ${assetId}`, 'warning');
}

function markUnscannedAssetsMissing() {
    let missingCount = 0;
    const missingAssets = [];
    
    expectedAssets.forEach(asset => {
        if (!asset.found) {
            asset.status = 'Missing';
            missingCount++;
            missingAssets.push(asset.id);
            
            // Update status in the UI
            const row = document.getElementById(`expected-asset-${asset.id}`);
            if (row) {
                const statusCell = row.cells[4]; // Status is in 5th column (index 4)
                statusCell.innerHTML = '<span class="status-dot status-poor"></span> Missing';
            }
        }
    });
    
    console.log(`Marking ${missingCount} assets as missing:`, missingAssets);
    
    if (missingCount > 0) {
        // Update the assets in the database
        updateMissingAssets(missingAssets);
        showScanMessage(`${missingCount} assets marked as missing`, 'warning');
    }
}

async function updateMissingAssets(missingAssetIds) {
    if (!missingAssetIds || missingAssetIds.length === 0) {
        console.log("No assets to mark as missing");
        return;
    }
    
    console.log(`Sending ${missingAssetIds.length} asset IDs to server for marking as missing:`, missingAssetIds);
    
    try {
        const response = await fetch('/api/mark-assets-missing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                assetIds: missingAssetIds
            })
        });
        
        const responseText = await response.text();
        console.log("Server response:", responseText);
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse response as JSON:", e);
            console.error("Raw response:", responseText);
            return;
        }
        
        if (!response.ok) {
            console.error('Failed to mark assets as missing:', responseData);
            showScanMessage(`Error marking assets as missing: ${responseData.message || 'Unknown error'}`, 'danger');
        } else {
            console.log(`Successfully marked ${responseData.processed_count || missingAssetIds.length} assets as missing`);
            
            // Confirm UI updates for all missing assets
            expectedAssets.forEach(asset => {
                if (missingAssetIds.includes(asset.id)) {
                    asset.status = 'Missing';
                    
                    // Update status in the UI again to ensure consistency
                    const row = document.getElementById(`expected-asset-${asset.id}`);
                    if (row) {
                        const statusCell = row.cells[4]; // Status is in 5th column (index 4)
                        statusCell.innerHTML = '<span class="status-dot status-poor"></span> Missing';
                    }
                }
            });
            
            // Optionally reload the page if needed to ensure all data is fresh
            // setTimeout(() => window.location.reload(), 3000);
        }
    } catch (error) {
        console.error('Error marking assets as missing:', error);
        showScanMessage(`Network error marking assets as missing: ${error.message}`, 'danger');
    }
}


/**
 * UI Helper Functions
 */
function updateScanCounter() {
    const foundCount = expectedAssets.filter(asset => asset.found).length;
    const totalCount = expectedAssets.length;
    
    let scanCounter = document.getElementById('scanCounter');
    if (!scanCounter) {
        scanCounter = document.createElement('div');
        scanCounter.id = 'scanCounter';
        scanCounter.className = 'alert alert-primary mt-3';
        document.getElementById('assetList').insertBefore(scanCounter, document.getElementById('assetList').firstChild);
    }
    
    scanCounter.innerHTML = `<strong>Asset Scan Progress:</strong> ${foundCount} of ${totalCount} assets found (${Math.round(foundCount/totalCount*100 || 0)}%)`;
    
    if (foundCount === totalCount && totalCount > 0) {
        scanCounter.className = 'alert alert-success mt-3';
        scanCounter.innerHTML += '<br><strong>✓ All assets accounted for!</strong>';
    }
    
    scanCounter.style.display = 'block';
}

function showScanMessage(message, type) {
    let scanMessage = document.getElementById('scanMessage');
    
    if (!scanMessage) {
        scanMessage = document.createElement('div');
        scanMessage.id = 'scanMessage';
        document.getElementById('searchContainer').appendChild(scanMessage);
    } else {
        if (scanMessage.hideTimeout) {
            clearTimeout(scanMessage.hideTimeout);
        }
    }
    
    scanMessage.className = `alert alert-${type} mt-2`;
    scanMessage.textContent = message;
    scanMessage.style.display = 'block';
    
    scanMessage.hideTimeout = setTimeout(() => {
        scanMessage.style.display = 'none';
    }, 3000);
}

function createScanningIndicator(method) {
    const indicatorId = {
        'barcode': 'scanIndicator',
        'rfid': 'rfidIndicator',
        'qrcode': 'qrIndicator'
    }[method];
    
    if (!indicatorId || document.getElementById(indicatorId)) return null;
    
    const indicatorMessages = {
        'barcode': '<strong>Barcode scanning active</strong><br>Scan assets or select a different scanning method',
        'rfid': '<strong>RFID scanning active</strong><br>Please place RFID reader near assets to scan',
        'qrcode': '<strong>QR Code scanning active</strong><br>Point the camera at QR codes to scan'
    };
    
    const indicator = document.createElement('div');
    indicator.id = indicatorId;
    indicator.className = 'alert alert-info mb-3';
    indicator.innerHTML = indicatorMessages[method] || '';
    
    const searchContainer = document.getElementById('searchContainer');
    searchContainer.insertBefore(indicator, document.getElementById('toggleRoomAudit'));
    
    return indicator;
}

function appendCell(row, text) {
    const cell = document.createElement('td');
    cell.textContent = text || '';
    row.appendChild(cell);
    return cell;
}

function hideElements(elementIds) {
    elementIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    });
}

function showElements(elementIds) {
    elementIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = id === 'auditMethodButtons' ? 'flex' : 'block';
    });
}

/**
 * Event Listeners 
 */
document.addEventListener('DOMContentLoaded', function() {
    // Set up click handlers
    const toggleButton = document.getElementById('toggleRoomAudit');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleRoomAudit);
        
        // Prevent the button from being submitted by Enter key
        toggleButton.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    }
    
    // Set up Cancel button handler
    const cancelButton = document.getElementById('cancelRoomAudit');
    if (cancelButton) {
        cancelButton.addEventListener('click', cancelRoomAudit);
        
        // Prevent the button from being submitted by Enter key
        cancelButton.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    }
    
    const searchButton = document.getElementById('manualSearchButton');
    if (searchButton) {
        searchButton.addEventListener('click', manualSearchAsset);
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                manualSearchAsset();
                e.preventDefault(); // Prevent form submission
            }
        });
    }
    
    // Prevent Enter key from stopping the scan
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && isRoomAuditActive) {
            // Prevent default action of Enter key when scanning is active
            e.preventDefault();
        }
    }, true); // Use capturing phase to catch the event early
    
    // Set default scanning method
    setAuditMethod('manual');
});