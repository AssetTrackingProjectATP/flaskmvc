from App.models import Room, Floor, Building
from App.controllers.asset import *
from App.controllers.building import *
from App.controllers.floor import *
from App.database import db
import os, csv

def create_room(room_id, floor_id, room_name):
    new_room = Room(room_id=room_id, floor_id=floor_id, room_name=room_name)
    db.session.add(new_room)
    db.session.commit()
    return new_room

def get_room(room_id):
    return Room.query.get(room_id)

def get_rooms_by_floor(floor_id):
    return Room.query.filter_by(floor_id=floor_id)

def get_all_rooms():
    return Room.query.all()

def get_all_rooms_json():
    rooms=get_all_rooms()
    if not rooms: return None
    rooms = [room.get_json() for room in rooms]
    return rooms

def update_room(room_id, floor_id, room_name):
    room = get_room(room_id)
    if not room: 
        return None
    
    room.floor_id = floor_id
    room.room_name = room_name
    
    try:
        db.session.commit()  # ADD THIS
        return room  # Return the room to indicate success
    except Exception as e:
        db.session.rollback()
        print(f"Error updating room: {e}")
        return None

def delete_room(room_id):
    room = get_room(room_id)
    if room:
        assets = get_all_assets_by_room_id(room_id) # Check if there are any assets in the room
        if assets:
            return False  # Room is not empty, can't be deleted
        else:
            db.session.delete(room)
            db.session.commit()
            return True  # Room deleted successfully
    return False  # Room not found

# def upload_csv(file_path):
#     with open(file_path, 'r', encoding='utf-8-sig') as file:
#      reader = csv.DictReader(file)
#      for row in reader:
     
#         row = {key.strip(): value for key, value in row.items()}
            
#             # Access and assign values to variables
#         new_building_id = row['Building ID']
#         new_building_name = row['Building Name']
#         new_floor_id = row["Floor ID"]
#         new_floor_name = row["Floor Name"]
#         new_room_id = row["Room ID"]
#         new_room_name = row["Room Name"]
        
#         existing_building = Building.query.filter_by(building_id=new_building_id).first()
#         existing_floor = Floor.query.filter_by(floor_id=new_floor_id).first()
#         existing_room = Room.query.filter_by(room_id=new_room_id).first()
#         #if existing_room: