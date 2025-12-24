package com.senseauto.audio

import android.content.Context
import java.io.BufferedReader
import java.io.IOException
import java.io.InputStreamReader

fun Context.readJsonFromAssets(fileName: String): String {
    try {
        val inputStream = assets.open(fileName)
        val reader = BufferedReader(InputStreamReader(inputStream))
        val jsonString = StringBuilder()
        var line: String?
        while (reader.readLine().also { line = it } != null) {
            jsonString.append(line)
        }
        reader.close()
        inputStream.close()
        val jsonStringWithoutSpaces = jsonString.toString().replace(" ", "")
        return (jsonStringWithoutSpaces)
    } catch (e: IOException) {
        e.printStackTrace()
        return ""
    }
}

fun generateConversationId() = getSystemTimeMillis().toString()
fun getSystemTimeMillis() = System.currentTimeMillis()

