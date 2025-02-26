from App.models import Floor
from App.database import db

def create_floor(floor_id, building_id, floor_name):
    new_floor = Floor(floor_id=floor_id, building_id=building_id, floor_name=floor_name)
    db.session.add(new_floor)
    db.session.commit()
    return new_floor

def get_floor(floor_id):
    return Floor.query.get(floor_id)

def get_floors_by_building(building_id):
    return Floor.query.filter_by(building_id=building_id).all()

def get_all_floors():
    return Floor.query.all()

def get_all_floors_json():
    floors=get_all_floors()
    if not floors: return None
    floors = [floor.get_json() for floor in floors]
    return floors

def update_floor(floor_id, building_id, floor_name):
    floor = get_floor(floor_id)
    if not floor: return None
    floor.building_id = building_id
    floor.floor_name = floor_name
    return db.session.commit()