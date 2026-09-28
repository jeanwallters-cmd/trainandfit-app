package com.trainandfit.app;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ImmersivePlugin.class);
        super.onCreate(savedInstanceState);
        showOverLockScreen();
        if (ImmersivePlugin.isEnabled(this)) {
            ImmersivePlugin.apply(this, true);
        }
    }

    // The app stays visible and usable on top of the lock screen: after the screen turns
    // off and on again the workout is shown immediately, without unlocking the phone.
    private void showOverLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED);
        }
    }

    // Screen off/on, notifications shade, dialogs etc. can bring the bars back – hide them again
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && ImmersivePlugin.isEnabled(this)) {
            ImmersivePlugin.apply(this, true);
        }
    }
}
