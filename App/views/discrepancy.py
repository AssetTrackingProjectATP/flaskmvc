from flask import Blueprint, render_template, jsonify
from flask_jwt_extended import jwt_required, current_user
from App.controllers.asset import get_assets_by_status, get_discrepant_assets
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