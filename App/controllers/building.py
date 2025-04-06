from App.models import Building
from App.database import db
from App.controllers.floor import *

def create_building(building_id, building_name):
    new_building = Building(building_id=building_id, building_name=building_name)
    db.session.add(new_building)
    db.session.commit()
    return new_building

def get_building(building_id):
    try:
        # Print for debugging
        print(f"Getting building with ID: {building_id} (type: {type(building_id)})")
        
        # Convert to string if it's not already a string
        if not isinstance(building_id, str):
            building_id = str(building_id)
            print(f"Converted building_id to string: {building_id}")
        
        # Try to get the building
        building = Building.query.get(building_id)
        
        if building:
            print(f"Found building: {building.building_name} (ID: {building.building_id})")
        else:
            print(f"No building found with ID: {building_id}")
            
        return building
    except Exception as e:
        print(f"Error in get_building: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def edit_building(building_id, building_name):
    try:
        # Print for debugging
        print(f"Editing building with ID: {building_id} (type: {type(building_id)}), New name: {building_name}")
        
        # Get the building
        building = get_building(building_id)
        
        if not building:
            print(f"Building with ID {building_id} not found")
            return None
        
        # Update the building name
        print(f"Updating building name from '{building.building_name}' to '{building_name}'")
        building.building_name = building_name
        
        # Add to session and commit
        db.session.add(building)
        db.session.commit()
        
        print(f"Building updated successfully: {building_id} - {building_name}")
        return True
    except Exception as e:
        print(f"Error updating building: {str(e)}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return None

def get_all_building_json():
    buildings = Building.query.all()
    if not buildings:
        return[]
    buildings = [building.get_json() for building in buildings]
    return buildings

def update_building(building_id, building_name):
    building = get_building(building_id)
    if not building: return None
    building.building_name = building_id
    return db.session.commit()

def delete_building(building_id):
    building = get_building(building_id)
    if building:
        floors = get_floors_by_building(building_id) # Check if there are any floors in the building
        if floors:
            return False  # Building has floors, can't be deleted
        else:
            db.session.delete(building)
            db.session.commit()
            return True  # Building deleted successfully
    return False  # Building not found

