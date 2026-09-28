package com.trainandfit.app;

import android.app.Activity;
import android.content.Context;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Sticky immersive full screen: hides the status and navigation bars and keeps them hidden
 * after the screen is turned off/on or the app returns from the background.
 * The choice is persisted, so the app also starts in full screen next time.
 */
@CapacitorPlugin(name = "Immersive")
public class ImmersivePlugin extends Plugin {

    private static final String PREFS = "immersive";
    private static final String KEY_ENABLED = "enabled";

    public static boolean isEnabled(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false);
    }

    public static void apply(Activity activity, boolean enabled) {
        Window window = activity.getWindow();
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        if (enabled) {
            // Bars appear temporarily on swipe and hide again by themselves
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            controller.hide(WindowInsetsCompat.Type.systemBars());
        } else {
            controller.show(WindowInsetsCompat.Type.systemBars());
        }
    }

    @PluginMethod
    public void setImmersive(PluginCall call) {
        final boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY_ENABLED, enabled).apply();
        getActivity().runOnUiThread(() -> {
            apply(getActivity(), enabled);
            call.resolve();
        });
    }

    @PluginMethod
    public void isImmersive(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("enabled", isEnabled(getContext()));
        call.resolve(ret);
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (isEnabled(getContext())) {
            getActivity().runOnUiThread(() -> apply(getActivity(), true));
        }
    }
}
