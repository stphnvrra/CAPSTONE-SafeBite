using UnityEngine;
using UnityEngine.UI;

public class FirebaseTestData : MonoBehaviour
{
    [Header("Test UI")]
    public Button addTestDataButton;
    public Button fetchRouteButton;
    
    void Start()
    {
        CreateTestUI();
    }
    
    void CreateTestUI()
    {
        // Create canvas for test buttons
        GameObject canvasObj = new GameObject("TestCanvas");
        Canvas canvas = canvasObj.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 99;
        
        CanvasScaler scaler = canvasObj.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1920, 1080);
        
        canvasObj.AddComponent<GraphicRaycaster>();
        
        // Add Test Data Button
        CreateTestButton(canvas.transform, "Add Test Route", new Vector2(-200, -200), AddTestRoute);
        
        // Fetch Route Button
        CreateTestButton(canvas.transform, "Fetch Route", new Vector2(-200, -250), FetchRoute);
    }
    
    void CreateTestButton(Transform parent, string text, Vector2 position, System.Action onClick)
    {
        GameObject buttonObj = new GameObject(text + "_Button");
        buttonObj.transform.SetParent(parent, false);
        
        Image buttonImage = buttonObj.AddComponent<Image>();
        buttonImage.color = Color.cyan;
        
        Button button = buttonObj.AddComponent<Button>();
        button.targetGraphic = buttonImage;
        button.onClick.AddListener(() => onClick());
        
        RectTransform buttonRect = buttonObj.GetComponent<RectTransform>();
        buttonRect.anchorMin = new Vector2(1, 1);
        buttonRect.anchorMax = new Vector2(1, 1);
        buttonRect.pivot = new Vector2(1, 1);
        buttonRect.anchoredPosition = position;
        buttonRect.sizeDelta = new Vector2(150, 40);
        
        GameObject textObj = new GameObject("Text");
        textObj.transform.SetParent(buttonObj.transform, false);
        
        Text buttonText = textObj.AddComponent<Text>();
        buttonText.text = text;
        buttonText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        buttonText.fontSize = 14;
        buttonText.color = Color.black;
        buttonText.alignment = TextAnchor.MiddleCenter;
        
        RectTransform textRect = textObj.GetComponent<RectTransform>();
        textRect.anchorMin = Vector2.zero;
        textRect.anchorMax = Vector2.one;
        textRect.offsetMin = Vector2.zero;
        textRect.offsetMax = Vector2.zero;
    }
    
    async void AddTestRoute()
    {
        if (FirebaseRouteManager.Instance != null)
        {
            await FirebaseRouteManager.Instance.AddTestRoute();
            Debug.Log("Test route added to Firebase");
        }
        else
        {
            Debug.LogError("FirebaseRouteManager not found");
        }
    }
    
    void FetchRoute()
    {
        if (FirebaseRouteManager.Instance != null)
        {
            FirebaseRouteManager.Instance.RefreshRoute();
            Debug.Log("Fetching route from Firebase");
        }
        else
        {
            Debug.LogError("FirebaseRouteManager not found");
        }
    }
}
