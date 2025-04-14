from App.models import Room, Floor, Building
from App.controllers.asset import *
from App.controllers.building import *
from App.controllers.floor import *
from App.database import db
import os, csv, io
from flask import request, jsonify

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
    return Room.query.filter(Room.room_id != "UNKNOWN").all()

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
def upload_locations_csv():
    if 'csvFile' not in request.files:
        return jsonify({'success': False, 'message': 'No file part'}), 400
    
    file = request.files['csvFile']
    
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No selected file'}), 400
    
    if file and file.filename.endswith('.csv'):
        try:
            # Read CSV file
            stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
            csv_reader = csv.DictReader(stream)
            
            # Initialize counters and error collection
            buildings_created = 0
            floors_created = 0
            rooms_created = 0
            skipped_rows = 0
            errors = []
            
            # Track which entities we've already processed to avoid duplicates
            processed_buildings = {}  # Dict of id -> building object
            processed_floors = {}  # Dict of id -> floor object
            processed_rooms = {}  # Dict of id -> room object
            
            for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 to account for header row
                try:
                    # Extract data with defaults for missing values
                    building_id = row.get('building_id', '').strip()
                    building_name = row.get('building_name', '').strip()
                    floor_id = row.get('floor_id', '').strip()
                    floor_name = row.get('floor_name', '').strip()
                    room_id = row.get('room_id', '').strip()
                    room_name = row.get('room_name', '').strip()
                    
                    # Skip empty rows
                    if not building_name:
                        errors.append(f"Row {row_num}: Missing building name (required)")
                        skipped_rows += 1
                        continue
                    
                    # BUILDING HANDLING
                    current_building = None
                    
                    # If building_id provided, check if it exists
                    if building_id:
                        existing_building = get_building(building_id)
                        if existing_building:
                            # Building exists with this ID
                            current_building = existing_building
                            
                            # Verify the building name matches
                            if existing_building.building_name != building_name:
                                errors.append(f"Row {row_num}: Building ID {building_id} exists but with name '{existing_building.building_name}' (not '{building_name}')")
                                skipped_rows += 1
                                continue
                        else:
                            # Building ID provided but doesn't exist, create it
                            current_building = create_building(building_id, building_name)
                            buildings_created += 1
                    else:
                        # No building_id provided, check if a building with this name exists
                        buildings = get_all_building_json()
                        existing_building = next((b for b in buildings if b['building_name'].lower() == building_name.lower()), None)
                        
                        if existing_building:
                            # Building exists with this name
                            current_building = get_building(existing_building['building_id'])
                        else:
                            # Generate a unique building ID
                            new_building_id = f"B{datetime.now().strftime('%Y%m%d%H%M%S')}"
                            current_building = create_building(new_building_id, building_name)
                            buildings_created += 1
                    
                    # Store the building for reference
                    processed_buildings[current_building.building_id] = current_building
                    
                    # If we don't have floor information, we're done with this row
                    if not floor_name:
                        continue
                    
                    # FLOOR HANDLING
                    current_floor = None
                    
                    # If floor_id provided, check if it exists
                    if floor_id:
                        existing_floor = get_floor(floor_id)
                        if existing_floor:
                            # Floor exists with this ID
                            current_floor = existing_floor
                            
                            # Verify the floor belongs to the right building
                            if existing_floor.building_id != current_building.building_id:
                                errors.append(f"Row {row_num}: Floor ID {floor_id} exists but belongs to building {existing_floor.building_id} (not {current_building.building_id})")
                                skipped_rows += 1
                                continue
                                
                            # Verify the floor name matches
                            if existing_floor.floor_name != floor_name:
                                errors.append(f"Row {row_num}: Floor ID {floor_id} exists but with name '{existing_floor.floor_name}' (not '{floor_name}')")
                                skipped_rows += 1
                                continue
                        else:
                            # Floor ID provided but doesn't exist, create it
                            current_floor = create_floor(floor_id, current_building.building_id, floor_name)
                            floors_created += 1
                    else:
                        # No floor_id provided, check if a floor with this name exists in the building
                        floors = get_floors_by_building(current_building.building_id)
                        existing_floor = next((f for f in floors if f.floor_name.lower() == floor_name.lower()), None)
                        
                        if existing_floor:
                            # Floor exists with this name in this building
                            current_floor = existing_floor
                        else:
                            # Generate a unique floor ID
                            new_floor_id = f"F{datetime.now().strftime('%Y%m%d%H%M%S')}"
                            current_floor = create_floor(new_floor_id, current_building.building_id, floor_name)
                            floors_created += 1
                    
                    # Store the floor for reference
                    processed_floors[current_floor.floor_id] = current_floor
                    
                    # If we don't have room information, we're done with this row
                    if not room_name:
                        continue
                    
                    # ROOM HANDLING
                    current_room = None
                    
                    # If room_id provided, check if it exists
                    if room_id:
                        existing_room = get_room(room_id)
                        if existing_room:
                            # Room exists with this ID
                            current_room = existing_room
                            
                            # Verify the room belongs to the right floor
                            if existing_room.floor_id != current_floor.floor_id:
                                errors.append(f"Row {row_num}: Room ID {room_id} exists but belongs to floor {existing_room.floor_id} (not {current_floor.floor_id})")
                                skipped_rows += 1
                                continue
                                
                            # Verify the room name matches
                            if existing_room.room_name != room_name:
                                errors.append(f"Row {row_num}: Room ID {room_id} exists but with name '{existing_room.room_name}' (not '{room_name}')")
                                skipped_rows += 1
                                continue
                        else:
                            # Room ID provided but doesn't exist, create it
                            current_room = create_room(room_id, current_floor.floor_id, room_name)
                            rooms_created += 1
                    else:
                        # No room_id provided, check if a room with this name exists in the floor
                        rooms = get_rooms_by_floor(current_floor.floor_id)
                        existing_room = next((r for r in rooms if r.room_name.lower() == room_name.lower()), None)
                        
                        if existing_room:
                            # Room exists with this name in this floor
                            current_room = existing_room
                        else:
                            # Generate a unique room ID
                            new_room_id = f"R{datetime.now().strftime('%Y%m%d%H%M%S')}"
                            current_room = create_room(new_room_id, current_floor.floor_id, room_name)
                            rooms_created += 1
                    
                    # Store the room for reference
                    processed_rooms[current_room.room_id] = current_room
                    
                except Exception as e:
                    errors.append(f"Row {row_num}: Error - {str(e)}")
                    skipped_rows += 1
            
            # Construct response
            response_data = {
                'success': buildings_created > 0 or floors_created > 0 or rooms_created > 0,
                'message': f'Successfully imported {buildings_created} buildings, {floors_created} floors, and {rooms_created} rooms. {skipped_rows} rows skipped.',
                'buildings_created': buildings_created,
                'floors_created': floors_created,
                'rooms_created': rooms_created,
                'skipped_rows': skipped_rows,
                'errors': errors[:10]  # Limit number of errors returned to avoid huge responses
            }
            
            if errors and len(errors) > 10:
                response_data['message'] += f" Showing first 10 of {len(errors)} errors."
            
            return jsonify(response_data)
            
        except Exception as e:
            return jsonify({'success': False, 'message': f'Error processing CSV: {str(e)}'}), 500
    else:
        return jsonify({'success': False, 'message': 'File must be a CSV'}), 400