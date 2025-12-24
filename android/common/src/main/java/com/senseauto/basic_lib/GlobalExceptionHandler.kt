package com.senseauto.basic_lib

import android.content.Context
import android.os.Environment
import android.util.Log
import java.io.File
import java.io.FileWriter
import java.io.IOException
import java.io.PrintWriter
import java.text.SimpleDateFormat
import java.util.*

class GlobalExceptionHandler(private val context: Context) : Thread.UncaughtExceptionHandler {

    val TAG = "GlobalExceptionHandler"
    private val defaultExceptionHandler: Thread.UncaughtExceptionHandler? = Thread.getDefaultUncaughtExceptionHandler()

    override fun uncaughtException(thread: Thread, ex: Throwable) {
        handleException(ex)
        defaultExceptionHandler?.uncaughtException(thread, ex)
    }

    private fun handleException(ex: Throwable) {
        // 记录日志
        Log.e(TAG, "Uncaught exception: ${ex.message}", ex)
        // 保存异常信息到文件
        saveExceptionToFile(ex)
    }

    private fun saveExceptionToFile(ex: Throwable) {
        val fileName = "Crash-${SimpleDateFormat("yyyy-MM-dd_HH-mm-ss", Locale.getDefault()).format(Date())}.txt"
        val logDir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "小影/Crashes")

        // 确保目录存在
        if (!logDir.exists() && !logDir.mkdirs()) {
            Log.e(TAG, "Failed to create directory: ${logDir.absolutePath}")
            return
        }
        val file = File(logDir, fileName)
        // 确保文件存在
        if (!file.exists() && !file.createNewFile()) {
            Log.e(TAG, "Failed to create file: ${file.absolutePath}")
            return
        }
        try {
            FileWriter(file).use { writer ->
                ex.printStackTrace(PrintWriter(writer))
            }
        } catch (e: IOException) {
            e.printStackTrace()
        }
    }
}