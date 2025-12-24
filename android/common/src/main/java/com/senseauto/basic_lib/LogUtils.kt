package com.senseauto.basic_lib

import android.util.Log

class LogUtils {
    companion object {
        var isLogIEnabled = true
        var isLogWEnabled = true
        var isLogDEnabled = true
        var isLogEEnabled = true
        fun i(TAG: String, message: String) {
            if (isLogIEnabled) {
                Log.i("EngineApp_" + TAG, message)
            }
        }

        fun w(TAG: String, message: String) {
            if (isLogWEnabled) {
                Log.w("EngineApp_" + TAG, message)
            }
        }

        fun d(TAG: String, message: String) {
            if (isLogDEnabled) {
                Log.d("EngineApp_" + TAG, message)
            }
        }

        fun e(TAG: String, message: String) {
            if (isLogEEnabled) {
                Log.e("EngineApp_" + TAG, message)
            }
        }
    }
}