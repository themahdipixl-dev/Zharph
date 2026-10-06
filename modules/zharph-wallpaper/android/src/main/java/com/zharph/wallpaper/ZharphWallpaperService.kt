package com.zharph.wallpaper

import android.app.WallpaperColors
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.os.Handler
import android.os.Looper
import android.service.wallpaper.WallpaperService
import android.view.SurfaceHolder
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.max
import kotlin.math.min

class ZharphWallpaperService : WallpaperService() {
  override fun onCreateEngine(): Engine = ZharphEngine()

  inner class ZharphEngine : Engine() {
    private val handler = Handler(Looper.getMainLooper())
    private var visible = false
    private var image: Bitmap? = null

    private val redraw = object : Runnable {
      override fun run() {
        if (!visible) return
        draw()
        scheduleNextMinute()
      }
    }

    override fun onCreate(surfaceHolder: SurfaceHolder) {
      super.onCreate(surfaceHolder)
      surfaceHolder.setFormat(android.graphics.PixelFormat.RGBA_8888)
      loadImage()
    }

    override fun onSurfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
      super.onSurfaceChanged(holder, format, width, height)
      draw()
    }

    override fun onSurfaceCreated(holder: SurfaceHolder) {
      super.onSurfaceCreated(holder)
      draw()
    }

    override fun onVisibilityChanged(isVisible: Boolean) {
      visible = isVisible
      if (isVisible) {
        loadImage()
        draw()
        scheduleNextMinute()
      } else {
        handler.removeCallbacks(redraw)
      }
    }

    override fun onSurfaceDestroyed(holder: SurfaceHolder) {
      handler.removeCallbacks(redraw)
      super.onSurfaceDestroyed(holder)
    }

    override fun onDestroy() {
      handler.removeCallbacks(redraw)
      image?.recycle()
      image = null
      super.onDestroy()
    }

    override fun onComputeColors(): WallpaperColors? {
      val bitmap = image ?: return null
      return WallpaperColors.fromBitmap(bitmap)
    }

    private fun loadImage() {
      val prefs = getSharedPreferences(ZharphWallpaperModule.PREFS, MODE_PRIVATE)
      val path = prefs.getString(ZharphWallpaperModule.KEY_IMAGE, null) ?: return
      val file = File(path)
      if (!file.exists()) return
      image?.recycle()
      image = BitmapFactory.decodeFile(file.absolutePath)
    }

    private fun scheduleNextMinute() {
      handler.removeCallbacks(redraw)
      val delay = 60_000L - (System.currentTimeMillis() % 60_000L) + 250L
      handler.postDelayed(redraw, delay)
    }

    private fun draw() {
      val canvas = try { surfaceHolder.lockCanvas() } catch (_: Exception) { null } ?: return
      try {
        val width = canvas.width.toFloat()
        val height = canvas.height.toFloat()
        canvas.drawColor(Color.BLACK)

        image?.let { bitmap ->
          val src = centerCropSource(bitmap, width, height)
          val dst = Rect(0, 0, width.toInt(), height.toInt())
          canvas.drawBitmap(bitmap, src, dst, bitmapPaint)
        }

        drawClock(canvas, width, height)
      } finally {
        surfaceHolder.unlockCanvasAndPost(canvas)
      }
    }

    private fun centerCropSource(bitmap: Bitmap, width: Float, height: Float): Rect {
      val scale = max(width / bitmap.width, height / bitmap.height)
      val sourceWidth = min(bitmap.width.toFloat(), width / scale)
      val sourceHeight = min(bitmap.height.toFloat(), height / scale)
      val left = ((bitmap.width - sourceWidth) / 2f).toInt()
      val top = ((bitmap.height - sourceHeight) / 2f).toInt()
      return Rect(left, top, (left + sourceWidth).toInt(), (top + sourceHeight).toInt())
    }

    private fun drawClock(canvas: Canvas, width: Float, height: Float) {
      val prefs = getSharedPreferences(ZharphWallpaperModule.PREFS, MODE_PRIVATE)
      val nx = prefs.getFloat(ZharphWallpaperModule.KEY_NX, 0.18f)
      val ny = prefs.getFloat(ZharphWallpaperModule.KEY_NY, 0.07f)
      val boxWidth = width * 0.64f
      val boxHeight = width * 0.30f
      val left = nx * width
      val top = ny * height
      val centerX = left + boxWidth / 2f

      val time = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
      val date = SimpleDateFormat("EEE, d MMM", Locale.getDefault()).format(Date())

      timePaint.textSize = width * 0.22f
      datePaint.textSize = width * 0.05f
      timePaint.textAlign = Paint.Align.CENTER
      datePaint.textAlign = Paint.Align.CENTER

      canvas.drawText(time, centerX, top + boxHeight * 0.61f, timePaint)
      canvas.drawText(date, centerX, top + boxHeight * 0.84f, datePaint)
    }

    private val bitmapPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    private val timePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.WHITE
      typeface = android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.NORMAL)
      setShadowLayer(10f, 0f, 2f, 0x66000000)
    }
    private val datePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = 0xE6FFFFFF.toInt()
      typeface = android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.NORMAL)
      setShadowLayer(6f, 0f, 1f, 0x66000000)
    }
  }
}
