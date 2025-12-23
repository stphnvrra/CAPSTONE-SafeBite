# Admin tool for managing crime zone data in Firebase
# This web app allows administrators to add, edit, and delete crime zones
# that appear on the SafeBite mobile app map

import os
import json
from typing import Any, Dict, List, Optional, Tuple
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
import httpx
from fastapi.templating import Jinja2Templates

import firebase_admin
from firebase_admin import credentials, firestore as admin_firestore, auth as admin_auth
from google.cloud.firestore_v1 import GeoPoint

# Load environment variables from .env file in the project root
# This allows the admin tool to use API keys and secrets from .env
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Set up file paths for the admin tool
APP_DIR = os.path.dirname(os.path.abspath(__file__))  # Current directory (admin folder)
SERVICE_ACCOUNT_PATH = os.path.join(
    APP_DIR, "safebite-v6-firebase-adminsdk-fbsvc-17d1531b31.json"
)  # Path to Firebase service account file


# Function: Sets up Firebase connection using service account file
# This connects the admin tool to Firebase so it can read/write crime zone data
def initialize_firebase() -> None:
    if not firebase_admin._apps:  # Only initialize if not already done
        if not os.path.exists(SERVICE_ACCOUNT_PATH):
            raise RuntimeError(
                f"Service account file not found at {SERVICE_ACCOUNT_PATH}."
            )
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)  # Load service account
        firebase_admin.initialize_app(cred)  # Connect to Firebase


# Initialize Firebase connection when the app starts
initialize_firebase()
db = admin_firestore.client()  # Get database connection

# Create the FastAPI web application
app = FastAPI(title="Crime Mapping Admin")
templates = Jinja2Templates(directory=os.path.join(APP_DIR, "templates"))  # HTML templates folder

# Set up session management for user login
# This allows users to stay logged in while using the admin tool
SESSION_SECRET = os.getenv("ADMIN_SESSION_SECRET", "change-me-in-prod")  # Secret key for sessions
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    same_site="lax",
    session_cookie="safebite_admin",  # Cookie name for admin sessions
)


# Function: Cleans up usernames to make them safe for the system
# Removes special characters and converts to lowercase
def _normalize_username(username: str) -> str:
    u = (username or "").strip().lower()  # Remove spaces and make lowercase
    # Replace disallowed characters with '-'
    normalized = []
    for ch in u:
        if ch.isalnum() or ch in {".", "_", "-"}:  # Allow letters, numbers, dots, underscores, dashes
            normalized.append(ch)
        else:
            normalized.append("-")  # Replace other characters with dash
    return "".join(normalized)


# Function: Converts username to a fake email address for Firebase authentication
# Firebase requires email addresses, so we create fake ones for usernames
def _username_to_email(username: str) -> str:
    return f"{_normalize_username(username)}@user.safebite.local"


# Function: Gets Firebase API key from environment or config file
# This key is needed to make authentication requests to Firebase
def _get_firebase_web_api_key() -> Optional[str]:
    # Prefer environment variable
    key = os.getenv("FIREBASE_WEB_API_KEY")
    if key:
        return key
    # Fallback: parse android google-services.json in repo if available
    try:
        repo_root = os.path.abspath(os.path.join(APP_DIR, os.pardir))  # Go up one directory
        path = os.path.join(
            repo_root, "safebite", "android", "app", "google-services.json"
        )
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                clients = (data.get("client") or [])
                if clients:
                    apis = (clients[0].get("api_key") or [])
                    if apis:
                        return apis[0].get("current_key")
    except Exception:
        return None
    return None


