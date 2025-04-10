from flask import Blueprint, render_template, jsonify, request
from flask_jwt_extended import current_user, jwt_required
from App.controllers.building import get_all_building_json
from App.controllers.floor import get_floors_by_building
from App.controllers.room import get_rooms_by_floor
from App.controllers.asset import (
    get_all_assets, 
    get_all_assets_by_room_json, 
    get_asset, 
    update_asset_location,
    mark_assets_missing
)

audit_views = Blueprint('audit_views', __name__, template_folder='../templates')

@audit_views.route('/audit')
def audit_page():
    buildings = get_all_building_json()
    return render_template('audit.html',
                          buildings=buildings)

@audit_views.route('/api/floors/<building_id>')
def get_floors(building_id):
    floors = get_floors_by_building(building_id)
    floors_json = [floor.get_json() for floor in floors]
    return jsonify(floors_json)

@audit_views.route('/api/rooms/<floor_id>')
def get_rooms(floor_id):
    rooms = get_rooms_by_floor(floor_id)
    rooms_json = [room.get_json() for room in rooms]
    return jsonify(rooms_json)

@audit_views.route('/api/assets/<room_id>')
def get_room_assets(room_id):
    print(get_all_assets())
    try:
        room_id_int = int(room_id)  # Convert to integer
    except ValueError:
        return jsonify({"error": "Invalid room ID"}), 400

    print(f"Fetching assets for room ID: {room_id_int}")
    room_assets = get_all_assets_by_room_json(room_id_int)
    
    print(f"Found {len(room_assets)} assets for room {room_id_int}")
    print(f"Sample of returned data: {room_assets[:1]}")
    
    return jsonify(room_assets)

@audit_views.route('/api/asset/<asset_id>', methods=['GET'])
def get_asset_by_id(asset_id):
    asset = get_asset(asset_id)
    print(asset)
    
    if not asset:
        return jsonify({'message': 'Asset not found'}), 404
    
    return jsonify(asset.get_json())

@audit_views.route('/api/mark-assets-missing', methods=['POST'])
@jwt_required()
def mark_missing():
    data = request.json
    
    if not data or 'assetIds' not in data:
        return jsonify({'success': False, 'message': 'Invalid request data: missing assetIds field'}), 400
    
    asset_ids = data['assetIds']
    
    if not isinstance(asset_ids, list):
        return jsonify({'success': False, 'message': 'assetIds must be a list'}), 400
    
    print(f"Marking {len(asset_ids)} assets as missing: {asset_ids}")
    
    # Pass the current user's ID
    processed_count, error_count, errors = mark_assets_missing(asset_ids, current_user.id)
    
    print(f"Result: processed={processed_count}, errors={error_count}, error_details={errors}")
    
    if processed_count == 0:
        return jsonify({
            'success': False,
            'message': f'Failed to mark assets as missing: {errors[0] if errors else "Unknown error"}',
            'errors': errors[:10] if errors else [],
            'processed_count': 0,
            'error_count': error_count
        }), 500
    
    return jsonify({
        'success': True,
        'message': f'{processed_count} assets marked as missing',
        'processed_count': processed_count,
        'error_count': error_count,
        'errors': errors[:10] if errors else []
    })
    
@audit_views.route('/api/update-asset-location', methods=['POST'])
@jwt_required()
def update_location():
    data = request.json
    
    if not data or 'assetId' not in data or 'roomId' not in data:
        return jsonify({'message': 'Invalid request data'}), 400
    
    asset_id = data['assetId']
    room_id = data['roomId']
    
    # Pass the current user's ID if available
    user_id = current_user.id if current_user else None
    updated_asset = update_asset_location(asset_id, room_id, user_id)
    
    if not updated_asset:
        return jsonify({'message': 'Failed to update asset location'}), 500
    
    return jsonify({
        'message': 'Asset location updated',
        'asset': updated_asset.get_json()
    })