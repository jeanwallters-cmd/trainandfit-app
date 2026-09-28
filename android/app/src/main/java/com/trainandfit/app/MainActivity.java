package com.trainandfit.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ImmersivePlugin.class);
        super.onCreate(savedInstanceState);
        if (ImmersivePlugin.isEnabled(this)) {
            ImmersivePlugin.apply(this, true);
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
