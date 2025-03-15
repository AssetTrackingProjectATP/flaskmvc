from datetime import datetime
from App.models import Asset 
import os, csv
from App.models.asset import *
from App.controllers.assignee import *
from App.controllers.scanevent import add_scan_event
from flask_jwt_extended import current_user
from App.database import db 

def get_asset(id):
    return Asset.query.filter_by(id=id).first()

def get_all_assets():
    return Asset.query.all()

def get_all_assets_by_room_id(room_id):
    assets = Asset.query.filter_by(room_id=room_id).all()
    return assets

def get_all_assets_json():
    assets = get_all_assets()
    if not assets:
        return[]
    assets = [asset.get_json() for asset in assets]
    return assets


def get_all_assets_by_room_json(room_id):
    assets = get_all_assets_by_room_id(room_id)
    if not assets:
        return[]
    assets = [asset.get_json() for asset in assets]
    return assets


def add_asset(id, description, model, brand, serial_number, room_id, last_located, assignee_id, last_update, notes):
    status = "Misplaced"
    if(last_located==room_id):
        status = "Good"
    
    newAsset = Asset(id, description, model, brand, serial_number, room_id, last_located, assignee_id, last_update, notes, status)
    
    try:
        db.session.add(newAsset)
        db.session.commit()
        return newAsset
    except:
        db.session.rollback()
        return None
    
def set_last_located(id,last_located):
    new_asset = get_asset(id)
    new_asset.last_located = last_located
    
def set_status(id):
    new_asset= Asset.query.filter_by(id = id).first()
    if new_asset.room_id == new_asset.last_located :
        new_asset.status = "Found"
    else:
        new_asset.status = "Misplaced"
        
    return new_asset
    
    
def upload_csv(self):
    with open('CSVsample.csv') as file:
     reader = csv.DictReader(file)
     for row in reader:
         

      new_asset = Asset(description=row['item'],
                            id=row['Asset Tag'],
                            model= row['Model'],
                            brand=row['Brand'],
                            serial_number=row['Serial Number'],
                            room_id=row['Location'],
                            last_located=row['Location'],
                            status=row['Condition'],
                            assignee_id=row['Assignee'],
                            last_update=db.func.current_timestamp(),
                            notes=null
                            
      )
    
     db.session.add(new_asset)
     db.session.commit()
        
def delete_asset(id):
    asset = get_asset(id)
    if asset:
        try:
            db.session.delete(asset)
            db.session.commit()
            return True, f"Asset {id} was successfully deleted."
        except:
            db.session.rollback()
            return False, f"Failed to delete asset {id}."
    return False, f"Asset {id} does not exist."



def update_asset_location(asset_id, new_location, user_id=None):
    asset = get_asset(asset_id)
    if not asset:
        return None
    
    # Store old status and location for changelog
    old_status = asset.status
    old_location = asset.last_located
        
    asset.last_located = new_location
    asset.last_update = datetime.now()
    
    # Set status based on whether the asset is in its assigned room
    if asset.room_id == new_location:
        asset.status = "Good"
    else:
        asset.status = "Misplaced"
    
    try:
        db.session.commit()
        
        # Create a scan event to record this update
        notes = f"Asset moved from {old_location} to {new_location}. Status changed from {old_status} to {asset.status}."
        
        # Use the current_user's ID if user_id not provided
        if not user_id and current_user:
            user_id = current_user.id
            
        # If we still don't have a user_id, use a default
        if not user_id:
            user_id = "SYSTEM"
            
        add_scan_event(
            asset_id=asset_id,
            user_id=user_id,
            room_id=new_location,
            status=asset.status,
            notes=notes
        )
        
        return asset
    except Exception as e:
        print(f"Error updating asset location: {e}")
        db.session.rollback()
        return None

