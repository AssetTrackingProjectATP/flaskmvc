import click, pytest, sys
from flask import Flask
from flask.cli import with_appcontext, AppGroup

from App.database import db, get_migrate
from App.models import *
from App.controllers.asset import *
from App.controllers.assignee import *
from App.controllers.history import *
from App.controllers.location import *
from App.controllers.user import * 
from App.views import *
from App.main import create_app
from App.controllers import ( create_user, get_all_users_json, get_all_users, initialize )


# This commands file allow you to create convenient CLI commands for testing controllers

app = create_app()
migrate = get_migrate(app)

# This command creates and initializes the database
@app.cli.command("init", help="Creates and initializes the database")
def init():
    initialize()
    print('database intialized')
    
    #create assets
    
    add_asset('','Laptop', 'ICT Equipment', 'F2', 'Jane', 'Doe', '12/12/2022', '7634-2734', 'Condition Updated')
    add_asset( '', 'Printer', 'ICT Equipment', 'F1', 'Long', 'NameMcgee', '07/07/2023', '5264-3386', 'Location Updated')
    add_asset('', 'Office Chair', 'Furniture', 'F3', 'Sam', 'Sung', '08/07/2023', '8844-3663', 'Owner Updated')
    
    
    
'''
User Commands
'''

# Commands can be organized using groups

# create a group, it would be the first argument of the comand
# eg : flask user <command>
user_cli = AppGroup('user', help='User object commands') 

# Then define the command and any parameters and annotate it with the group (@)
@user_cli.command("create", help="Creates a user")
@click.argument("username", default="rob")
@click.argument("password", default="robpass")
def create_user_command(username, password):
    create_user(username, password)
    print(f'{username} created!')

# this command will be : flask user create bob bobpass

@user_cli.command("list", help="Lists users in the database")
@click.argument("format", default="string")
def list_user_command(format):
    if format == 'string':
        print(get_all_users())
    else:
        print(get_all_users_json())

app.cli.add_command(user_cli) # add the group to the cli

#flask assets list
asset_cli = AppGroup('asset', help='Asset object commands')

@asset_cli.command("list", help="Lists users in the database")
@click.argument("format", default="string")
def list_user_command(format):
    if format == 'string':
        print(get_all_assets())
    else:
        print(get_all_assets_json())
        
#flask asset add
@asset_cli.command("add", help="Add an asset object to the database")
@click.argument("name", default="Miscellaneous")
@click.argument("item_class", default="Unknown")
@click.argument("location_id", default = "1")
@click.argument("assignee_id", default="1")
@click.argument("last_update", default="01/01/2000")
@click.argument("serial_number", default="00000000")
@click.argument("change_log", default="")

def add_asset_command(name,item_class,location_id,assignee_id,last_update,serial_number,change_log):
    asset = add_asset(name,item_class,location_id,assignee_id,last_update,serial_number,change_log)
    if asset is None:
        print('Error creating asset')
    else:
        print(f'{asset} created!')

app.cli.add_command(asset_cli) # add the group to the cli

'''
Test Commands
'''

test = AppGroup('test', help='Testing commands') 

@test.command("user", help="Run User tests")
@click.argument("type", default="all")
def user_tests_command(type):
    if type == "unit":
        sys.exit(pytest.main(["-k", "UserUnitTests"]))
    elif type == "int":
        sys.exit(pytest.main(["-k", "UserIntegrationTests"]))
    else:
        sys.exit(pytest.main(["-k", "App"]))
    

app.cli.add_command(test)