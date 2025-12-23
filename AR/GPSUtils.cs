using UnityEngine;
using System.Collections.Generic;

public static class GPSUtils
{
    private const double EarthRadius = 6378137.0; 

    public static Vector3 GPSToMeters(double lat, double lon)
    {
        double x = EarthRadius * Mathf.Deg2Rad * (float)lon;
        double z = EarthRadius * Mathf.Deg2Rad * (float)lat;
        return new Vector3((float)x, 0, (float)z);
    }

    public static Vector3 GPSToRelativePosition(double lat, double lon, double originLat, double originLon)
    {
        Vector3 origin = GPSToMeters(originLat, originLon);
        Vector3 target = GPSToMeters(lat, lon);
        return target - origin;
    }

    public static float CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        double dlat = Mathf.Deg2Rad * (lat2 - lat1);
        double dlon = Mathf.Deg2Rad * (lon2 - lon1);
        
        double a = Mathf.Sin((float)dlat / 2) * Mathf.Sin((float)dlat / 2) +
                   Mathf.Cos(Mathf.Deg2Rad * (float)lat1) * Mathf.Cos(Mathf.Deg2Rad * (float)lat2) *
                   Mathf.Sin((float)dlon / 2) * Mathf.Sin((float)dlon / 2);
        
        double c = 2 * Mathf.Atan2(Mathf.Sqrt((float)a), Mathf.Sqrt(1 - (float)a));
        return (float)(EarthRadius * c);
    }

    public static float CalculateBearing(double lat1, double lon1, double lat2, double lon2)
    {
        double dlon = Mathf.Deg2Rad * (lon2 - lon1);
        double lat1Rad = Mathf.Deg2Rad * lat1;
        double lat2Rad = Mathf.Deg2Rad * lat2;
        
        double y = Mathf.Sin((float)dlon) * Mathf.Cos((float)lat2Rad);
        double x = Mathf.Cos((float)lat1Rad) * Mathf.Sin((float)lat2Rad) -
                   Mathf.Sin((float)lat1Rad) * Mathf.Cos((float)lat2Rad) * Mathf.Cos((float)dlon);
        
        double bearing = Mathf.Atan2((float)y, (float)x);
        return (float)(Mathf.Rad2Deg * bearing + 360) % 360;
    }

    public static List<Vector3> ConvertCoordinatesToRelativePositions(List<List<double>> coordinates, double originLat, double originLon)
    {
        List<Vector3> positions = new List<Vector3>();
        
        foreach (var coord in coordinates)
        {
            if (coord.Count >= 2)
            {
                double lon = coord[0];
                double lat = coord[1];
                Vector3 relativePos = GPSToRelativePosition(lat, lon, originLat, originLon);
                positions.Add(relativePos);
            }
        }
        
        return positions;
    }

    public static Vector3 FindClosestPointOnPolyline(Vector3 userPosition, List<Vector3> polylinePoints, out int closestSegmentIndex)
    {
        closestSegmentIndex = 0;
        Vector3 closestPoint = polylinePoints[0];
        float minDistance = Vector3.Distance(userPosition, closestPoint);

        for (int i = 0; i < polylinePoints.Count - 1; i++)
        {
            Vector3 segmentStart = polylinePoints[i];
            Vector3 segmentEnd = polylinePoints[i + 1];
            
            Vector3 pointOnSegment = ClosestPointOnLineSegment(userPosition, segmentStart, segmentEnd);
            float distance = Vector3.Distance(userPosition, pointOnSegment);

            if (distance < minDistance)
            {
                minDistance = distance;
                closestPoint = pointOnSegment;
                closestSegmentIndex = i;
            }
        }

        return closestPoint;
    }

    private static Vector3 ClosestPointOnLineSegment(Vector3 point, Vector3 lineStart, Vector3 lineEnd)
    {
        Vector3 line = lineEnd - lineStart;
        float lineLength = line.magnitude;
        
        if (lineLength == 0) return lineStart;
        
        float t = Mathf.Clamp01(Vector3.Dot(point - lineStart, line) / (lineLength * lineLength));
        return lineStart + t * line;
    }
}