# Function: Checks if username and password are correct by asking Firebase
# This is used when someone tries to log into the admin tool
async def _sign_in_with_username_password(username: str, password: str) -> Dict[str, Any]:
    api_key = _get_firebase_web_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="Firebase Web API key not configured")
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    payload = {
        "email": _username_to_email(username),  # Convert username to fake email
        "password": password,
        "returnSecureToken": True,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:  # Make request to Firebase
        resp = await client.post(url, json=payload)
    if resp.status_code != 200:
        # Avoid leaking exact error from Firebase to the page
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return resp.json()


# Function: Gets the current logged-in user from the session
# Returns user info if logged in, None if not logged in
def _session_user(request: Request) -> Optional[Dict[str, Any]]:
    return (request.session or {}).get("user")


# Function: Checks if the current user is an admin
# Only admins can use this admin tool
def _is_admin(request: Request) -> bool:
    u = _session_user(request)
    return bool(u and (u.get("role") == "superadmin"))  # Must have superadmin role


# Function: Calculates risk level based on crime score
# High: 4.5+ (top tier)
# Moderate: 3.0-4.4 (middle tier) 
# Low: <3.0 (lower tier)
def _calculate_risk_by_score(crime_score: float) -> str:
    if crime_score >= 4.5:
        return "high"
    elif crime_score >= 3.0:
        return "moderate"
    else:
        return "low"


# Function: Safely converts text input to a number
# Returns None if the input is empty or not a valid number
def _to_float(value: Optional[str]) -> Optional[float]:
    if value is None:
        return None
    value = str(value).strip()  # Remove spaces
    if value == "":
        return None
    try:
        return float(value)  # Try to convert to number
    except ValueError:
        return None  # Return None if conversion fails


# Function: Creates a map polygon from form input coordinates
# Takes up to 5 coordinate pairs and creates a GeoJSON polygon
def _build_polygon_from_form(form: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    coordinates: List[List[float]] = []
    for i in range(1, 6):  # Check for 5 coordinate pairs (p1_lng, p1_lat, p2_lng, p2_lat, etc.)
        lng = _to_float(form.get(f"p{i}_lng"))  # Get longitude
        lat = _to_float(form.get(f"p{i}_lat"))  # Get latitude
        if lng is None or lat is None:
            continue  # Skip if either coordinate is missing
        # Auto-correct likely swapped inputs (if lat looks like lng and vice versa)
        if lat is not None and (lat < -90 or lat > 90) and lng is not None and (-90 <= lng <= 90) and (-180 <= lat <= 180):
            lng, lat = lat, lng  # Swap them
        # Validate ranges (lat: -90 to 90, lng: -180 to 180)
        if lat < -90 or lat > 90 or lng < -180 or lng > 180:
            raise HTTPException(status_code=400, detail=f"Polygon coordinate {i} is out of range (lng -180..180, lat -90..90)")
        coordinates.append([lng, lat])

    if len(coordinates) < 3:  # Need at least 3 points to make a polygon
        return None
    if coordinates[0] != coordinates[-1]:  # Close the polygon if not already closed
        coordinates.append(coordinates[0])

    return {"type": "Polygon", "coordinates": [coordinates]}


# Function: Converts GeoJSON polygon to a compact string for storage
# Firebase stores this as a string to avoid database restrictions
def _geojson_to_string(geojson: Optional[Dict[str, Any]]) -> Optional[str]:
    if not geojson:
        return None
    try:
        # Compact JSON to save space
        return json.dumps(geojson, separators=(",", ":"))
    except Exception:
        return None


# Function: Converts string back to GeoJSON object for editing
# Used when loading existing crime zones for editing
def _parse_geojson(value: Any) -> Optional[Dict[str, Any]]:
    if not value:
        return None
    if isinstance(value, dict):  # Already a dictionary
        return value
    if isinstance(value, str):  # String that needs to be parsed
        try:
            obj = json.loads(value)  # Convert JSON string to object
            return obj if isinstance(obj, dict) else None
        except Exception:
            return None
    return None


# Function: Splits polygon coordinates for the edit form
# Takes a polygon and extracts up to 5 coordinate pairs for form fields
def _split_polygon_for_form(geojson: Optional[Dict[str, Any]]) -> List[Tuple[Optional[float], Optional[float]]]:
    result: List[Tuple[Optional[float], Optional[float]]] = [(None, None)] * 5  # 5 empty coordinate pairs
    if not geojson or geojson.get("type") != "Polygon":
        return result
    ring: List[List[float]] = (geojson.get("coordinates") or [[]])[0] or []  # Get first ring of polygon
    # Remove closing coordinate if present (polygons often repeat the first point at the end)
    if len(ring) > 1 and ring[0] == ring[-1]:
        ring = ring[:-1]
    for i in range(min(5, len(ring))):  # Take up to 5 coordinates
        lng, lat = ring[i]
        result[i] = (lng, lat)
    return result


# Function: Checks if user is logged in as admin, redirects to login if not
# This protects admin pages from unauthorized access
def _require_admin(request: Request) -> Optional[RedirectResponse]:
    if not _is_admin(request):
        return RedirectResponse(url="/login", status_code=303)  # Redirect to login page
    return None


# Web page: Shows the login form
@app.get("/login", response_class=HTMLResponse)
async def login_form(request: Request):
    # If already logged in, skip to dashboard
    if _is_admin(request):
        return RedirectResponse(url="/", status_code=303)
    return templates.TemplateResponse("login.html", {"request": request, "error": None})


# Web page: Processes login form submission
@app.post("/login")
async def login_action(request: Request, username: str = Form(...), password: str = Form(...)):
    try:
        # Only allow single admin username for admin site
        if _normalize_username(username) != "admin":
            raise HTTPException(status_code=403, detail="Not authorized for admin")
        auth_res = await _sign_in_with_username_password(username, password)  # Check credentials
        uid = auth_res.get("localId")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        # Fetch role from users/{uid}
        snap = db.collection("users").document(uid).get()
        role = "user"
        if snap.exists:
            data = snap.to_dict() or {}
            role = str(data.get("role") or "user").lower()
        # Only allow superadmin to access admin site
        if role != "superadmin":
            raise HTTPException(status_code=403, detail="Not authorized for admin")
        request.session["user"] = {"uid": uid, "username": _normalize_username(username), "role": role}
        return RedirectResponse(url="/", status_code=303)  # Redirect to main page
    except HTTPException as e:
        # Re-render with generic error
        return templates.TemplateResponse(
            "login.html",
            {"request": request, "error": "Invalid username or password" if e.status_code in (401, 403) else "Login failed"},
            status_code=e.status_code if e.status_code in (401, 403) else 400,
        )


# Web page: Logs out the user and clears their session
@app.post("/logout")
async def logout_action(request: Request):
    request.session.clear()  # Clear all session data
    return RedirectResponse(url="/login", status_code=303)  # Redirect to login page


# Web page: Main dashboard showing all crime zones
@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    guard = _require_admin(request)  # Check if user is logged in as admin
    if guard is not None:
        return guard
    docs = list(db.collection("crimeZones").stream())  # Get all crime zones from database
    items: List[Dict[str, Any]] = []
    high_count = 0     # Count of high-risk zones
    moderate_count = 0  # Count of moderate-risk zones
    low_count = 0      # Count of low-risk zones

    for d in docs:  # Process each crime zone
        data = d.to_dict() or {}
        risk = str(data.get("riskLevel") or "").lower()
        if risk == "high":
            high_count += 1
        elif risk == "moderate":
            moderate_count += 1
        elif risk == "low":
            low_count += 1
        items.append(
            {
                "id": d.id,  # Document ID
                "street_name": data.get("street_name"),  # Street name
                "averageCrimeScore": data.get("averageCrimeScore"),  # Crime score
                "riskLevel": data.get("riskLevel"),  # Risk level (high/moderate/low)
                "has_geo": bool(data.get("geoJsonPolygon")),  # Whether it has map polygon
            }
        )

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "total": len(items),         # Total number of crime zones
            "high_count": high_count,    # Number of high-risk zones
            "moderate_count": moderate_count, # Number of moderate-risk zones
            "low_count": low_count,      # Number of low-risk zones
            "items": items,              # List of all crime zones
        },
    )


