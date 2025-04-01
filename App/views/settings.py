from flask import Blueprint, render_template, jsonify
from flask_jwt_extended import jwt_required, current_user
from App.controllers.asset import get_all_assets_json, upload_csv
#from App.controllers.asset import upload_csv

settings_views = Blueprint('settings_views', __name__, template_folder='../templates')

@settings_views.route('/settings', methods=['GET'])
@jwt_required()
def inventory_page():
    return render_template('settings.html')

@settings_views.route('/api/settings', methods=['GET'])
@jwt_required()
def get_assets():
    assets = get_all_assets_json()
    return jsonify(assets)

@settings_views.route('/add-asset', methods=['GET'])
@jwt_required()
def add_asset_page():
    # This will be implemented in the future
    return render_template('message.html', 
                          title="Add Asset", 
                          message="Add Asset functionality coming soon!")

@settings_views.route('/add-asset', methods=['GET'])
@jwt_required()
def add_asset_page():
    # This will be implemented in the future
    return render_template('message.html', 
                          title="Upload CSV", 
                          message="Upload CSV functionality coming soon!")
    