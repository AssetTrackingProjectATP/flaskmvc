from .user import create_user
from App.controllers.asset import *
from App.controllers.assetassignment import *
from App.controllers.assignee import *
from App.controllers.building import *
from App.controllers.floor import *
from App.controllers.provider import *
from App.controllers.room import *
from App.controllers.scanevent import *
from datetime import datetime
from App.database import db
from sqlalchemy import inspect



def initialize():
    db.drop_all()
    db.create_all()
    create_user('bob@gmail.com','bob marley', 'bobpass')
    

    # add_asset( 1, "Laptop", "ThinkPad X1", "Lenovo", "SN12345", 1, 1, 1, datetime.now(), "Good condition")
    # add_asset(2, "Projector", "Epson X300", "Epson", "SN67890", 2, 2, 2, datetime.now(), "Mounted on ceiling")

    print("Assets created.")

    # Sample data for assetassignments
    # create_asset_assignment(1, 1, 1, 1, datetime.now(), None)
    # create_asset_assignment(2, 2, 2, 2, datetime.now(), None)
    print("Asset assignments created.")

    # Sample data for buildings
    create_building(1, "Main Building")
    create_building(2, "Annex Building")
    print("Buildings created.")

    # Sample data for floors
    create_floor(1, 1, "1st Floor")
    create_floor(2, 2, "2nd Floor")
    print("Floors created.")
    

    # Sample data for providers
    create_provider(1, "Tech Supplies Ltd", "jerrysmith@techsupplies.com")
    create_provider(2, "Office Esstenials Inc", "support@officeessentials.com")
    print("Providers created.")

    # Sample data for rooms
    create_room(1, 1, "Asset Room: 101")
    create_room(2, 2, "Asset Room: 201")
    print("Rooms created.")

    #Sample data for scan events
    # add_scan_event(1, 1, datetime.now(), "Checked In", "Routine check")
    # add_scan_event(2, 2, datetime.now(), "Checked Out", "For external use")
    # print("Scan events created.")

    # Sample data for assignees
    create_assignee( "John", "Doe", "john.doe@mail.com",1)
    create_assignee( "Jane", "Smith", "jane.smith@mail.com",2)
    print("Assignees created.")

    print("Sample data succesful.")

def ensure_defaults():
    """
    Ensures default data exists without wiping existing data.
    This is safe to run in production.
    """
    inspector = inspect(db.engine)
    
    if not (inspector.has_table('building') and 
        inspector.has_table('floor') and 
        inspector.has_table('room') and 
        inspector.has_table('user')):
        # Tables don't exist yet, so don't try to add defaults
        return
    
    # Create default building if it doesn't exist
    default_building_id = "DEFAULT"
    default_building = get_building(default_building_id)
    if not default_building:
        default_building = create_building(default_building_id, "Default Building")
        print(f"Created default building: {default_building_id}")
    
    # Create default floor if it doesn't exist
    default_floor_id = "DEFAULT"
    default_floor = get_floor(default_floor_id)
    if not default_floor:
        default_floor = create_floor(default_floor_id, default_building_id, "Default Floor")
        print(f"Created default floor: {default_floor_id}")
    
    # Create unknown room if it doesn't exist
    unknown_room_id = "UNKNOWN"
    unknown_room = get_room(unknown_room_id)
    if not unknown_room:
        unknown_room = create_room(unknown_room_id, default_floor_id, "Unknown Room")
        print(f"Created unknown room: {unknown_room_id}")
    
    return {
        "building": default_building,
        "floor": default_floor, 
        "room": unknown_room
    }