# Web page: Shows the form for adding a new crime zone
@app.get("/add", response_class=HTMLResponse)
async def add_form(request: Request):
    guard = _require_admin(request)  # Check if user is logged in as admin
    if guard is not None:
        return guard
    return templates.TemplateResponse(
        "form.html",
        {
            "request": request,
            "mode": "add",        # Tell template this is for adding (not editing)
            "doc_id": None,       # No document ID for new crime zones
            "defaults": {          # Default values for empty form
                "street_name": "",
                "averageCrimeScore": "",
                "riskLevel": "low",
                "start_lng": "",
                "start_lat": "",
                "end_lng": "",
                "end_lat": "",
                "points": [(None, None)] * 5,  # 5 empty coordinate pairs
            },
        },
    )


# Web page: Processes the form submission for adding a new crime zone
@app.post("/add")
async def add_action(request: Request):
    guard = _require_admin(request)  # Check if user is logged in as admin
    if guard is not None:
        return guard
    form = await request.form()  # Get form data

    # Extract form data
    street_name = str(form.get("street_name") or "").strip()
    score = _to_float(form.get("averageCrimeScore")) or 0.0
    # Auto-calculate risk level based on crime score
    risk_level = _calculate_risk_by_score(score)
    # Allow manual override if user specifically selected a different risk level
    manual_risk = str(form.get("riskLevel") or "").lower()
    if manual_risk in ["high", "moderate", "low"]:
        risk_level = manual_risk
    start_lng = _to_float(form.get("start_lng"))
    start_lat = _to_float(form.get("start_lat"))
    end_lng = _to_float(form.get("end_lng"))
    end_lat = _to_float(form.get("end_lat"))

    if not street_name:  # Street name is required
        raise HTTPException(status_code=400, detail="Street name is required")

    polygon = _build_polygon_from_form(form)  # Create polygon from coordinates
    polygon_str = _geojson_to_string(polygon)  # Convert to string for storage

    data: Dict[str, Any] = {
        "street_name": street_name,
        "averageCrimeScore": float(score),
        "riskLevel": risk_level,
        # Store as JSON string to avoid nested array restrictions in Datastore-mode projects
        "geoJsonPolygon": polygon_str,
        "lastUpdated": admin_firestore.SERVER_TIMESTAMP,  # Set update timestamp
    }

    # Normalize/validate start & end points
    def normalize_point(lng: Optional[float], lat: Optional[float], label: str) -> Optional[GeoPoint]:
        if lng is None or lat is None:
            return None
        # auto-correct if swapped (common mistake)
        if (lat < -90 or lat > 90) and (-90 <= lng <= 90) and (-180 <= lat <= 180):
            lng, lat = lat, lng
        if lat < -90 or lat > 90:
            raise HTTPException(status_code=400, detail=f"{label}: latitude must be between -90 and 90")
        if lng < -180 or lng > 180:
            raise HTTPException(status_code=400, detail=f"{label}: longitude must be between -180 and 180")
        return GeoPoint(lat, lng)  # Create Firebase GeoPoint

    sp = normalize_point(start_lng, start_lat, "Start Point")
    ep = normalize_point(end_lng, end_lat, "End Point")
    if sp is not None:
        data["startPoint"] = sp
    if ep is not None:
        data["endPoint"] = ep

    db.collection("crimeZones").add(data)  # Save to database

    return RedirectResponse(url="/", status_code=303)  # Redirect back to main page


