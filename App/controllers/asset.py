from App.models import Asset 
from App.controllers.assignee import *
from App.controllers.location import *
from App.database import db 


def add_asset(id, name, item_class,location_id, fname, lname, last_update, serial_number, change_log):
    assignee = get_assignee_by_fname_lname(fname, lname)
    
    
    newAsset = Asset(id, name, item_class, assignee.id, location_id, last_update, serial_number, change_log)
    
    
    try:
        db.session.add(newAsset)
        db.session.commit()
        return newAsset
    except:
        db.session.rollback()
        return None

def get_asset(id):
    return Asset.query.filter_by(id=id).first()

def get_all_assets():
    return Asset.query.all()

def get_all_assets_json():
    assets = get_all_assets()
    if not assets:
        return[]
    assets = [asset.get_json() for asset in assets]
    return assets

def update_condition(id, condition):
    asset = get_asset(id)
    asset.condition = condition
    
    return asset

def add_asset(id, name, item_class,location_id, fname, lname, last_update, serial_number, change_log, email):
    assignee = get_assignee_by_fname_lname(fname, lname)
    if assignee is None:
        assignee = create_assignee(fname, lname, email)
    
    
    newAsset = Asset(id, name, item_class, assignee.id, location_id, last_update, serial_number, change_log)
    
    
    try:
        db.session.add(newAsset)
        db.session.commit()
        return newAsset
    except:
        db.session.rollback()
        return None
    


    
    
    