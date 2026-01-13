package com.pyshare.app;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;
import android.webkit.CookieManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DownloadPlugin")
public class DownloadPlugin extends Plugin {

    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        String filename = call.getString("filename");
        
        if (url == null || filename == null) {
            call.reject("URL and filename are required");
            return;
        }

        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            
            // Set title and description
            request.setTitle(filename);
            request.setDescription("Downloading " + filename);
            
            // Set notification visibility
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            
            // Set destination
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
            
            // Allow download over metered networks
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            
            // Get cookies if any
            String cookies = CookieManager.getInstance().getCookie(url);
            if (cookies != null) {
                request.addRequestHeader("Cookie", cookies);
            }
            
            // Get download service and enqueue file
            DownloadManager downloadManager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            long downloadId = downloadManager.enqueue(request);
            
            JSObject ret = new JSObject();
            ret.put("downloadId", downloadId);
            ret.put("success", true);
            call.resolve(ret);
            
        } catch (Exception e) {
            call.reject("Download failed: " + e.getMessage());
        }
    }
}
