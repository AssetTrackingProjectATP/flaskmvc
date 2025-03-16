from flask import Blueprint, render_template
from flask_jwt_extended import jwt_required, current_user

discrepancy_views = Blueprint('discrepancy_views', __name__, template_folder='../templates')

@discrepancy_views.route('/discrepancy-report', methods=['GET'])
@jwt_required()
def discrepancy_report_page():
    return render_template('discrepancy.html')

@discrepancy_views.route('/lost-assets', methods=['GET'])
@jwt_required()
def lost_assets_page():
    return render_template('lost_assets.html')