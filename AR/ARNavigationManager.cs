using UnityEngine;
using UnityEngine.XR.ARFoundation;
using System.Collections;


using System.Collections.Generic;

public class ARNavigationManager : MonoBehaviour
{
    [Header("References")]
    public LineRenderer lineRenderer;
    public GameObject arrowPrefab;
    public Transform arCamera;


    
    [Header("Navigation Settings")]
    public float navigationThreshold = 5f; 
    public float polylineHeight = 0.5f;
    public bool useFirebaseRoute = true;
    
    [Header("Firebase Route Data")]
    private RouteData currentRoute;
    private List<Vector3> routePositions = new List<Vector3>();
    private Vector3 originPosition;
    private int currentWaypointIndex = 0;
    private bool navigationActive = false;
    
    [Header("Current Navigation Info")]
    public double currentUserLat;
    public double currentUserLon;
    public float distanceToNextWaypoint;
    public float bearingToNextWaypoint;
    public string navigationStatus = "Initializing...";

    private Vector3 destinationRelative;



    void Start()
    {
        StartCoroutine(InitializeNavigation());
        
        // Subscribe to Firebase route updates
        if (useFirebaseRoute && FirebaseRouteManager.Instance != null)
        {
            FirebaseRouteManager.Instance.OnRouteDataReceived += SetupFirebaseRoute;
        }
    }

    void OnDestroy()
    {
        // Unsubscribe from Firebase route updates
        if (FirebaseRouteManager.Instance != null)
        {
            FirebaseRouteManager.Instance.OnRouteDataReceived -= SetupFirebaseRoute;
        }
    }

    IEnumerator InitializeNavigation()
    {
        navigationStatus = "Checking GPS...";
        
        if (!Input.location.isEnabledByUser)
        {
            Debug.Log("GPS not enabled!");


            navigationStatus = "GPS not enabled";
            yield break;
        }

        Input.location.Start(1f, 0.1f);
        int maxWait = 20;
        while (Input.location.status == LocationServiceStatus.Initializing && maxWait > 0)
        {


            navigationStatus = $"Initializing GPS... ({maxWait}s)";
            yield return new WaitForSeconds(1);
            maxWait--;
        }

        if (Input.location.status != LocationServiceStatus.Running)
        {
            Debug.Log("Unable to get GPS");


            navigationStatus = "GPS failed";
            yield break;
        }



        // Store origin position
        currentUserLat = Input.location.lastData.latitude;
        currentUserLon = Input.location.lastData.longitude;
        originPosition = GPSUtils.GPSToMeters(currentUserLat, currentUserLon);

        Debug.Log($"Navigation initialized at: {currentUserLat}, {currentUserLon}");
        navigationStatus = "GPS Ready";

        // Setup route based on mode
        if (useFirebaseRoute)
        {
            navigationStatus = "Waiting for Firebase route...";
            // Firebase route will be set up via callback
        }
        else
        {
            SetupManualRoute();
        }
        
        // Start navigation update loop
        StartCoroutine(NavigationUpdateLoop());
    }

    IEnumerator NavigationUpdateLoop()
    {
        while (true)
        {
            if (navigationActive && ARGPSManager.Instance != null && ARGPSManager.Instance.HasLocation)
            {
                currentUserLat = ARGPSManager.Instance.Latitude;
                currentUserLon = ARGPSManager.Instance.Longitude;
                
                UpdateNavigation();
            }
            
            yield return new WaitForSeconds(1f);
        }
    }

    private void SetupManualRoute()
    {
        navigationStatus = "Setting up manual route...";
        
        double startLat = currentUserLat;
        double startLon = currentUserLon;

        Vector3 startMeters = GPSUtils.GPSToMeters(startLat, startLon);


        Vector3 destMeters = GPSUtils.GPSToMeters(destinationLatitude, destinationLongitude);

        destinationRelative = destMeters - startMeters;



        // Simple straight line for manual route
        routePositions = new List<Vector3> { Vector3.zero, destinationRelative };
        
        SetupPolyline();
        PlaceDestinationMarker();
        
        navigationActive = true;
        currentWaypointIndex = 0;
        navigationStatus = "Manual route active";
        
        Debug.Log("Manual route navigation setup complete");
    }

