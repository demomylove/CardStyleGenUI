package com.senseauto.audio.listener

interface IAsrManagerListener {
    fun onAsrBegin()
    fun onAsrResult(resultStr: String)
    fun onAsrEnd(p0: String?)
    fun onAsrError(code:Int, message:String)
}