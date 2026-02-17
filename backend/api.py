from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from db_manager import DBManager
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="CardioRisk AI Cloud API")

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For alpha test, allow all. In production, restrict this.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGODB_URI")
if not MONGO_URI:
    print("[CRITICAL] MONGODB_URI not set in environment!")
    # In a real API, you might want to exit or handle this gracefully
    
db_manager = DBManager(MONGO_URI)

@app.get("/")
async def root():
    return {"message": "CardioRisk AI API is running", "status": "online"}

@app.get("/api/dashboard")
async def get_dashboard_data(user_name: str = "Usuário CardioRisk"):
    """
    Returns the latest health data for a specific user from MongoDB.
    """
    try:
        # Search for the user in our customers collection
        # Note: In alpha, we use name. In production, use a unique ID.
        data = db_manager.collection.find_one(
            {"user.name": user_name},
            {"_id": 0} # Exclude MongoDB ObjectID for JSON compatibility
        )
        
        if not data:
            raise HTTPException(status_code=404, detail="User data not found in cloud")
            
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/save_settings")
async def save_settings(settings: dict):
    """
    Saves user settings/profile to MongoDB.
    """
    try:
        success = db_manager.save_client_data(settings)
        if success:
            return {"status": "success", "message": "Settings saved to MongoDB"}
        else:
            raise HTTPException(status_code=500, detail="Failed to save to MongoDB")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/get_settings")
async def get_settings(user_name: str = "Usuário CardioRisk"):
    """
    Retrieves user settings/profile from MongoDB.
    """
    try:
        data = db_manager.collection.find_one(
            {"user.name": user_name},
            {"_id": 0}
        )
        if not data:
            return {"status": "not_found", "message": "No settings found for this user"}
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/save_alerts")
async def save_alerts(data: dict):
    """Saves alerts list to MongoDB."""
    try:
        user_name = data.get("user_name", "Usuário CardioRisk")
        alerts = data.get("alerts", [])
        db_manager.db['alerts'].update_one(
            {"user_name": user_name},
            {"$set": {"alerts": alerts, "last_updated": datetime.now()}},
            upsert=True
        )
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/get_alerts")
async def get_alerts(user_name: str = "Usuário CardioRisk"):
    """Retrieves alerts from MongoDB."""
    try:
        data = db_manager.db['alerts'].find_one({"user_name": user_name}, {"_id": 0})
        return data if data else {"alerts": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/save_devices")
async def save_devices(data: dict):
    """Saves connected devices to MongoDB."""
    try:
        user_name = data.get("user_name", "Usuário CardioRisk")
        devices = data.get("devices", [])
        db_manager.db['devices'].update_one(
            {"user_name": user_name},
            {"$set": {"devices": devices, "last_updated": datetime.now()}},
            upsert=True
        )
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/get_devices")
async def get_devices(user_name: str = "Usuário CardioRisk"):
    """Retrieves connected devices from MongoDB."""
    try:
        data = db_manager.db['devices'].find_one({"user_name": user_name}, {"_id": 0})
        return data if data else {"devices": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/save_measurement")
async def save_measurement(data: dict):
    """Saves a health measurement (e.g. BPM) to MongoDB."""
    try:
        user_name = data.get("user_name", "Usuário CardioRisk")
        measurement = data.get("measurement")
        db_manager.db['measurements'].insert_one({
            "user_name": user_name,
            "data": measurement,
            "timestamp": datetime.now()
        })
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/clients")
async def list_clients():
    """Returns a list of all clients in the system."""
    return db_manager.get_all_clients()

if __name__ == "__main__":
    print("Starting Cloud API Server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
