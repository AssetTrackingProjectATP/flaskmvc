from App.models import User
from App.database import db
from werkzeug.security import generate_password_hash

def create_user(email, username, password):
    newuser = User(email=email, username=username, password=password)
    db.session.add(newuser)
    db.session.commit()
    return newuser

def get_user_by_username(username):
    return User.query.filter_by(username=username).first()

def get_user_by_email(email):
    return User.query.filter_by(email=email).first()

def get_user(id):
    return User.query.get(id)

def get_all_users():
    return User.query.all()

def get_all_users_json():
    users = User.query.all()
    if not users:
        return []
    users = [user.get_json() for user in users]
    return users

def update_user(id, email, username, new_password=None):
    user = get_user(id)
    if user:
        user.email = email
        user.username = username
        if new_password:
            user.set_password(new_password)
        db.session.add(user)
        return db.session.commit()
    return None

def delete_user(id):
    user = get_user(id)
    if user:
        db.session.delete(user)
        db.session.commit()
        return True
    return False