# New function to mark assets as missing
def mark_assets_missing(asset_ids, user_id=None):
    try:
        for asset_id in asset_ids:
            asset = get_asset(asset_id)
            if asset:
                old_status = asset.status
                asset.status = "Missing"
                asset.last_update = datetime.now()
                
                # Use the current_user's ID if user_id not provided
                if not user_id and current_user:
                    user_id = current_user.id
                
                # If we still don't have a user_id, use a default
                if not user_id:
                    user_id = "SYSTEM"
                
                # Create a scan event for each missing asset
                notes = f"Asset marked as Missing. Previous status: {old_status}."
                add_scan_event(
                    asset_id=asset_id,
                    user_id=user_id,
                    room_id=asset.room_id,
                    status="Missing",
                    notes=notes
                )
        
        db.session.commit()
        return True
    except Exception as e:
        print(f"Error marking assets as missing: {e}")
        db.session.rollback()
        return False

def get_assets_by_status(status):
    assets = Asset.query.filter_by(status=status).all()
    if not assets:
        return []
    assets = [asset.get_json() for asset in assets]
    return assets

def get_discrepant_assets():
    assets = Asset.query.filter(Asset.status.in_(["Missing", "Misplaced"])).all()
    if not assets:
        return []
    assets = [asset.get_json() for asset in assets]
    return assets      

def mark_asset_lost(asset_id, user_id=None):
    asset = get_asset(asset_id)
    if not asset:
        return None
    
    # Store old status for changelog
    old_status = asset.status
    
    # Set status to Lost
    asset.status = "Lost"
    asset.last_update = datetime.now()
    
    try:
        # Use the current_user's ID if user_id not provided
        if not user_id and current_user:
            user_id = current_user.id
            
        # If we still don't have a user_id, use a default
        if not user_id:
            user_id = "SYSTEM"
        
        # Create a scan event to record this update
        notes = f"Asset marked as Lost. Previous status: {old_status}."
        
        add_scan_event(
            asset_id=asset_id,
            user_id=user_id,
            room_id=asset.room_id,
            status="Lost",
            notes=notes
        )
        
        db.session.commit()
        return asset
    except Exception as e:
        print(f"Error marking asset as lost: {e}")
        db.session.rollback()
        return None

def mark_asset_found(asset_id, user_id=None, return_to_room=True):
    asset = get_asset(asset_id)
    if not asset:
        return None
    
    # Store old status for changelog
    old_status = asset.status
    
    # If returning to assigned room, update last_located to match room_id
    if return_to_room:
        asset.last_located = asset.room_id
    else:
        asset.room_id = asset.last_located
    
    # Set status to Good
    asset.status = "Good"
    asset.last_update = datetime.now()
    
    try:
        # Use the current_user's ID if user_id not provided
        if not user_id and current_user:
            user_id = current_user.id
            
        # If we still don't have a user_id, use a default
        if not user_id:
            user_id = "SYSTEM"
        
        # Create a scan event to record this update
        if return_to_room:
            notes = f"Asset marked as Found and returned to its assigned room. Previous status: {old_status}."
        else:
            notes = f"Asset marked as Found. Previous status: {old_status}."
        
        add_scan_event(
            asset_id=asset_id,
            user_id=user_id,
            room_id=asset.last_located,
            status="Good",
            notes=notes
        )
        
        db.session.commit()
        return asset
    except Exception as e:
        print(f"Error marking asset as found: {e}")
        db.session.rollback()
        return None
    
def update_asset_details(asset_id, description, model, brand, serial_number, assignee_id, notes):
    """Update basic asset details excluding location and status fields"""
    asset = get_asset(asset_id)
    if not asset:
        return None
    
    # Update only the editable fields
    asset.description = description
    asset.model = model
    asset.brand = brand
    asset.serial_number = serial_number
    asset.assignee_id = assignee_id
    asset.notes = notes
    
    # Automatically update the last_update timestamp
    asset.last_update = datetime.now()
    
    try:
        db.session.commit()
        return asset
    except Exception as e:
        print(f"Error updating asset details: {e}")
        db.session.rollback()
        return None
