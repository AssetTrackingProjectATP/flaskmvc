from App.models import Asset 
from App.database import db 


def get_asset(id):
    return Asset.query.filter_by(id=id).first()

def get_all_assets():
    return Asset.query.all()

def get_all_assets_json():
    assets = get_all_assets()
    if not assets:
        return[]
    assets = [asset.get_json() for asset in assets]
    return assets


    
    