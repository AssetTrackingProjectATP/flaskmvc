import os, tempfile, pytest, logging, unittest
from unittest.mock import patch, MagicMock
from datetime import datetime
from werkzeug.security import check_password_hash, generate_password_hash

from App.main import create_app
from App.database import db, create_db
from App.models import User
from App.models import Asset
from App.controllers import (
    create_user,
    get_all_users_json,
    login,
    get_user,
    get_user_by_username,
    update_user,
     get_asset, get_all_assets, get_all_assets_by_room_id,
    get_all_assets_json, get_all_assets_by_room_json, add_asset
)


LOGGER = logging.getLogger(__name__)

'''
   Unit Tests
'''
class UserUnitTests(unittest.TestCase):

    def test_new_user(self):
        user = User("bob", "bobpass")
        assert user.email == "bob"

    # pure function no side effects or integrations called
    def test_get_json(self):
        user = User("bob", "bobpass")
        user_json = user.get_json()
        self.assertDictEqual(user_json, {"id":None, "username":"bob"})
    
    def test_hashed_password(self):
        password = "mypass"
        hashed = generate_password_hash(password, method='sha256')
        user = User("bob", password)
        assert user.password != password

    def test_check_password(self):
        password = "mypass"
        user = User("bob", password)
        assert user.check_password(password)

       
