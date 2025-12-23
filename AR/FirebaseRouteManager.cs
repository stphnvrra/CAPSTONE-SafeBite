using UnityEngine;
using Firebase.Firestore;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq;

[System.Serializable]
public class RouteGeometry
{
    public string type;
    public List<List<double>> coordinates;
}

[System.Serializable]
public class RouteGeometryFlat
{
    public string type;
    public List<double> coordinates; // Flat array: [lon, lat, lon, lat, ...]
}

[System.Serializable]
public class RouteOrigin
{
    public double lon;
    public double lat;
}

[System.Serializable]
public class RouteDestination
{
    public double lon;
    public double lat;
}

[System.Serializable]
public class RouteData
{
    public RouteOrigin origin;
    public RouteDestination destination;
    public RouteGeometry geometry;
    public string userId;
    public object createdAt;
}

[System.Serializable]
public class RouteDataFlat
{
    public RouteOrigin origin;
    public RouteDestination destination;
    public RouteGeometryFlat geometry;
    public string userId;
    public object createdAt;
}

public class FirebaseRouteManager : MonoBehaviour
{
    public static FirebaseRouteManager Instance;
    
    [Header("Firebase Settings")]
    private FirebaseFirestore db;
    
    [Header("Coordinate Format Settings")]
    public bool autoDetectFormat = true; // Auto-detect flat vs nested arrays
    public bool preferFlatArray = false; // If true, try flat array format first
    
    [Header("Events")]
    public System.Action<RouteData> OnRouteDataReceived;
    
    [Header("Debug")]
    public bool enableDebugLogs = true;
    
    private bool isInitialized = false;

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    void Start()
    {
        InitializeFirebase();
    }

    private async void InitializeFirebase()
    {
        try
        {
            db = FirebaseFirestore.DefaultInstance;
            isInitialized = true;
            
            if (enableDebugLogs)
                Debug.Log("Firebase Firestore initialized successfully");
            
            // Automatically fetch the latest route
            await FetchLatestRoute();
        }
        catch (Exception e)
        {
            Debug.LogError($"Failed to initialize Firebase: {e.Message}");
        }
    }

    public async Task FetchLatestRoute()
    {
        if (!isInitialized)
        {
            Debug.LogWarning("Firebase not initialized yet");
            return;
        }

        try
        {
            if (enableDebugLogs)
                Debug.Log("Fetching latest route from Firestore...");
            
            Query routesQuery = db.Collection("routes")
                .OrderByDescending("createdAt")
                .Limit(1);

            QuerySnapshot querySnapshot = await routesQuery.GetSnapshotAsync();

            if (querySnapshot.Count > 0)
            {
                DocumentSnapshot document = querySnapshot.Documents.First();
                RouteData routeData = ParseRouteDocument(document);
                
                if (routeData != null)
                {
                    if (enableDebugLogs)
                    {
                        Debug.Log($"Route fetched successfully: {document.Id}");
                        Debug.Log($"Origin: {routeData.origin.lat}, {routeData.origin.lon}");
                        Debug.Log($"Destination: {routeData.destination.lat}, {routeData.destination.lon}");
                        Debug.Log($"Coordinates count: {routeData.geometry.coordinates.Count}");
                    }
                    
                    OnRouteDataReceived?.Invoke(routeData);
                }
            }
            else
            {
                Debug.LogWarning("No routes found in Firestore");
            }
        }
        catch (Exception e)
        {
            Debug.LogError($"Error fetching route: {e.Message}");
        }
    }

    private RouteData ParseRouteDocument(DocumentSnapshot document)
    {
        try
        {
            // Parse basic route data
            var data = document.ToDictionary();
            
            RouteData routeData = new RouteData
            {
                origin = new RouteOrigin
                {
                    lat = GetDoubleValue(data, "origin", "lat"),
                    lon = GetDoubleValue(data, "origin", "lon")
                },
                destination = new RouteDestination
                {
                    lat = GetDoubleValue(data, "destination", "lat"),
                    lon = GetDoubleValue(data, "destination", "lon")
                },
                userId = GetStringValue(data, "userId"),
                createdAt = data.ContainsKey("createdAt") ? data["createdAt"] : null
            };

            // Parse geometry with flat array support
            if (data.ContainsKey("geometry") && data["geometry"] is Dictionary<string, object> geometryDict)
            {
                routeData.geometry = new RouteGeometry
                {
                    type = geometryDict.ContainsKey("type") ? geometryDict["type"].ToString() : "LineString"
                };

                if (geometryDict.ContainsKey("coordinates"))
                {
                    var coordsObj = geometryDict["coordinates"];
                    
                    if (coordsObj is List<object> coordsList)
                    {
                        // Check if it's flat array (numbers) or nested array (arrays)
                        if (coordsList.Count > 0 && coordsList[0] is double || coordsList[0] is long)
                        {
                            // Flat array: [lon, lat, lon, lat, ...]
                            routeData.geometry.coordinates = ConvertFlatListToNested(coordsList);
                            if (enableDebugLogs)
                                Debug.Log($"Processed flat coordinate array with {coordsList.Count} elements");
                        }
                        else
                        {
                            // Already nested array: [[lon, lat], [lon, lat], ...]
                            routeData.geometry.coordinates = ConvertNestedListToNested(coordsList);
                            if (enableDebugLogs)
                                Debug.Log($"Processed nested coordinate array with {coordsList.Count} pairs");
                        }
                    }
                }
            }

            if (enableDebugLogs)
            {
                Debug.Log($"Route parsed successfully");
                Debug.Log($"Origin: {routeData.origin.lat}, {routeData.origin.lon}");
                Debug.Log($"Destination: {routeData.destination.lat}, {routeData.destination.lon}");
                Debug.Log($"Coordinates: {routeData.geometry?.coordinates?.Count} points");
            }

            return routeData;
        }
        catch (Exception e)
        {
            Debug.LogError($"Error parsing route document: {e.Message}");
            return null;
        }
    }

