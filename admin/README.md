# SafeBite Admin Tool - Complete Guide

## What is the Admin Tool?
The SafeBite Admin Tool is a web application that allows administrators to manage crime zone data for the SafeBite mobile app. It provides a simple interface to add, edit, and delete crime zones that appear on the mobile app's map.

## What Does It Do?
- **User Authentication**: Secure login system for administrators
- **Dashboard Statistics**: View total streets and risk level breakdowns
- **Add Crime Zones**: Create new crime zones with street names, coordinates, and safety ratings
- **Edit Existing Data**: Modify crime zone information, scores, and polygons
- **Delete Zones**: Remove outdated or incorrect crime zone data
- **GeoJSON Polygons**: Define crime zone boundaries with polygon coordinates
- **Automatic Risk Calculation**: Risk levels calculated from crime scores (high/moderate/low)
- **Upload to Firebase**: All changes are automatically saved to Firebase Firestore

## Technology Stack
- **Framework**: FastAPI (Python web framework)
- **Database**: Firebase Firestore
- **Frontend**: HTML templates with Bootstrap styling
- **Authentication**: Firebase Authentication with session management
- **Security**: Session-based authentication with secure cookies

## What You Need Before Starting

### Required Software:
- **Python** version 3.10 or higher
- **Firebase account** with Firestore enabled
- **Firebase service account** JSON file

### Required Setup:
- Firebase project with Firestore database
- Service account with Firestore permissions

## Step-by-Step Setup Guide

### Step 1: Prepare Firebase Project

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use existing SafeBite project
   - Enable Firestore Database

2. **Create Service Account**:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
   - Rename it to `[your-service-account].json` (use your actual service account filename)
   - Place it in the `admin/` folder

### Step 2: Set Up Python Environment

1. **Create Virtual Environment**:
   ```bash
   cd admin
   python -m venv .venv
   ```

