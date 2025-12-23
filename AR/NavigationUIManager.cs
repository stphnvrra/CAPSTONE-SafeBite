using UnityEngine;
using UnityEngine.UI;

public class NavigationUIManager : MonoBehaviour
{
    [Header("UI References")]
    public Button button2D;
    public Text navigationInfoText;
    public GameObject button2DGameObject;
    
    [Header("Button Settings")]
    public Vector2 button2DPosition = new Vector2(-20, -20); 
    public Vector2 button2DSize = new Vector2(400, 70);    
    
    [Header("Camera Settings")]
    public Transform arCamera;
    public float topDownHeight = 50f;
    public float topDownSize = 100f;
    
    [Header("External App Settings")]
    public string targetAppPackage = "com.safebite"; 
    public string targetActivity = "com.safebite.MainActivity";
    
    private Canvas uiCanvas;
    private ARNavigationManager navigationManager;
    private Vector3 originalCameraPosition;
    private Quaternion originalCameraRotation;
    private bool originalOrthographic;
    private float originalOrthographicSize;

    void Start()
    {
        SetupUI();
        navigationManager = FindFirstObjectByType<ARNavigationManager>();
        
        if (arCamera == null)
            arCamera = Camera.main.transform;
            
        if (arCamera != null)
        {
            originalCameraPosition = arCamera.position;
            originalCameraRotation = arCamera.rotation;
            Camera cam = arCamera.GetComponent<Camera>();
            if (cam != null)
            {
                originalOrthographic = cam.orthographic;
                originalOrthographicSize = cam.orthographicSize;
            }
        }
    }

    void SetupUI()
    {
        // Create UI Canvas if it doesn't exist
        if (uiCanvas == null)
        {
            GameObject canvasObj = new GameObject("NavigationCanvas");
            uiCanvas = canvasObj.AddComponent<Canvas>();
            uiCanvas.renderMode = RenderMode.ScreenSpaceOverlay;
            uiCanvas.sortingOrder = 100;
            
            CanvasScaler scaler = canvasObj.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920, 1080);
            scaler.matchWidthOrHeight = 0.5f;
            
            canvasObj.AddComponent<GraphicRaycaster>();
        }

        // Create 2D button
        Create2DButton();
        
