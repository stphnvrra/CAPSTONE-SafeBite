package com.safebite

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import android.os.Bundle
import android.view.WindowManager

// Hosts the RN root view and clears FLAG_SECURE to allow screenshots for debugging
class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "safebite"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  // Initializes the Activity and ensures secure-flag is cleared after creation
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Ensure screenshots are allowed even if a library sets FLAG_SECURE.
    window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
  }

  // Re-applies the clear-flag on resume in case other screens re-enabled it
  override fun onResume() {
    super.onResume()
    // Re-clear in case any screen re-applies the secure flag.
    window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
  }
}
