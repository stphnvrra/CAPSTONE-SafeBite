package com.safebite

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

// Registers the Unity AR launcher native module with React Native
class UnityARLauncherPackage : ReactPackage {
    
    // Provides our native module instance to RN
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(UnityARLauncherModule(reactContext))
    }
    
    // No custom native views are exposed by this package
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