class AssetControllerTest(unittest.TestCase):

    def build(self):
        db.create_all()
        
        self.test_asset1 = Asset(
            id="A001",
            description="Test Asset 1",
            model="Model X",
            brand="BrandA",
            serial_number="SN12345",
            room_id="R001",
            assignee_id="U001",
            last_update=datetime.now(),
            notes="Test notes",
            status="active"
        )
        
        self.test_asset2 = Asset(
            id="A002",
            description="Test Asset 2",
            model="Model Y",
            brand="BrandB",
            serial_number="SN67890",
            room_id="R001",
            assignee_id="U002",
            last_update=datetime.now(),
            notes="Test notes 2",
            status="inactive"
        )
        
        self.test_asset3 = Asset(
            id="A003",
            description="Test Asset 3",
            model="Model Z",
            brand="BrandC",
            serial_number="SN11111",
            room_id="R002",
            assignee_id="U001",
            last_update=datetime.now(),
            notes="Test notes 3",
            status="active"
        )
    
    def destroy(self):
        # Clean up after each test
        db.session.remove()
        db.drop_all()
    
    # Tests for get_asset
    def test_get_asset_success(self):
        # Add asset to test db
        db.session.add(self.test_asset1)
        db.session.commit()
        
        # Test retrieving the asset
        asset = get_asset("A001")
        self.assertIsNotNone(asset)
        self.assertEqual(asset.id, "A001")
        self.assertEqual(asset.description, "Test Asset 1")
    
    def test_get_asset_not_found(self):
        # Test retrieving non-existent asset
        asset = get_asset("nonexistent")
        self.assertIsNone(asset)
    
    # Tests for get_all_assets
    def test_get_all_assets_empty(self):
        # Test with empty database
        assets = get_all_assets()
        self.assertEqual(len(assets), 0)
    
    def test_get_all_assets(self):
        # Add assets to test db
        db.session.add(self.test_asset1)
        db.session.add(self.test_asset2)
        db.session.add(self.test_asset3)
        db.session.commit()
        
        # Test retrieving all assets
        assets = get_all_assets()
        self.assertEqual(len(assets), 3)
    
    # Tests for get_all_assets_by_room_id
    def test_get_all_assets_by_room_id(self):
        # Add assets to test db
        db.session.add(self.test_asset1)
        db.session.add(self.test_asset2)
        db.session.add(self.test_asset3)
        db.session.commit()
        
        # Test retrieving assets by room
        assets = get_all_assets_by_room_id("R001")
        self.assertEqual(len(assets), 2)
        self.assertEqual(assets[0].room_id, "R001")
        self.assertEqual(assets[1].room_id, "R001")
    
    def test_get_all_assets_by_room_id_empty(self):
        # Test with no matching room
        assets = get_all_assets_by_room_id("nonexistent")
        self.assertEqual(len(assets), 0)
    
    # Tests for get_all_assets_json
    def test_get_all_assets_json_empty(self):
        # Test with empty database
        assets_json = get_all_assets_json()
        self.assertEqual(assets_json, [])
    
    def test_get_all_assets_json(self):
        # Setup mock assets with get_json method
        mock_asset1 = MagicMock()
        mock_asset1.get_json.return_value = {"id": "A001", "description": "Test Asset 1"}
        
        mock_asset2 = MagicMock()
        mock_asset2.get_json.return_value = {"id": "A002", "description": "Test Asset 2"}
        
        # Mock get_all_assets to return our mock assets
        with patch('your_module.get_all_assets', return_value=[mock_asset1, mock_asset2]):
            assets_json = get_all_assets_json()
            self.assertEqual(len(assets_json), 2)
            self.assertEqual(assets_json[0]["id"], "A001")
            self.assertEqual(assets_json[1]["id"], "A002")
    
    # Tests for get_all_assets_by_room_json
    def test_get_all_assets_by_room_json_empty(self):
        # Test with no matching room
        with patch('your_module.get_all_assets_by_room_id', return_value=[]):
            assets_json = get_all_assets_by_room_json("nonexistent")
            self.assertEqual(assets_json, [])
    
    def test_get_all_assets_by_room_json(self):
        # Setup mock assets with get_json method
        mock_asset1 = MagicMock()
        mock_asset1.get_json.return_value = {"id": "A001", "room_id": "R001"}
        
        mock_asset2 = MagicMock()
        mock_asset2.get_json.return_value = {"id": "A002", "room_id": "R001"}
        
        # Mock get_all_assets_by_room_id to return our mock assets
        with patch('your_module.get_all_assets_by_room_id', return_value=[mock_asset1, mock_asset2]):
            assets_json = get_all_assets_by_room_json("R001")
            self.assertEqual(len(assets_json), 2)
            self.assertEqual(assets_json[0]["room_id"], "R001")
            self.assertEqual(assets_json[1]["room_id"], "R001")
    
    # Tests for add_asset
    def test_add_asset_success(self):
        # Test successful asset addition
        today = datetime.now()
        
        new_asset = add_asset(
            id="A004",
            description="New Test Asset",
            model="Model New",
            brand="BrandNew",
            serial_number="SN99999",
            room_id="R003",
            assignee_id="U003",
            last_update=today,
            notes="New asset notes",
            status="active"
        )
        
        self.assertIsNotNone(new_asset)
        self.assertEqual(new_asset.id, "A004")
        self.assertEqual(new_asset.description, "New Test Asset")
        
        # Verify it was added to the database
        asset_from_db = get_asset("A004")
        self.assertIsNotNone(asset_from_db)
        self.assertEqual(asset_from_db.id, "A004")
    
    def test_add_asset_failure(self):
        # Test adding an asset with error (duplicate key for example)
        # First add an asset
        db.session.add(self.test_asset1)
        db.session.commit()
        
        # Try to add another asset with the same ID (should fail)
        duplicate_asset = add_asset(
            id="A001",  # Same ID as test_asset1
            description="Duplicate Asset",
            model="Model Dup",
            brand="BrandDup",
            serial_number="SN-DUP",
            room_id="R001",
            assignee_id="U001",
            last_update=datetime.now(),
            notes="Duplicate notes",
            status="active"
        )
        
        self.assertIsNone(duplicate_asset)
        
        # Verify the original asset is still there and unchanged
        asset_from_db = get_asset("A001")
        self.assertEqual(asset_from_db.description, "Test Asset 1")

if __name__ == '__main__':
    unittest.main()
        

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
    user = create_user("bob", "bobpass")
    assert login("bob", "bobpass") != None

class UsersIntegrationTests(unittest.TestCase):

    def test_create_user(self):
        user = create_user("rick", "bobpass")
        assert user.email == "rick"

    def test_get_all_users_json(self):
        users_json = get_all_users_json()
        self.assertListEqual([{"id":1, "username":"bob"}, {"id":2, "username":"rick"}], users_json)

    # Tests data changes in the database
    def test_update_user(self):
        update_user(1, "ronnie")
        user = get_user(1)
        assert user.username == "ronnie"
        

