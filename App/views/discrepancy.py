from flask import Blueprint, render_template, jsonify, request
from flask_jwt_extended import jwt_required, current_user
from App.controllers.asset import get_assets_by_status, get_discrepant_assets, mark_asset_lost, mark_asset_found
from App.controllers.room import get_room

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
    # Check for custom return location or use default behavior
    data = request.json or {}
    return_to_room = data.get('return_to_assigned_room', True)
    
    asset = mark_asset_found(asset_id, current_user.id, return_to_room)
    
    if not asset:
        return jsonify({'success': False, 'message': 'Failed to mark asset as found. Asset not found or error occurred.'}), 404
    
    return jsonify({
        'success': True,
        'message': 'Asset successfully marked as found' + (' and returned to its assigned room' if return_to_room else ''),
        'asset': asset.get_json()
    })