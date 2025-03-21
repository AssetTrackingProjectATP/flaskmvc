import os, tempfile, pytest, logging, unittest
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime
from App.models import Assignee, AssetAssignment, Building, Floor, Room, Asset, ScanEvent
from App.controllers import (
    create_building, get_building, 
    create_floor, get_floor,
    create_room, get_room, 
)
from App.controllers.asset import(
    get_asset, get_all_assets,
    get_all_assets_json, get_all_assets_by_room_id,
    add_asset, set_last_located,set_status
)
from App.controllers.scanevent import(
    add_scan_event, get_all_scans,
    get_scan_event, get_scans_by_status,
    get_scans_by_last_update, get_scans_by_changelog
)
from App.main import create_app
from App.database import db, create_db
from App.models import User
from App.controllers import (
    create_user,
    get_all_users_json,
    login,
    get_user,
    get_user_by_username,
    update_user
)
from App.controllers.assignee import create_assignee, get_assignee_by_id, update_assignee
from App.controllers.assetassignment import (
    create_asset_assignment, get_asset_assignment_by_id,
    update_asset_assignment, delete_asset_assignment
)

LOGGER = logging.getLogger(__name__)

'''
   Unit Tests
'''
class UserUnitTests(unittest.TestCase):

    def test_new_user(self):
        user = User( "bob@gmail.com", "bob", "bobpass")
        self.assertEqual(user.id, None)
        self.assertEqual(user.username, "bob")
        #assert user.email == "bob@gmail.com"
        self.assertEqual(user.email, "bob@gmail.com")
       # self.assertEqual(user.password, "bobpass")
        

    # pure function no side effects or integrations called
    def test_get_json(self):
        user = User( "bob@gmail.com", "bob", "bobpass")
        user_json = user.get_json()
        self.assertDictEqual(user_json, {"id":None, "email":"bob@gmail.com", "username":"bob" })
    
    def test_hashed_password(self):
        password = "mypass"
        hashed = generate_password_hash(password, method='sha256')
        user = User("bob@gmail.com", "bob", password)
        assert user.password != password

    def test_check_password(self):
        password = "mypass"
        user = User("bob@gmail.com", "bob", password)
        assert user.check_password(password)

class BuildingUnitTests(unittest.TestCase):

    def test_new_building(self):
        building = Building("B1", "Main Building")
        self.assertEqual(building.building_id, "B1")
        self.assertEqual(building.building_name, "Main Building")


    def test_building_get_json(self):
        building = Building("B2", "Main Building")
        expected_json = {
            'building_id': "B2",
            'building_name': "Main Building"
        }
        self.assertDictEqual(building.get_json(), expected_json)

class FloorUnitTests(unittest.TestCase):

    def test_new_floor(self):
        floor = Floor("F1", "B1", "First Floor")
        self.assertEqual(floor.floor_id, "F1")
        self.assertEqual(floor.building_id, "B1")
        self.assertEqual(floor.floor_name, "First Floor")

    def test_floor_get_json(self):
        floor = Floor("F2", "B1", "Second Floor")
        expected_json = {
            'floor_id': "F2",
            'building_id': "B1",
            'floor_name': "Second Floor"
        }
        self.assertDictEqual(floor.get_json(), expected_json)

class RoomUnitTests(unittest.TestCase):

    def test_new_room(self):
        room = Room("R1", "F1", "Asset Room: 101")
        self.assertEqual(room.room_id, "R1")
        self.assertEqual(room.floor_id, "F1")
        self.assertEqual(room.room_name, "Asset Room: 101")

    def test_room_get_json(self):
        room = Room("R2", "F1", "Asset Room: 102")
        expected_json = {
            'room_id': "R2",
            'floor_id': "F1",
            'room_name': "Asset Room: 102"
        }
        self.assertDictEqual(room.get_json(), expected_json)

class AssigneeUnitTests(unittest.TestCase):

    def test_new_assignee(self):
        a = Assignee("Alice", "Smith", "alice@example.com", room_id="R1")
        self.assertEqual(a.fname, "Alice")
        self.assertEqual(a.lname, "Smith")
        self.assertEqual(a.email, "alice@example.com")
        self.assertEqual(a.room_id, "R1")

    def test_get_json(self):
        a = Assignee("Alice", "Smith", "alice@example.com", room_id="R1")
        expected = {
            'id': None,
            'fname': "Alice",
            'lname': "Smith",
            'email': "alice@example.com",
            'room_id': "R1"
        }
        self.assertEqual(a.get_json(), expected)

