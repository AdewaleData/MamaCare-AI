#!/usr/bin/env python3
"""
MamaCare AI Backend Server Startup Script
"""

import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(backend_dir))

# Change to backend directory
os.chdir(backend_dir)

if __name__ == "__main__":
    try:
        # Set UTF-8 encoding for Windows console
        if sys.platform == "win32":
            import io
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
        
        print("=" * 60)
        print("MamaCare AI Backend Server")
        print("=" * 60)
        
        # Import the FastAPI app
        print("Loading application...")
        from app.main import app
        import uvicorn
        
        print(f"[OK] App loaded successfully ({len(app.routes)} routes)")
        print(f"[OK] Working directory: {backend_dir}")
        print("=" * 60)
        print(f"Server URL: http://127.0.0.1:8001")
        print(f"API Documentation: http://127.0.0.1:8001/docs")
        print(f"Health Check: http://127.0.0.1:8001/health")
        print("=" * 60)
        print("Starting server...")
        print("Press Ctrl+C to stop the server")
        print("=" * 60)
        print()
        
        # Start the server
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=8001,
            log_level="info",
            reload=False,
            access_log=True
        )
        
    except ImportError as e:
        print(f"\n[ERROR] Import Error: {e}")
        print("\nTry installing dependencies:")
        print("  pip install -r requirements.txt")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nServer stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n[ERROR] Error starting server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

