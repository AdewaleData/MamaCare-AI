#!/usr/bin/env python3
"""
MamaCare AI Backend Server Startup Script

- Works locally (Windows/Linux/macOS)
- Works on Render (binds to 0.0.0.0 and uses PORT env var)
- Keeps repo structure unchanged (backend/app/main.py)
"""

import os
import sys
from pathlib import Path


def _setup_paths() -> Path:
    """Ensure imports work regardless of where the script is run from."""
    backend_dir = Path(__file__).resolve().parent
    # Add backend directory to Python path so `from app...` works
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))
    # Change working directory to backend (important for relative paths)
    os.chdir(backend_dir)
    return backend_dir


def _setup_windows_utf8():
    """Improve Windows console encoding to avoid Unicode issues."""
    if sys.platform == "win32":
        try:
            import io
            sys.stdout = io.TextIOWrapper(
                sys.stdout.buffer, encoding="utf-8", errors="replace")
            sys.stderr = io.TextIOWrapper(
                sys.stderr.buffer, encoding="utf-8", errors="replace")
        except Exception:
            # If this fails, continue anyway
            pass


def main() -> int:
    _setup_windows_utf8()
    backend_dir = _setup_paths()

    # Render sets PORT. Locally we default to 8000.
    port = int(os.environ.get("PORT", "8000"))

    # Render must bind to 0.0.0.0. Locally this also works fine.
    host = os.environ.get("HOST", "0.0.0.0")

    # Enable reload only for local dev if desired.
    # (Render should not use reload.)
    reload = os.environ.get("RELOAD", "false").lower() == "true"

    try:
        print("=" * 60)
        print("MamaCare AI Backend Server")
        print("=" * 60)
        print("Loading application...")
        from app.main import app  # FastAPI app defined in backend/app/main.py
        import uvicorn

        print(f"[OK] App loaded successfully ({len(app.routes)} routes)")
        print(f"[OK] Working directory: {backend_dir}")
        print("=" * 60)
        print(f"Server URL: http://{host}:{port}")
        print(f"API Documentation: http://{host}:{port}/docs")
        print(f"Health Check: http://{host}:{port}/health")
        print("=" * 60)
        print("Starting server...")
        print("=" * 60)

        uvicorn.run(
            "app.main:app",          # Use import string for stability in production
            host=host,
            port=port,
            log_level=os.environ.get("LOG_LEVEL", "info"),
            reload=reload,
            access_log=True,
            proxy_headers=True,
            forwarded_allow_ips="*",
        )
        return 0

    except ImportError as e:
        print(f"\n[ERROR] Import Error: {e}")
        print("\nTry installing dependencies:")
        print("  pip install -r requirements.txt")
        import traceback
        traceback.print_exc()
        return 1

    except KeyboardInterrupt:
        print("\n\nServer stopped by user")
        return 0

    except Exception as e:
        print(f"\n[ERROR] Error starting server: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