class AssetAssignmentUnitTests(unittest.TestCase):

    def test_new_asset_assignment(self):
        aa = AssetAssignment(
            "AA1", "asset1", "assigned1", "F1",
            assignment_date="2025-03-07 12:00:00", return_date="2025-03-08 12:00:00"
        )
        self.assertEqual(aa.assignment_id, "AA1")
        self.assertEqual(aa.asset_id, "asset1")
        self.assertEqual(aa.assigned_to_assignee_id, "assigned1")
        self.assertEqual(aa.floor_id, "F1")
        self.assertEqual(aa.assignment_date, "2025-03-07 12:00:00")
        self.assertEqual(aa.return_date, "2025-03-08 12:00:00")

    def test_get_json(self):
        aa = AssetAssignment(
            "AA1", "asset1", "assigned1", "1st Floor",
            assignment_date="2025-03-07 12:00:00", return_date="2025-03-08 12:00:00"
        )
        expected = {
            'assignment_id': "AA1",
            'asset_id': "asset1",
            'assigned_to_assignee_id': "assigned1",
            'floor_id': "1st Floor",
            'assignment_date': "2025-03-07 12:00:00",
            'return_date': "2025-03-08 12:00:00"
        }
        self.assertEqual(aa.get_json(), expected)

class AssetUnitTests(unittest.TestCase):
    def test_new_asset(self):
        asset = Asset("01", "laptop", "ISP 300", "DELL", "8300164", "R2", "R2", "01", "30-01-2025", "Recently bought", "Good")
        self.assertEqual(asset.id, "01")
        self.assertEqual(asset.description, "laptop")
        self.assertEqual(asset.model, "ISP 300")
        self.assertEqual(asset.brand, "DELL")
        self.assertEqual(asset.serial_number, "8300164")
        self.assertEqual(asset.room_id, "R2")
        self.assertEqual(asset.last_located, "R2")
        self.assertEqual(asset.assignee_id, "01")
        self.assertEqual(asset.last_update, "30-01-2025")
        self.assertEqual(asset.notes, "Recently bought")
        self.assertEqual(asset.status, "Good")
        
    def test_get_json(self):
        asset = Asset("01", "laptop", "ISP 300", "DELL", "8300164", "R2", "R2", "01", "30-01-2025", "Recently bought", "Good")
        expected_json = {
            'id': "01",
            'description': "laptop",
            'model': "ISP 300",
            'brand': "DELL",
            'serial_number': "8300164",
            'room_id': "R2",
            'last_located': "R2",
            'assignee_id': "01",
            'last_update': "30-01-2025",
            'notes': "Recently bought",
            'status': "Good"
        }
        self.assertDictEqual(asset.get_json(), expected_json)
        
class ScanEventUnitTest(unittest.TestCase):
    def test_new_scanevent(self):
        scanevent = ScanEvent("01", "01", "01", "01", "30-12-2024", "Good", "scanned successfully", "15-09-2024", "Original owner")
        self.assertEqual(scanevent.asset_id, "01")
        self.assertEqual(scanevent.user_id, "01")
        self.assertEqual(scanevent.room_id, "01")
        self.assertEqual(scanevent.scan_time, "30-12-2024")
        self.assertEqual(scanevent.status, "Good")
        self.assertEqual(scanevent.notes, "scanned successfully")
        self.assertEqual(scanevent.last_update, "15-09-2024")
        self.assertEqual(scanevent.changeLog, "Original owner")
        
    def test_get_json(self):
        scanevent = ScanEvent("01", "02", "03", "04", "30-12-2024", "Good", "scanned successfully", "15-09-2024", "Original owner")
        expected_json = {
            'scan_id: ': "01",
            'asset_id: ': "02",
            'user_id: ': "03",
            'room_id: ': "04",
            'scan_time: ': "30-12-2024",
            'status: ': "Good",
            'notes: ': "scanned successfully",
            'last_update: ': "15-09-2024",
            'change log: ': "Original owner"
        }
        self.assertDictEqual(scanevent.get_json(), expected_json)
        
        
        