2. **Activate Virtual Environment**:
   ```bash
   # On Windows:
   .venv\Scripts\activate
   
   # On macOS/Linux:
   source .venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

### Step 3: Configure Firebase API Key (Optional)

The admin tool can automatically detect the Firebase Web API key from the mobile app's `google-services.json` file. Alternatively:

1. **Set Environment Variable**:
   ```bash
   export FIREBASE_WEB_API_KEY=your_firebase_web_api_key
   ```

2. **Or ensure `google-services.json` exists**:
   - Path: `../safebite/android/app/google-services.json`
   - The tool will auto-detect the API key from this file

### Step 4: Run the Admin Tool

1. **Start the Server**:
   ```bash
   fastapi dev main.py --port 8080
   ```

2. **Open in Browser**:
   - Go to http://127.0.0.1:8080
   - You will be redirected to the login page
   - **Default Login Credentials**:
     - Username: `admin`
     - Password: `[default-password]` (change in production!)
   - After login, you'll see the admin dashboard

## How to Use the Admin Tool

### Login:
1. Navigate to http://127.0.0.1:8080
2. Enter your credentials (default: `admin` / `[default-password]`)
3. Click "Login"
4. You'll be redirected to the dashboard

### Dashboard Interface:
The admin dashboard shows:

1. **Statistics Cards**:
   - Total Streets: Count of all crime zones
   - High Risk: Number of zones with high risk level
   - Moderate Risk: Number of zones with moderate risk level
   - Low Risk: Number of zones with low risk level

2. **Crime Zones Table**:
   - Lists all existing crime zones
   - Shows street name, crime score, risk level, and GeoJSON status
   - Edit button for each zone
   - Delete button for each zone
   - "+ Add New Street" button at the top

### Adding a New Crime Zone:

1. **Click "+ Add New Street"** button

2. **Fill out the form**:
   - **Street Name**: Name of the street or area (required)
   - **Average Crime Weight**: Safety score as decimal number (e.g., 1.0, 3.5, 4.8)
   - **Start Point**: Optional starting coordinates (Longitude, Latitude)
   - **End Point**: Optional ending coordinates (Longitude, Latitude)
   - **Risk Level**: Select from dropdown (Low/Moderate/High)
     - Automatically calculated from crime score but can be manually overridden
   - **Polygon Coordinates**: Up to 5 coordinate pairs (Longitude, Latitude)
     - At least 3 points required to form a polygon
     - Coordinate 5 automatically mirrors Coordinate 1 to close the polygon

3. **Submit the form**:
   - Click "Save Street"
   - The zone will be saved to Firebase
   - You'll be redirected back to the dashboard

### Editing a Crime Zone:

1. **Click "Edit" button** next to any zone in the table
2. **Modify the information** in the form
3. **Click "Save Street"**
4. **Changes are saved** to Firebase
5. You'll be redirected back to the dashboard

### Deleting a Crime Zone:

1. **Click "Delete" button** next to any zone in the table
2. **Confirm deletion** in the browser popup dialog
3. **Zone is removed** from Firebase
4. Page refreshes to show updated list

### Logout:

1. **Click "Logout" button** in the navigation bar
2. Session is cleared
3. You'll be redirected to the login page

## Available Commands

### Development Commands:
- `fastapi dev main.py --port 8080` - Start development server
- `fastapi dev main.py --port 8080 --reload` - Start with auto-reload
- `uvicorn main:app --host 0.0.0.0 --port 8080` - Production server

### Python Commands:
- `python -m venv .venv` - Create virtual environment
- `source .venv/bin/activate` - Activate virtual environment
- `pip install -r requirements.txt` - Install dependencies

## Important Files and Folders

### Main Files:
- `main.py` - FastAPI application and routes
- `requirements.txt` - Python dependencies
- `[your-service-account].json` - Firebase service account file (keep secure, not in repo)

### Templates (`templates/`):
- `index.html` - Main admin dashboard with statistics and crime zones table
- `form.html` - Add/edit crime zone form with polygon coordinates
- `login.html` - Admin login page with authentication

## Data Structure

### Crime Zone Data (Firestore):
Each crime zone document is stored in the `crimeZones` collection:
```typescript
{
  street_name: string,              // Name of the street/area (required)
  averageCrimeScore: number,        // Safety score (decimal, e.g., 1.0, 3.5, 4.8)
  riskLevel: 'high' | 'moderate' | 'low',  // Risk level (auto-calculated or manual)
  startPoint: GeoPoint,             // Optional starting coordinates (lat, lng)
  endPoint: GeoPoint,               // Optional ending coordinates (lat, lng)
  geoJsonPolygon: string,           // GeoJSON polygon as JSON string (optional)
  lastUpdated: Timestamp            // Server timestamp of last modification
}
```

### Risk Level Calculation:
- **High Risk**: Crime score ≥ 4.5
- **Moderate Risk**: Crime score ≥ 3.0
- **Low Risk**: Crime score < 3.0
- Risk level is automatically calculated from `averageCrimeScore` but can be manually overridden in the form

### How Coordinates Work:
- **Latitude**: North/South position (-90 to 90)
  - Positive = North, Negative = South
- **Longitude**: East/West position (-180 to 180)
  - Positive = East, Negative = West
- **Butuan City coordinates**: Approximately lat: 8.947200, lng: 125.543061
- **Format**: Enter as decimal numbers (e.g., 8.947200, not 8°56'49.92"N)
- **Order**: Forms use (Longitude, Latitude) order for consistency
- **Polygon**: Requires minimum 3 coordinate points to form a valid polygon
- **Auto-closure**: The polygon automatically closes (last point connects to first point)

## Configuration Details

### Firebase Setup:
- **Service Account**: Must have Firestore read/write permissions
- **Firebase Authentication**: Must be enabled for user login
- **Collections Used**:
  - `crimeZones`: Stores all crime zone data
  - `users`: Stores user profiles with roles
  - `usernames`: Maps usernames to user IDs
- **Security**: Service account provides admin access to Firestore
- **Default Admin**: Created automatically on first startup (username: `admin`, password: `[default-password]` - change in production!)

### FastAPI Configuration:
- **Port**: Default 8080 (can be changed)
- **Host**: Localhost for development
- **Auto-reload**: Enabled in development mode

## Troubleshooting

### Common Issues and Solutions:

**Service account not found**:
- Make sure your Firebase service account JSON file is in the `admin/` folder
- Check the filename matches exactly
- Verify the file has proper JSON format

**Firebase connection errors**:
- Check internet connection
- Verify Firebase project is active
- Ensure Firestore is enabled in Firebase Console
- Check service account permissions

**Python environment issues**:
- Make sure Python 3.10+ is installed
- Activate virtual environment before running
- Reinstall requirements: `pip install -r requirements.txt`

**Port already in use**:
- Change port: `fastapi dev main.py --port 8081`
- Or kill process using port 8080

**Template not found errors**:
- Make sure `templates/` folder exists
- Check HTML files are in `templates/` folder
- Verify file permissions

**Login issues**:
- Default credentials: username `admin`, password `[default-password]` (change in production!)
- Ensure Firebase Authentication is enabled in Firebase Console
- Check that admin user exists with `superadmin` role in Firestore (`users/{uid}` document)
- Verify Firebase Web API key is accessible (from environment variable or `google-services.json`)
- Check browser console for authentication errors

**Risk level not calculating correctly**:
- Risk levels are auto-calculated: ≥4.5 = high, ≥3.0 = moderate, <3.0 = low
- You can manually override by selecting a different risk level in the form
- Ensure crime score is entered as a decimal number (e.g., 4.5, not 45)

**Polygon validation errors**:
- Polygons require at least 3 coordinate points
- Coordinates must be valid: latitude (-90 to 90), longitude (-180 to 180)
- The system will auto-swap coordinates if they appear reversed
- Coordinate 5 automatically mirrors Coordinate 1 to close the polygon

### Debug Commands:
```bash
# Check Python version
python --version

