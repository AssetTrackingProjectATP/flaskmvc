from flask import Blueprint, render_template, jsonify, request
from flask_jwt_extended import jwt_required, current_user
from App.database import db
from App.controllers.asset import (
    get_asset,
    get_assets_by_status, 
    get_discrepant_assets, 
    mark_asset_lost, 
    mark_asset_found,
    update_asset_location
)
from App.controllers.room import get_room, get_all_rooms
from datetime import datetime
from App.controllers.scanevent import add_scan_event

discrepancy_views = Blueprint('discrepancy_views', __name__, template_folder='../templates')

@discrepancy_views.route('/discrepancy-report', methods=['GET'])
@jwt_required()
def discrepancy_report_page():
    # Default without loading data in template (will be loaded via API)
    return render_template('discrepancy.html')

@discrepancy_views.route('/api/discrepancies', methods=['GET'])
@jwt_required()
def get_discrepancies():
    """API endpoint to get all discrepancy assets"""
    discrepancies = get_discrepant_assets()
    
    # Enrich with room information
    for asset in discrepancies:
        # Get expected room name (if available)
        if asset.get('room_id'):
            room = get_room(asset['room_id'])
            if room:
                asset['room_name'] = room.room_name
            else:
                asset['room_name'] = f"Room {asset['room_id']}"
        else:
            asset['room_name'] = "Unknown"
            
        # Get last located room name (if available)
        if asset.get('last_located') and asset['last_located'] != asset['room_id']:
            last_room = get_room(asset['last_located'])
            if last_room:
                asset['last_located_name'] = last_room.room_name
            else:
                asset['last_located_name'] = f"Room {asset['last_located']}"
                
    return jsonify(discrepancies)

@discrepancy_views.route('/api/rooms/all', methods=['GET'])
@jwt_required()
def get_all_rooms_json():
    """API endpoint to get all rooms for relocation"""
    rooms = get_all_rooms()
    if not rooms:
        return jsonify([])
    rooms_json = [room.get_json() for room in rooms]
    return jsonify(rooms_json)

@discrepancy_views.route('/api/discrepancies/missing', methods=['GET'])
@jwt_required()
def get_missing():
    """API endpoint to get missing assets"""
    missing = get_assets_by_status("Missing")
    return jsonify(missing)

@discrepancy_views.route('/api/discrepancies/misplaced', methods=['GET'])
@jwt_required()
def get_misplaced():
    """API endpoint to get misplaced assets"""
    misplaced = get_assets_by_status("Misplaced")
    return jsonify(misplaced)

@discrepancy_views.route('/api/asset/<asset_id>/mark-lost', methods=['POST'])
@jwt_required()
def mark_asset_as_lost(asset_id):
    """API endpoint to mark an asset as lost"""
    asset = mark_asset_lost(asset_id, current_user.id)
    
    if not asset:
        return jsonify({'success': False, 'message': 'Failed to mark asset as lost. Asset not found or error occurred.'}), 404
    
    return jsonify({
        'success': True,
        'message': 'Asset successfully marked as lost',
        'asset': asset.get_json()
    })

@discrepancy_views.route('/api/asset/<asset_id>/mark-found', methods=['POST'])
@jwt_required()
def mark_asset_as_found(asset_id):
    """API endpoint to mark an asset as found"""
    # Return to room is always true for this endpoint
    asset = mark_asset_found(asset_id, current_user.id, return_to_room=True)
    
    if not asset:
        return jsonify({'success': False, 'message': 'Failed to mark asset as found. Asset not found or error occurred.'}), 404
    
    return jsonify({
        'success': True,
        'message': 'Asset successfully marked as found and returned to its assigned room',
        'asset': asset.get_json()
    })



@discrepancy_views.route('/api/asset/<asset_id>/relocate', methods=['POST'])
@jwt_required()
def relocate_asset(asset_id):
    """API endpoint to mark an asset as found and relocate it to a new room"""
    data = request.json
    
    if not data or 'roomId' not in data:
        return jsonify({'success': False, 'message': 'Room ID is required'}), 400
    
    new_room_id = data['roomId']
    user_notes = data.get('notes', '')  # Get optional notes, default to empty string
    
    # Get the asset directly
    asset = get_asset(asset_id)
    if not asset:
        return jsonify({'success': False, 'message': 'Asset not found'}), 404
    
    # Store old status and location for changelog
    old_status = asset.status
    old_location = asset.room_id
    
    # Update both room_id AND last_located in one operation
    asset.last_located = new_room_id
    asset.room_id = new_room_id
    asset.status = "Good"
    asset.last_update = datetime.now()
    
    try:
        # Get room names for better context in notes
        old_room_name = get_room(old_location).room_name if get_room(old_location) else f"Room {old_location}"
        new_room_name = get_room(new_room_id).room_name if get_room(new_room_id) else f"Room {new_room_id}"
        
        # Create the base notes about the relocation
        if old_location == new_room_id:
            system_notes = f"Asset reassigned to its current location ({new_room_name})."
        else:
            system_notes = f"Asset relocated and reassigned from {old_room_name} to {new_room_name}."
            
        # Add status change information
        system_notes += f" Previous status: {old_status}."
        
        # Append user notes if provided
        if user_notes:
            notes = f"{system_notes} \n User note: {user_notes}"
        else:
            notes = system_notes
        
        # Create a single scan event using the existing controller
        add_scan_event(
            asset_id=asset_id,
            user_id=current_user.id,
            room_id=new_room_id,
            status="Good",
            notes=notes
        )
        
        # Commit all changes at once
        db.session.commit()
        
        # Get room name for the response message
        room = get_room(new_room_id)
        room_name = room.room_name if room else f"Room {new_room_id}"
        
        return jsonify({
            'success': True,
            'message': f'Asset successfully reassigned to {room_name}',
            'asset': asset.get_json()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error updating asset: {str(e)}'}), 500
    