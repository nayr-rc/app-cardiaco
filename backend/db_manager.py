import pymongo
from datetime import datetime

class DBManager:
    def __init__(self, connection_string):
        self.client = pymongo.MongoClient(connection_string)
        self.db = self.client['CardioRisk']
        self.collection = self.db['customers']

    def save_client_data(self, data):
        """
        Saves or updates client data in the database.
        Includes a timestamp for the update.
        """
        # Create a deep copy to avoid modifying the original if needed, 
        # but here we add the sync timestamp
        data_to_save = data.copy()
        data_to_save['last_db_sync'] = datetime.now()
        
        # We'll use the user name as a simple key for alpha test
        user_name = data_to_save.get('user', {}).get('name', 'Unknown User')
        
        try:
            result = self.collection.update_one(
                {'user.name': user_name},
                {'$set': data_to_save},
                upsert=True
            )
            print(f"[DB] Data saved for {user_name}. Match: {result.matched_count}, Modified: {result.modified_count}, Upsert ID: {result.upserted_id}")
            return True
        except Exception as e:
            print(f"[DB] Error saving to MongoDB: {e}")
            return False

    def get_all_clients(self):
        return list(self.collection.find({}, {'_id': 0}))