# Check installed packages
pip list

# Test Firebase connection
python -c "import firebase_admin; print('Firebase SDK installed')"

# Check if service account file exists
ls -la [your-service-account].json
```

## Building for Production

### Development Server:
```bash
fastapi dev main.py --port 8080
```

### Production Server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8080
```

### Docker (if needed):
```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

## Security Considerations

### Current Security:
- **Authentication Required**: Login system with username/password
- **Role-Based Access**: Only users with `superadmin` role can access admin interface
- **Session Management**: Secure session cookies for maintaining login state
- **Service Account**: Has admin access to Firebase Firestore
- **Local by Default**: Runs on localhost by default (change for production)

### Authentication System:
- Uses Firebase Authentication for user verification
- Username-based login (converted to email format internally)
- Session-based authentication with secure cookies
- Default admin account created on first startup
- Only `superadmin` role can access admin pages

### Recommended Improvements:
- Change default `SESSION_SECRET` in production (line 48 of `main.py`)
- Use environment variables for sensitive configuration
- Implement HTTPS/SSL for production deployment
- Add input validation and sanitization for all user inputs
- Implement rate limiting to prevent abuse
- Add audit logging for all admin actions
- Consider two-factor authentication for sensitive operations
- Regular password changes for admin accounts

## Integration with Mobile App

### How Data Flows:
1. **Admin adds crime zone** → Saved to Firebase Firestore
2. **Mobile app fetches data** → Reads from `crimeZones` collection
3. **Map displays zones** → Shows as heatmap overlay
4. **Route calculation** → Avoids high-risk zones

### Data Synchronization:
- Changes in admin tool appear immediately in mobile app
- Mobile app refreshes data when opened
- No manual sync required

## Important Notes

- **Academic Project**: This is for educational/capstone use
- **Authentication Required**: Must login as admin to access the interface
- **Default Credentials**: username `admin`, password `[default-password]` (change in production!)
- **Firebase Dependency**: Requires active Firebase project with Firestore and Authentication enabled
- **GeoJSON Support**: Crime zones can include polygon boundaries for precise mapping
- **Risk Calculation**: Risk levels automatically calculated from crime scores with manual override option
- **Statistics Dashboard**: Real-time counts of total streets and risk level breakdowns
- **Bootstrap UI**: Modern, responsive interface using Bootstrap 5

## Getting Help

If you encounter issues:
1. Check the troubleshooting section above
2. Verify Firebase project settings
3. Check Python environment and dependencies
4. Look at FastAPI server logs for errors
5. Test Firebase connection separately
6. Verify service account permissions

## License
This project is for academic/capstone use only.
