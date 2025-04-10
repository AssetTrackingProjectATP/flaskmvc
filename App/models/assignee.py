from App.database import db

class Assignee(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fname = db.Column(db.String(50), nullable=False)
    lname = db.Column(db.String(50), nullable=True) # Allow lname to be nullable if name is single word
    email = db.Column(db.String(100), nullable=True, unique=True) # Make email nullable, maybe add logic later
    room_id = db.Column(db.Integer, db.ForeignKey('room.room_id'), nullable=True) # Make nullable

    room = db.relationship('Room', backref=db.backref('assignees', lazy=True))

    # Updated __init__ to accept room_id=None and handle single names
    def __init__(self, fname, lname=None, email=None, room_id=None):
        self.fname = fname
        self.lname = lname
        self.email = email
        self.room_id = room_id

    def get_json(self):
        return {
            'id': self.id,
            'fname': self.fname,
            'lname': self.lname,
            'email': self.email,
            'room_id': self.room_id
        }

    def __repr__(self):
        return f'<Assignee {self.fname} {self.lname}, Room ID: {self.room_id}>'

    def __str__(self):
        return f'{self.fname} {self.lname}' if self.lname else self.fname