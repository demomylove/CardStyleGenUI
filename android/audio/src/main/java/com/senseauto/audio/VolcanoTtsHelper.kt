package com.senseauto.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.util.Log
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.net.URLEncoder

class VolcanoTtsHelper private constructor() :
    CoroutineScope by CoroutineScope(Dispatchers.Main + SupervisorJob()) {

    companion object {
        val INSTANCE by lazy { VolcanoTtsHelper() }
        private const val VOLCANO_TTS_BASE_URI = "http://popkter.com:10012"
        private const val TAG = "VolcanoTtsHelper"
    }

    private val audioAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ASSISTANT)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
        .build()

    private val focusRequest: AudioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
        .setAudioAttributes(audioAttributes)
        .setAcceptsDelayedFocusGain(true)
        .setOnAudioFocusChangeListener {
            // 处理音频焦点变化的逻辑
        }
        .build()

    private val processing = Mutex(false)

    /**
     * 播放状态
     */
    private val _ttsBuffer = StringBuffer()

    /**
     * 断句
     */
    private val sentenceEndRegex = Regex(".*[，。？～！;]")

    /**
     * 播放器
     */
    private lateinit var ttsPlayer: ExoPlayer

    /**
     * 音频管理
     */
    private var audioManager: AudioManager? = null

    /**
     * 音色
     */
    var voiceType: String = VolcanoTtsVoice.Xiaoying.name

    private val playerStatusFlow = MutableStateFlow<VolcanoTtsStatus>(VolcanoTtsStatus.Idle)
    val playerStatus: StateFlow<VolcanoTtsStatus> = playerStatusFlow.asStateFlow()

    /**
     * 初始化
     */
    fun initTts(context: Context): VolcanoTtsHelper {
        audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager?

        ttsPlayer = ExoPlayer.Builder(context)
            .setAudioAttributes(
                androidx.media3.common.AudioAttributes.Builder()
                    .setUsage(C.USAGE_MEDIA)
                    .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                    .build(), false
            )
            .build().apply {
                playWhenReady = true
                prepare()
                addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(playbackState: Int) {
                        Log.d(TAG, "onPlaybackStateChanged: $playbackState")
                        when (playbackState) {
                            Player.STATE_IDLE -> {
                                clearMediaItems()
                                prepare()
                            }

                            Player.STATE_ENDED -> {
                                clearMediaItems()
                                prepare()
                            }

                            else -> {}
                        }
                    }

                    override fun onIsPlayingChanged(isPlaying: Boolean) {
                        Log.e(TAG, "onIsPlayingChanged: $isPlaying")
                        updatePlayStatus(
                            if (isPlaying) {
                                if (!hasPreviousMediaItem()) {
                                    audioManager?.requestAudioFocus(focusRequest)
                                    VolcanoTtsStatus.Start
                                } else {
                                    VolcanoTtsStatus.Resume
                                }

                            } else {
                                if (hasNextMediaItem() || _ttsBuffer.isNotEmpty()) {
                                    VolcanoTtsStatus.Pause
                                } else {
                                    audioManager?.abandonAudioFocusRequest(focusRequest)
                                    VolcanoTtsStatus.End
                                }
                            }
                        )
                    }

                    override fun onPlayerError(error: PlaybackException) {
                        Log.e(TAG, "onIsPlayingChanged: onError errorCode: ${error.errorCode}, message: ${error.message}")
                        updatePlayStatus(VolcanoTtsStatus.Error)

                    }
                })
            }

        return this
    }

    /**
     * 整句播放
     */
    fun playTts(text: String) {
        launch {
            splitLongText(text, 100).forEach { chunk ->
                requestTts(chunk)
            }
        }
    }

    /**
     * 拆分长文本，确保每个短句不超过 maxLen 个字符
     */
    private fun splitLongText(text: String, maxLen: Int): List<String> {
        val result = mutableListOf<String>()
        val sentenceEndRegex = Regex("[。！？?!]") // 句子结束标点

        var buffer = StringBuilder()

        for (char in text) {
            buffer.append(char)
            if (char.toString().matches(sentenceEndRegex) || buffer.length >= maxLen) {
                result.add(buffer.toString().trim())
                buffer = StringBuilder()
            }
        }

        // 处理剩余文本
        if (buffer.isNotEmpty()) {
            result.add(buffer.toString().trim())
        }

        return result
    }

    private val ttsInputChannel = Channel<String>(Channel.UNLIMITED)

    init {
        // 启动一个协程来顺序处理输入
        launch {
            for (text in ttsInputChannel) {
                processTtsInput(text)
            }
        }
    }

    /**
     * 分句播放
     */
    fun playChunkTts(appendText: String) {
        if (appendText.isNotBlank()) {
            ttsInputChannel.trySend(appendText)
        }
    }

    private suspend fun processTtsInput(appendText: String) {
        processing.withLock {
            _ttsBuffer.append(appendText)
            val matchResults = sentenceEndRegex.findAll(_ttsBuffer).toList()
            if (matchResults.isNotEmpty()) {
                val matchResult = matchResults.joinToString("") { it.value }
                val sentence = matchResult.trim()
                Log.e(TAG, "appendText: sentence: $sentence")
                requestTts(sentence)
                _ttsBuffer.delete(0, matchResult.length)
            }
        }
    }


    fun pauseTts() {
        launch(Dispatchers.Main) {
            ttsPlayer.pause()
        }
    }

    fun resumeTts() {
        launch(Dispatchers.Main) {
            ttsPlayer.play()
        }
    }

    fun cancelTts() {
        launch {
            ttsPlayer.stop()
            _ttsBuffer.setLength(0)
        }
    }

    fun stopTts() {
        launch {
            ttsPlayer.stop()
            ttsPlayer.clearMediaItems()
            _ttsBuffer.setLength(0)
        }
    }

    /**
     * 资源释放
     */
    fun releaseTts() {
        launch {
            stopTts()
            ttsPlayer.release()
            playerStatusFlow.emit(VolcanoTtsStatus.Idle)
        }
    }

    /**
     * 更新音色
     */
    fun updateVoiceType(name: String) {
        Log.i(TAG, "updateVoiceType: $name")
        if (VolcanoTtsVoice::class.sealedSubclasses.any { it.objectInstance!!.name == name }) {
            name.takeIf { voiceType != it }?.let {
                voiceType = it
            }
        } else {
            throw ClassNotFoundException("Voice Type: $name Not Found in UniSoundTtsVoice")
        }
    }

    private suspend fun requestTts(query: String) {
        val processQuery = query.trimPunctuation()
        if (!processQuery.isNotAllPunctuation()) return
        Log.e(TAG, "requestTts: $processQuery")

        coroutineScope {
            withContext(Dispatchers.IO) {
                val text = URLEncoder.encode(processQuery, "UTF-8")
                withContext(Dispatchers.Main) {
//                    val url = "http://124.221.124.238:10010/stream_audio?text=$query&voice=zh-CN-XiaoxiaoNeural&rate=10&volume=10"
                    val url = "$VOLCANO_TTS_BASE_URI/synthesize?text=$text&voice_type=$voiceType"
                    Log.d(TAG, "requestTts url: $url")
                    ttsPlayer.addMediaItem(MediaItem.fromUri(url))
                }
            }
        }
    }

    private fun updatePlayStatus(status: VolcanoTtsStatus){
        launch {
            Log.e(TAG, "updatePlayStatus: $status")
            playerStatusFlow.emit(status)
        }
    }

    sealed class VolcanoTtsVoice(var name: String) {
        data object Xiaoying : VolcanoTtsVoice("ICL_zh_female_huoponvhai_tob")
        data object Yingbao : VolcanoTtsVoice("zh_male_tiancaitongsheng_mars_bigtts")
        data object Yingzong : VolcanoTtsVoice("zh_male_aojiaobazong_moon_bigtts")
        data object Yingjie : VolcanoTtsVoice("zh_female_gaolengyujie_moon_bigtts")
        data object Xinyi : VolcanoTtsVoice("zh_female_wanwanxiaohe_moon_bigtts")
        data object Sunwukong : VolcanoTtsVoice("zh_male_sunwukong_mars_bigtts")
        data object Libai : VolcanoTtsVoice("ICL_zh_male_shenmifashi_tob")
        data object Lindaiyu : VolcanoTtsVoice("ICL_zh_female_bingjiaojiejie_tob")
        data object BV407 : VolcanoTtsVoice("BV407_V2_streaming")
    }
}

// 扩展函数：移除字符串开头和结尾的所有标点符号
fun String.trimPunctuation(): String =
    this.replace(Regex("^[\\p{P}]+|[\\p{P}]+$"), "")


// 正则表达式匹配全标点符号的字符串
fun String.isNotAllPunctuation(): Boolean {
    val punctuationRegex = "^[\\p{P}\\p{S}]+$".toRegex()
    return !this.matches(punctuationRegex)
}

sealed class VolcanoTtsStatus() {
    data object Idle : VolcanoTtsStatus()
    data object Start : VolcanoTtsStatus()
    data object End : VolcanoTtsStatus()
    data object Error : VolcanoTtsStatus()
    data object Pause : VolcanoTtsStatus()
    data object Resume : VolcanoTtsStatus()
}