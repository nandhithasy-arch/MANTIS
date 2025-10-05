import earthaccess
import os

def setup_nasa_auth():
    print("🛰️ Setting up NASA authentication...")
    try:
        # Try environment-based login first
        auth = earthaccess.login(strategy="environment")
        if auth and auth.authenticated:
            print("✅ NASA authentication successful!")
            return True
    except:
        pass
    
    try:
        # Try interactive login
        auth = earthaccess.login(strategy="interactive")
        if auth and auth.authenticated:
            print("✅ NASA authentication successful!")
            return True
    except:
        pass
    
    print("⚠️ NASA authentication failed - will use fallback methods")
    return False

if __name__ == "__main__":
    setup_nasa_auth()
    print("🚀 Setup complete!")
