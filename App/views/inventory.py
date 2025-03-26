from flask import Blueprint, render_template, jsonify
from flask_jwt_extended import jwt_required, current_user
from App.controllers.asset import get_all_assets_json, get_asset
from App.controllers.assignee import get_assignee_by_id
from App.controllers.room import get_room
from App.controllers.scanevent import get_scans_by_asset

inventory_views = Blueprint('inventory_views', __name__, template_folder='../templates')

@inventory_views.route('/inventory', methods=['GET'])
@jwt_required()
def inventory_page():
    return render_template('inventory.html')

@inventory_views.route('/api/assets', methods=['GET'])
@jwt_required()
def get_assets():
    assets = get_all_assets_json()
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