    public void SetupFirebaseRoute(RouteData routeData)
    {
        navigationStatus = "Setting up Firebase route...";
        currentRoute = routeData;
        
        if (routeData?.geometry?.coordinates == null)
        {
            Debug.LogError("Invalid route data received");
            navigationStatus = "Invalid route data";
            return;
        }

        Debug.Log("Setting up Firebase route navigation...");
        
        // Use route origin as reference point
        double originLat = routeData.origin.lat;
        double originLon = routeData.origin.lon;
        
        // Convert all coordinates to relative positions
        routePositions = GPSUtils.ConvertCoordinatesToRelativePositions(
            routeData.geometry.coordinates, 
            originLat, 
            originLon
        );

        if (routePositions.Count > 0)
        {
            SetupPolyline();
            PlaceDestinationMarker();
            navigationActive = true;
            currentWaypointIndex = 0;
            navigationStatus = $"Firebase route active ({routePositions.Count} waypoints)";
            
            Debug.Log($"Firebase route navigation setup complete with {routePositions.Count} waypoints");
        }
        else
        {
            Debug.LogError("No valid route positions found");
            navigationStatus = "No valid route positions";
        }
    }

    private void SetupPolyline()
    {
        if (lineRenderer == null || routePositions.Count < 2)
        {
            Debug.LogWarning("LineRenderer not assigned or insufficient route points");
            return;
        }

        lineRenderer.positionCount = routePositions.Count;
        
        // Calculate total distance of the route
        float totalDistance = 0f;
        for (int i = 1; i < routePositions.Count; i++)
        {
            totalDistance += Vector3.Distance(routePositions[i-1], routePositions[i]);
        }
        
        // Create a straight line going forward from user position
        for (int i = 0; i < routePositions.Count; i++)
        {
            float progress = (float)i / (routePositions.Count - 1);
            Vector3 position = new Vector3(0, 0.02f, progress * totalDistance); // Lower height
            lineRenderer.SetPosition(i, position);
        }
        
        // Configure line renderer appearance to match your image
        lineRenderer.startWidth = 0.1f;  // Much thinner - like road marking
        lineRenderer.endWidth = 0.1f;    // Much thinner - like road marking
        lineRenderer.material.color = new Color(0.0f, 0.5f, 1.0f, 0.9f); // Bright blue like your image
        
        // Additional settings for better appearance
        lineRenderer.useWorldSpace = true;
        lineRenderer.textureMode = LineTextureMode.Tile;
        
        Debug.Log($"Thin precise polyline setup with {routePositions.Count} points");
    }

    private void PlaceDestinationMarker()
    {
        if (arrowPrefab != null && routePositions.Count > 0)
        {
            Vector3 destinationPos = routePositions[routePositions.Count - 1];
            Instantiate(arrowPrefab, destinationPos, Quaternion.identity);
            Debug.Log($"Destination marker placed at: {destinationPos}");
        }
    }

