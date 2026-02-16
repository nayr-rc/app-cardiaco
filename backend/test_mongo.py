from db_manager import DBManager
import sys

def test_connection():
    mongo_uri = "mongodb+srv://narsie454_db_user:BH7BP1Wg9sDA5yAY@cardiorisk.zzksboj.mongodb.net/"
    print(f"Testing connection to: {mongo_uri}")
    
    try:
        db = DBManager(mongo_uri)
        # Try to ping or list collections
        db.client.admin.command('ping')
        print("✅ Success! Connected to MongoDB Atlas.")
        
        # Create a test record
        test_data = {
            "user": {"name": "Alpha Tester"},
            "test_run": True,
            "message": "Connection working from CardioRisk AI"
        }
        db.save_client_data(test_data)
        print("✅ Test record saved to 'customers' collection.")
        
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_connection()
