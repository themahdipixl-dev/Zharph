package com.zharph.wallpaper

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class ZharphWallpaperModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ZharphWallpaper")

    AsyncFunction("applyWallpaper") { imageUri: String, foregroundMasks: List<String>, nx: Double, ny: Double ->
      val context = requireNotNull(appContext.reactContext)
      val target = File(context.filesDir, "zharph-wallpaper.jpg")
      copyImage(context, imageUri, target)

      val maskDir = File(context.filesDir, "zharph-masks")
      if (maskDir.exists()) maskDir.deleteRecursively()

      if (foregroundMasks.isNotEmpty()) {
        maskDir.mkdirs()
        foregroundMasks.forEachIndexed { index, base64 ->
          writeBase64Png(base64, File(maskDir, "mask-$index.png"))
        }
      }

      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_IMAGE, target.absolutePath)
        .putString(KEY_MASK_DIR, if (foregroundMasks.isNotEmpty()) maskDir.absolutePath else null)
        .putFloat(KEY_NX, nx.toFloat().coerceIn(0f, 1f))
        .putFloat(KEY_NY, ny.toFloat().coerceIn(0f, 1f))
        .apply()

      val intent = Intent("android.service.wallpaper.CHANGE_LIVE_WALLPAPER").apply {
        putExtra(
          "android.service.wallpaper.extra.LIVE_WALLPAPER_COMPONENT",
          ComponentName(context, ZharphWallpaperService::class.java)
        )
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }

      Handler(Looper.getMainLooper()).post { context.startActivity(intent) }
      true
    }
  }

  private fun writeBase64Png(base64: String, target: File) {
    val temporary = File(target.parentFile, target.name + ".tmp")
    if (temporary.exists()) temporary.delete()
    val clean = base64.substringAfter(',', base64)
    val bytes = Base64.decode(clean, Base64.DEFAULT)
    FileOutputStream(temporary).use { it.write(bytes) }

    if (!temporary.renameTo(target)) {
      temporary.copyTo(target, overwrite = true)
      temporary.delete()
    }
  }

  private fun copyImage(context: Context, source: String, target: File) {
    val temporary = File(target.parentFile, target.name + ".tmp")
    if (temporary.exists()) temporary.delete()

    when {
      source.startsWith("http://", true) || source.startsWith("https://", true) -> {
        val connection = URL(source).openConnection() as HttpURLConnection
        connection.connectTimeout = 15000
        connection.readTimeout = 30000
        connection.instanceFollowRedirects = true
        connection.connect()
        if (connection.responseCode !in 200..299) {
          connection.disconnect()
          throw IllegalStateException("Could not download wallpaper image (${connection.responseCode})")
        }
        connection.inputStream.use { input ->
          FileOutputStream(temporary).use { output -> input.copyTo(output) }
        }
        connection.disconnect()
      }
      source.startsWith("content://", true) -> {
        val input = context.contentResolver.openInputStream(Uri.parse(source))
          ?: throw IllegalStateException("Could not open selected image")
        input.use { stream ->
          FileOutputStream(temporary).use { output -> stream.copyTo(output) }
        }
      }
      else -> {
        val path = source.removePrefix("file://")
        File(path).inputStream().use { input ->
          FileOutputStream(temporary).use { output -> input.copyTo(output) }
        }
      }
    }

    if (!temporary.renameTo(target)) {
      temporary.copyTo(target, overwrite = true)
      temporary.delete()
    }
  }

  companion object {
    const val PREFS = "zharph_wallpaper"
    const val KEY_IMAGE = "image_path"
    const val KEY_MASK_DIR = "mask_dir"
    const val KEY_NX = "clock_nx"
    const val KEY_NY = "clock_ny"
  }
}
