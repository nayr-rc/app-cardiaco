from db_manager import DBManager
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_connection():
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        print("❌ Error: MONGODB_URI not found in environment variables.")
        sys.exit(1)
        
    print(f"Testing connection to MongoDB...")
    
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
