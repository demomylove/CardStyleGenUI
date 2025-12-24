package com.senseauto.audio

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.senseauto.audio.listener.IAsrManagerListener

class VoiceInputModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var asrManagerListener: IAsrManagerListener? = null
    private var isAsrInitialized = false
    private var promise: Promise? = null

    override fun getName() = "VoiceInput"

    init {
        // 初始化ASR监听器
        asrManagerListener = object : IAsrManagerListener {
            override fun onAsrBegin() {
                // 发送开始识别事件
                sendEvent("onAsrBegin", null)
            }

            override fun onAsrResult(resultStr: String) {
                // 发送识别结果事件
                val params = Arguments.createMap()
                params.putString("result", resultStr)
                sendEvent("onAsrResult", params)
            }

            override fun onAsrEnd(p0: String?) {
                // 发送识别结束事件
                val params = Arguments.createMap()
                params.putString("finalResult", p0 ?: "")
                sendEvent("onAsrEnd", params)
                
                // 解决Promise
                promise?.resolve(p0 ?: "")
                promise = null
            }

            override fun onAsrError(code: Int, message: String) {
                // 发送错误事件
                val params = Arguments.createMap()
                params.putInt("code", code)
                params.putString("message", message)
                sendEvent("onAsrError", params)
                
                // 非持续模式，拒绝Promise
                promise?.reject("ASR_ERROR_$code", message)
                promise = null
            }
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun initAsr(asrType: String, duplexSwitch: Boolean, hotwordJsonStr: String, promise: Promise) {
        try {
            if (!isAsrInitialized) {
                AudioManager.instance.initAsr(asrType, asrManagerListener!!, duplexSwitch, hotwordJsonStr)
                isAsrInitialized = true
            }
            promise.resolve("ASR initialized successfully")
        } catch (e: Exception) {
            promise.reject("ASR_INIT_ERROR", e.message)
        }
    }

    @ReactMethod
    fun startAsr(promise: Promise) {
        try {
            if (!isAsrInitialized) {
                promise.reject("ASR_NOT_INITIALIZED", "ASR not initialized. Call initAsr first.")
                return
            }
            
            this.promise = promise
            AudioManager.instance.startAsr()
        } catch (e: Exception) {
            promise.reject("ASR_START_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopAsr(promise: Promise) {
        try {
            AudioManager.instance.stopAsr()
            promise.resolve("ASR stopped")
        } catch (e: Exception) {
            promise.reject("ASR_STOP_ERROR", e.message)
        }
    }

    @ReactMethod
    fun releaseAsr(promise: Promise) {
        try {
            if (isAsrInitialized) {
                AudioManager.instance.releaseAsr()
                isAsrInitialized = false
            }
            // 如果有正在进行的 ASR 操作，取消它
            this.promise?.reject("ASR_CANCELLED", "ASR released")
            this.promise = null
            promise.resolve("ASR released")
        } catch (e: Exception) {
            promise.reject("ASR_RELEASE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for event emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for event emitter
    }
}