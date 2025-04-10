from App.models import Assignee
from App import db
import re # Import regex for generating email

# Modify create_assignee slightly if needed based on model changes (already done in model's __init__)
def create_assignee(fname, lname, email=None, room_id=None):
    # Basic check for existing email if provided and unique constraint is enforced
    if email and Assignee.query.filter_by(email=email).first():
        print(f"Warning: Email {email} already exists. Cannot create duplicate.")
        return None # Or handle differently

    new_assignee = Assignee(fname=fname, lname=lname, email=email, room_id=room_id)
    try:
        db.session.add(new_assignee)
        db.session.commit()
        return new_assignee
    except Exception as e:
        db.session.rollback()
        print(f"Error creating assignee: {e}")
        return None

def get_assignee_by_id(assignee_id):
    # Ensure ID is an integer
    try:
        return Assignee.query.get(int(assignee_id))
    except (ValueError, TypeError):
        return None

def get_assignee_by_fname(fname):
    return Assignee.query.filter_by(fname=fname).all()

def get_assignee_by_lname(lname):
    return Assignee.query.filter_by(lname=lname).all()

def get_assignee_by_email(email):
     if not email: return None
     return Assignee.query.filter(db.func.lower(Assignee.email) == email.lower()).first()

def get_assignee_by_room_id(room_id):
    return Assignee.query.filter_by(room_id=room_id).all()

def get_all_assignees():
    return Assignee.query.all()

def get_all_assignees_json():
    assignees = Assignee.query.all()
    if not assignees:
        return []
    assignees = [assignee.get_json() for assignee in assignees]
    return assignees

def update_assignee(assignee_id, fname, lname, email, room_id):
    assignee = get_assignee_by_id(assignee_id)
    if assignee:
        assignee.fname = fname
        assignee.lname = lname
        assignee.email = email
        assignee.room_id = room_id
        try:
            db.session.commit()
            return assignee
        except Exception as e:
            db.session.rollback()
            print(f"Error updating assignee: {e}")
            return None
    return None

# NEW Function to get or create by name
def get_or_create_assignee_by_name(full_name):
    """
    Finds an assignee by full name (case-insensitive). If not found, creates a new one.
    Returns the assignee object or None if creation fails.
    """
    if not full_name or not full_name.strip():
        return None

    name_parts = full_name.strip().split(maxsplit=1)
    fname = name_parts[0]
    lname = name_parts[1] if len(name_parts) > 1 else None # Handle single names

    # Case-insensitive search
    existing_assignee = None
    if lname:
        existing_assignee = Assignee.query.filter(
            db.func.lower(Assignee.fname) == fname.lower(),
            db.func.lower(Assignee.lname) == lname.lower()
        ).first()
    else:
         existing_assignee = Assignee.query.filter(
            db.func.lower(Assignee.fname) == fname.lower(),
            Assignee.lname.is_(None) # Check for null lname explicitly
        ).first()


    if existing_assignee:
        return existing_assignee
    else:
        # Create a new one
        # Generate a placeholder email (optional, adjust as needed)
        safe_fname = re.sub(r'\W+', '', fname.lower())
        safe_lname = re.sub(r'\W+', '', lname.lower()) if lname else ''
        placeholder_email = f"{safe_fname}.{safe_lname}.placeholder@auto.generated" if lname else f"{safe_fname}.placeholder@auto.generated"

        # Ensure placeholder email is unique if needed (by adding number suffix)
        counter = 1
        temp_email = placeholder_email
        while get_assignee_by_email(temp_email):
             temp_email = f"{safe_fname}.{safe_lname}{counter}.placeholder@auto.generated" if lname else f"{safe_fname}{counter}.placeholder@auto.generated"
             counter += 1
        placeholder_email = temp_email


        print(f"Creating new assignee: {fname} {lname or ''} with email {placeholder_email}")
        # Create with room_id=None initially
        new_assignee = create_assignee(fname=fname, lname=lname, email=placeholder_email, room_id=None)
        return new_assignee