'''
    Integration Tests
'''

# This fixture creates an empty database for the test and deletes it after the test
# scope="class" would execute the fixture once and resued for all methods in the class
@pytest.fixture(autouse=True, scope="module")
def empty_db():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite:///test.db'})
    create_db()
    yield app.test_client()
    db.drop_all()


def test_authenticate():
    user = create_user("bob@gmail.com", "bob", "bobpass")
    assert login("bob@gmail.com", "bobpass") != None

class UsersIntegrationTests(unittest.TestCase):

    def test_create_user(self):
        user = create_user("rick@gmail.com", "rick", "bobpass")
        assert user.email == "rick@gmail.com"

    def test_get_all_users_json(self):
        users_json = get_all_users_json()
        self.assertListEqual([{"id":1, "email":"bob@gmail.com", "username":"bob"}, {"id":2, "email":"rick@gmail.com", "username":"rick"}], users_json)

    # Tests data changes in the database
    def test_update_user(self):
        update_user(1, "ronnie@gmail.com", "ronnie")
        user = get_user(1)
        assert user.username == "ronnie"
        
class BuildingIntegrationTests (unittest.TestCase):

    def test_create_building(self):
        building = create_building("B3", "Third building")
        self.assertEqual(building.building_name, "Third building")

    def test_get_building(self):
        create_building("B1", "Main Building")
        building = get_building("B1")  
        self.assertIsNotNone(building)
        self.assertEqual(building.building_name, "Main Building")

class FloorIntegrationTests(unittest.TestCase):

    def test_create_floor(self):
        floor = create_floor("F3", "B3", "Third Floor")
        self.assertEqual(floor.floor_name, "Third Floor")

    def test_get_floor(self):
        create_floor("F4", "B3", "Fourth Floor")
        floor = get_floor("F4")
        self.assertIsNotNone(floor)
        self.assertEqual(floor.floor_name, "Fourth Floor")

class RoomIntegrationTests(unittest.TestCase):

    def test_create_room(self):
        room = create_room("R3", "F3", "Asset Room: 103")
        self.assertEqual(room.room_name, "Asset Room: 103")

    def test_get_room(self):
        create_room("R4", "F3", "Asset Room: 104")
        room = get_room("R4")
        self.assertIsNotNone(room)
        self.assertEqual(room.room_name, "Asset Room: 104")

class AssigneeIntegrationTests(unittest.TestCase):

    def test_create_assignee(self):
        assignee = create_assignee("Alice", "Smith", "alice@example.com", "R1")
        self.assertEqual(assignee.email, "alice@example.com")

    def test_update_assignee(self):
        assignee = create_assignee("Bob", "Jones", "bob@example.com", "R2")
        updated = update_assignee(assignee.id, "Robert", "Jones", "bob@example.com", "R3")
        self.assertEqual(updated.fname, "Robert")
        self.assertEqual(updated.room_id, "R3")

class AssetAssignmentIntegrationTests(unittest.TestCase):
    def test_create_asset_assignment(self):
        aa = create_asset_assignment("AA1", "asset1", "assigned1", "F1")
        self.assertEqual(aa.assignment_id, "AA1")
        self.assertIsNotNone(aa.assignment_date)  
        
    def test_update_asset_assignment(self):
        create_asset_assignment(
            "AA2", "asset2", "assigned2", "F1",
            assignment_date="2025-03-07 12:00:00", return_date="2025-03-08 12:00:00"
        )
        updated = update_asset_assignment("AA2", asset_id="asset3", return_date="2025-03-09 12:00:00")
        self.assertEqual(updated.asset_id, "asset3")
        self.assertEqual(updated.return_date, "2025-03-09 12:00:00")

    def test_delete_asset_assignment(self):
        create_asset_assignment("AA3", "asset3", "assigned3", "F1")
        result = delete_asset_assignment("AA3")
        self.assertTrue(result)
        aa = get_asset_assignment_by_id("AA3")
        self.assertIsNone(aa)
