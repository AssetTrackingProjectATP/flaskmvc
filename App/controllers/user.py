from App.models import User
from App.database import db
from werkzeug.security import generate_password_hash

def create_user(email, username, password):
    # Check if email already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return None
        
    # Create new user
    new_user = User(email=email, username=username, password=password)
    
    try:
        db.session.add(new_user)
        db.session.commit()
        return new_user
    except Exception as e:
        db.session.rollback()
        print(f"Error creating user: {e}")
        return None

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
    try:
        # Convert id to integer if it's a string
        if isinstance(id, str) and id.isdigit():
            id = int(id)
            
        # Try to get the user directly by id
        user = User.query.get(id)
        
        # If that fails, try filter_by
        if not user:
            user = User.query.filter_by(id=id).first()
            
        if not user:
            return None
            
        # Update user information
        user.email = email
        user.username = username
        
        # Update password if provided
        if new_password:
            user.set_password(new_password)
            
        # Add the user and commit the changes
        db.session.add(user)
        db.session.commit()
        return True
    except Exception as e:
        # Rollback the session
        db.session.rollback()
        print(f"Error updating user: {e}")
        return None

def delete_user(id):
    try:
        user = get_user(id)
        if user:
            db.session.delete(user)
            db.session.commit()
            return True
        return False
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting user: {e}")
        return False