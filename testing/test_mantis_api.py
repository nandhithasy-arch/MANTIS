from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
import pandas as pd
import uvicorn
from datetime import datetime, timedelta
from typing import Optional
import asyncio
import random
import os

app = FastAPI(
    title="🦈 MANTIS Backend API",
    description="NASA-Enhanced Marine Animal Navigation & Tracking Intelligence System",
    version="2.0.0",
    docs_url="/api/docs"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

satellite_data = None
tag_data = None
combined_data = None
system_stats = {}
real_time_events = []

# (Include your existing data loading, mock creation, system stats, and real time simulation functions here as before) ...


@app.get("/")
async def root():
    stats = system_stats
    return HTMLResponse(f"""
    <!DOCTYPE html>
    <html>
    <head><title>🦈 MANTIS Backend API</title></head>
    <body>
    <h1>🦈 MANTIS Backend API</h1>
    <p>Status: Online | Version 2.0.0 | NASA Integration: {stats.get('nasa_integration', 'Active')}</p>
    <p>Satellite Predictions: {stats.get('total_satellite_predictions', 0)}</p>
    <p>Tag Validations: {stats.get('total_tag_validations', 0)}</p>
    <p>Prediction Accuracy: {stats.get('prediction_accuracy', 0):.1%}</p>
    <p><a href="/api/docs">API Documentation</a></p>
    </body></html>
    """)

# New API endpoints added for your test_mantis_api.py compatibility:

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/system-stats")
async def get_system_stats():
    global system_stats
    if system_stats: 
        return JSONResponse(content={"statistics": system_stats})
    return JSONResponse(content={"error": "Stats unavailable"}, status_code=503)

@app.get("/api/satellite-predictions")
async def get_satellite_predictions():
    global satellite_data
    if satellite_data is not None:
        return satellite_data.to_dict(orient='records')
    return JSONResponse(content={"error": "Data unavailable"}, status_code=503)

@app.get("/api/tag-data")
async def get_tag_data():
    global tag_data
    if tag_data is not None:
        return tag_data.to_dict(orient='records')
    return JSONResponse(content={"error": "Data unavailable"}, status_code=503)

@app.get("/api/combined-events")
async def get_combined_events():
    global combined_data
    if combined_data is not None:
        return combined_data.to_dict(orient='records')
    return JSONResponse(content={"error": "Data unavailable"}, status_code=503)

@app.get("/api/nasa-data-sources")
async def get_nasa_data_sources():
    sources = {
        "EONET": "https://eonet.gsfc.nasa.gov/api/v3/events",
        "OceanColor": "https://oceandata.sci.gsfc.nasa.gov/api/file_search",
        "NASA_API": "https://api.nasa.gov/planetary/apod"
    }
    return sources

@app.get("/api/real-time-events")
async def get_real_time_events():
    return real_time_events

# Your existing on_startup code and real-time simulation as before:
@app.on_event("startup")
async def on_startup():
    print("🚀 Starting NASA-Enhanced MANTIS Backend Server...")
    load_data()
    asyncio.create_task(simulate_real_time())

if __name__ == "__main__":
    uvicorn.run("mantis_backend:app", host="0.0.0.0", port=8000, reload=True)
