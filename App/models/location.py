from App.database import db

class Location(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    room_name = db.Column(db.String(30), nullable=False)
    building_name = db.Column(db.String(30), nullable=False)

    #this allows same names of rooms to be used in different buildings, for example
    #Building 1 room 1, Building 2 room 2 is allowed but not Building 1 room 1, Building 1 room 1
    __table_args__ = (db.UniqueConstraint('room_name', 'building_name', name='uq_room_building'),)

    def __init__(self, room_name, building_name):
        self.room_name = room_name
        self.building_name = building_name

    def get_json(self):
        return{
            'id': self.id,
            'room': self.room_name,
            'building': self.building_name

        }