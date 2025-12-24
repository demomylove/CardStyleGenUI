package com.senseauto.audio

import com.popkter.common.application_ext.ApplicationModule
import com.popkter.common.log_ext.Logger
import com.senseauto.audio.listener.IAsrManagerListener
import com.senseauto.audio.listener.ITtsManagerListener
import com.senseauto.audio.listener.IWakeupManagerListener
import com.senseauto.audiolib.asr.AsrManager
import com.senseauto.audiolib.asr.IAsrListener
import com.senseauto.audiolib.tts.ITtsListener
import com.senseauto.audiolib.tts.TtsManager
import com.senseauto.audiolib.wakeup.IWakeupListener
import com.senseauto.audiolib.wakeup.WakeupManager

class AudioManager : IAsrListener, ITtsListener, IWakeupListener {
    companion object {
        val instance by lazy { AudioManager() }
        const val TAG = "AudioManager"
    }

    private lateinit var asrManager: AsrManager
    private lateinit var ttsManager: TtsManager
    private lateinit var wakeupManager: WakeupManager
    private lateinit var asrListener: IAsrManagerListener
    private lateinit var ttsListener: ITtsManagerListener
    private lateinit var wakeupListener: IWakeupManagerListener

    /**
     * Wakeup
     */
    fun initWakeUp(wakeupType: String, listener: IWakeupManagerListener, clazz: Class<*>) {
        Logger.i("initWakeUp, wakeupType is $wakeupType, class:${clazz.simpleName}")
        if (wakeupType == "unisound") {
            wakeupManager = WakeupManager(wakeupType, ApplicationModule.application)
        } else {
            // todo
        }
        wakeupListener = listener
        wakeupManager.setWakeupListener(this)

        when (clazz.simpleName) {
            "BYDActivity" -> {
                wakeupManager.addWakeupWord("小迪")
                wakeupManager.addWakeupWord("你好小迪")
                wakeupManager.addWakeupWord("hello小迪")
                wakeupManager.addWakeupWord("哈喽小迪")
                wakeupManager.addWakeupWord("小迪小迪")
            }

            else -> {
                wakeupManager.addWakeupWord("你好小影")
                wakeupManager.addWakeupWord("hello小影")
                wakeupManager.addWakeupWord("哈喽小影")
            }
        }
        wakeupManager.init()
    }

    fun startWakeup() {
        wakeupManager.start()
    }

    fun stopWakeup() {
        wakeupManager.stop()
    }

    fun playWakeUpSound() {
        Logger.i("playWakeUpSound")
        wakeupManager.playNotificationSound()
    }

    fun releaseWakeUp() {
        wakeupManager.release()
    }

    override fun OnWakeupEnd() {
        Logger.i("OnWakeupEnd")
        wakeupListener.OnWakeupEnd()
    }

    override fun onWakeupError(p0: Int, p1: String?) {
        Logger.i("onWakeupError")
        wakeupListener.onWakeupError(p0, p1 ?: "")
    }

    /**
     * ASR
     */
    /*    fun initAsr(asrType: String, listener: IAsrManagerListener, duplexSwitch: Boolean) {
            Logger.i("initTTS: asrType is $asrType, duplexSwitch is $duplexSwitch")
            if (asrType == "unisound") {
                asrManager = AsrManager(asrType, ApplicationModule.application)
            } else if (asrType == "iflytek") {
                // todo
            } else {
                // 抛出异常
            }
            asrListener = listener
            asrManager.setAsrListener(this@AudioManager)
            // 需要在init前配置全双工与否，否则不生效
            asrManager.setFullDuplexMode(duplexSwitch)
            asrManager.init()
        }*/

    fun initAsr(
        asrType: String,
        listener: IAsrManagerListener,
        duplexSwitch: Boolean,
        hotwordJsonStr: String,
    ) {
        val jsonString = ApplicationModule.application.readJsonFromAssets("hotword.json")
        Logger.i("initAsr: asrType is $asrType, duplexSwitch is $duplexSwitch")
        Logger.i("initAsr: hotword jsonStr is $jsonString")
        if (asrType == "unisound") {
            asrManager = AsrManager(asrType, ApplicationModule.application)
        } else if (asrType == "iflytek") {
            asrManager = AsrManager(asrType, ApplicationModule.application)
        } else {
            // 抛出异常
        }
        asrListener = listener
        asrManager.setAsrListener(this@AudioManager)
        // 需要在init前配置全双工与否，否则不生效
        asrManager.setFullDuplexMode(duplexSwitch)
        asrManager.uploadHotword(jsonString)
        asrManager.init()
    }

    fun startAsr() {
        Logger.i("startAsr")
        asrManager.start()
    }

    fun stopAsr() {
        if (this::asrManager.isInitialized) {
            Logger.i("stopAsr")
            asrManager.stop()
        }
    }

    fun releaseAsr() {
        Logger.i("releaseAsr")
        asrManager.release()
    }

    fun uploadHotWords(hotWordJsonStr: String) {
        Logger.i("startTTS")
        asrManager.uploadHotword(hotWordJsonStr)

    }

    override fun onAsrBegin() {
        asrListener.onAsrBegin()
    }

    override fun onAsrResult(p0: String?) {
        asrListener.onAsrResult(p0 ?: "")
    }

    override fun onAsrEnd(p0: String?) {
        asrListener.onAsrEnd(p0)
    }

    override fun onAsrError(p0: Int, p1: String?) {
        Logger.i("onAsrError: code=$p0, message=${p1 ?: ""}")
        asrListener.onAsrError(p0, p1 ?: "")
        
        // 如果是持续模式，尝试自动重启ASR
        // 这里不需要直接重启，因为VoiceInputModule会处理
    }

    /**
     * TTS
     */
    fun initTTS(ttsType: String, listener: ITtsManagerListener, voiceType: String) {
        Logger.i("initTTS: ttsType is $ttsType")
        if (ttsType == "unisound") {
            ttsManager = TtsManager(ttsType, ApplicationModule.application)
        } else {
            // todo
        }
        ttsListener = listener
        ttsManager.setTtsListener(this)
        ttsManager.setVoice(voiceType)
        ttsManager.init()
    }

    fun initTTS(ttsType: String, listener: ITtsManagerListener) {
        Logger.i("initTTS: ttsType is $ttsType")
        if (ttsType == "unisound") {
            ttsManager = TtsManager(ttsType, ApplicationModule.application)
        } else {
            // todo
        }
        ttsListener = listener
        ttsManager.setTtsListener(this)
        ttsManager.init()
    }

    fun startTTS(ttsString: String) {
        Logger.i("startTTS: $ttsString")
        ttsManager.start(ttsString)
    }

    fun stopTTS() {
//        Logger.i("stopTTS")
        ttsManager.stop()
    }

    fun releaseTTS() {
        Logger.i("releaseTTS")
        ttsManager.release()
    }

    fun switchTTSVoice(voiceType: String) {
        Logger.i("switchTTSVoice: $voiceType")
        ttsManager.setVoice(voiceType)
    }

    override fun onTtsStart() {
        ttsListener.onTtsStart()
    }

    override fun onTtsEnd() {
        ttsListener.onTtsEnd()
    }

    override fun onTtsError(p0: Int, p1: String?) {
        ttsListener.onTtsError(p0, p1 ?: "")
    }

}