    private double GetDoubleValue(Dictionary<string, object> data, string parentKey, string childKey)
    {
        if (data.ContainsKey(parentKey) && data[parentKey] is Dictionary<string, object> parent)
        {
            if (parent.ContainsKey(childKey))
            {
                var value = parent[childKey];
                if (value is double d) return d;
                if (value is long l) return (double)l;
                if (value is float f) return (double)f;
                if (double.TryParse(value.ToString(), out double result)) return result;
            }
        }
        return 0.0;
    }

    private string GetStringValue(Dictionary<string, object> data, string key)
    {
        return data.ContainsKey(key) ? data[key]?.ToString() ?? "" : "";
    }

    private List<List<double>> ConvertFlatListToNested(List<object> flatList)
    {
        List<List<double>> nested = new List<List<double>>();
        
        for (int i = 0; i < flatList.Count - 1; i += 2)
        {
            double lon = ConvertToDouble(flatList[i]);
            double lat = ConvertToDouble(flatList[i + 1]);
            nested.Add(new List<double> { lon, lat });
        }
        
        return nested;
    }

    private List<List<double>> ConvertNestedListToNested(List<object> nestedList)
    {
        List<List<double>> result = new List<List<double>>();
        
        foreach (var item in nestedList)
        {
            if (item is List<object> pair && pair.Count >= 2)
            {
                double lon = ConvertToDouble(pair[0]);
                double lat = ConvertToDouble(pair[1]);
                result.Add(new List<double> { lon, lat });
            }
        }
        
        return result;
    }

    private double ConvertToDouble(object value)
    {
        if (value is double d) return d;
        if (value is long l) return (double)l;
        if (value is float f) return (double)f;
        if (double.TryParse(value?.ToString(), out double result)) return result;
        return 0.0;
    }

    public async void RefreshRoute()
    {
        if (isInitialized)
        {
            await FetchLatestRoute();
        }
    }

    // Method to add test route data with flat coordinates (for development)
    public async Task AddTestRouteFlatFormat()
    {
        if (!isInitialized) return;

        try
        {
            var testRouteFlat = new
            {
                origin = new { lat = 8.94720, lon = 125.54306 },
                destination = new { lat = 8.98002, lon = 125.60001 },
                geometry = new
                {
                    type = "LineString",
                    coordinates = new List<double>
                    {
                        125.54306, 8.94720,  // First point: [lon, lat]
                        125.55000, 8.95000,  // Second point: [lon, lat]
                        125.56000, 8.96000,  // Third point: [lon, lat]
                        125.58000, 8.97000,  // Fourth point: [lon, lat]
                        125.60001, 8.98002   // Fifth point: [lon, lat]
                    }
                },
                userId = "test_user_flat",
                createdAt = FieldValue.ServerTimestamp
            };

            await db.Collection("routes").AddAsync(testRouteFlat);
            Debug.Log("Test route with flat coordinates added successfully");
        }
        catch (Exception e)
        {
            Debug.LogError($"Error adding test route with flat coordinates: {e.Message}");
        }
    }

    // Method to add test route data with nested coordinates (for development)
    public async Task AddTestRouteNestedFormat()
    {
        if (!isInitialized) return;

        try
        {
            RouteData testRoute = new RouteData
            {
                origin = new RouteOrigin { lat = 8.94720, lon = 125.54306 },
                destination = new RouteDestination { lat = 8.98002, lon = 125.60001 },
                geometry = new RouteGeometry
                {
                    type = "LineString",
                    coordinates = new List<List<double>>
                    {
                        new List<double> { 125.54306, 8.94720 },
                        new List<double> { 125.55000, 8.95000 },
                        new List<double> { 125.56000, 8.96000 },
                        new List<double> { 125.58000, 8.97000 },
                        new List<double> { 125.60001, 8.98002 }
                    }
                },
                userId = "test_user_nested",
                createdAt = FieldValue.ServerTimestamp
            };

            await db.Collection("routes").AddAsync(testRoute);
            Debug.Log("Test route with nested coordinates added successfully");
        }
        catch (Exception e)
        {
            Debug.LogError($"Error adding test route with nested coordinates: {e.Message}");
        }
    }

    // Legacy method for backward compatibility
    public async Task AddTestRoute()
    {
        await AddTestRouteNestedFormat();
    }

    // Public method to manually set coordinate format preference
    public void SetCoordinateFormat(bool useFlatArray)
    {
        preferFlatArray = useFlatArray;
        autoDetectFormat = false;
        
        if (enableDebugLogs)
            Debug.Log($"Coordinate format set to: {(useFlatArray ? "Flat Array" : "Nested Array")}");
    }

    // Public method to enable auto-detection
    public void EnableAutoDetection()
    {
        autoDetectFormat = true;
        
        if (enableDebugLogs)
            Debug.Log("Auto-detection enabled for coordinate format");
    }
}
