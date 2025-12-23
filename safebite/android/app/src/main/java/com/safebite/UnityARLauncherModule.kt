package com.safebite

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

// Exposes native methods to check/install and launch the Unity AR companion app
class UnityARLauncherModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "UnityARLauncher"
    }
    
    @ReactMethod
    // Attempts to start the Unity app by its package name and resolves/rejects the promise
    fun launchUnityApp(packageName: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val packageManager = context.packageManager
            
            // Check if the Unity AR app is installed
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            
            if (launchIntent != null) {
                // App is installed, launch it
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(launchIntent)
                promise.resolve("Unity AR app launched successfully")
            } else {
                // App is not installed
                promise.reject("APP_NOT_INSTALLED", "Unity AR app with package name $packageName is not installed")
            }
        } catch (e: Exception) {
            promise.reject("LAUNCH_ERROR", "Failed to launch Unity AR app: ${e.message}")
        }
    }
    
    @ReactMethod
    // Returns true if the given package has a launch intent registered
    fun isUnityAppInstalled(packageName: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val packageManager = context.packageManager
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            promise.resolve(launchIntent != null)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }
}
