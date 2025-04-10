from flask import Blueprint, render_template, jsonify, request
from flask_jwt_extended import jwt_required, current_user
from App.controllers.asset import get_all_assets_json, get_asset, update_asset_details
from App.controllers.assignee import get_all_assignees_json, get_assignee_by_id
from App.controllers.room import get_room
from App.controllers.scanevent import add_scan_event, get_scans_by_asset

inventory_views = Blueprint('inventory_views', __name__, template_folder='../templates')

@inventory_views.route('/inventory', methods=['GET'])
@jwt_required()
def inventory_page():
    return render_template('inventory.html')

@inventory_views.route('/api/assets', methods=['GET'])
@jwt_required()
def get_assets():
    # Get all assets
    assets = get_all_assets_json()
    
    # Enrich each asset with room name and assignee name
    for asset in assets:
        # Add room name
        if asset.get('room_id'):
            room = get_room(asset['room_id'])
            if room:
                asset['room_name'] = room.room_name
            else:
                asset['room_name'] = f"Room {asset['room_id']}"
        else:
            asset['room_name'] = "Unknown"
            
        # Add assignee name
        if asset.get('assignee_id'):
            assignee = get_assignee_by_id(asset['assignee_id'])
            if assignee:
                asset['assignee_name'] = f"{assignee.fname} {assignee.lname}"
            else:
                asset['assignee_name'] = f"Assignee {asset['assignee_id']}"
        else:
            asset['assignee_name'] = "Unassigned"
    
    return jsonify(assets)

@inventory_views.route('/add-asset', methods=['GET'])
@jwt_required()
def add_asset_page():
    # This will be implemented in the future
    return render_template('message.html', 
                          title="Add Asset", 
                          message="Add Asset functionality coming soon!")
    
@inventory_views.route('/asset/<asset_id>', methods=['GET'])
@jwt_required()
def asset_report(asset_id):
    """Display detailed report for a specific asset"""
    asset = get_asset(asset_id)
    
    if not asset:
        return render_template('message.html', 
                              title="Asset Not Found", 
                              message=f"The asset with ID {asset_id} was not found.")
    
    # Get room information
    room = get_room(asset.room_id) if asset.room_id else None
    room_name = room.room_name if room else "Unknown"
    
    # Get last location information
    last_location = get_room(asset.last_located) if asset.last_located else None
    last_location_name = last_location.room_name if last_location else "Unknown"
    
    # Get assignee information
    assignee = get_assignee_by_id(asset.assignee_id) if asset.assignee_id else None
    assignee_name = f"{assignee.fname} {assignee.lname}" if assignee else "Unassigned"
    
    # Get scan history
    scan_events = get_scans_by_asset(asset_id)
    
    # Enrich scan events with room names
    enriched_scan_events = []
    for event in scan_events:
        event_dict = event.__dict__.copy()
        scan_room = get_room(event.room_id)
        event_dict['room_name'] = scan_room.room_name if scan_room else f"Room {event.room_id}"
        enriched_scan_events.append(event_dict)
    
    return render_template('asset.html',
                          asset=asset,
                          room_name=room_name,
                          last_location_name=last_location_name,
                          assignee_name=assignee_name,
                          scan_events=enriched_scan_events)
    
@inventory_views.route('/api/asset/<asset_id>/update', methods=['POST'])
@jwt_required()
def update_asset_details_endpoint(asset_id):
    """API endpoint to update editable asset details"""
    data = request.json
    
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
    
    # Extract data from request
    description = data.get('description')
    model = data.get('model')
    brand = data.get('brand')
    serial_number = data.get('serial_number')
    assignee_id = data.get('assignee_id')
    notes = data.get('notes')
    
    # Basic validation
    if not description:
        return jsonify({'success': False, 'message': 'Description is required'}), 400
    
    # Update the asset details
    updated_asset = update_asset_details(
        asset_id, description, model, brand, serial_number, assignee_id, notes
    )
    
    if not updated_asset:
        return jsonify({'success': False, 'message': 'Failed to update asset. Asset not found or error occurred.'}), 404
    
    # Add a scan event to record this update
    try:
        add_scan_event(
            asset_id=asset_id,
            user_id=current_user.id,
            room_id=updated_asset.room_id,
            status=updated_asset.status,
            notes=f"Asset details updated by {current_user.username}"
        )
    except Exception as e:
        # Log the error but don't fail the request
        print(f"Error adding scan event: {e}")
    
    return jsonify({
        'success': True,
        'message': 'Asset details updated successfully',
        'asset': updated_asset.get_json()
    })

#endpoint to get all assignees for the dropdown
@inventory_views.route('/api/assignees', methods=['GET'])
@jwt_required()
def get_assignees():
    """API endpoint to get all assignees for dropdown selection"""
    assignees = get_all_assignees_json()
    return jsonify(assignees)