# Web page: Shows the edit form for an existing crime zone
@app.get("/edit/{doc_id}", response_class=HTMLResponse)
async def edit_form(request: Request, doc_id: str):
    guard = _require_admin(request)  # Check if user is logged in as admin
    if guard is not None:
        return guard
    snap = db.collection("crimeZones").document(doc_id).get()  # Get crime zone from database
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Document not found")
    data = snap.to_dict() or {}

    # Extract defaults for the form
    start_point = data.get("startPoint")
    end_point = data.get("endPoint")
    defaults = {
        "street_name": data.get("street_name", ""),
        "averageCrimeScore": data.get("averageCrimeScore", ""),
        "riskLevel": data.get("riskLevel", "low"),
        "start_lng": getattr(start_point, "longitude", ""),  # Get longitude from GeoPoint
        "start_lat": getattr(start_point, "latitude", ""),   # Get latitude from GeoPoint
        "end_lng": getattr(end_point, "longitude", ""),
        "end_lat": getattr(end_point, "latitude", ""),
        # Parse stringified GeoJSON back to object for the form
        "points": _split_polygon_for_form(_parse_geojson(data.get("geoJsonPolygon"))),
    }

    return templates.TemplateResponse(
        "form.html",
        {"request": request, "mode": "edit", "doc_id": doc_id, "defaults": defaults},
    )