    private void UpdateNavigation()
    {
        if (!navigationActive || routePositions.Count == 0)
            return;

        Vector3 currentUserPosition;
        
        if (useFirebaseRoute && currentRoute != null)
        {
            // Calculate user's current position relative to route origin
            currentUserPosition = GPSUtils.GPSToRelativePosition(
                currentUserLat, 
                currentUserLon, 
                currentRoute.origin.lat, 
                currentRoute.origin.lon
            );
        }
        else
        {
            // For manual routes, use relative to original start position
            currentUserPosition = GPSUtils.GPSToRelativePosition(
                currentUserLat, 
                currentUserLon, 
                originPosition.x / (6378137.0 * Mathf.Deg2Rad), // Convert back to lat
                originPosition.z / (6378137.0 * Mathf.Deg2Rad)  // Convert back to lon
            );
        }

        // Find the closest waypoint ahead of the user
        UpdateCurrentWaypoint(currentUserPosition);
        
        // Calculate navigation information
        if (currentWaypointIndex < routePositions.Count)
        {
            Vector3 nextWaypoint = routePositions[currentWaypointIndex];
            distanceToNextWaypoint = Vector3.Distance(currentUserPosition, nextWaypoint);
            
            // Calculate bearing to next waypoint
            if (useFirebaseRoute && currentRoute != null && currentWaypointIndex < currentRoute.geometry.coordinates.Count)
            {
                var nextCoord = currentRoute.geometry.coordinates[currentWaypointIndex];
                bearingToNextWaypoint = GPSUtils.CalculateBearing(
                    currentUserLat, currentUserLon,
                    nextCoord[1], nextCoord[0]
                );
            }
            else
            {
                bearingToNextWaypoint = GPSUtils.CalculateBearing(
                    currentUserLat, currentUserLon,
                    destinationLatitude, destinationLongitude
                );
            }
            
            // Check if we've reached the destination
            if (currentWaypointIndex >= routePositions.Count - 1 && distanceToNextWaypoint < navigationThreshold)
            {
                Debug.Log("Navigation complete - destination reached!");
                navigationActive = false;
                navigationStatus = "Destination reached!";
            }
            else
            {
                navigationStatus = $"Navigating to waypoint {currentWaypointIndex + 1}/{routePositions.Count}";
            }
        }
    }

    private void UpdateCurrentWaypoint(Vector3 userPosition)
    {
        float minDistance = float.MaxValue;
        int closestIndex = currentWaypointIndex;
        
        // Look for the next waypoint to navigate to
        for (int i = currentWaypointIndex; i < routePositions.Count; i++)
        {
            float distance = Vector3.Distance(userPosition, routePositions[i]);
            
            if (distance < navigationThreshold)
            {
                // User has reached this waypoint, move to next
                currentWaypointIndex = Mathf.Min(i + 1, routePositions.Count - 1);
                Debug.Log($"Reached waypoint {i}, moving to next: {currentWaypointIndex}");
                break;
            }
            
            if (distance < minDistance)
            {
                minDistance = distance;
                closestIndex = i;
            }
        }
        
        // If we haven't passed any waypoints, navigate to the closest one
        if (currentWaypointIndex == closestIndex)
        {
            currentWaypointIndex = closestIndex;
        }
    }

    public void RefreshRoute()
    {
        if (useFirebaseRoute && FirebaseRouteManager.Instance != null)
        {
            FirebaseRouteManager.Instance.RefreshRoute();
        }
        else
        {
            SetupManualRoute();
        }
    }

    public string GetNavigationInfo()
    {
        if (!navigationActive)
            return navigationStatus;
            
        return $"Status: {navigationStatus}\nDistance: {distanceToNextWaypoint:F1}m\nBearing: {bearingToNextWaypoint:F0}°\nWaypoint: {currentWaypointIndex + 1}/{routePositions.Count}";
    }

    // Public method to toggle between Firebase and manual mode
    public void ToggleRouteMode()
    {
        useFirebaseRoute = !useFirebaseRoute;
        
        if (useFirebaseRoute)
        {
            navigationStatus = "Switching to Firebase mode...";
            if (FirebaseRouteManager.Instance != null)
            {
                FirebaseRouteManager.Instance.OnRouteDataReceived += SetupFirebaseRoute;
                FirebaseRouteManager.Instance.RefreshRoute();
            }
        }
        else
        {
            navigationStatus = "Switching to manual mode...";
            if (FirebaseRouteManager.Instance != null)
            {
                FirebaseRouteManager.Instance.OnRouteDataReceived -= SetupFirebaseRoute;
            }
            SetupManualRoute();
        }
    }
}

