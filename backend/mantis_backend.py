from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import pandas as pd
from datetime import datetime

app = FastAPI(title="🦈 MANTIS Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or ["http://localhost:3001"] for stricter dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

satellite_data = None
tag_data = None
combined_data = None
system_stats = {}
real_time_events = [
    {"event": "Shark Tagged", "timestamp": "2025-10-05T10:30:00Z", "species": "Tiger Shark", "location": "Sydney Harbour"},
    {"event": "Feeding Detected", "timestamp": "2025-10-05T11:15:00Z", "species": "Bull Shark", "location": "Bondi Beach"}
]

def load_generated_data():
    global satellite_data, tag_data, combined_data
    try:
        print("[INFO] Loading nasa_satellite_predictions.csv")
        satellite_data = pd.read_csv('nasa_satellite_predictions.csv')
        print("[INFO] Satellite data loaded:", satellite_data.shape, "columns:", satellite_data.columns.tolist())
    except Exception as e:
        print("[ERROR] Failed to load nasa_satellite_predictions.csv:", repr(e))
        satellite_data = pd.DataFrame()
    try:
        print("[INFO] Loading nasa_mantis_tag_data.csv")
        tag_data = pd.read_csv('nasa_mantis_tag_data.csv')
        print("[INFO] Tag data loaded:", tag_data.shape, "columns:", tag_data.columns.tolist())
    except Exception as e:
        print("[ERROR] Failed to load nasa_mantis_tag_data.csv:", repr(e))
        tag_data = pd.DataFrame()
    try:
        print("[INFO] Loading nasa_combined_display_data.csv")
        combined_data = pd.read_csv('nasa_combined_display_data.csv')
        print("[INFO] Combined data loaded:", combined_data.shape, "columns:", combined_data.columns.tolist())
    except Exception as e:
        print("[ERROR] Failed to load nasa_combined_display_data.csv:", repr(e))
        combined_data = pd.DataFrame()

def calculate_system_stats():
    global system_stats, satellite_data, tag_data, combined_data
    
    # Calculate accuracy from tag data
    if tag_data is not None and len(tag_data):
        correct = (tag_data['prediction_accuracy'] == 'correct').sum() if 'prediction_accuracy' in tag_data.columns else 0
        accuracy = float(correct) / float(len(tag_data)) if len(tag_data) > 0 else 0
    else:
        accuracy = 0.0
    
    # Calculate shark species counts as object (species name -> count)
    shark_species_tracked = {}
    if combined_data is not None and 'shark_species' in combined_data.columns:
        # Clean the data: remove NaN, empty strings, and 'NA' values
        clean_species = combined_data['shark_species'].dropna()
        clean_species = clean_species[clean_species.astype(str).str.strip() != '']
        clean_species = clean_species[clean_species.astype(str).str.upper() != 'NA']
        clean_species = clean_species[clean_species.astype(str).str.upper() != 'NAN']
        
        if len(clean_species) > 0:
            # Convert to dict with species names as keys and counts as values
            shark_species_tracked = clean_species.value_counts().to_dict()
            print(f"[DEBUG] Species found in combined data: {list(shark_species_tracked.keys())}")
        else:
            print("[DEBUG] No valid species found in combined data")
            
    elif tag_data is not None and 'shark_species' in tag_data.columns:
        # Fallback to tag data if combined data doesn't have species info
        clean_species = tag_data['shark_species'].dropna()
        clean_species = clean_species[clean_species.astype(str).str.strip() != '']
        clean_species = clean_species[clean_species.astype(str).str.upper() != 'NA']
        clean_species = clean_species[clean_species.astype(str).str.upper() != 'NAN']
        
        if len(clean_species) > 0:
            shark_species_tracked = clean_species.value_counts().to_dict()
            print(f"[DEBUG] Species found in tag data: {list(shark_species_tracked.keys())}")
        else:
            print("[DEBUG] No valid species found in tag data")
    else:
        print("[DEBUG] No shark_species column found in any data")
    
    system_stats = {
        "prediction_accuracy": round(float(accuracy), 3),
        "total_satellite_predictions": int(len(satellite_data)) if satellite_data is not None else 0,
        "total_tag_validations": int(len(tag_data)) if tag_data is not None else 0,
        "shark_species_tracked": shark_species_tracked  # Now returns object with species names and counts
    }
    
    print(f"[DEBUG] Calculated stats: {system_stats}")

@app.get("/")
async def root():
    stats = system_stats
    species_count = len(stats.get('shark_species_tracked', {}))
    return HTMLResponse(f"""
    <h2>🦈 MANTIS Backend API</h2>
    <p>Version 1.0</p>
    <p>Prediction Accuracy: {stats.get('prediction_accuracy',0):.1%}</p>
    <p>Species Tracked: {species_count}</p>
    <p>System Stats: {stats}</p>
    """)

@app.get("/health")
async def health():
    return JSONResponse({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.get("/api/system-stats")
async def get_system_stats():
    global system_stats
    if system_stats:
        return JSONResponse(system_stats)
    else:
        return JSONResponse({"message": "No stats available"}, status_code=503)

@app.get("/api/satellite-predictions")
async def get_satellite_predictions():
    if satellite_data is not None and not satellite_data.empty:
        # Convert all non-serializable types
        return JSONResponse(satellite_data.astype(str).to_dict(orient='records'))
    else:
        return JSONResponse({"message": "No satellite data"}, status_code=503)

@app.get("/api/tag-data")
async def get_tag_data():
    if tag_data is not None and not tag_data.empty:
        return JSONResponse(tag_data.astype(str).to_dict(orient='records'))
    else:
        return JSONResponse({"message": "No tag data"}, status_code=503)

@app.get("/api/combined-events")
async def get_combined_events():
    global combined_data
    try:
        if combined_data is not None and not combined_data.empty:
            # Convert all non-serializable types
            return JSONResponse(combined_data.astype(str).to_dict(orient='records'))
        else:
            print("[WARN] combined_data is empty or None!")
            return JSONResponse({"message": "No combined data"}, status_code=503)
    except Exception as e:
        print("[ERROR] Exception in /api/combined-events:", repr(e))
        return JSONResponse({"message": f"Internal error: {e}"}, status_code=500)

@app.get("/api/nasa-data-sources")
async def get_nasa_data_sources():
    return {
        "EONET": "https://eonet.gsfc.nasa.gov/api/v3/events",
        "OceanColor": "https://oceandata.sci.gsfc.nasa.gov/api/file_search",
        "NASA_API": "https://api.nasa.gov/planetary/apod"
    }

@app.get("/api/real-time-events")
async def get_real_time_events():
    return JSONResponse(real_time_events)

@app.on_event("startup")
async def startup_event():
    print("[BACKEND] Starting up, loading all data ...")
    load_generated_data()
    calculate_system_stats()
    print("[BACKEND] Startup complete. System stats:", system_stats)

if __name__ == "__main__":
    uvicorn.run("mantis_backend:app", host="127.0.0.1", port=8000, reload=True)