# Web page: Processes the form submission for editing an existing crime zone
@app.post("/edit/{doc_id}")
async def edit_action(request: Request, doc_id: str):
    guard = _require_admin(request)  # Check if user is logged in as admin
    if guard is not None:
        return guard
    form = await request.form()  # Get form data

    # Extract form data (same as add_action)
    street_name = str(form.get("street_name") or "").strip()
    score = _to_float(form.get("averageCrimeScore")) or 0.0
    # Auto-calculate risk level based on crime score
    risk_level = _calculate_risk_by_score(score)
    # Allow manual override if user specifically selected a different risk level
    manual_risk = str(form.get("riskLevel") or "").lower()
    if manual_risk in ["high", "moderate", "low"]:
        risk_level = manual_risk
    start_lng = _to_float(form.get("start_lng"))
    start_lat = _to_float(form.get("start_lat"))
    end_lng = _to_float(form.get("end_lng"))
    end_lat = _to_float(form.get("end_lat"))

    if not street_name:  # Street name is required
        raise HTTPException(status_code=400, detail="Street name is required")

    polygon = _build_polygon_from_form(form)  # Create polygon from coordinates
    polygon_str = _geojson_to_string(polygon)  # Convert to string for storage

    data: Dict[str, Any] = {
        "street_name": street_name,
        "averageCrimeScore": float(score),
        "riskLevel": risk_level,
        # Store as JSON string to avoid nested array restrictions in Datastore-mode projects
        "geoJsonPolygon": polygon_str,
        "lastUpdated": admin_firestore.SERVER_TIMESTAMP,  # Set update timestamp
    }
    
    # Normalize/validate start & end points (same as add_action)
    def normalize_point(lng: Optional[float], lat: Optional[float], label: str) -> Optional[GeoPoint]:
        if lng is None or lat is None:
            return None
        if (lat < -90 or lat > 90) and (-90 <= lng <= 90) and (-180 <= lat <= 180):
            lng, lat = lat, lng
        if lat < -90 or lat > 90:
            raise HTTPException(status_code=400, detail=f"{label}: latitude must be between -90 and 90")
        if lng < -180 or lng > 180:
            raise HTTPException(status_code=400, detail=f"{label}: longitude must be between -180 and 180")
        return GeoPoint(lat, lng)

    sp = normalize_point(start_lng, start_lat, "Start Point")
    ep = normalize_point(end_lng, end_lat, "End Point")
    if sp is not None:
        data["startPoint"] = sp
    if ep is not None:
        data["endPoint"] = ep

    db.collection("crimeZones").document(doc_id).set(data, merge=True)  # Update existing document
    return RedirectResponse(url="/", status_code=303)  # Redirect back to main page


# Web page: Deletes a crime zone from the database
@app.post("/delete/{doc_id}")
async def delete_action(request: Request, doc_id: str):
    guard = _require_admin(request)  # Check if user is logged in as admin
    if guard is not None:
        return guard
    ref = db.collection("crimeZones").document(doc_id)  # Get reference to crime zone
    if not ref.get().exists:  # Check if crime zone exists
        raise HTTPException(status_code=404, detail="Document not found")
    ref.delete()  # Delete from database
    return RedirectResponse(url="/", status_code=303)  # Redirect back to main page


# Web page: Health check endpoint for monitoring
@app.get("/healthz")
async def healthz():
    return {"status": "ok"}  # Simple health check response


# Function: Creates a default admin account if it doesn't exist
# This runs when the app starts to ensure there's always an admin user
def _ensure_default_admin() -> None:
    """Create a single default admin account if it doesn't exist.

    Username: admin
    Password: From ADMIN_DEFAULT_PASSWORD environment variable (default: admin123)
    Role: superadmin
    """
    try:
        username = "admin"
        email = _username_to_email(username)  # Convert to fake email
        # Get default password from environment variable, fallback to insecure default for dev only
        default_password = os.getenv("ADMIN_DEFAULT_PASSWORD", "admin123")
        try:
            user = admin_auth.get_user_by_email(email)  # Check if user exists
        except Exception:
            user = admin_auth.create_user(email=email, password=default_password, display_name="Admin")  # Create user

        uid = user.uid if hasattr(user, "uid") else getattr(user, "uid", None)
        if not uid:
            return

        # usernames/admin -> {uid} (username mapping)
        db.collection("usernames").document(_normalize_username(username)).set(
            {"uid": uid, "createdAt": admin_firestore.SERVER_TIMESTAMP}, merge=True
        )
        # users/{uid} (user profile)
        db.collection("users").document(uid).set(
            {
                "username": _normalize_username(username),
                "fullName": "Admin",
                "email": email,
                "role": "superadmin",  # Give superadmin role
                "createdAt": admin_firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
    except Exception as _e:
        # Best-effort seeding; don't crash startup
        pass


# Event: Runs when the app starts up
@app.on_event("startup")
def _on_startup():
    _ensure_default_admin()  # Create default admin account