        // Create navigation info text
        CreateNavigationInfoText();
    }

    void Create2DButton()
    {
        // Create button GameObject
        button2DGameObject = new GameObject("2D_Button");
        button2DGameObject.transform.SetParent(uiCanvas.transform, false);
        
        // Add Image component for button background
        Image buttonImage = button2DGameObject.AddComponent<Image>();
        buttonImage.color = new Color(1f, 1f, 1f, 0.95f); // Clean white background
        
        // Add Button component
        button2D = button2DGameObject.AddComponent<Button>();
        button2D.targetGraphic = buttonImage;
        button2D.onClick.AddListener(LaunchExternalApp); // Launch external app
        
        // Configure button colors for feedback
        ColorBlock colors = button2D.colors;
        colors.normalColor = Color.white;
        colors.highlightedColor = new Color(0.9f, 0.9f, 0.9f);
        colors.pressedColor = new Color(0.8f, 0.8f, 0.8f);
        colors.selectedColor = Color.white;
        button2D.colors = colors;
        
        // Position button in top-right corner
        RectTransform buttonRect = button2DGameObject.GetComponent<RectTransform>();
        buttonRect.anchorMin = new Vector2(1, 1);
        buttonRect.anchorMax = new Vector2(1, 1);
        buttonRect.pivot = new Vector2(1, 1);
        buttonRect.anchoredPosition = new Vector2(-20, -20); // Force position
        buttonRect.sizeDelta = new Vector2(400, 70); // Very wide rectangle (hardcoded)
        
        // Add text to button
        GameObject buttonTextObj = new GameObject("ButtonText");
        buttonTextObj.transform.SetParent(button2DGameObject.transform, false);
        
        Text buttonText = buttonTextObj.AddComponent<Text>();
        buttonText.text = "2D"; // Text stays as "2D" and never changes
        buttonText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        buttonText.fontSize = 28; // Font size for wide button
        buttonText.color = Color.black;
        buttonText.alignment = TextAnchor.MiddleCenter;
        buttonText.fontStyle = FontStyle.Bold;
        
        RectTransform textRect = buttonTextObj.GetComponent<RectTransform>();
        textRect.anchorMin = Vector2.zero;
        textRect.anchorMax = Vector2.one;
        textRect.offsetMin = Vector2.zero;
        textRect.offsetMax = Vector2.zero;
        
        Debug.Log($"Rectangle button created - Width: {buttonRect.sizeDelta.x}, Height: {buttonRect.sizeDelta.y}");
        Debug.Log($"2D button created - launches external app: {targetAppPackage}");
    }

    void CreateNavigationInfoText()
    {
        GameObject textObj = new GameObject("NavigationInfo");
        textObj.transform.SetParent(uiCanvas.transform, false);
        
        navigationInfoText = textObj.AddComponent<Text>();
        navigationInfoText.text = "Navigation Info";
        navigationInfoText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        navigationInfoText.fontSize = 16;
        navigationInfoText.color = Color.white;
        navigationInfoText.alignment = TextAnchor.UpperLeft;
        
        // Add shadow for better readability
        Shadow shadow = textObj.AddComponent<Shadow>();
        shadow.effectColor = Color.black;
        shadow.effectDistance = new Vector2(1, -1);
        
        // Simple position without safe area
        RectTransform textRect = textObj.GetComponent<RectTransform>();
        textRect.anchorMin = new Vector2(0, 1);
        textRect.anchorMax = new Vector2(0, 1);
        textRect.pivot = new Vector2(0, 1);
        textRect.anchoredPosition = new Vector2(20, -20);
        textRect.sizeDelta = new Vector2(300, 150);
    }

    void Update()
    {
        UpdateNavigationInfo();
    }

    void UpdateNavigationInfo()
    {
        if (navigationManager != null && navigationInfoText != null)
        {
            string info = navigationManager.GetNavigationInfo();
            navigationInfoText.text = info;
        }
    }

    // FIXED METHOD: Launch external app with multiple approaches for Android 11+
    void LaunchExternalApp()
    {
        Debug.Log("=== LAUNCHING SAFEBITE APP ===");
        
        try
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            using (AndroidJavaClass unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
            using (AndroidJavaObject currentActivity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity"))
            {
                // Method 1: Direct ComponentName approach (most reliable for Android 11+)
                Debug.Log("Attempting Method 1: Direct ComponentName launch");
                try
                {
                    using (AndroidJavaClass componentName = new AndroidJavaClass("android.content.ComponentName"))
                    using (AndroidJavaObject component = new AndroidJavaObject("android.content.ComponentName", targetAppPackage, targetActivity))
                    using (AndroidJavaObject intent = new AndroidJavaObject("android.content.Intent"))
                    {
                        intent.Call<AndroidJavaObject>("setComponent", component);
                        intent.Call<AndroidJavaObject>("setAction", "android.intent.action.MAIN");
                        intent.Call<AndroidJavaObject>("addCategory", "android.intent.category.LAUNCHER");
                        intent.Call<AndroidJavaObject>("addFlags", 0x10000000); // FLAG_ACTIVITY_NEW_TASK
                        intent.Call<AndroidJavaObject>("addFlags", 0x20000000); // FLAG_ACTIVITY_SINGLE_TOP
                        
                        currentActivity.Call("startActivity", intent);
                        Debug.Log("✅ SUCCESS: App launched via ComponentName method");
                        ShowSuccessMessage();
                        return;
                    }
                }
                catch (AndroidJavaException componentEx)
                {
                    Debug.LogWarning($"Method 1 failed: {componentEx.Message}");
                }
                
                // Method 2: Package Manager approach
                Debug.Log("Attempting Method 2: PackageManager launch intent");
                try
                {
                    using (AndroidJavaObject packageManager = currentActivity.Call<AndroidJavaObject>("getPackageManager"))
                    {
                        AndroidJavaObject intent = packageManager.Call<AndroidJavaObject>("getLaunchIntentForPackage", targetAppPackage);
                        if (intent != null)
                        {
                            intent.Call<AndroidJavaObject>("addFlags", 0x10000000); // FLAG_ACTIVITY_NEW_TASK
                            currentActivity.Call("startActivity", intent);
                            Debug.Log("✅ SUCCESS: App launched via PackageManager method");
                            ShowSuccessMessage();
                            return;
                        }
                        else
                        {
                            Debug.LogWarning("Method 2: Launch intent is null");
                        }
                    }
                }
                catch (AndroidJavaException pmEx)
                {
                    Debug.LogWarning($"Method 2 failed: {pmEx.Message}");
                }
                
                // Method 3: ADB-style approach using ActivityManager
                Debug.Log("Attempting Method 3: ActivityManager approach");
                try
                {
                    using (AndroidJavaObject intent = new AndroidJavaObject("android.content.Intent"))
                    {
                        intent.Call<AndroidJavaObject>("setClassName", targetAppPackage, targetActivity);
                        intent.Call<AndroidJavaObject>("addFlags", 0x10000000); // FLAG_ACTIVITY_NEW_TASK
                        currentActivity.Call("startActivity", intent);
                        Debug.Log("✅ SUCCESS: App launched via ActivityManager method");
                        ShowSuccessMessage();
                        return;
                    }
                }
                catch (AndroidJavaException amEx)
                {
                    Debug.LogWarning($"Method 3 failed: {amEx.Message}");
                }
                
                // All methods failed
                Debug.LogError("❌ ALL LAUNCH METHODS FAILED");
                ShowAppNotFoundMessage();
            }
#elif UNITY_EDITOR
            Debug.Log($"[EDITOR SIMULATION] Would launch: {targetAppPackage}/{targetActivity}");
            ShowEditorSimulationMessage();
#else
            Debug.LogWarning("Platform not supported for external app launch");
#endif
        }
        catch (System.Exception e)
        {
            Debug.LogError($"❌ CRITICAL ERROR: {e.Message}");
            ShowAppNotFoundMessage();
        }
    }

    void ShowSuccessMessage()
    {
        GameObject messageObj = new GameObject("SuccessMessage");
        messageObj.transform.SetParent(uiCanvas.transform, false);
        
        Text messageText = messageObj.AddComponent<Text>();
        messageText.text = "✅ SafeBite App Launched!";
        messageText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        messageText.fontSize = 18;
        messageText.color = Color.green;
        messageText.alignment = TextAnchor.MiddleCenter;
        
        RectTransform messageRect = messageObj.GetComponent<RectTransform>();
        messageRect.anchorMin = new Vector2(0.5f, 0.5f);
        messageRect.anchorMax = new Vector2(0.5f, 0.5f);
        messageRect.pivot = new Vector2(0.5f, 0.5f);
        messageRect.anchoredPosition = Vector2.zero;
        messageRect.sizeDelta = new Vector2(400, 100);
        
        Destroy(messageObj, 2f);
    }

    void ShowAppNotFoundMessage()
    {
        GameObject messageObj = new GameObject("AppNotFoundMessage");
        messageObj.transform.SetParent(uiCanvas.transform, false);
        
        Text messageText = messageObj.AddComponent<Text>();
        messageText.text = "❌ Cannot launch SafeBite!\nCheck if app is enabled.";
        messageText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        messageText.fontSize = 18;
        messageText.color = Color.red;
        messageText.alignment = TextAnchor.MiddleCenter;
        
        RectTransform messageRect = messageObj.GetComponent<RectTransform>();
        messageRect.anchorMin = new Vector2(0.5f, 0.5f);
        messageRect.anchorMax = new Vector2(0.5f, 0.5f);
        messageRect.pivot = new Vector2(0.5f, 0.5f);
        messageRect.anchoredPosition = Vector2.zero;
        messageRect.sizeDelta = new Vector2(400, 100);
        
        Destroy(messageObj, 3f);
    }

    void ShowEditorSimulationMessage()
    {
        GameObject messageObj = new GameObject("EditorSimMessage");
        messageObj.transform.SetParent(uiCanvas.transform, false);
        
        Text messageText = messageObj.AddComponent<Text>();
        messageText.text = $"[EDITOR] Would launch:\n{targetActivity}";
        messageText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        messageText.fontSize = 16;
        messageText.color = Color.yellow;
        messageText.alignment = TextAnchor.MiddleCenter;
        
        RectTransform messageRect = messageObj.GetComponent<RectTransform>();
        messageRect.anchorMin = new Vector2(0.5f, 0.5f);
        messageRect.anchorMax = new Vector2(0.5f, 0.5f);
        messageRect.pivot = new Vector2(0.5f, 0.5f);
        messageRect.anchoredPosition = Vector2.zero;
        messageRect.sizeDelta = new Vector2(400, 100);
        
        Destroy(messageObj, 2f);
    }

    public void RefreshRoute()
    {
        if (navigationManager != null)
        {
            navigationManager.RefreshRoute();
        }
    }

    public void SetTargetApp(string packageName, string activityName = null)
    {
        targetAppPackage = packageName;
        if (!string.IsNullOrEmpty(activityName))
        {
            targetActivity = activityName;
        }
        Debug.Log($"Target app changed to: {packageName}/{targetActivity}");
    }
}